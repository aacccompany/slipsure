package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TransactionHandler handles merchant transaction history requests.
type TransactionHandler struct {
	transactionRepo repositories.TransactionRepository
	slipRepo        repositories.SlipRepository
	merchantRepo    repositories.MerchantRepository
}

// NewTransactionHandler creates a transaction handler.
func NewTransactionHandler(transactionRepo repositories.TransactionRepository, slipRepo repositories.SlipRepository, merchantRepo repositories.MerchantRepository) *TransactionHandler {
	return &TransactionHandler{
		transactionRepo: transactionRepo,
		slipRepo:        slipRepo,
		merchantRepo:    merchantRepo,
	}
}

// ListTransactions handles GET /transactions.
func (h *TransactionHandler) ListTransactions(c *gin.Context) {
	merchantID, ok := h.currentMerchantID(c)
	if !ok {
		return
	}

	page, limit := readPagination(c, 20)
	filters, ok := h.readFilters(c, limit, (page-1)*limit)
	if !ok {
		return
	}

	transactions, err := h.transactionRepo.ListByMerchant(merchantID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "INTERNAL_ERROR", "message": "Failed to list transactions"})
		return
	}

	total, err := h.transactionRepo.CountByMerchant(merchantID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "INTERNAL_ERROR", "message": "Failed to count transactions"})
		return
	}

	items := make([]models.Transaction, 0, len(transactions))
	for _, transaction := range transactions {
		items = append(items, *transaction)
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.TransactionListResponse{
			Items: items,
			Pagination: models.Pagination{
				Page:       page,
				Limit:      limit,
				Total:      total,
				TotalPages: totalPages,
			},
		},
	})
}

// GetTransaction handles GET /transactions/:id.
func (h *TransactionHandler) GetTransaction(c *gin.Context) {
	merchantID, ok := h.currentMerchantID(c)
	if !ok {
		return
	}

	transactionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "Invalid transaction ID"})
		return
	}

	transaction, err := h.transactionRepo.FindByID(transactionID)
	if err != nil || transaction.MerchantID != merchantID {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "NOT_FOUND", "message": "Transaction not found"})
		return
	}

	if slip, err := h.slipRepo.FindByID(transaction.SlipID); err == nil {
		transaction.Slip = slip
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    transaction,
	})
}

// ExportTransactions handles GET /transactions/export.
func (h *TransactionHandler) ExportTransactions(c *gin.Context) {
	merchantID, ok := h.currentMerchantID(c)
	if !ok {
		return
	}

	format := c.DefaultQuery("format", "csv")
	if format != "csv" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "Only csv export is supported"})
		return
	}

	filters, ok := h.readFilters(c, 10000, 0)
	if !ok {
		return
	}

	transactions, err := h.transactionRepo.ListByMerchant(merchantID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "INTERNAL_ERROR", "message": "Failed to export transactions"})
		return
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)
	_ = writer.Write([]string{"id", "slip_id", "reference_no", "amount", "status", "sender_bank", "sender_account", "receiver_bank", "receiver_account", "transfer_at", "is_duplicate", "fail_reason", "created_at"})
	for _, transaction := range transactions {
		_ = writer.Write(transactionCSVRow(transaction))
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "INTERNAL_ERROR", "message": "Failed to write CSV"})
		return
	}

	filename := fmt.Sprintf("transactions-%s.csv", time.Now().Format("20060102-150405"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.String(http.StatusOK, buf.String())
}

func (h *TransactionHandler) currentMerchantID(c *gin.Context) (uuid.UUID, bool) {
	merchantID, err := getSlipMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "UNAUTHORIZED", "message": "Merchant profile not found"})
		return uuid.Nil, false
	}
	return merchantID, true
}

func (h *TransactionHandler) readFilters(c *gin.Context, limit int, offset int) (models.TransactionFilters, bool) {
	filters := models.TransactionFilters{Limit: limit, Offset: offset, Search: c.Query("search")}

	if status := c.Query("status"); status != "" {
		transactionStatus := models.TransactionStatus(status)
		if !isValidTransactionStatus(transactionStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "Invalid transaction status"})
			return filters, false
		}
		filters.Status = &transactionStatus
	}

	if startDate := c.Query("start_date"); startDate != "" {
		parsed, err := time.Parse("2006-01-02", startDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "Invalid start_date. Use YYYY-MM-DD"})
			return filters, false
		}
		filters.StartDate = &parsed
	}

	if endDate := c.Query("end_date"); endDate != "" {
		parsed, err := time.Parse("2006-01-02", endDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "Invalid end_date. Use YYYY-MM-DD"})
			return filters, false
		}
		filters.EndDate = &parsed
	}

	return filters, true
}

func readPagination(c *gin.Context, defaultLimit int) (int, int) {
	page := 1
	limit := defaultLimit
	if p := c.Query("page"); p != "" {
		if num, err := parsePage(p); err == nil {
			page = num
		}
	}
	if l := c.Query("limit"); l != "" {
		if num, err := parseLimit(l); err == nil {
			limit = num
		}
	}
	return page, limit
}

func isValidTransactionStatus(status models.TransactionStatus) bool {
	switch status {
	case models.TransactionStatusPending, models.TransactionStatusSuccess, models.TransactionStatusFailed, models.TransactionStatusProcessing:
		return true
	default:
		return false
	}
}

func transactionCSVRow(transaction *models.Transaction) []string {
	transferAt := ""
	if transaction.TransferAt != nil {
		transferAt = transaction.TransferAt.Format(time.RFC3339)
	}

	failReason := ""
	if transaction.FailReason != nil {
		failReason = *transaction.FailReason
	}

	return []string{
		transaction.ID.String(),
		transaction.SlipID.String(),
		transaction.ReferenceNo,
		strconv.FormatFloat(transaction.Amount, 'f', 2, 64),
		string(transaction.Status),
		transaction.SenderBank,
		transaction.SenderAccount,
		transaction.ReceiverBank,
		transaction.ReceiverAccount,
		transferAt,
		strconv.FormatBool(transaction.IsDuplicate),
		failReason,
		transaction.CreatedAt.Format(time.RFC3339),
	}
}
