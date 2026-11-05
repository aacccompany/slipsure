package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"
)

func (s *AdminReportService) writeWorkspaces(ctx context.Context, tx *sql.Tx, f *excelize.File, period AdminReportPeriod, totals *adminReportTotals) error {
	table, err := newAdminSheet(f, adminWorkspacesSheet, []string{
		"รหัสร้านค้า", "ชื่อร้านค้า", "ชื่อเจ้าของ", "วันที่สมัคร", "แพ็กเกจ", "สถานะแพ็กเกจ",
		"สถานะร้านค้า", "ตรวจสอบทั้งหมด", "ตรวจสอบสำเร็จ", "เครดิตที่ใช้", "เครดิตคงเหลือ", "กิจกรรมล่าสุด",
	})
	if err != nil {
		return err
	}
	start, end := periodParams(period)
	rows, err := tx.QueryContext(ctx, `SELECT m.id::text, m.shop_name, COALESCE(u.name, ''), m.created_at,
		COALESCE(sp.name, ''), COALESCE(s.status::text, ''), m.is_active,
		COALESCE(sc.total, 0)::int, COALESCE(sc.success, 0)::int, COALESCE(ec.used, 0)::int,
		q.remaining, last_scan.last_at
		FROM merchants m JOIN users u ON u.id = m.owner_id
		LEFT JOIN subscriptions s ON s.merchant_id = m.id
		LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'verified') AS success
			FROM slips sl WHERE sl.merchant_id = m.id
			AND ($1::timestamptz IS NULL OR sl.created_at >= $1)
			AND ($2::timestamptz IS NULL OR sl.created_at < $2)
		) sc ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(credits_used) AS used FROM credit_usage_events e WHERE e.merchant_id = m.id
			AND ($1::timestamptz IS NULL OR e.created_at >= $1)
			AND ($2::timestamptz IS NULL OR e.created_at < $2)
		) ec ON TRUE
		LEFT JOIN LATERAL (
			SELECT SUM(credits_remaining) AS remaining FROM credit_lots l
			WHERE l.merchant_id = m.id AND l.expires_at > CURRENT_TIMESTAMP
		) q ON TRUE
		LEFT JOIN LATERAL (SELECT MAX(created_at) AS last_at FROM slips WHERE merchant_id = m.id) last_scan ON TRUE
		ORDER BY m.created_at, m.id`, start, end)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, name, owner, plan, subscription string
		var registered, last sql.NullTime
		var active bool
		var verifications, success, credits int
		var remaining sql.NullInt64
		if err := rows.Scan(&id, &name, &owner, &registered, &plan, &subscription, &active,
			&verifications, &success, &credits, &remaining, &last); err != nil {
			return err
		}
		var quota interface{}
		if remaining.Valid {
			quota = remaining.Int64
		}
		status := "ระงับ"
		if active {
			status = "ใช้งาน"
			totals.active++
		}
		if err := table.append(id, name, owner, adminDate(registered, period.Location), plan, adminStatus(subscription, ""),
			status, verifications, success, credits, quota, adminDate(last, period.Location)); err != nil {
			return err
		}
		totals.workspaces++
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return table.finish()
}

func (s *AdminReportService) writeSlips(ctx context.Context, tx *sql.Tx, f *excelize.File, period AdminReportPeriod, totals *adminReportTotals) error {
	table, err := newAdminSheet(f, adminSlipsSheet, []string{
		"รหัสธุรกรรม", "รหัสร้านค้า", "ชื่อร้านค้า", "วันที่ตรวจสอบ", "วันที่โอน", "จำนวนเงิน", "สกุลเงิน",
		"ชื่อผู้โอน", "ธนาคารผู้โอน", "ชื่อผู้รับ", "ธนาคารผู้รับ", "เลขอ้างอิงธนาคาร", "สถานะการตรวจสอบ",
		"รหัสข้อผิดพลาด", "ผู้ให้บริการ", "เครดิตที่ใช้", "รหัสสลิป",
	})
	if err != nil {
		return err
	}
	start, end := periodParams(period)
	rows, err := tx.QueryContext(ctx, `SELECT COALESCE(t.id::text, ''), m.id::text, m.shop_name, s.created_at,
		t.transfer_at, t.amount::float8, COALESCE(t.sender_name, ''), COALESCE(t.sender_bank, ''),
		COALESCE(t.receiver_name, ''), COALESCE(t.receiver_bank, ''), COALESCE(t.reference_no, ''),
		s.status::text, COALESCE(s.fail_reason::text, t.fail_reason, ''), COALESCE(t.provider, ''),
		e.credits_used, s.id::text
		FROM slips s JOIN merchants m ON m.id = s.merchant_id
		LEFT JOIN transactions t ON t.slip_id = s.id
		LEFT JOIN credit_usage_events e ON e.verification_id = s.id
		WHERE ($1::timestamptz IS NULL OR s.created_at >= $1)
		AND ($2::timestamptz IS NULL OR s.created_at < $2)
		ORDER BY s.created_at, s.id`, start, end)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var transactionID, workspaceID, name, sender, senderBank, receiver, receiverBank, reference, status, reason, provider, slipID string
		var verifiedAt time.Time
		var transferred sql.NullTime
		var amount sql.NullFloat64
		var credits sql.NullInt64
		if err := rows.Scan(&transactionID, &workspaceID, &name, &verifiedAt, &transferred, &amount,
			&sender, &senderBank, &receiver, &receiverBank, &reference, &status, &reason, &provider, &credits, &slipID); err != nil {
			return err
		}
		var amountValue, creditsValue interface{}
		if amount.Valid {
			amountValue = amount.Float64
		}
		if credits.Valid {
			creditsValue = credits.Int64
		}
		shownStatus := adminStatus(status, reason)
		if err := table.append(transactionID, workspaceID, name, verifiedAt.In(period.Location).Format("2006-01-02 15:04:05"),
			adminDate(transferred, period.Location), amountValue, nil, sender, senderBank, receiver, receiverBank,
			reference, shownStatus, reason, provider, creditsValue, slipID); err != nil {
			return err
		}
		totals.slips++
		switch {
		case reason == "DUPLICATE_SLIP":
			totals.duplicate++
		case status == "verified":
			totals.successful++
		case status == "failed":
			totals.failed++
		default:
			totals.pending++
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return table.finish()
}

func (s *AdminReportService) writeCredits(ctx context.Context, tx *sql.Tx, f *excelize.File, period AdminReportPeriod, totals *adminReportTotals) error {
	table, err := newAdminSheet(f, adminCreditsSheet, []string{
		"รหัสรายการเครดิต", "รหัสร้านค้า", "ชื่อร้านค้า", "วันที่ทำรายการ", "รหัสธุรกรรมที่เกี่ยวข้อง", "ประเภทรายการ",
		"เครดิตที่เพิ่ม", "เครดิตที่หัก", "ยอดคงเหลือหลังรายการ", "รหัสคำสั่งซื้อที่เกี่ยวข้อง", "สถานะ", "รายละเอียด", "รหัสบันทึกการชำระเงิน",
	})
	if err != nil {
		return err
	}
	start, end := periodParams(period)
	rows, err := tx.QueryContext(ctx, `SELECT l.id::text, m.id::text, m.shop_name, l.started_at,
		''::text, 'Added'::text, l.credits_total, 0::int, NULL::int, ''::text, 'Recorded'::text,
		COALESCE(sp.name, ''), COALESCE(l.payment_log_id::text, '')
		FROM credit_lots l JOIN merchants m ON m.id = l.merchant_id
		LEFT JOIN subscription_plans sp ON sp.id = l.plan_id
		WHERE ($1::timestamptz IS NULL OR l.started_at >= $1)
		AND ($2::timestamptz IS NULL OR l.started_at < $2)
		UNION ALL
		SELECT e.id::text, m.id::text, m.shop_name, e.created_at,
		COALESCE(t.id::text, ''), 'Deducted', 0, e.credits_used, e.lot_balance_after, ''::text,
		COALESCE(s.status::text, 'Not recorded'), 'FIFO scan credit consumed', COALESCE(l.payment_log_id::text, '')
		FROM credit_usage_events e JOIN merchants m ON m.id = e.merchant_id
		LEFT JOIN credit_lots l ON l.id = e.credit_lot_id
		LEFT JOIN slips s ON s.id = e.verification_id
		LEFT JOIN transactions t ON t.slip_id = s.id
		WHERE ($1::timestamptz IS NULL OR e.created_at >= $1)
		AND ($2::timestamptz IS NULL OR e.created_at < $2)
		ORDER BY 4, 1`, start, end)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, workspaceID, name, transactionID, kind, orderID, status, description, paymentID string
		var when time.Time
		var added, deducted int
		var balance sql.NullInt64
		if err := rows.Scan(&id, &workspaceID, &name, &when, &transactionID, &kind, &added, &deducted,
			&balance, &orderID, &status, &description, &paymentID); err != nil {
			return err
		}
		var balanceValue interface{}
		if balance.Valid {
			balanceValue = balance.Int64
		}
		if kind == "Deducted" {
			totals.credits += deducted
		}
		shownKind := "เพิ่มเครดิต"
		if kind == "Deducted" {
			shownKind = "หักเครดิต"
			description = "ใช้เครดิตตรวจสอบสลิปตามลำดับแพ็กเกจ"
		}
		if err := table.append(id, workspaceID, name, when.In(period.Location).Format("2006-01-02 15:04:05"), transactionID,
			shownKind, added, deducted, balanceValue, orderID, adminStatus(status, ""), description, paymentID); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return table.finish()
}

func (s *AdminReportService) writePayments(ctx context.Context, tx *sql.Tx, f *excelize.File, period AdminReportPeriod, totals *adminReportTotals) error {
	orders, err := newAdminSheet(f, adminOrdersSheet, []string{
		"รหัสคำสั่งซื้อ", "รหัสร้านค้า", "ชื่อร้านค้า", "ชื่อแพ็กเกจ", "เครดิตที่ซื้อ", "ยอดเงินที่ขอชำระ",
		"สกุลเงิน", "วิธีชำระเงิน", "สถานะคำสั่งซื้อ", "สถานะการชำระเงิน", "วันที่สร้าง", "วันที่ชำระ", "รหัสบันทึกการชำระเงิน",
	})
	if err != nil {
		return err
	}
	revenue, err := newAdminSheet(f, adminPaymentsSheet, []string{
		"รหัสการชำระเงิน", "รหัสร้านค้า", "ชื่อร้านค้า", "รหัสคำสั่งซื้อ", "ผู้ให้บริการ", "รหัสอ้างอิงผู้ให้บริการ", "ยอดรับก่อนหักคืน",
		"ยอดคืนเงิน", "ยอดสุทธิ", "สกุลเงิน", "สถานะการชำระเงิน", "วันที่ชำระเงิน",
	})
	if err != nil {
		return err
	}
	start, end := periodParams(period)
	rows, err := tx.QueryContext(ctx, `SELECT p.id::text, m.id::text, m.shop_name, COALESCE(lots.plan, ''),
		lots.credits, p.amount::float8, COALESCE(p.currency, ''), COALESCE(p.gateway::text, ''),
		p.status::text, p.created_at, p.paid_at, COALESCE(p.gateway_reference_id, '')
		FROM payment_logs p JOIN merchants m ON m.id = p.merchant_id
		LEFT JOIN (
			SELECT l.payment_log_id, SUM(l.credits_total)::bigint AS credits,
			STRING_AGG(DISTINCT sp.name, ', ') AS plan
			FROM credit_lots l JOIN subscription_plans sp ON sp.id = l.plan_id
			WHERE l.payment_log_id IS NOT NULL GROUP BY l.payment_log_id
		) lots ON lots.payment_log_id = p.id
		WHERE ($1::timestamptz IS NULL OR COALESCE(p.paid_at, p.created_at) >= $1)
		AND ($2::timestamptz IS NULL OR COALESCE(p.paid_at, p.created_at) < $2)
		ORDER BY COALESCE(p.paid_at, p.created_at), p.id`, start, end)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, workspaceID, name, plan, currency, gateway, status, reference string
		var amount float64
		var credits sql.NullInt64
		var created, paid sql.NullTime
		if err := rows.Scan(&id, &workspaceID, &name, &plan, &credits, &amount, &currency, &gateway,
			&status, &created, &paid, &reference); err != nil {
			return err
		}
		if currency == "" {
			currency = "ไม่มีข้อมูล"
		}
		var purchased interface{}
		if credits.Valid {
			purchased = credits.Int64
		}
		if err := orders.append(nil, workspaceID, name, plan, purchased, amount, currency, nil, nil,
			adminStatus(status, ""), adminDate(created, period.Location), adminDate(paid, period.Location), id); err != nil {
			return err
		}
		var gross, net interface{}
		gross, net, paidRecord := paymentRevenueValues(status, amount)
		if paidRecord {
			totals.gross[currency] += amount
			totals.paidPayments++
			if status == "refunded" {
				totals.refunded[currency] = true
			}
		}
		if err := revenue.append(id, workspaceID, name, nil, gateway, reference, gross, nil, net,
			currency, adminStatus(status, ""), adminDate(paid, period.Location)); err != nil {
			return err
		}
		totals.paymentRecords++
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if err := orders.finish(); err != nil {
		return err
	}
	return revenue.finish()
}

func paymentRevenueValues(status string, amount float64) (gross, net interface{}, paid bool) {
	switch status {
	case "success":
		return amount, amount, true
	case "refunded":
		return amount, nil, true
	default:
		return nil, nil, false
	}
}

func adminCurrencySummary(totals adminReportTotals, currency string) (gross float64, net interface{}) {
	gross = totals.gross[currency]
	if !totals.refunded[currency] {
		net = gross
	}
	return
}

func writeAdminSummary(f *excelize.File, period AdminReportPeriod, totals adminReportTotals) error {
	const sheet = adminSummarySheet
	f.SetColWidth(sheet, "A", "A", 32)
	f.SetColWidth(sheet, "B", "B", 28)
	f.SetColWidth(sheet, "C", "E", 20)
	f.MergeCell(sheet, "A1", "E2")
	f.SetCellValue(sheet, "A1", "รายงานภาพรวมแพลตฟอร์ม FlowSlip")
	title, err := f.NewStyle(&excelize.Style{Font: &excelize.Font{Family: "Aptos", Bold: true, Size: 18, Color: "FFFFFF"}, Fill: excelize.Fill{Type: "pattern", Color: []string{"12325D"}, Pattern: 1}})
	if err != nil {
		return err
	}
	f.SetCellStyle(sheet, "A1", "E2", title)
	f.SetCellValue(sheet, "A3", "ช่วงเวลารายงาน")
	f.SetCellValue(sheet, "B3", period.Label)
	f.SetCellValue(sheet, "A4", "สร้างรายงานเมื่อ")
	f.SetCellValue(sheet, "B4", time.Now().In(period.Location).Format("2006-01-02 15:04:05"))
	f.SetCellValue(sheet, "A5", "เขตเวลา")
	f.SetCellValue(sheet, "B5", "Asia/Bangkok (UTC+07:00)")
	f.SetCellValue(sheet, "A6", "ขอบเขต")
	f.SetCellValue(sheet, "B6", "ร้านค้าทั้งหมด")
	metrics := [][2]interface{}{
		{"ร้านค้าทั้งหมด", totals.workspaces}, {"ร้านค้าที่ใช้งาน", totals.active}, {"ร้านค้าที่ระงับ", totals.workspaces - totals.active},
		{"ผู้ใช้ทั้งหมด", totals.users}, {"ตรวจสอบสลิปทั้งหมด", totals.slips}, {"ตรวจสอบสำเร็จ", totals.successful},
		{"ตรวจสอบไม่สำเร็จ", totals.failed}, {"ตรวจพบสลิปซ้ำ", totals.duplicate}, {"รอดำเนินการ", totals.pending},
		{"อัตราความสำเร็จ", nil}, {"ยอดเงินสลิปที่ตรวจสอบสำเร็จ", nil}, {"เครดิตที่ใช้ทั้งหมด", totals.credits},
		{"คำสั่งซื้อทั้งหมด", nil}, {"คำสั่งซื้อที่ชำระแล้ว", nil}, {"รายการชำระเงิน", totals.paymentRecords}, {"รายการชำระเงินสำเร็จ", totals.paidPayments},
	}
	completed := totals.successful + totals.failed + totals.duplicate
	if completed > 0 {
		metrics[9][1] = float64(totals.successful) / float64(completed)
	}
	for i, metric := range metrics {
		row := i + 8
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), metric[0])
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), metric[1])
	}
	percent, err := f.NewStyle(&excelize.Style{NumFmt: 10})
	if err != nil {
		return err
	}
	f.SetCellStyle(sheet, "B17", "B17", percent)
	f.SetCellValue(sheet, "A26", "ยอดรายรับแยกตามสกุลเงิน")
	f.SetCellValue(sheet, "A27", "สกุลเงิน")
	f.SetCellValue(sheet, "B27", "ยอดรับก่อนหักคืน")
	f.SetCellValue(sheet, "C27", "ยอดคืนเงิน")
	f.SetCellValue(sheet, "D27", "ยอดสุทธิ")
	currencies := sortedCurrencies(totals.gross)
	for i, currency := range currencies {
		row := 28 + i
		gross, net := adminCurrencySummary(totals, currency)
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), currency)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), gross)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), net)
	}
	money, err := f.NewStyle(&excelize.Style{NumFmt: 2})
	if err != nil {
		return err
	}
	f.SetCellStyle(sheet, "B28", fmt.Sprintf("D%d", max(28, 27+len(currencies))), money)
	notesRow := max(31, 29+len(currencies))
	f.SetCellValue(sheet, fmt.Sprintf("A%d", notesRow), "ข้อจำกัดของข้อมูล")
	for i, note := range []string{
		"ไม่มีตารางคำสั่งซื้อ: แสดงบันทึกการชำระเงินเป็นความพยายามชำระ ไม่ใช่คำสั่งซื้อแยกรายการ",
		"ไม่มีจำนวนเงินคืนหรือประวัติการคืนเงิน: ช่องยอดคืนและยอดสุทธิที่ได้รับผลกระทบจึงว่าง",
		"ไม่ได้บันทึกสกุลเงินของสลิป: ยอดเงินที่ตรวจสอบสำเร็จและสกุลเงินรายสลิปจึงว่าง",
		"ประวัติการหักเครดิตเริ่มเมื่อเปิดใช้ระบบบันทึกการใช้เครดิต จึงไม่สามารถย้อนนับรายการก่อนหน้านั้น",
		"ระบบบันทึกการเพิ่มเครดิต แต่ไม่ได้เก็บยอดคงเหลือหลังเพิ่มและเหตุการณ์หมดอายุย้อนหลัง",
		"โควตาและสถานะร้านค้าเป็นข้อมูล ณ เวลาสร้างรายงาน ส่วนกิจกรรมอิงช่วงเวลาที่เลือก",
		"รายการรอดำเนินการรวมรายการที่กำลังตรวจสอบ และรายรับที่เคยสำเร็จอาจรวมรายการที่คืนเงินภายหลัง",
	} {
		row := notesRow + 1 + i
		f.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("E%d", row))
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), note)
	}
	return nil
}
