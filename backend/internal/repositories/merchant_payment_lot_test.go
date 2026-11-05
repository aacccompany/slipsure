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

	"slipsure-backend/internal/models"

	"github.com/google/uuid"
)

type paidLotState struct {
	paymentID   uuid.UUID
	lotID       uuid.UUID
	paid        bool
	lotCreated  bool
	lotInserts  int
	createdTime time.Time
}

type paidLotDriver struct{ state *paidLotState }

func (d paidLotDriver) Open(string) (driver.Conn, error) { return paidLotConn{d.state}, nil }

type paidLotConn struct{ state *paidLotState }

func (c paidLotConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("unexpected prepare")
}
func (c paidLotConn) Close() error              { return nil }
func (c paidLotConn) Begin() (driver.Tx, error) { return paidLotTx{}, nil }
func (c paidLotConn) ExecContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Result, error) {
	if !strings.Contains(query, "pg_advisory_xact_lock") {
		return nil, fmt.Errorf("unexpected exec: %s", query)
	}
	return driver.RowsAffected(1), nil
}

func (c paidLotConn) QueryContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Rows, error) {
	s := c.state
	switch {
	case strings.Contains(query, "INSERT INTO payment_logs"):
		return &paidLotRows{columns: []string{"id", "created_at"}}, nil
	case strings.Contains(query, "FROM payment_logs"):
		if !s.paid {
			return &paidLotRows{columns: []string{"id", "created_at"}}, nil
		}
		return &paidLotRows{columns: []string{"id", "created_at"}, values: []driver.Value{s.paymentID.String(), s.createdTime}}, nil
	case strings.Contains(query, "INSERT INTO credit_lots"):
		if s.lotCreated {
			return nil, errors.New("duplicate credit lot insert")
		}
		s.lotCreated = true
		s.lotInserts++
		return &paidLotRows{columns: []string{"id", "created_at", "updated_at"}, values: []driver.Value{s.lotID.String(), s.createdTime, s.createdTime}}, nil
	case strings.Contains(query, "FROM credit_lots"):
		if !s.lotCreated {
			return &paidLotRows{columns: []string{"id", "created_at", "updated_at"}}, nil
		}
		return &paidLotRows{columns: []string{"id", "created_at", "updated_at"}, values: []driver.Value{s.lotID.String(), s.createdTime, s.createdTime}}, nil
	default:
		return nil, fmt.Errorf("unexpected query: %s", query)
	}
}

type paidLotTx struct{}

func (paidLotTx) Commit() error   { return nil }
func (paidLotTx) Rollback() error { return nil }

type paidLotRows struct {
	columns []string
	values  []driver.Value
	read    bool
}

func (r *paidLotRows) Columns() []string { return r.columns }
func (r *paidLotRows) Close() error      { return nil }
func (r *paidLotRows) Next(dest []driver.Value) error {
	if r.read || len(r.values) == 0 {
		return io.EOF
	}
	copy(dest, r.values)
	r.read = true
	return nil
}

func TestPaidCheckoutRecoversMissingLotWithoutDuplicateCredits(t *testing.T) {
	state := &paidLotState{paymentID: uuid.New(), lotID: uuid.New(), paid: true, createdTime: time.Now()}
	name := "paid-lot-" + uuid.NewString()
	sql.Register(name, paidLotDriver{state})
	db, err := sql.Open(name, "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	repo := &merchantRepository{db: db}
	merchantID, subscriptionID := uuid.New(), uuid.New()
	for attempt := 0; attempt < 2; attempt++ {
		payment := &models.PaymentLog{MerchantID: merchantID, SubscriptionID: &subscriptionID, Gateway: "stripe", GatewayReferenceID: "cs_test_paid", Status: "success"}
		if err := repo.CreatePaymentLog(payment); err != nil {
			t.Fatal(err)
		}
		if payment.ID != state.paymentID {
			t.Fatalf("payment ID = %s, want existing ID %s", payment.ID, state.paymentID)
		}
		lot := &models.CreditLot{MerchantID: merchantID, SubscriptionID: &subscriptionID, PaymentLogID: &payment.ID, PlanID: "plan-mini", CreditsTotal: 150, CreditsRemaining: 150, StartedAt: state.createdTime, ExpiresAt: state.createdTime.AddDate(0, 1, 0)}
		if err := repo.CreateCreditLot(lot); err != nil {
			t.Fatal(err)
		}
		if lot.ID != state.lotID {
			t.Fatalf("lot ID = %s, want existing ID %s", lot.ID, state.lotID)
		}
	}
	if state.lotInserts != 1 {
		t.Fatalf("credit lot inserts = %d, want 1", state.lotInserts)
	}
}

func TestExistingUnpaidPaymentCannotBeReusedForCredits(t *testing.T) {
	state := &paidLotState{paymentID: uuid.New(), paid: false, createdTime: time.Now()}
	name := "unpaid-lot-" + uuid.NewString()
	sql.Register(name, paidLotDriver{state})
	db, err := sql.Open(name, "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	repo := &merchantRepository{db: db}
	payment := &models.PaymentLog{MerchantID: uuid.New(), Gateway: "stripe", GatewayReferenceID: "cs_test_unpaid", Status: "success"}
	if err := repo.CreatePaymentLog(payment); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("unpaid payment reuse error = %v, want sql.ErrNoRows", err)
	}
	if payment.ID != uuid.Nil {
		t.Fatalf("unpaid payment ID = %s, want empty", payment.ID)
	}
}
