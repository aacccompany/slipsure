package repositories

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

type freePlanState struct {
	used       bool
	configured bool
	lots       int
	pending    bool
	pendingLot int
}

type freePlanDriver struct{ state *freePlanState }

func (d freePlanDriver) Open(string) (driver.Conn, error) { return &freePlanConn{state: d.state}, nil }

type freePlanConn struct{ state *freePlanState }

func (c *freePlanConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (c *freePlanConn) Close() error              { return nil }
func (c *freePlanConn) Begin() (driver.Tx, error) { return &freePlanTx{state: c.state}, nil }

func (c *freePlanConn) QueryContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Rows, error) {
	switch {
	case strings.Contains(query, "FOR UPDATE OF m"):
		return &freePlanRows{columns: []string{"used", "configured"}, values: []driver.Value{c.state.used, c.state.configured}}, nil
	case strings.Contains(query, "INSERT INTO subscriptions"):
		now := time.Now()
		return &freePlanRows{columns: []string{"id", "created_at", "updated_at"}, values: []driver.Value{uuid.NewString(), now, now}}, nil
	default:
		return nil, fmt.Errorf("unexpected query: %s", query)
	}
}

func (c *freePlanConn) ExecContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Result, error) {
	switch {
	case strings.Contains(query, "INSERT INTO credit_lots"):
		c.state.pendingLot++
	case strings.Contains(query, "UPDATE merchants SET free_plan_used"):
		c.state.pending = true
	default:
		return nil, fmt.Errorf("unexpected exec: %s", query)
	}
	return driver.RowsAffected(1), nil
}

type freePlanTx struct{ state *freePlanState }

func (t *freePlanTx) Commit() error {
	t.state.used = t.state.pending
	t.state.lots += t.state.pendingLot
	t.state.pending = false
	t.state.pendingLot = 0
	return nil
}
func (t *freePlanTx) Rollback() error {
	t.state.pending = false
	t.state.pendingLot = 0
	return nil
}

type freePlanRows struct {
	columns []string
	values  []driver.Value
	read    bool
}

func (r *freePlanRows) Columns() []string { return r.columns }
func (r *freePlanRows) Close() error      { return nil }
func (r *freePlanRows) Next(dest []driver.Value) error {
	if r.read {
		return io.EOF
	}
	copy(dest, r.values)
	r.read = true
	return nil
}

func TestFreePlanGrantedOnlyOnce(t *testing.T) {
	state := &freePlanState{configured: true}
	name := "free-plan-" + uuid.NewString()
	sql.Register(name, freePlanDriver{state})
	db, err := sql.Open(name, "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	repo := &merchantRepository{db: db}
	merchantID := uuid.New()
	for attempt := 0; attempt < 2; attempt++ {
		expiresAt := time.Now().AddDate(100, 0, 0)
		subscription := &models.Subscription{MerchantID: merchantID, PlanID: "plan-free", Status: models.SubscriptionStatusActive, BillingCycle: models.BillingCycleMonthly, StartedAt: time.Now(), ExpiresAt: &expiresAt}
		err := repo.ActivateFreePlan(subscription, 20)
		if attempt == 0 && err != nil {
			t.Fatal(err)
		}
		if attempt == 1 && !errors.Is(err, ErrFreePlanAlreadyUsed) {
			t.Fatalf("second grant error = %v", err)
		}
	}
	if !state.used || state.lots != 1 {
		t.Fatalf("used = %v, lots = %d; want true and 1", state.used, state.lots)
	}
}

func TestFreePlanRequiresLINEConfig(t *testing.T) {
	state := &freePlanState{}
	name := "free-plan-unconfigured-" + uuid.NewString()
	sql.Register(name, freePlanDriver{state})
	db, err := sql.Open(name, "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	repo := &merchantRepository{db: db}
	expiresAt := time.Now().AddDate(100, 0, 0)
	subscription := &models.Subscription{MerchantID: uuid.New(), PlanID: "plan-free", Status: models.SubscriptionStatusActive, BillingCycle: models.BillingCycleMonthly, StartedAt: time.Now(), ExpiresAt: &expiresAt}
	if err := repo.ActivateFreePlan(subscription, 20); !errors.Is(err, ErrLINEConfigRequired) {
		t.Fatalf("unconfigured grant error = %v, want ErrLINEConfigRequired", err)
	}
	if state.used || state.lots != 0 {
		t.Fatalf("unconfigured merchant used = %v, lots = %d", state.used, state.lots)
	}
}
