package repositories

import (
	"strings"
	"testing"
	"time"

	"slipsure-backend/internal/models"

	"github.com/google/uuid"
)

func TestBuildSlipHistoryWhere(t *testing.T) {
	merchantID := uuid.New()
	start := time.Date(2026, 10, 15, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 0, 1)
	where, args := buildSlipHistoryWhere(&merchantID, models.SlipHistoryFilters{
		Status: "duplicate", StartDate: &start, EndDate: &end, Search: "sender",
	})
	for _, clause := range []string{
		"s.merchant_id = $1", "s.fail_reason = 'DUPLICATE_SLIP'",
		"s.created_at >= $2", "s.created_at < $3", "t.sender_name ILIKE $4",
	} {
		if !strings.Contains(where, clause) {
			t.Errorf("missing clause %q in %q", clause, where)
		}
	}
	if len(args) != 4 || args[0] != merchantID || args[3] != "%sender%" || args[2] != end.AddDate(0, 0, 1) {
		t.Fatalf("unexpected args: %#v", args)
	}
}

func TestBuildSlipHistoryWhereAllMerchants(t *testing.T) {
	where, args := buildSlipHistoryWhere(nil, models.SlipHistoryFilters{Status: "failed"})
	if strings.Contains(where, "merchant_id") || !strings.Contains(where, "s.status::text = $1") || len(args) != 1 || args[0] != "failed" {
		t.Fatalf("unexpected global history filter: %q %#v", where, args)
	}
}
