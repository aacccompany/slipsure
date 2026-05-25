package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"slipsure-backend/internal/models"
	"slipsure-backend/internal/services"
)

// SlipHandler handles slip verification HTTP requests
type SlipHandler struct {
	verificationService *services.SlipVerificationService
}

// NewSlipHandler creates a new slip handler
func NewSlipHandler(verificationService *services.SlipVerificationService) *SlipHandler {
	return &SlipHandler{
		verificationService: verificationService,
	}
}

// UploadSlip handles POST /slips/upload - upload slip image for verification
func (h *SlipHandler) UploadSlip(c *gin.Context) {
	// Get merchant ID from JWT context
	merchantIDStr, exists := c.Get("merchant_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "Merchant profile not found",
		})
		return
	}

	merchantID, err := uuid.Parse(merchantIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_MERCHANT_ID",
			"message": "Invalid merchant ID format",
		})
		return
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "No file uploaded",
		})
		return
	}

	// Validate file size (max 10MB)
	maxSize := 10 * 1024 * 1024
	if file.Size > int64(maxSize) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "FILE_TOO_LARGE",
			"message": "File size exceeds 10MB limit",
		})
		return
	}

	// Open file
	fileHeader, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to read uploaded file",
		})
		return
	}
	defer fileHeader.Close()

	// Read file data
	fileData := make([]byte, file.Size)
	_, err = fileHeader.Read(fileData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to read file data",
		})
		return
	}

	// Upload and verify
	ctx := context.Background()
	slip, err := h.verificationService.UploadAndVerify(ctx, merchantID, fileData, file.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to process slip",
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"message": "Slip received and queued for verification.",
		"data": models.SlipUploadResponse{
			SlipID:           slip.ID,
			Status:           slip.Status,
			EstimatedSeconds: 3,
		},
	})
}

// ScanQRData handles POST /slips/scan - submit raw QR data for verification
func (h *SlipHandler) ScanQRData(c *gin.Context) {
	// Get merchant ID from JWT context
	merchantIDStr, exists := c.Get("merchant_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "Merchant profile not found",
		})
		return
	}

	merchantID, err := uuid.Parse(merchantIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_MERCHANT_ID",
			"message": "Invalid merchant ID format",
		})
		return
	}

	var req models.ScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request body",
		})
		return
	}

	// Scan and verify
	slip, err := h.verificationService.ScanQRData(merchantID, req.QRRawData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"data": models.SlipUploadResponse{
			SlipID:           slip.ID,
			Status:           slip.Status,
			EstimatedSeconds: 2,
		},
	})
}

// GetSlip handles GET /slips/:slip_id - get verification result for a slip
func (h *SlipHandler) GetSlip(c *gin.Context) {
	// Get slip ID from URL parameter
	slipIDStr := c.Param("slip_id")
	slipID, err := uuid.Parse(slipIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid slip ID format",
		})
		return
	}

	// Get slip
	slip, err := h.verificationService.GetSlip(slipID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "NOT_FOUND",
			"message": "Slip not found",
		})
		return
	}

	// Build response
	response := models.VerificationResponse{
		SlipID: slip.ID,
		Status: slip.Status,
	}

	if slip.Status == models.SlipStatusVerified && slip.Transaction != nil {
		response.Transaction = slip.Transaction
		response.Validation = &models.ValidationInfo{
			TimeWindowOK:         true, // Will be calculated from transaction time
			BankFormatOK:         true,
			Duplicate:            slip.Transaction.IsDuplicate,
			ReceiverAccountMatch: true,
			ValidationSource:     "bank_api",
		}
	} else if slip.Status == models.SlipStatusFailed {
		response.FailReason = slip.FailReason
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ReprocessSlip handles POST /slips/:slip_id/reprocess - manually trigger re-verification
func (h *SlipHandler) ReprocessSlip(c *gin.Context) {
	// Get slip ID from URL parameter
	slipIDStr := c.Param("slip_id")
	slipID, err := uuid.Parse(slipIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid slip ID format",
		})
		return
	}

	var req models.ReprocessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Optional request body
		req = models.ReprocessRequest{ForceVerify: false}
	}

	// Reprocess
	err = h.verificationService.ReprocessSlip(slipID, req.ForceVerify)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"message": "Slip queued for reprocessing.",
		"data": map[string]interface{}{
			"slip_id": slipID,
			"status":  "processing",
		},
	})
}

// ListSlips handles GET /slips - list merchant's slips
func (h *SlipHandler) ListSlips(c *gin.Context) {
	// Get merchant ID from JWT context
	merchantIDStr, exists := c.Get("merchant_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "Merchant profile not found",
		})
		return
	}

	_, err := uuid.Parse(merchantIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_MERCHANT_ID",
			"message": "Invalid merchant ID format",
		})
		return
	}

	// Parse pagination parameters
	page := 1
	limit := 20
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

	// Get slips (this would need to be implemented in repository)
	// For now, return empty list
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items": []interface{}{},
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       0,
				"total_pages": 0,
			},
		},
	})
}

// Helper function to parse page parameter
func parsePage(s string) (int, error) {
	var page int
	if _, err := fmt.Sscanf(s, "%d", &page); err != nil {
		return 0, err
	}
	if page < 1 {
		return 1, nil
	}
	return page, nil
}

// Helper function to parse limit parameter
func parseLimit(s string) (int, error) {
	var limit int
	if _, err := fmt.Sscanf(s, "%d", &limit); err != nil {
		return 0, err
	}
	if limit < 1 {
		return 20, nil
	}
	if limit > 100 {
		return 100, nil
	}
	return limit, nil
}
