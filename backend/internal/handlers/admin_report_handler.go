package handlers

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"slipsure-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminReportHandler struct {
	db      *sql.DB
	reports interface {
		Build(context.Context, services.AdminReportPeriod) ([]byte, error)
	}
}

func NewAdminReportHandler(db *sql.DB) *AdminReportHandler {
	return &AdminReportHandler{db: db, reports: services.NewAdminReportService(db)}
}

type adminReportRequest struct {
	ReportPeriod string `json:"report_period"`
	ExportType   string `json:"export_type"`
	Format       string `json:"format"`
	Timezone     string `json:"timezone"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
}

func parseAdminPeriod(req adminReportRequest, now time.Time) (services.AdminReportPeriod, error) {
	loc := time.FixedZone("Asia/Bangkok", 7*60*60)
	now = now.In(loc)
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	period := services.AdminReportPeriod{Label: "ทั้งหมด", Location: loc}
	switch req.ReportPeriod {
	case "", "all":
		return period, nil
	case "today":
		period.Start, period.End, period.Label = &day, datePointer(day.AddDate(0, 0, 1)), "วันนี้"
	case "7d", "30d":
		days := 7
		if req.ReportPeriod == "30d" {
			days = 30
		}
		period.Start, period.End, period.Label = datePointer(day.AddDate(0, 0, 1-days)), datePointer(day.AddDate(0, 0, 1)), fmt.Sprintf("%d วันที่ผ่านมา", days)
	case "month":
		period.Start, period.End, period.Label = datePointer(time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)), datePointer(day.AddDate(0, 0, 1)), "เดือนนี้"
	case "custom":
		start, err := time.ParseInLocation("2006-01-02", req.StartDate, loc)
		if err != nil {
			return period, errors.New("วันที่เริ่มไม่ถูกต้อง")
		}
		end, err := time.ParseInLocation("2006-01-02", req.EndDate, loc)
		if err != nil || end.Before(start) {
			return period, errors.New("วันที่สิ้นสุดไม่ถูกต้อง")
		}
		period.Start, period.End, period.Label = &start, datePointer(end.AddDate(0, 0, 1)), req.StartDate+" ถึง "+req.EndDate
	default:
		return period, errors.New("ช่วงเวลารายงานไม่ถูกต้อง")
	}
	return period, nil
}

func datePointer(value time.Time) *time.Time { return &value }

func (h *AdminReportHandler) Export(c *gin.Context) {
	userID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "กรุณาเข้าสู่ระบบ"})
		return
	}
	var role string
	var active bool
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT role::text, is_active FROM users WHERE id = $1`, userID).Scan(&role, &active); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ตรวจสอบสิทธิ์ผู้ดูแลระบบไม่สำเร็จ"})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "เฉพาะผู้ดูแลระบบเท่านั้น"})
		return
	}
	if !active || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "เฉพาะผู้ดูแลระบบเท่านั้น"})
		return
	}
	var req adminReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลคำขอไม่ถูกต้อง"})
		return
	}
	if req.ExportType != "" && req.ExportType != "full" || req.Format != "" && req.Format != "xlsx" || req.Timezone != "" && req.Timezone != "Asia/Bangkok" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รองรับเฉพาะรายงานฉบับเต็มแบบ XLSX ในเขตเวลาเอเชีย/กรุงเทพฯ"})
		return
	}
	period, err := parseAdminPeriod(req, time.Now())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var auditID uuid.UUID
	if err := h.db.QueryRowContext(c.Request.Context(), `INSERT INTO system_logs (service, level, message)
		VALUES ('admin_report_export', 'info', $1) RETURNING id`, fmt.Sprintf("Admin %s requested platform report for %s", userID, period.Label)).Scan(&auditID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "บันทึกประวัติการส่งออกไม่สำเร็จ"})
		return
	}
	data, err := h.reports.Build(c.Request.Context(), period)
	if err != nil {
		_, _ = h.db.ExecContext(c.Request.Context(), `UPDATE system_logs SET level = 'error', error_details = $2 WHERE id = $1`, auditID, err.Error())
		if errors.Is(err, services.ErrAdminReportTooLarge) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "รายงานเกินจำนวนแถวที่ Excel รองรับ กรุณาเลือกช่วงเวลาที่สั้นลง"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างรายงานไม่สำเร็จ"})
		}
		return
	}
	if _, err := h.db.ExecContext(c.Request.Context(), `UPDATE system_logs SET message = message || ' (completed)' WHERE id = $1`, auditID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "บันทึกประวัติการส่งออกไม่สำเร็จ"})
		return
	}
	c.Header("Cache-Control", "no-store")
	stamp := time.Now().In(period.Location).Format("20060102_150405")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="FlowSlip_Admin_Report_%s.xlsx"; filename*=UTF-8''%s`, stamp, url.PathEscape("FlowSlip_รายงานแอดมิน_"+stamp+".xlsx")))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data)
}
