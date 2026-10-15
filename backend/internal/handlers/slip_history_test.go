package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type slipHistoryRepoStub struct {
	repositories.SlipRepository
	items   []*models.Slip
	filters models.SlipHistoryFilters
}

func (s *slipHistoryRepoStub) ListHistoryByMerchant(_ uuid.UUID, filters models.SlipHistoryFilters) ([]*models.Slip, error) {
	s.filters = filters
	return s.items, nil
}

func (s *slipHistoryRepoStub) CountHistoryByMerchant(_ uuid.UUID, _ models.SlipHistoryFilters) (int, error) {
	return len(s.items), nil
}

type slipHistoryTransactionRepoStub struct {
	repositories.TransactionRepository
}

func (s *slipHistoryTransactionRepoStub) FindBySlipIDs(_ []uuid.UUID) (map[uuid.UUID]*models.Transaction, error) {
	return map[uuid.UUID]*models.Transaction{}, nil
}

func TestWriteSlipHistoryIncludesRejectedSlipWithoutTransaction(t *testing.T) {
	gin.SetMode(gin.TestMode)
	reason := models.FailReasonDuplicateSlip
	slip := &models.Slip{
		ID: uuid.New(), MerchantID: uuid.New(), ImageURL: "https://example.test/slip.png",
		Status: models.SlipStatusFailed, FailReason: &reason, CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	repo := &slipHistoryRepoStub{items: []*models.Slip{slip}}
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/slip-history?status=duplicate", nil)

	writeSlipHistory(ctx, slip.MerchantID, repo, &slipHistoryTransactionRepoStub{})

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var response struct {
		Data models.AdminSlipHistoryResponse `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if repo.filters.Status != "duplicate" || response.Data.Pagination.Total != 1 || len(response.Data.Items) != 1 {
		t.Fatalf("unexpected history response: %+v", response.Data)
	}
	if response.Data.Items[0].Slip.ID != slip.ID || response.Data.Items[0].Transaction != nil {
		t.Fatalf("rejected slip was not returned without a transaction: %+v", response.Data.Items[0])
	}
}
