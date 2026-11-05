package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const adminSlipExportBatchSize = 1000

// ExportAdminSlipHistory exports every matching verification attempt, including failures without a transaction.
func (h *MerchantHandler) ExportAdminSlipHistory(c *gin.Context) {
	userID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "UNAUTHORIZED", "message": "กรุณาเข้าสู่ระบบ"})
		return
	}
	user, err := h.userRepo.FindByID(userID)
	if err != nil || user == nil || !user.IsActive || user.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "FORBIDDEN", "message": "เฉพาะผู้ดูแลระบบเท่านั้น"})
		return
	}
	if c.DefaultQuery("format", "csv") != "csv" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "รองรับเฉพาะไฟล์ CSV"})
		return
	}
	status := c.Query("status")
	switch status {
	case "", "verified", "failed", "pending", "processing", "duplicate":
	default:
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "สถานะสลิปไม่ถูกต้อง"})
		return
	}
	startDate, endDate, ok := readAdminDateRange(c)
	if !ok {
		return
	}
	filters := models.SlipHistoryFilters{Status: status, StartDate: startDate, EndDate: endDate, Search: c.Query("search")}
	data, err := buildAdminSlipHistoryCSV(c, h.slipRepo, h.transactionRepo, filters)
	if err != nil {
		log.Printf("Failed to export admin slip history: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "DATABASE_ERROR", "message": "ส่งออกประวัติการตรวจสลิปไม่สำเร็จ"})
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="admin-transactions-%s.csv"`, time.Now().Format("20060102-150405")))
	c.Data(http.StatusOK, "text/csv; charset=utf-8", data)
}

func buildAdminSlipHistoryCSV(c *gin.Context, slipRepo repositories.SlipRepository, transactionRepo repositories.TransactionRepository, filters models.SlipHistoryFilters) ([]byte, error) {
	var buf bytes.Buffer
	buf.Write([]byte{0xEF, 0xBB, 0xBF})
	writer := csv.NewWriter(&buf)
	if err := writer.Write([]string{"รหัสสลิป", "รหัสร้านค้า", "สถานะ", "สาเหตุที่ไม่สำเร็จ", "รหัสธุรกรรม", "เลขอ้างอิง", "จำนวนเงิน", "ชื่อผู้โอน", "ธนาคารผู้โอน", "ชื่อผู้รับ", "ธนาคารผู้รับ", "ผู้ให้บริการ", "วันที่โอน", "วันที่ตรวจสอบ"}); err != nil {
		return nil, err
	}
	loc := time.FixedZone("Asia/Bangkok", 7*60*60)
	filters.Limit = adminSlipExportBatchSize
	for offset := 0; ; {
		if err := c.Request.Context().Err(); err != nil {
			return nil, err
		}
		filters.Offset = offset
		slips, err := slipRepo.ListHistoryAll(filters)
		if err != nil {
			return nil, err
		}
		ids := make([]uuid.UUID, len(slips))
		for i, slip := range slips {
			ids[i] = slip.ID
		}
		transactions, err := transactionRepo.FindBySlipIDs(ids)
		if err != nil {
			return nil, err
		}
		for _, slip := range slips {
			status := string(slip.Status)
			reason := ""
			if slip.FailReason != nil {
				reason = string(*slip.FailReason)
			}
			if reason == "DUPLICATE_SLIP" {
				status = "สลิปซ้ำ"
			} else {
				switch slip.Status {
				case models.SlipStatusVerified:
					status = "สำเร็จ"
				case models.SlipStatusFailed:
					status = "ไม่สำเร็จ"
				case models.SlipStatusPending:
					status = "รอดำเนินการ"
				case models.SlipStatusProcessing:
					status = "กำลังตรวจสอบ"
				}
			}
			row := []string{slip.ID.String(), slip.MerchantID.String(), status, adminSlipFailReason(reason), "", "", "", "", "", "", "", "", "", slip.CreatedAt.In(loc).Format("2006-01-02 15:04:05")}
			if transaction := transactions[slip.ID]; transaction != nil {
				row[4] = transaction.ID.String()
				row[5] = transaction.ReferenceNo
				row[6] = strconv.FormatFloat(transaction.Amount, 'f', 2, 64)
				row[7], row[8] = transaction.SenderName, transaction.SenderBank
				row[9], row[10] = transaction.ReceiverName, transaction.ReceiverBank
				row[11] = transaction.Provider
				if transaction.TransferAt != nil {
					row[12] = transaction.TransferAt.In(loc).Format("2006-01-02 15:04:05")
				}
			}
			for i := range row {
				row[i] = safeAdminCSVCell(row[i])
			}
			if err := writer.Write(row); err != nil {
				return nil, err
			}
		}
		if len(slips) < adminSlipExportBatchSize {
			break
		}
		offset += len(slips)
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func safeAdminCSVCell(value string) string {
	trimmed := strings.TrimLeft(value, " \t\r\n")
	if trimmed != "" && strings.ContainsAny(trimmed[:1], "=+-@") {
		return "'" + value
	}
	return value
}

func adminSlipFailReason(reason string) string {
	switch models.FailReason(reason) {
	case models.FailReasonDuplicateSlip:
		return "สลิปซ้ำ"
	case models.FailReasonAmountMismatch:
		return "ยอดเงินไม่ตรงกัน"
	case models.FailReasonTimeout:
		return "หมดเวลาตรวจสอบ"
	case models.FailReasonInvalidQR:
		return "คิวอาร์โค้ดไม่ถูกต้อง"
	case models.FailReasonBankError:
		return "ธนาคารขัดข้อง"
	case models.FailReasonExpiredSlip:
		return "สลิปหมดอายุ"
	default:
		return reason
	}
}
