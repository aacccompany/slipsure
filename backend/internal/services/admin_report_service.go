package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/xuri/excelize/v2"
)

var ErrAdminReportTooLarge = errors.New("report exceeds Excel worksheet capacity")

const adminReportMaxRows = 1048575

const (
	adminSummarySheet    = "01_สรุปแพลตฟอร์ม"
	adminWorkspacesSheet = "02_ร้านค้า"
	adminSlipsSheet      = "03_การตรวจสลิป"
	adminCreditsSheet    = "04_การใช้เครดิต"
	adminOrdersSheet     = "05_แพ็กเกจ"
	adminPaymentsSheet   = "06_รายรับและการชำระ"
)

type AdminReportPeriod struct {
	Start, End *time.Time
	Label      string
	Location   *time.Location
}

type AdminReportService struct{ db *sql.DB }

func NewAdminReportService(db *sql.DB) *AdminReportService { return &AdminReportService{db: db} }

type adminReportTotals struct {
	workspaces, active, users, slips, successful, failed, duplicate, pending, credits int
	paymentRecords, paidPayments                                                      int
	gross                                                                             map[string]float64
	refunded                                                                          map[string]bool
}

func periodParams(p AdminReportPeriod) (interface{}, interface{}) {
	if p.Start == nil {
		return nil, nil
	}
	return *p.Start, *p.End
}

func adminCellText(value string) string {
	value = strings.TrimSpace(value)
	if value != "" && strings.ContainsAny(value[:1], "=+-@\t\r\n") {
		return "'" + value
	}
	return value
}

func adminDate(value sql.NullTime, loc *time.Location) string {
	if !value.Valid {
		return ""
	}
	return value.Time.In(loc).Format("2006-01-02 15:04:05")
}

func adminStatus(status, reason string) string {
	if reason == "DUPLICATE_SLIP" {
		return "สลิปซ้ำ"
	}
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "verified", "success":
		return "สำเร็จ"
	case "failed":
		return "ไม่สำเร็จ"
	case "pending":
		return "รอดำเนินการ"
	case "processing":
		return "กำลังตรวจสอบ"
	case "refunded":
		return "คืนเงินแล้ว"
	case "active":
		return "ใช้งาน"
	case "suspended":
		return "ระงับ"
	case "cancelled":
		return "ยกเลิก"
	case "expired":
		return "หมดอายุ"
	case "trial":
		return "ทดลองใช้"
	case "recorded":
		return "บันทึกแล้ว"
	case "not recorded":
		return "ไม่มีข้อมูล"
	default:
		return status
	}
}

type adminSheet struct {
	f            *excelize.File
	name         string
	lastCol      string
	row          int
	widths       []int
	statusCols   map[int]bool
	moneyCols    []int
	statusStyles map[string]int
	wrapStyle    int
}

func newAdminSheet(f *excelize.File, name string, headers []string) (*adminSheet, error) {
	if _, err := f.NewSheet(name); err != nil {
		return nil, err
	}
	s := &adminSheet{f: f, name: name, row: 1, widths: make([]int, len(headers)), statusCols: make(map[int]bool), statusStyles: make(map[string]int)}
	s.lastCol, _ = excelize.ColumnNumberToName(len(headers))
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		if err := f.SetCellValue(name, cell, header); err != nil {
			return nil, err
		}
		s.widths[i] = utf8.RuneCountInString(header) + 2
		if header == "สถานะ" || header == "สถานะร้านค้า" || header == "สถานะการตรวจสอบ" || header == "สถานะการชำระเงิน" || header == "สถานะแพ็กเกจ" || header == "สถานะคำสั่งซื้อ" {
			s.statusCols[i] = true
		}
		if header == "จำนวนเงิน" || header == "ยอดเงินที่ขอชำระ" || header == "ยอดรับก่อนหักคืน" || header == "ยอดคืนเงิน" || header == "ยอดสุทธิ" {
			s.moneyCols = append(s.moneyCols, i)
		}
	}
	noGrid := false
	if err := f.SetSheetView(name, 0, &excelize.ViewOptions{ShowGridLines: &noGrid}); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *adminSheet) append(values ...interface{}) error {
	if s.row > adminReportMaxRows {
		return ErrAdminReportTooLarge
	}
	s.row++
	for col, value := range values {
		wrap := false
		if text, ok := value.(string); ok {
			value = adminCellText(text)
			width := utf8.RuneCountInString(text) + 2
			wrap = width > 40
			if width > s.widths[col] {
				s.widths[col] = width
			}
		}
		cell, _ := excelize.CoordinatesToCellName(col+1, s.row)
		if err := s.f.SetCellValue(s.name, cell, value); err != nil {
			return err
		}
		if wrap {
			if s.wrapStyle == 0 {
				style, err := s.f.NewStyle(&excelize.Style{Font: &excelize.Font{Family: "Aptos"}, Alignment: &excelize.Alignment{WrapText: true}})
				if err != nil {
					return err
				}
				s.wrapStyle = style
			}
			if err := s.f.SetCellStyle(s.name, cell, cell, s.wrapStyle); err != nil {
				return err
			}
			if err := s.f.SetRowHeight(s.name, s.row, 30); err != nil {
				return err
			}
		}
		if s.statusCols[col] {
			if status, ok := value.(string); ok && status != "" {
				style, err := s.styleForStatus(status)
				if err != nil {
					return err
				}
				if style != 0 {
					if err := s.f.SetCellStyle(s.name, cell, cell, style); err != nil {
						return err
					}
				}
			}
		}
	}
	return nil
}

func (s *adminSheet) styleForStatus(status string) (int, error) {
	color := ""
	switch strings.ToLower(status) {
	case "สำเร็จ", "ใช้งาน", "บันทึกแล้ว":
		color = "047857"
	case "ไม่สำเร็จ", "ระงับ", "ยกเลิก", "หมดอายุ":
		color = "B91C1C"
	case "สลิปซ้ำ", "รอดำเนินการ", "กำลังตรวจสอบ", "คืนเงินแล้ว", "ทดลองใช้":
		color = "B45309"
	}
	if color == "" {
		return 0, nil
	}
	if style := s.statusStyles[color]; style != 0 {
		return style, nil
	}
	style, err := s.f.NewStyle(&excelize.Style{Font: &excelize.Font{Family: "Aptos", Bold: true, Color: color}})
	if err == nil {
		s.statusStyles[color] = style
	}
	return style, err
}

func (s *adminSheet) finish() error {
	for i, width := range s.widths {
		column, _ := excelize.ColumnNumberToName(i + 1)
		if width < 15 {
			width = 15
		}
		if width > 40 {
			width = 40
		}
		if err := s.f.SetColWidth(s.name, column, column, float64(width)); err != nil {
			return err
		}
	}
	last := s.row
	if last == 1 {
		last = 2
	}
	if err := s.f.AddTable(s.name, &excelize.Table{
		Range:     fmt.Sprintf("A1:%s%d", s.lastCol, last),
		Name:      "Admin" + s.name[:2] + "Table",
		StyleName: "TableStyleMedium2",
	}); err != nil {
		return err
	}
	if len(s.moneyCols) > 0 {
		money, err := s.f.NewStyle(&excelize.Style{NumFmt: 2, Font: &excelize.Font{Family: "Aptos"}})
		if err != nil {
			return err
		}
		for _, col := range s.moneyCols {
			column, _ := excelize.ColumnNumberToName(col + 1)
			if err := s.f.SetCellStyle(s.name, fmt.Sprintf("%s2", column), fmt.Sprintf("%s%d", column, last), money); err != nil {
				return err
			}
		}
	}
	return s.f.SetPanes(s.name, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"})
}

func (s *AdminReportService) Build(ctx context.Context, period AdminReportPeriod) ([]byte, error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	f := excelize.NewFile()
	defer f.Close()
	if err := f.SetSheetName("Sheet1", adminSummarySheet); err != nil {
		return nil, err
	}
	noGrid := false
	if err := f.SetSheetView(adminSummarySheet, 0, &excelize.ViewOptions{ShowGridLines: &noGrid}); err != nil {
		return nil, err
	}
	totals := adminReportTotals{gross: make(map[string]float64), refunded: make(map[string]bool)}
	if err := s.writeWorkspaces(ctx, tx, f, period, &totals); err != nil {
		return nil, err
	}
	if err := s.writeSlips(ctx, tx, f, period, &totals); err != nil {
		return nil, err
	}
	if err := s.writeCredits(ctx, tx, f, period, &totals); err != nil {
		return nil, err
	}
	if err := s.writePayments(ctx, tx, f, period, &totals); err != nil {
		return nil, err
	}
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*)::int FROM users`).Scan(&totals.users); err != nil {
		return nil, err
	}
	if err := writeAdminSummary(f, period, totals); err != nil {
		return nil, err
	}
	f.SetActiveSheet(0)
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func sortedCurrencies(gross map[string]float64) []string {
	keys := make([]string, 0, len(gross))
	for currency := range gross {
		keys = append(keys, currency)
	}
	sort.Strings(keys)
	return keys
}
