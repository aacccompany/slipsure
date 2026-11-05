package services

import (
	"archive/zip"
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/xuri/excelize/v2"
)

func TestAdminReportEmptyWorkbook(t *testing.T) {
	f := excelize.NewFile()
	defer f.Close()
	if err := f.SetSheetName("Sheet1", adminSummarySheet); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{adminWorkspacesSheet, adminSlipsSheet, adminCreditsSheet, adminOrdersSheet, adminPaymentsSheet} {
		sheet, err := newAdminSheet(f, name, []string{"ID", "Status"})
		if err != nil {
			t.Fatal(err)
		}
		if err := sheet.finish(); err != nil {
			t.Fatal(err)
		}
	}
	period := AdminReportPeriod{Label: "ทั้งหมด", Location: time.FixedZone("Asia/Bangkok", 7*60*60)}
	totals := adminReportTotals{gross: map[string]float64{}, refunded: map[string]bool{}}
	if err := writeAdminSummary(f, period, totals); err != nil {
		t.Fatal(err)
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}
	opened, err := excelize.OpenReader(bytes.NewReader(buf.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	defer opened.Close()
	if sheets := opened.GetSheetList(); len(sheets) != 6 {
		t.Fatalf("sheet count = %d: %v", len(sheets), sheets)
	}
	for _, name := range opened.GetSheetList() {
		tables, err := opened.GetTables(name)
		want := 1
		if name == adminSummarySheet {
			want = 0
		}
		if err != nil || len(tables) != want {
			t.Fatalf("%s tables = %d, want %d, error = %v", name, len(tables), want, err)
		}
	}
	archive, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatal(err)
	}
	charts := 0
	for _, file := range archive.File {
		if strings.HasPrefix(file.Name, "xl/charts/chart") && strings.HasSuffix(file.Name, ".xml") {
			charts++
		}
	}
	if charts != 0 {
		t.Fatalf("chart count = %d, want 0", charts)
	}
	if got, _ := opened.GetCellValue(adminSummarySheet, "B12"); got != "0" {
		t.Fatalf("empty platform slip count = %q", got)
	}
	if got, _ := opened.GetCellValue(adminSummarySheet, "A1"); got != "รายงานภาพรวมแพลตฟอร์ม FlowSlip" {
		t.Fatalf("summary title = %q", got)
	}
}

func TestAdminReportStatusFormattingAndRowLimit(t *testing.T) {
	f := excelize.NewFile()
	defer f.Close()
	sheet, err := newAdminSheet(f, "StatusRows", []string{"ID", "สถานะ"})
	if err != nil {
		t.Fatal(err)
	}
	for _, status := range []string{"สำเร็จ", "ไม่สำเร็จ", "สลิปซ้ำ", "รอดำเนินการ"} {
		if err := sheet.append("id", status); err != nil {
			t.Fatal(err)
		}
	}
	if err := sheet.finish(); err != nil {
		t.Fatal(err)
	}
	styles := make(map[int]bool)
	for row := 2; row <= 5; row++ {
		style, err := f.GetCellStyle("StatusRows", "B"+string(rune('0'+row)))
		if err != nil {
			t.Fatal(err)
		}
		styles[style] = true
	}
	if len(styles) < 3 {
		t.Fatalf("status colors not distinct: %v", styles)
	}
	sheet.row = adminReportMaxRows + 1
	if err := sheet.append("overflow", "Pending"); err != ErrAdminReportTooLarge {
		t.Fatalf("overflow error = %v", err)
	}
}

func TestAdminReportCurrencyAndRefundSemantics(t *testing.T) {
	for _, status := range []string{"pending", "failed"} {
		gross, net, paid := paymentRevenueValues(status, 99)
		if paid || gross != nil || net != nil {
			t.Fatalf("%s counted as revenue", status)
		}
	}
	if gross, net, paid := paymentRevenueValues("refunded", 49); !paid || gross != float64(49) || net != nil {
		t.Fatalf("refund values = %v, %v, %v", gross, net, paid)
	}
	totals := adminReportTotals{
		gross:    map[string]float64{"THB": 149, "USD": 10},
		refunded: map[string]bool{"THB": true},
	}
	keys := sortedCurrencies(totals.gross)
	if len(keys) != 2 || keys[0] != "THB" || keys[1] != "USD" {
		t.Fatalf("currencies not separate: %v", keys)
	}
	if _, net := adminCurrencySummary(totals, "THB"); net != nil {
		t.Fatalf("net revenue must be unknown without refund amount, got %v", net)
	}
	if gross, net := adminCurrencySummary(totals, "USD"); gross != 10 || net != float64(10) {
		t.Fatalf("unrefunded USD revenue = gross %v, net %v", gross, net)
	}
}

func TestAdminReportFormulaInjection(t *testing.T) {
	for _, input := range []string{"=1+1", " +SUM(A1:A2)", "@cmd"} {
		if got := adminCellText(input); got == "" || got[0] != '\'' {
			t.Fatalf("unsafe cell %q -> %q", input, got)
		}
	}
}

func TestAdminReportStatusTranslation(t *testing.T) {
	for _, tc := range []struct{ status, reason, want string }{
		{"Recorded", "", "บันทึกแล้ว"},
		{"verified", "", "สำเร็จ"},
		{"failed", "DUPLICATE_SLIP", "สลิปซ้ำ"},
		{"Not recorded", "", "ไม่มีข้อมูล"},
	} {
		if got := adminStatus(tc.status, tc.reason); got != tc.want {
			t.Errorf("adminStatus(%q, %q) = %q, want %q", tc.status, tc.reason, got, tc.want)
		}
	}
}
