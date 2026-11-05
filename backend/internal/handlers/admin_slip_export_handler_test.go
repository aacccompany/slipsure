package handlers

import (
	"bytes"
	"encoding/csv"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type adminSlipExportRepoStub struct {
	repositories.SlipRepository
	items   []*models.Slip
	filters []models.SlipHistoryFilters
}

type adminSlipExportUserRepoStub struct {
	repositories.UserRepository
	user *models.User
}

func (s *adminSlipExportUserRepoStub) FindByID(uuid.UUID) (*models.User, error) {
	return s.user, nil
}

func (s *adminSlipExportRepoStub) ListHistoryAll(filters models.SlipHistoryFilters) ([]*models.Slip, error) {
	s.filters = append(s.filters, filters)
	if filters.Offset >= len(s.items) {
		return nil, nil
	}
	end := min(len(s.items), filters.Offset+filters.Limit)
	return s.items[filters.Offset:end], nil
}

type adminSlipExportTransactionsStub struct {
	repositories.TransactionRepository
	items map[uuid.UUID]*models.Transaction
	calls int
}

func (s *adminSlipExportTransactionsStub) FindBySlipIDs(ids []uuid.UUID) (map[uuid.UUID]*models.Transaction, error) {
	s.calls++
	result := make(map[uuid.UUID]*models.Transaction)
	for _, id := range ids {
		if transaction := s.items[id]; transaction != nil {
			result[id] = transaction
		}
	}
	return result, nil
}

func TestExportAdminSlipHistoryIncludesAllPagesAndRejectedSlips(t *testing.T) {
	gin.SetMode(gin.TestMode)
	created := time.Date(2026, 11, 3, 0, 0, 0, 0, time.UTC)
	reason := models.FailReasonDuplicateSlip
	repo := &adminSlipExportRepoStub{items: make([]*models.Slip, adminSlipExportBatchSize+1)}
	merchantID := uuid.New()
	for i := range repo.items {
		repo.items[i] = &models.Slip{ID: uuid.New(), MerchantID: merchantID, Status: models.SlipStatusVerified, CreatedAt: created}
	}
	repo.items[0].Status = models.SlipStatusFailed
	repo.items[0].FailReason = &reason
	transactions := &adminSlipExportTransactionsStub{items: map[uuid.UUID]*models.Transaction{
		repo.items[1].ID: {ID: uuid.New(), ReferenceNo: "=SUM(1,1)", Amount: 49, SenderName: "Alice", ReceiverName: "Bob"},
	}}
	handler := &MerchantHandler{userRepo: &adminSlipExportUserRepoStub{user: &models.User{Role: models.RoleAdmin, IsActive: true}}, slipRepo: repo, transactionRepo: transactions}
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/v1/admin/slip-history/export?status=duplicate&search=abc&start_date=2026-11-01&end_date=2026-11-03", nil)
	ctx.Set("user_id", uuid.New().String())
	handler.ExportAdminSlipHistory(ctx)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if got := response.Header().Get("Content-Disposition"); !strings.Contains(got, ".csv") {
		t.Fatalf("missing download header: %q", got)
	}
	data := response.Body.Bytes()
	if !bytes.HasPrefix(data, []byte{0xEF, 0xBB, 0xBF}) {
		t.Fatal("UTF-8 BOM missing")
	}
	rows, err := csv.NewReader(bytes.NewReader(data[3:])).ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != adminSlipExportBatchSize+2 {
		t.Fatalf("CSV rows = %d, want %d", len(rows), adminSlipExportBatchSize+2)
	}
	if rows[0][0] != "รหัสสลิป" || rows[1][2] != "สลิปซ้ำ" || rows[1][3] != "สลิปซ้ำ" || rows[1][4] != "" {
		t.Fatalf("rejected row = %v", rows[1])
	}
	if rows[2][5] != "'=SUM(1,1)" || rows[2][6] != "49.00" || rows[2][13] != "2026-11-03 07:00:00" {
		t.Fatalf("transaction row = %v", rows[2])
	}
	if len(repo.filters) != 2 || repo.filters[0].Offset != 0 || repo.filters[1].Offset != adminSlipExportBatchSize || transactions.calls != 2 {
		t.Fatalf("pagination = %+v, transaction batches = %d", repo.filters, transactions.calls)
	}
	if repo.filters[0].Status != "duplicate" || repo.filters[0].Search != "abc" || repo.filters[0].StartDate == nil || repo.filters[0].EndDate == nil {
		t.Fatalf("filters = %+v", repo.filters[0])
	}
}

func TestExportAdminSlipHistoryRejectsInvalidStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &MerchantHandler{userRepo: &adminSlipExportUserRepoStub{user: &models.User{Role: models.RoleAdmin, IsActive: true}}}
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/v1/admin/slip-history/export?status=invalid", nil)
	ctx.Set("user_id", uuid.New().String())
	handler.ExportAdminSlipHistory(ctx)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestExportAdminSlipHistoryRejectsDemotedAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &MerchantHandler{userRepo: &adminSlipExportUserRepoStub{user: &models.User{Role: models.RoleMerchant, IsActive: true}}}
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/v1/admin/slip-history/export", nil)
	ctx.Set("user_id", uuid.New().String())
	handler.ExportAdminSlipHistory(ctx)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestSafeAdminCSVCell(t *testing.T) {
	for _, value := range []string{"=1+1", " +SUM(1,2)", "\t@cmd"} {
		if got := safeAdminCSVCell(value); !strings.HasPrefix(got, "'") {
			t.Fatalf("unsafe CSV cell %q -> %q", value, got)
		}
	}
}
