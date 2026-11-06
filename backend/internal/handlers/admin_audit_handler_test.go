package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAuditCSVFormulaEscaping(t *testing.T) {
	for _, input := range []string{"=1+1", " +SUM(A1)", "\t@cmd"} {
		if got := safeAuditCSV(input); len(got) == 0 || got[0] != '\'' {
			t.Fatalf("unescaped CSV formula %q -> %q", input, got)
		}
	}
	if got := safeAuditCSV("admin@example.com"); got != "admin@example.com" {
		t.Fatalf("ordinary value changed: %q", got)
	}
}

func TestReadAuditFilterRejectsBadDatesAndStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, query := range []string{"?start_date=tomorrow", "?status=pending", "?admin_id=bad", "?start_date=2026-11-08&end_date=2026-11-07"} {
		ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
		ctx.Request = httptest.NewRequest("GET", "/v1/admin/logs"+query, nil)
		if _, ok := readAuditFilter(ctx); ok {
			t.Fatalf("accepted invalid filter %s", query)
		}
	}
}

func TestReadAuditFilterEndDateIsInclusiveForUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("GET", "/v1/admin/logs?start_date=2026-11-06&end_date=2026-11-06", nil)
	filter, ok := readAuditFilter(ctx)
	if !ok || filter.Start == nil || filter.End == nil || filter.End.Sub(*filter.Start).Hours() != 24 {
		t.Fatalf("wrong date range: %+v", filter)
	}
}
