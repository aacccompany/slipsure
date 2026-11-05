package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"slipsure-backend/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

const reportRowLimit = 25000

const (
	reportSummarySheet  = "01_สรุปผล"
	reportSlipsSheet    = "02_รายการสลิป"
	reportCreditsSheet  = "03_การใช้เครดิต"
	reportPaymentsSheet = "04_การชำระเงิน"
)

type MerchantReportHandler struct {
	db           *sql.DB
	merchantRepo repositories.MerchantRepository
}

func NewMerchantReportHandler(db *sql.DB, merchantRepo repositories.MerchantRepository) *MerchantReportHandler {
	return &MerchantReportHandler{db: db, merchantRepo: merchantRepo}
}

type reportRange struct {
	start, end *time.Time
	label      string
}

func parseReportRange(startRaw, endRaw string, loc *time.Location) (reportRange, error) {
	var result reportRange
	if startRaw == "" && endRaw == "" {
		result.label = "ทั้งหมด"
		return result, nil
	}
	if startRaw == "" || endRaw == "" {
		return result, errors.New("start_date and end_date are both required")
	}
	start, err := time.ParseInLocation("2006-01-02", startRaw, loc)
	if err != nil {
		return result, errors.New("invalid start_date")
	}
	end, err := time.ParseInLocation("2006-01-02", endRaw, loc)
	if err != nil {
		return result, errors.New("invalid end_date")
	}
	if end.Before(start) {
		return result, errors.New("end_date must be on or after start_date")
	}
	endExclusive := end.AddDate(0, 0, 1)
	result.start, result.end = &start, &endExclusive
	result.label = startRaw + " ถึง " + endRaw
	return result, nil
}

func rangeArgs(r reportRange) (interface{}, interface{}) {
	var start, end interface{}
	if r.start != nil {
		start = *r.start
		end = *r.end
	}
	return start, end
}

func safeCell(value string) string {
	value = strings.TrimSpace(value)
	if value != "" && strings.ContainsRune("=+-@\t\r\n", rune(value[0])) {
		return "'" + value
	}
	return value
}

func reportDate(value sql.NullTime, loc *time.Location) string {
	if !value.Valid {
		return ""
	}
	return value.Time.In(loc).Format("2006-01-02 15:04:05")
}

func slipStatusTH(status, reason string) string {
	if reason == "DUPLICATE_SLIP" {
		return "สลิปซ้ำ"
	}
	switch status {
	case "verified":
		return "สำเร็จ"
	case "failed":
		return "ไม่สำเร็จ"
	case "pending":
		return "รอดำเนินการ"
	case "processing":
		return "กำลังตรวจสอบ"
	default:
		return "ไม่มีข้อมูล"
	}
}

func paymentStatusTH(status string) string {
	switch status {
	case "success":
		return "ชำระแล้ว"
	case "pending":
		return "รอชำระเงิน"
	case "failed":
		return "ชำระไม่สำเร็จ"
	case "refunded":
		return "คืนเงินแล้ว"
	default:
		return "ไม่มีข้อมูล"
	}
}

type reportSlip struct {
	slipID, transactionID, status, reason, sender, senderBank, receiver, receiverBank, reference string
	created, transfer                                                                            sql.NullTime
	amount                                                                                       sql.NullFloat64
	credits                                                                                      sql.NullInt64
}

func (h *MerchantReportHandler) Export(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Merchant not found"})
		return
	}
	loc := time.FixedZone("Asia/Bangkok", 7*60*60)
	period, err := parseReportRange(c.Query("start_date"), c.Query("end_date"), loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	reportType := c.DefaultQuery("type", "full")
	if reportType != "full" && reportType != "slips" && reportType != "summary" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}
	data, err := h.buildReport(merchantID, period, reportType, loc)
	if err != nil {
		if errors.Is(err, errReportTooLarge) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Report exceeds 25,000 rows; choose a shorter date range"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		}
		return
	}
	date := time.Now().In(loc).Format("2006-01-02")
	filename := "FlowSlip_รายงานร้านค้า_" + date + ".xlsx"
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="FlowSlip_Report_%s.xlsx"; filename*=UTF-8''%s`, date, url.PathEscape(filename)))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data)
}

var errReportTooLarge = errors.New("report too large")

func (h *MerchantReportHandler) buildReport(merchantID uuid.UUID, period reportRange, reportType string, loc *time.Location) ([]byte, error) {
	start, end := rangeArgs(period)
	var shopName string
	if err := h.db.QueryRow(`SELECT shop_name FROM merchants WHERE id = $1`, merchantID).Scan(&shopName); err != nil {
		return nil, err
	}
	slips, err := h.reportSlips(merchantID, start, end)
	if err != nil {
		return nil, err
	}
	f := excelize.NewFile()
	defer f.Close()
	if err := f.SetSheetName("Sheet1", reportSummarySheet); err != nil {
		return nil, err
	}
	for _, name := range []string{reportSummarySheet, reportSlipsSheet, reportCreditsSheet, reportPaymentsSheet} {
		if name != reportSummarySheet && (reportType == "full" || (reportType == "slips" && name == reportSlipsSheet)) {
			if _, err := f.NewSheet(name); err != nil {
				return nil, err
			}
		}
	}
	if err := h.writeSummary(f, shopName, merchantID, period, slips, start, end, loc); err != nil {
		return nil, err
	}
	if reportType != "summary" {
		if err := writeSlips(f, slips, loc); err != nil {
			return nil, err
		}
	}
	if reportType == "full" {
		if err := h.writeCreditUsage(f, merchantID, start, end, loc); err != nil {
			return nil, err
		}
		if err := h.writePayments(f, merchantID, start, end, loc); err != nil {
			return nil, err
		}
	}
	f.SetActiveSheet(0)
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (h *MerchantReportHandler) reportSlips(merchantID uuid.UUID, start, end interface{}) ([]reportSlip, error) {
	rows, err := h.db.Query(`
		SELECT s.id::text, COALESCE(t.id::text, ''), s.status::text, COALESCE(s.fail_reason::text, t.fail_reason, ''),
			COALESCE(t.sender_name, ''), COALESCE(t.sender_bank, ''), COALESCE(t.receiver_name, ''),
			COALESCE(t.receiver_bank, ''), COALESCE(t.reference_no, ''), s.created_at, t.transfer_at, t.amount,
			(SELECT SUM(e.credits_used)::bigint FROM credit_usage_events e WHERE e.verification_id = s.id)
		FROM slips s LEFT JOIN transactions t ON t.slip_id = s.id
		WHERE s.merchant_id = $1 AND ($2::timestamptz IS NULL OR s.created_at >= $2)
			AND ($3::timestamptz IS NULL OR s.created_at < $3)
		ORDER BY s.created_at DESC, s.id DESC LIMIT $4`, merchantID, start, end, reportRowLimit+1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []reportSlip
	for rows.Next() {
		var v reportSlip
		if err := rows.Scan(&v.slipID, &v.transactionID, &v.status, &v.reason, &v.sender, &v.senderBank,
			&v.receiver, &v.receiverBank, &v.reference, &v.created, &v.transfer, &v.amount, &v.credits); err != nil {
			return nil, err
		}
		result = append(result, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(result) > reportRowLimit {
		return nil, errReportTooLarge
	}
	return result, nil
}

func reportTable(f *excelize.File, sheet string, headers []string) {
	style, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "FFFFFF"}, Fill: excelize.Fill{Type: "pattern", Color: []string{"12325D"}, Pattern: 1}})
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}
	last, _ := excelize.CoordinatesToCellName(len(headers), 1)
	f.SetCellStyle(sheet, "A1", last, style)
	f.SetColWidth(sheet, "A", strings.TrimRight(last, "0123456789"), 23)
	f.SetRowHeight(sheet, 1, 27)
}

func reportRow(f *excelize.File, sheet string, row int, values ...interface{}) {
	for col, value := range values {
		if text, ok := value.(string); ok {
			value = safeCell(text)
		}
		cell, _ := excelize.CoordinatesToCellName(col+1, row)
		f.SetCellValue(sheet, cell, value)
	}
}

func finishReportTable(f *excelize.File, sheet, lastColumn string, rows int) error {
	if err := f.AutoFilter(sheet, fmt.Sprintf("A1:%s%d", lastColumn, max(2, rows+1)), []excelize.AutoFilterOptions{}); err != nil {
		return err
	}
	return f.SetPanes(sheet, &excelize.Panes{
		Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft",
	})
}

func writeSlips(f *excelize.File, slips []reportSlip, loc *time.Location) error {
	const sheet = reportSlipsSheet
	reportTable(f, sheet, []string{"รหัสธุรกรรม", "รหัสสลิป", "วันที่ตรวจสอบ (เวลาไทย)", "วันที่โอนเงิน", "จำนวนเงิน (บาท)", "ชื่อผู้โอน", "ธนาคารผู้โอน", "ชื่อผู้รับ", "ธนาคารผู้รับ", "เลขอ้างอิงธนาคาร", "สถานะ", "รหัสข้อผิดพลาด", "เครดิตที่ใช้", "LINE Bot"})
	for i, s := range slips {
		var amount, credits interface{}
		if s.amount.Valid {
			amount = s.amount.Float64
		}
		if s.credits.Valid {
			credits = s.credits.Int64
		}
		reportRow(f, sheet, i+2, s.transactionID, s.slipID, reportDate(s.created, loc), reportDate(s.transfer, loc), amount,
			s.sender, s.senderBank, s.receiver, s.receiverBank, s.reference, slipStatusTH(s.status, s.reason), s.reason, credits, "ไม่มีข้อมูล")
	}
	f.SetColWidth(sheet, "A", "B", 37)
	f.SetColWidth(sheet, "C", "D", 28)
	return finishReportTable(f, sheet, "N", len(slips))
}

func (h *MerchantReportHandler) writeSummary(f *excelize.File, shopName string, merchantID uuid.UUID, period reportRange, slips []reportSlip, start, end interface{}, loc *time.Location) error {
	const sheet = reportSummarySheet
	f.SetColWidth(sheet, "A", "A", 33)
	f.SetColWidth(sheet, "B", "B", 39)
	f.SetColWidth(sheet, "C", "D", 12)
	f.MergeCell(sheet, "A1", "D2")
	f.SetCellValue(sheet, "A1", "FlowSlip รายงานการตรวจสอบสลิป")
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 18, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"12325D"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	sectionStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "12325D"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"E9F2FA"}, Pattern: 1},
	})
	f.SetCellStyle(sheet, "A1", "D2", titleStyle)
	f.SetRowHeight(sheet, 1, 30)
	f.SetRowHeight(sheet, 2, 15)
	f.SetCellValue(sheet, "A3", "ร้านค้า")
	f.SetCellValue(sheet, "B3", safeCell(shopName))
	f.SetCellValue(sheet, "A4", "ช่วงเวลารายงาน")
	f.SetCellValue(sheet, "B4", period.label)
	f.SetCellValue(sheet, "A5", "วันที่สร้างรายงาน")
	f.SetCellValue(sheet, "B5", time.Now().In(loc).Format("2006-01-02 15:04:05"))
	f.SetCellValue(sheet, "A6", "เขตเวลา")
	f.SetCellValue(sheet, "B6", "เวลาไทย (UTC+07:00)")
	for _, row := range []int{7, 14, 19, 25} {
		f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row), sectionStyle)
		f.SetRowHeight(sheet, row, 24)
	}
	f.SetCellValue(sheet, "A7", "สรุปผลการตรวจสอบ (ตามช่วงเวลาที่เลือก)")
	f.SetCellValue(sheet, "A14", "โควต้าปัจจุบัน (ณ เวลาสร้างรายงาน)")
	f.SetCellValue(sheet, "A19", "การใช้งานและการชำระเงิน (ตามช่วงเวลาที่เลือก)")
	f.SetCellValue(sheet, "A25", "หมายเหตุข้อมูล")
	success, failed, duplicate := 0, 0, 0
	for _, s := range slips {
		switch {
		case s.reason == "DUPLICATE_SLIP":
			duplicate++
		case s.status == "verified":
			success++
		case s.status == "failed":
			failed++
		}
	}
	var successRate float64
	if completed := success + failed + duplicate; completed > 0 {
		successRate = float64(success) * 100 / float64(completed)
	}
	for i, pair := range [][2]interface{}{{"สลิปทั้งหมด", len(slips)}, {"สำเร็จ", success}, {"ไม่สำเร็จ", failed}, {"สลิปซ้ำ", duplicate}, {"อัตราความสำเร็จ", fmt.Sprintf("%.2f%%", successRate)}} {
		reportRow(f, sheet, i+8, pair[0], pair[1])
	}
	if quota, err := h.merchantRepo.GetQuotaStatus(merchantID); err == nil && quota != nil {
		reportRow(f, sheet, 15, "โควต้าทั้งหมด", quota.QuotaLimit)
		reportRow(f, sheet, 16, "โควต้าที่ใช้แล้ว", quota.Used)
		reportRow(f, sheet, 17, "โควต้าคงเหลือ", quota.Remaining)
		reportRow(f, sheet, 18, "รีเซ็ตครั้งถัดไป (เวลาไทย)", quota.ResetDate.In(loc).Format("2006-01-02 15:04:05"))
	}
	var botCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM line_webhook_configs WHERE merchant_id = $1`, merchantID).Scan(&botCount); err != nil {
		return err
	}
	reportRow(f, sheet, 20, "LINE Bot ที่เชื่อมต่ออยู่", botCount)
	var credits int
	if err := h.db.QueryRow(`SELECT COALESCE(SUM(credits_used), 0)::int FROM credit_usage_events
		WHERE merchant_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2)
		AND ($3::timestamptz IS NULL OR created_at < $3)`, merchantID, start, end).Scan(&credits); err != nil {
		return err
	}
	reportRow(f, sheet, 21, "เครดิตที่บันทึกว่าใช้ในช่วงเวลา", credits)
	var payments float64
	if err := h.db.QueryRow(`SELECT COALESCE(SUM(amount), 0)::float8 FROM payment_logs
		WHERE merchant_id = $1 AND status::text = 'success' AND currency = 'THB'
		AND ($2::timestamptz IS NULL OR COALESCE(paid_at, created_at) >= $2)
		AND ($3::timestamptz IS NULL OR COALESCE(paid_at, created_at) < $3)`, merchantID, start, end).Scan(&payments); err != nil {
		return err
	}
	reportRow(f, sheet, 22, "ยอดชำระสำเร็จในช่วงเวลา (บาท)", payments)
	for i, note := range []string{
		"โควต้าเป็นยอดปัจจุบัน ไม่ใช่ยอดย้อนหลังตามช่วงเวลาที่เลือก",
		"ข้อมูลการใช้เครดิตก่อนเริ่มบันทึกประวัติไม่สามารถแสดงย้อนหลังได้",
		"ระบบไม่ได้บันทึก LINE Bot ของแต่ละสลิปหรือรายการต้นฉบับของสลิปซ้ำ",
		"ระบบไม่ได้บันทึกวิธีชำระเงินหรือชื่อแพ็กเกจเดิมที่ไม่ผูกกับเครดิต",
	} {
		row := i + 26
		f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("D%d", row))
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), note)
	}
	return nil
}

func (h *MerchantReportHandler) writeCreditUsage(f *excelize.File, merchantID uuid.UUID, start, end interface{}, loc *time.Location) error {
	const sheet = reportCreditsSheet
	reportTable(f, sheet, []string{"วันที่ (เวลาไทย)", "รหัสธุรกรรม", "ประเภทเครดิต", "เครดิตที่ใช้", "รายละเอียด", "เครดิตคงเหลือในแพ็กเกจ", "สถานะการตรวจสอบ", "รหัสสลิป"})
	rows, err := h.db.Query(`SELECT e.created_at, COALESCE(t.id::text, ''), COALESCE(p.name, 'Legacy quota'),
		e.credits_used, e.lot_balance_after, COALESCE(s.status::text, 'not recorded'), e.verification_id::text
		FROM credit_usage_events e LEFT JOIN credit_lots l ON l.id = e.credit_lot_id
		LEFT JOIN subscription_plans p ON p.id = l.plan_id
		LEFT JOIN slips s ON s.id = e.verification_id AND s.merchant_id = e.merchant_id
		LEFT JOIN transactions t ON t.slip_id = s.id
		WHERE e.merchant_id = $1 AND ($2::timestamptz IS NULL OR e.created_at >= $2)
		AND ($3::timestamptz IS NULL OR e.created_at < $3)
		ORDER BY e.created_at DESC, e.id DESC LIMIT $4`, merchantID, start, end, reportRowLimit+1)
	if err != nil {
		return err
	}
	defer rows.Close()
	i := 0
	for rows.Next() {
		i++
		if i > reportRowLimit {
			return errReportTooLarge
		}
		var created time.Time
		var transactionID, plan, status, slipID string
		var used int
		var balance sql.NullInt64
		if err := rows.Scan(&created, &transactionID, &plan, &used, &balance, &status, &slipID); err != nil {
			return err
		}
		var remaining interface{}
		if balance.Valid {
			remaining = balance.Int64
		}
		if plan == "Legacy quota" {
			plan = "โควต้าระบบเดิม"
		}
		reportRow(f, sheet, i+1, created.In(loc).Format("2006-01-02 15:04:05"), transactionID,
			plan, used, "หักเครดิตตามลำดับแพ็กเกจ", remaining, slipStatusTH(status, ""), slipID)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return finishReportTable(f, sheet, "H", i)
}

func (h *MerchantReportHandler) writePayments(f *excelize.File, merchantID uuid.UUID, start, end interface{}, loc *time.Location) error {
	const sheet = reportPaymentsSheet
	reportTable(f, sheet, []string{"รหัสคำสั่งซื้อ", "วันที่ชำระเงิน (เวลาไทย)", "ชื่อแพ็กเกจ", "จำนวนเงิน", "สกุลเงิน", "วิธีชำระเงิน", "สถานะการชำระเงิน", "เลขอ้างอิงการชำระเงิน", "ผู้ให้บริการชำระเงิน"})
	rows, err := h.db.Query(`SELECT p.id::text, COALESCE(p.paid_at, p.created_at), COALESCE(lot_plan.name, ''),
		p.amount::float8, COALESCE(p.currency, ''), COALESCE(p.gateway::text, ''),
		COALESCE(p.status::text, ''), COALESCE(p.gateway_reference_id, '')
		FROM payment_logs p LEFT JOIN LATERAL (
			SELECT sp.name FROM credit_lots l JOIN subscription_plans sp ON sp.id = l.plan_id
			WHERE l.payment_log_id = p.id ORDER BY l.created_at ASC LIMIT 1
		) lot_plan ON TRUE
		WHERE p.merchant_id = $1 AND ($2::timestamptz IS NULL OR COALESCE(p.paid_at, p.created_at) >= $2)
		AND ($3::timestamptz IS NULL OR COALESCE(p.paid_at, p.created_at) < $3)
		ORDER BY COALESCE(p.paid_at, p.created_at) DESC, p.id DESC LIMIT $4`, merchantID, start, end, reportRowLimit+1)
	if err != nil {
		return err
	}
	defer rows.Close()
	i := 0
	for rows.Next() {
		i++
		if i > reportRowLimit {
			return errReportTooLarge
		}
		var id, plan, currency, gateway, status, reference string
		var when time.Time
		var amount float64
		if err := rows.Scan(&id, &when, &plan, &amount, &currency, &gateway, &status, &reference); err != nil {
			return err
		}
		if plan == "" {
			plan = "ไม่มีข้อมูล"
		}
		reportRow(f, sheet, i+1, id, when.In(loc).Format("2006-01-02 15:04:05"), plan, amount, currency, "ไม่มีข้อมูล", paymentStatusTH(status), reference, gateway)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return finishReportTable(f, sheet, "I", i)
}
