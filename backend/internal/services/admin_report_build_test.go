package services

import (
	"bytes"
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/xuri/excelize/v2"
)

type adminDataDriver struct{}

func (adminDataDriver) Open(string) (driver.Conn, error) { return adminDataConn{}, nil }

type adminDataConn struct{}

func (adminDataConn) Prepare(string) (driver.Stmt, error) { return nil, errors.New("not supported") }
func (adminDataConn) Close() error                        { return nil }
func (adminDataConn) Begin() (driver.Tx, error)           { return adminDataTx{}, nil }
func (adminDataConn) BeginTx(context.Context, driver.TxOptions) (driver.Tx, error) {
	return adminDataTx{}, nil
}

type adminDataTx struct{}

func (adminDataTx) Commit() error   { return nil }
func (adminDataTx) Rollback() error { return nil }

type adminDataRows struct {
	columns []string
	values  [][]driver.Value
	index   int
}

func (r *adminDataRows) Columns() []string { return r.columns }
func (r *adminDataRows) Close() error      { return nil }
func (r *adminDataRows) Next(dest []driver.Value) error {
	if r.index >= len(r.values) {
		return io.EOF
	}
	copy(dest, r.values[r.index])
	r.index++
	return nil
}

func (adminDataConn) QueryContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Rows, error) {
	when := time.Date(2026, 11, 3, 8, 0, 0, 0, time.UTC)
	makeRows := func(count int, values ...[]driver.Value) driver.Rows {
		return &adminDataRows{columns: make([]string, count), values: values}
	}
	switch {
	case strings.Contains(query, "FROM merchants m JOIN users u"):
		return makeRows(12,
			[]driver.Value{"w1", "Shop A", "Owner A", when, "Mini", "active", true, int64(2), int64(1), int64(1), int64(10), when},
			[]driver.Value{"w2", "Shop B", "Owner B", when, "Pro", "active", false, int64(1), int64(0), int64(0), int64(20), when}), nil
	case strings.Contains(query, "FROM slips s JOIN merchants m"):
		return makeRows(16,
			[]driver.Value{"t1", "w1", "Shop A", when, when, float64(125), "Alice", "KBANK", "Bob", "SCB", "ref1", "verified", "", "HaveSLIP", int64(1), "s1"},
			[]driver.Value{"", "w1", "Shop A", when, nil, nil, "", "", "", "", "", "failed", "DUPLICATE_SLIP", "", nil, "s2"},
			[]driver.Value{"", "w2", "Shop B", when, nil, nil, "", "", "", "", "", "failed", "BANK_ERROR", "", nil, "s3"}), nil
	case strings.Contains(query, "UNION ALL"):
		return makeRows(13,
			[]driver.Value{"lot1", "w1", "Shop A", when, "", "Added", int64(10), int64(0), nil, "", "Recorded", "Mini", "p1"},
			[]driver.Value{"event1", "w1", "Shop A", when, "t1", "Deducted", int64(0), int64(1), int64(9), "", "verified", "FIFO scan credit consumed", "p1"}), nil
	case strings.Contains(query, "FROM payment_logs p JOIN merchants m"):
		return makeRows(12,
			[]driver.Value{"p1", "w1", "Shop A", "Mini", int64(10), float64(49), "THB", "stripe", "refunded", when, when, "ref-p1"},
			[]driver.Value{"p2", "w2", "Shop B", "Pro", int64(20), float64(10), "USD", "stripe", "success", when, when, "ref-p2"},
			[]driver.Value{"p3", "w1", "Shop A", "", nil, float64(99), "THB", "stripe", "failed", when, nil, "ref-p3"}), nil
	case strings.Contains(query, "COUNT(*)::int FROM users"):
		return makeRows(1, []driver.Value{int64(2)}), nil
	default:
		return nil, fmt.Errorf("unexpected query: %s", query)
	}
}

func TestAdminReportBuildReconcilesWorkspacesCreditsAndCurrencies(t *testing.T) {
	driverName := fmt.Sprintf("admin-data-%d", time.Now().UnixNano())
	sql.Register(driverName, adminDataDriver{})
	db, err := sql.Open(driverName, "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	period := AdminReportPeriod{Label: "ทั้งหมด", Location: time.FixedZone("Asia/Bangkok", 7*60*60)}
	data, err := NewAdminReportService(db).Build(context.Background(), period)
	if err != nil {
		t.Fatal(err)
	}
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	checks := []struct{ sheet, cell, want string }{
		{adminSummarySheet, "A1", "รายงานภาพรวมแพลตฟอร์ม FlowSlip"},
		{adminSummarySheet, "A44", ""},
		{adminSummarySheet, "B8", "2"},
		{adminSummarySheet, "B12", "3"},
		{adminSummarySheet, "B13", "1"},
		{adminSummarySheet, "B14", "1"},
		{adminSummarySheet, "B15", "1"},
		{adminSummarySheet, "B19", "1"},
		{adminSummarySheet, "A28", "THB"},
		{adminSummarySheet, "B28", "49.00"},
		{adminSummarySheet, "D28", ""},
		{adminSummarySheet, "A29", "USD"},
		{adminSummarySheet, "B29", "10.00"},
		{adminWorkspacesSheet, "A3", "w2"},
		{adminWorkspacesSheet, "A1", "รหัสร้านค้า"},
		{adminSlipsSheet, "M1", "สถานะการตรวจสอบ"},
		{adminSlipsSheet, "M3", "สลิปซ้ำ"},
		{adminCreditsSheet, "F1", "ประเภทรายการ"},
		{adminCreditsSheet, "H3", "1"},
		{adminOrdersSheet, "D1", "ชื่อแพ็กเกจ"},
		{adminPaymentsSheet, "K1", "สถานะการชำระเงิน"},
		{adminPaymentsSheet, "G4", ""},
	}
	for _, check := range checks {
		got, err := f.GetCellValue(check.sheet, check.cell)
		if err != nil || got != check.want {
			t.Errorf("%s!%s = %q, want %q (error %v)", check.sheet, check.cell, got, check.want, err)
		}
	}
}
