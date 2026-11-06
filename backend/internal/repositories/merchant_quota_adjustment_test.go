package repositories

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"slipsure-backend/internal/models"

	"github.com/google/uuid"
)

type quotaAdjustmentState struct {
	subscriptionID uuid.UUID
	startedAt      time.Time
	planTotal      int
	planRemaining  int
	hasPlan        bool
	storedExtra    int
	grantTotal     int
	grantRemaining int
	grantExpiresAt time.Time
	hasGrant       bool
	commits        int
}

type quotaAdjustmentDriver struct{ state *quotaAdjustmentState }

func (d quotaAdjustmentDriver) Open(string) (driver.Conn, error) {
	return quotaAdjustmentConn{d.state}, nil
}

type quotaAdjustmentConn struct{ state *quotaAdjustmentState }

func (c quotaAdjustmentConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (c quotaAdjustmentConn) Close() error { return nil }
func (c quotaAdjustmentConn) Begin() (driver.Tx, error) {
	return quotaAdjustmentTx{c.state}, nil
}

func (c quotaAdjustmentConn) QueryContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Rows, error) {
	s := c.state
	switch {
	case strings.Contains(query, "FROM subscriptions s JOIN subscription_plans"):
		return &paidLotRows{
			columns: []string{"id", "plan_id", "quota_per_month", "quota_override", "started_at", "expires_at"},
			values:  []driver.Value{s.subscriptionID.String(), "plan-free", int64(20), int64(s.storedExtra), s.startedAt, s.startedAt.AddDate(0, 2, 0)},
		}, nil
	case strings.Contains(query, "grant_source = 'admin_extra'"):
		rows := &paidLotRows{columns: []string{"id", "credits_total", "credits_remaining"}}
		if s.hasGrant && s.grantExpiresAt.After(time.Now()) {
			rows.values = []driver.Value{uuid.NewString(), int64(s.grantTotal), int64(s.grantRemaining)}
		}
		return rows, nil
	case strings.Contains(query, "grant_source = 'plan'"):
		rows := &paidLotRows{columns: []string{"id", "credits_total", "credits_remaining"}}
		if s.hasPlan {
			rows.values = []driver.Value{uuid.NewString(), int64(s.planTotal), int64(s.planRemaining)}
		}
		return rows, nil
	default:
		return nil, fmt.Errorf("unexpected query: %s", query)
	}
}

func (c quotaAdjustmentConn) ExecContext(_ context.Context, query string, args []driver.NamedValue) (driver.Result, error) {
	s := c.state
	switch {
	case strings.Contains(query, "SET credits_total = $2"):
		s.planTotal = int(args[1].Value.(int64))
		s.planRemaining = int(args[2].Value.(int64))
	case strings.Contains(query, "INSERT INTO credit_lots"):
		s.grantTotal = int(args[3].Value.(int64))
		s.grantRemaining = s.grantTotal
		expiresIndex := 5
		if strings.Contains(query, "$4, $5, $6, $7") {
			s.grantRemaining = int(args[4].Value.(int64))
			expiresIndex = 6
		}
		s.grantExpiresAt = args[expiresIndex].Value.(time.Time)
		s.hasGrant = true
	case strings.Contains(query, "SET credits_total = credits_total + $2"):
		delta := int(args[1].Value.(int64))
		s.grantTotal += delta
		s.grantRemaining += delta
		if args[2].Value != nil {
			s.grantExpiresAt = args[2].Value.(time.Time)
		}
	case strings.Contains(query, "UPDATE subscriptions"):
		s.storedExtra = int(args[1].Value.(int64))
	default:
		return nil, fmt.Errorf("unexpected exec: %s", query)
	}
	return driver.RowsAffected(1), nil
}

type quotaAdjustmentTx struct{ state *quotaAdjustmentState }

func (tx quotaAdjustmentTx) Commit() error {
	tx.state.commits++
	return nil
}
func (quotaAdjustmentTx) Rollback() error { return nil }

func openQuotaAdjustmentRepo(t *testing.T, state *quotaAdjustmentState) *merchantRepository {
	t.Helper()
	state.subscriptionID = uuid.New()
	state.startedAt = time.Now().Add(-24 * time.Hour)
	name := "quota-adjustment-" + uuid.NewString()
	sql.Register(name, quotaAdjustmentDriver{state})
	db, err := sql.Open(name, "")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return &merchantRepository{db: db}
}

func TestAdminExtraQuotaUsesSeparateExpiringLot(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 20, planRemaining: 19, storedExtra: 5}
	repo := openQuotaAdjustmentRepo(t, state)
	merchantID := uuid.New()
	_, resetDate := models.QuotaPeriodFor(state.startedAt, time.Now())
	for _, want := range []int{5, 5, 10, 0} {
		var expiry *time.Time
		if want > 0 {
			expiry = &resetDate
		}
		if err := repo.UpdateAdminMerchantQuota(merchantID, want, expiry); err != nil {
			t.Fatal(err)
		}
		if state.planTotal != 20 || state.planRemaining != 19 || state.grantTotal != want || state.storedExtra != want {
			t.Fatalf("unexpected quota state after setting %d: %+v", want, state)
		}
	}
	if !state.grantExpiresAt.Equal(resetDate) {
		t.Fatalf("grant expires %v, want current reset %v", state.grantExpiresAt, resetDate)
	}
}

func TestAdminExtraQuotaSplitsLegacyPlanLot(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 25, planRemaining: 24, storedExtra: 5}
	repo := openQuotaAdjustmentRepo(t, state)
	_, expiry := models.QuotaPeriodFor(state.startedAt, time.Now())
	if err := repo.UpdateAdminMerchantQuota(uuid.New(), 5, &expiry); err != nil {
		t.Fatal(err)
	}
	if state.planTotal != 20 || state.planRemaining != 19 || state.grantTotal != 5 || state.grantRemaining != 5 {
		t.Fatalf("legacy extra was not separated: %+v", state)
	}
}

func TestAdminExtraQuotaCannotRemoveUsedCredits(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 20, planRemaining: 0,
		hasGrant: true, grantTotal: 5, grantRemaining: 2, grantExpiresAt: time.Now().Add(time.Hour), storedExtra: 5}
	repo := openQuotaAdjustmentRepo(t, state)
	if err := repo.UpdateAdminMerchantQuota(uuid.New(), 0, nil); !errors.Is(err, ErrQuotaAdjustmentExceedsRemaining) {
		t.Fatalf("error = %v, want used-credit conflict", err)
	}
	if state.commits != 0 || state.grantTotal != 5 || state.storedExtra != 5 {
		t.Fatalf("rejected update changed quota: %+v", state)
	}
}

func TestAdminExtraQuotaDoesNotRewriteSpentLegacyLot(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 25, planRemaining: 2, storedExtra: 5}
	repo := openQuotaAdjustmentRepo(t, state)
	_, expiry := models.QuotaPeriodFor(state.startedAt, time.Now())
	if err := repo.UpdateAdminMerchantQuota(uuid.New(), 5, &expiry); !errors.Is(err, ErrLegacyExtraAlreadyUsed) {
		t.Fatalf("error = %v, want legacy usage conflict", err)
	}
	if state.commits != 0 || state.planTotal != 25 || state.hasGrant {
		t.Fatalf("legacy history changed after rejected split: %+v", state)
	}
}

func TestExpiredAdminGrantIsNotReused(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 20, planRemaining: 19,
		hasGrant: true, grantTotal: 5, grantRemaining: 5, grantExpiresAt: time.Now().Add(-time.Hour), storedExtra: 5}
	repo := openQuotaAdjustmentRepo(t, state)
	_, expiry := models.QuotaPeriodFor(state.startedAt, time.Now())
	if err := repo.UpdateAdminMerchantQuota(uuid.New(), 3, &expiry); err != nil {
		t.Fatal(err)
	}
	if state.grantTotal != 3 || !state.grantExpiresAt.After(time.Now()) {
		t.Fatalf("new period grant not created: %+v", state)
	}
}

func TestAdminCanChangeGrantExpiryWithoutAddingCredits(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 20, planRemaining: 19,
		hasGrant: true, grantTotal: 5, grantRemaining: 5, grantExpiresAt: time.Now().Add(3 * time.Hour), storedExtra: 5}
	repo := openQuotaAdjustmentRepo(t, state)
	expiry := time.Now().Add(2 * time.Hour)
	if err := repo.UpdateAdminMerchantQuota(uuid.New(), 5, &expiry); err != nil {
		t.Fatal(err)
	}
	if state.grantTotal != 5 || state.grantRemaining != 5 || !state.grantExpiresAt.Equal(expiry) {
		t.Fatalf("expiry-only update changed credits or missed expiry: %+v", state)
	}
}

func TestAdminGrantExpiryMustStayWithinCurrentPeriod(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 20, planRemaining: 19}
	repo := openQuotaAdjustmentRepo(t, state)
	for _, expiry := range []time.Time{time.Now().Add(-time.Minute), time.Now().AddDate(0, 2, 0)} {
		if err := repo.UpdateAdminMerchantQuota(uuid.New(), 5, &expiry); !errors.Is(err, ErrInvalidQuotaExpiry) {
			t.Fatalf("expiry %v error = %v, want invalid expiry", expiry, err)
		}
	}
	if state.hasGrant || state.commits != 0 {
		t.Fatalf("invalid expiry changed quota: %+v", state)
	}
}

func TestAdminGrantRequiresChosenExpiry(t *testing.T) {
	state := &quotaAdjustmentState{hasPlan: true, planTotal: 20, planRemaining: 19}
	repo := openQuotaAdjustmentRepo(t, state)
	if err := repo.UpdateAdminMerchantQuota(uuid.New(), 5, nil); !errors.Is(err, ErrQuotaExpiryRequired) {
		t.Fatalf("error = %v, want missing-expiry error", err)
	}
	if state.hasGrant || state.commits != 0 {
		t.Fatalf("missing expiry changed quota: %+v", state)
	}
}
