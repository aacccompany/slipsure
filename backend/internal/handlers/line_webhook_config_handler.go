package handlers

import (
	"net/http"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
	"slipsure-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LINEWebhookConfigHandler handles LINE webhook configuration operations
type LINEWebhookConfigHandler struct {
	webhookService *services.LINEWebhookService
	merchantRepo repositories.MerchantRepository
}

// NewLINEWebhookConfigHandler creates a new LINE webhook config handler
func NewLINEWebhookConfigHandler(webhookService *services.LINEWebhookService, merchantRepo repositories.MerchantRepository) *LINEWebhookConfigHandler {
	return &LINEWebhookConfigHandler{
		webhookService: webhookService,
		merchantRepo: merchantRepo,
	}
}

// GetConfig retrieves LINE webhook configuration for merchant
func (h *LINEWebhookConfigHandler) GetConfig(c *gin.Context) {
	// Get user ID from JWT context (set by AuthMiddleware)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Find merchant by user ID
	merchant, err := h.merchantRepo.FindByOwnerID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant profile not found"})
		return
	}

	config, err := h.webhookService.GetLINEWebhookConfig(merchant.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get LINE webhook config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"config": config})
}

// UpdateConfig updates LINE webhook configuration for merchant
func (h *LINEWebhookConfigHandler) UpdateConfig(c *gin.Context) {
	// Get user ID from JWT context (set by AuthMiddleware)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Find merchant by user ID
	merchant, err := h.merchantRepo.FindByOwnerID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant profile not found"})
		return
	}

	var request models.UpdateLINEWebhookRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.webhookService.UpdateLINEWebhookConfig(merchant.ID, &request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update LINE webhook config"})
		return
	}

	// Get updated config to return webhook URL
	config, _ := h.webhookService.GetLINEWebhookConfig(merchant.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "LINE webhook configuration updated successfully",
		"config":  config,
	})
}

// DeleteConfig removes LINE webhook configuration
func (h *LINEWebhookConfigHandler) DeleteConfig(c *gin.Context) {
	// Get user ID from JWT context (set by AuthMiddleware)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Find merchant by user ID
	merchant, err := h.merchantRepo.FindByOwnerID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant profile not found"})
		return
	}

	err = h.webhookService.DeleteLINEWebhookConfig(merchant.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete LINE webhook config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "LINE webhook configuration deleted successfully"})
}

// TestWebhook tests LINE webhook connectivity
func (h *LINEWebhookConfigHandler) TestWebhook(c *gin.Context) {
	// Get user ID from JWT context (set by AuthMiddleware)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Find merchant by user ID
	merchant, err := h.merchantRepo.FindByOwnerID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant profile not found"})
		return
	}

	result, err := h.webhookService.TestLINEWebhook(merchant.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to test LINE webhook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"result": result})
}

// ProcessWebhook processes incoming LINE webhook (multi-merchant endpoint)
func (h *LINEWebhookConfigHandler) ProcessWebhook(c *gin.Context) {
	webhookRefID := c.Param("ref_id")
	if webhookRefID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Webhook reference ID required"})
		return
	}

	// Get LINE signature for verification
	signature := c.GetHeader("X-Line-Signature")

	// Read raw body
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Process webhook (errors return 200 to prevent LINE retries)
	err = h.webhookService.ProcessWebhook(webhookRefID, signature, body)
	if err != nil {
		// Log error but return 200 to LINE
		c.JSON(http.StatusOK, gin.H{"status": "error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GenerateWebhookURL generates the webhook URL for a merchant
func (h *LINEWebhookConfigHandler) GenerateWebhookURL(c *gin.Context) {
	// Get user ID from JWT context (set by AuthMiddleware)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Find merchant by user ID
	merchant, err := h.merchantRepo.FindByOwnerID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Merchant profile not found"})
		return
	}

	config, err := h.webhookService.GetLINEWebhookConfig(merchant.ID)
	if err != nil || config == nil || !config.IsConfigured {
		c.JSON(http.StatusBadRequest, gin.H{"error": "LINE webhook not configured for this merchant"})
		return
	}

	webhookURL := ""
	if config.WebhookURL != nil {
		webhookURL = *config.WebhookURL
	}

	c.JSON(http.StatusOK, gin.H{
		"webhook_url":          webhookURL,
		"webhook_reference_id": config.WebhookReferenceID,
	})
}
