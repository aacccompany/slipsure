package repositories

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"math"
	"strings"
	"testing"

	"github.com/google/uuid"
)

type adminPerformanceDriver struct{ merchantID uuid.UUID }

func (d adminPerformanceDriver) Open(string) (driver.Conn, error) {
	return adminPerformanceConn{merchantID: d.merchantID}, nil
}

type adminPerformanceConn struct{ merchantID uuid.UUID }

func (c adminPerformanceConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (c adminPerformanceConn) Close() error { return nil }
func (c adminPerformanceConn) Begin() (driver.Tx, error) {
	return nil, errors.New("unexpected transaction")
}
func (c adminPerformanceConn) QueryContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Rows, error) {
	if !strings.Contains(query, "SUM(credits_remaining) FILTER (WHERE expires_at > CURRENT_TIMESTAMP)") {
		return nil, errors.New("performance query must aggregate active credit balances")
	}
	return &paidLotRows{
		columns: []string{"merchant_id", "shop_name", "scans", "verified_scans", "failed_scans", "has_subscription", "lot_count", "active_total", "active_remaining", "last_scan"},
		values:  []driver.Value{c.merchantID.String(), "unik", int64(12), int64(1), int64(2), true, int64(2), int64(351), int64(20), nil},
	}, nil
}

func TestAdminMerchantPerformanceUsesActiveCreditBalance(t *testing.T) {
	merchantID := uuid.New()
	driverName := "admin-performance-" + uuid.NewString()
	sql.Register(driverName, adminPerformanceDriver{merchantID: merchantID})
	db, err := sql.Open(driverName, "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	repo := &merchantRepository{db: db}
	performance, err := repo.GetAdminMerchantPerformance()
	if err != nil {
		t.Fatal(err)
	}
	if len(performance.UsagePerMerchant) != 1 {
		t.Fatalf("got %d merchants, want 1", len(performance.UsagePerMerchant))
	}
	item := performance.UsagePerMerchant[0]
	if item.MerchantID != merchantID || item.Scans != 12 {
		t.Fatalf("lifetime slip activity changed: %+v", item)
	}
	if item.Quota != 351 || item.QuotaUsed != 331 || item.QuotaRemaining != 20 {
		t.Fatalf("incorrect active quota: %+v", item)
	}
	if math.Abs(item.QuotaPercent-(331.0/351.0*100)) > 0.001 {
		t.Fatalf("quota percent = %f, want active-credit usage percent", item.QuotaPercent)
	}
}
