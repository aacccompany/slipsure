package handlers

import (
	"archive/zip"
	"bytes"
	"database/sql"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/xuri/excelize/v2"
)

func TestParseReportRangeBangkok(t *testing.T) {
	loc, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		t.Fatal(err)
	}
	period, err := parseReportRange("2024-07-01", "2024-07-31", loc)
	if err != nil {
		t.Fatal(err)
	}
	if got := period.start.UTC().Format(time.RFC3339); got != "2024-06-30T17:00:00Z" {
		t.Fatalf("start UTC = %s", got)
	}
	if got := period.end.UTC().Format(time.RFC3339); got != "2024-07-31T17:00:00Z" {
		t.Fatalf("end exclusive UTC = %s", got)
	}
	if period.label != "2024-07-01 ถึง 2024-07-31" {
		t.Fatalf("range label = %q", period.label)
	}
	if all, err := parseReportRange("", "", loc); err != nil || all.label != "ทั้งหมด" {
		t.Fatalf("all-time label = %q, error = %v", all.label, err)
	}
	for _, dates := range [][2]string{{"2024-07-01", ""}, {"2024-07-31", "2024-07-01"}, {"2024-02-30", "2024-03-01"}} {
		if _, err := parseReportRange(dates[0], dates[1], loc); err == nil {
			t.Fatalf("expected invalid range for %v", dates)
		}
	}
}

func TestWriteSlipsDoesNotInventHistoricalCredits(t *testing.T) {
	f := excelize.NewFile()
	defer f.Close()
	if _, err := f.NewSheet(reportSlipsSheet); err != nil {
		t.Fatal(err)
	}
	if err := writeSlips(f, []reportSlip{
		{slipID: "old-slip", status: "failed", reason: "DUPLICATE_SLIP", sender: "=SUM(1,2)"},
		{slipID: "new-slip", status: "verified", credits: sql.NullInt64{Int64: 1, Valid: true}},
	}, time.UTC); err != nil {
		t.Fatal(err)
	}
	if got, _ := f.GetCellValue(reportSlipsSheet, "A1"); got != "รหัสธุรกรรม" {
		t.Fatalf("transaction header = %q", got)
	}
	if got, _ := f.GetCellValue(reportSlipsSheet, "K2"); got != "สลิปซ้ำ" {
		t.Fatalf("duplicate status = %q", got)
	}
	if got, _ := f.GetCellValue(reportSlipsSheet, "M2"); got != "" {
		t.Fatalf("historical credit should be blank, got %q", got)
	}
	if got, _ := f.GetCellValue(reportSlipsSheet, "M3"); got != "1" {
		t.Fatalf("recorded credit = %q", got)
	}
	if got, _ := f.GetCellValue(reportSlipsSheet, "F2"); got != "'=SUM(1,2)" {
		t.Fatalf("unsafe sender name = %q", got)
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}
	archive, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range archive.File {
		if file.Name != "xl/worksheets/sheet2.xml" {
			continue
		}
		reader, err := file.Open()
		if err != nil {
			t.Fatal(err)
		}
		contents, err := io.ReadAll(reader)
		reader.Close()
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(contents), `autoFilter ref="$A$1:$N$3"`) {
			t.Fatal("transactions sheet has no filterable range")
		}
		return
	}
	t.Fatal("transactions worksheet missing from workbook")
}
