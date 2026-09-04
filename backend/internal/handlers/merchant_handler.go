package handlers

import (
	"encoding/csv"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
	"slipsure-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// MerchantHandler handles merchant-related HTTP requests
type MerchantHandler struct {
	merchantService *services.MerchantService
	stripeService   *services.StripeService
	userRepo        repositories.UserRepository
	merchantRepo    repositories.MerchantRepository
	transactionRepo repositories.TransactionRepository
}

// Helper function to get merchant ID by querying merchants by owner_id from user ID in JWT
func getMerchantID(c *gin.Context, merchantRepo repositories.MerchantRepository) (uuid.UUID, error) {
	// Get user ID from JWT context
	userIDStr, exists := c.Get("user_id")
	if !exists {
		log.Printf("getMerchantID: user_id not found in context")
		return uuid.Nil, errors.New("user_id not found in context")
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		log.Printf("getMerchantID: invalid user ID format: %v", err)
		return uuid.Nil, fmt.Errorf("invalid user ID format: %w", err)
	}

	// Query merchants table directly by owner_id
	merchant, err := merchantRepo.FindByOwnerID(userID)
	if err != nil {
		log.Printf("getMerchantID: merchant not found for user %s: %v", userID, err)
		return uuid.Nil, fmt.Errorf("merchant not found for user: %w", err)
	}

	log.Printf("getMerchantID: successfully found merchant %s for user %s", merchant.ID, userID)
	return merchant.ID, nil
}

// NewMerchantHandler creates a new merchant handler instance
func NewMerchantHandler(merchantService *services.MerchantService, stripeService *services.StripeService, userRepo repositories.UserRepository, merchantRepo repositories.MerchantRepository, transactionRepo repositories.TransactionRepository) *MerchantHandler {
	return &MerchantHandler{
		merchantService: merchantService,
		stripeService:   stripeService,
		userRepo:        userRepo,
		merchantRepo:    merchantRepo,
		transactionRepo: transactionRepo,
	}
}

// Plan handlers

// GetPlans handles GET /plans - list all available subscription plans (public)
func (h *MerchantHandler) GetPlans(c *gin.Context) {
	plans, err := h.merchantService.GetAllPlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to retrieve plans",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    plans.Plans,
	})
}

// Checkout handlers

// CreateCheckout handles POST /checkout - create Stripe checkout session
func (h *MerchantHandler) CreateCheckout(c *gin.Context) {
	var req models.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request body",
		})
		return
	}

	// Get user ID from JWT context (set by auth middleware)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "User not authenticated",
		})
		return
	}

	// Get user email from JWT context for Stripe customer creation
	userEmailStr, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "User email not found in token",
		})
		return
	}

	// Parse user ID from string to UUID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_USER_ID",
			"message": "Invalid user ID format",
		})
		return
	}

	checkoutResp, err := h.merchantService.CreateCheckout(userID, userEmailStr.(string), &req)
	if err != nil {
		// Log the actual error for debugging
		fmt.Printf("Checkout creation failed: %v\n", err)

		if errors.Is(err, services.ErrFreePlanAlreadyUsed) {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "FREE_PLAN_ALREADY_USED",
				"message": "Free plan can only be used once per account.",
			})
			return
		}

		// Return more specific error message
		errorMessage := "Failed to create checkout session"
		if err.Error() == "stripe service is not available. please configure STRIPE_SECRET_KEY and STRIPE_PRICE_ID_* environment variables" {
			errorMessage = "Stripe payment is not configured. Please contact support."
		} else if err.Error() == "invalid plan ID" {
			errorMessage = "Invalid plan selected. Please choose a valid plan."
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": errorMessage,
			"debug":   err.Error(), // Include actual error for debugging
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    checkoutResp,
	})
}

// Stripe webhook handler

// HandleStripeWebhook handles POST /checkout/webhook - receive Stripe webhook events
func (h *MerchantHandler) HandleStripeWebhook(c *gin.Context) {
	// Read raw payload
	payload, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_REQUEST",
			"message": "Failed to read request body",
		})
		return
	}

	// Get Stripe signature
	signature := c.GetHeader("Stripe-Signature")

	// Debug logging
	fmt.Printf("Webhook received from %s\n", c.ClientIP())
	fmt.Printf("Stripe-Signature header: %s\n", signature)
	fmt.Printf("Payload length: %d bytes\n", len(payload))

	// Verify webhook signature
	if err := h.stripeService.VerifyWebhookSignature(payload, signature); err != nil {
		fmt.Printf("Webhook signature verification failed: %v\n", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "Invalid webhook signature",
		})
		return
	}

	// Process webhook event
	event, err := h.stripeService.ProcessWebhook(payload, signature)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "WEBHOOK_ERROR",
			"message": "Failed to process webhook event",
		})
		return
	}

	// Handle different event types
	switch event.Type {
	case "checkout.session.completed":
		userID, checkoutSessionID, customerID, planID, billingCycle, err := h.stripeService.HandleCheckoutSessionCompleted(event)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "WEBHOOK_PROCESSING_ERROR",
				"message": "Failed to process checkout completed event",
			})
			return
		}

		// Activate subscription in database
		if err := h.activateSubscription(userID, checkoutSessionID, customerID, planID, billingCycle); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "DATABASE_ERROR",
				"message": "Failed to activate subscription",
			})
			return
		}

	case "payment_intent.succeeded":
		userID, checkoutSessionID, customerID, planID, billingCycle, err := h.stripeService.HandlePaymentIntentSucceeded(event)
		if err != nil {
			fmt.Printf("Failed to resolve checkout from payment intent: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "WEBHOOK_PROCESSING_ERROR",
				"message": "Failed to process successful payment",
			})
			return
		}

		if err := h.activateSubscription(userID, checkoutSessionID, customerID, planID, billingCycle); err != nil {
			fmt.Printf("Failed to activate subscription from payment intent: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "DATABASE_ERROR",
				"message": "Failed to activate subscription",
			})
			return
		}

	case "customer.subscription.deleted":
		customerID, err := h.stripeService.HandleSubscriptionDeleted(event)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "WEBHOOK_PROCESSING_ERROR",
				"message": "Failed to process subscription deleted event",
			})
			return
		}

		// Deactivate subscription in database
		if err := h.deactivateSubscription(customerID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "DATABASE_ERROR",
				"message": "Failed to deactivate subscription",
			})
			return
		}

	case "invoice.paid":
		customerID, subscriptionID, err := h.stripeService.HandleInvoicePaid(event)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "WEBHOOK_PROCESSING_ERROR",
				"message": "Failed to process invoice paid event",
			})
			return
		}

		// Update subscription billing info
		// This would reset usage counters and update billing period
		_ = customerID
		_ = subscriptionID
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Webhook received",
	})
}

// Subscription handlers

// GetSubscription handles GET /merchants/me/subscription - get current subscription
func (h *MerchantHandler) GetSubscription(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found",
		})
		return
	}

	subscription, err := h.merchantService.GetSubscription(merchantID)
	if err != nil {
		// No subscription found - return proper response
		c.JSON(http.StatusNotFound, gin.H{
			"success": true,
			"data": gin.H{
				"subscription": nil,
				"message":      "No active subscription found. Please choose a plan to continue.",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    subscription,
	})
}

// CancelSubscription handles POST /merchants/me/subscription/cancel - cancel subscription
func (h *MerchantHandler) CancelSubscription(c *gin.Context) {
	var req models.CancelSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request body",
		})
		return
	}

	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found",
		})
		return
	}

	err = h.merchantService.CancelSubscription(merchantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to cancel subscription",
		})
		return
	}

	// Determine access until date
	accessUntil := time.Now().AddDate(0, 1, 0) // Default: 1 month from now
	message := "Subscription will end on " + accessUntil.Format("2006-01-02") + "."

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"status":         "cancelling",
			"cancelled_at":   time.Now(),
			"access_until":   accessUntil,
			"can_reactivate": true,
		},
	})
}

// Merchant profile handlers

// CreateProfile handles POST /merchants/me/profile - create initial merchant shop profile
func (h *MerchantHandler) CreateProfile(c *gin.Context) {
	var req models.CreateMerchantProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request body",
		})
		return
	}

	// Get user ID from JWT context (set by auth middleware)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "User not authenticated",
		})
		return
	}

	// Parse user ID from string to UUID
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_USER_ID",
			"message": "Invalid user ID format",
		})
		return
	}

	profileResp, err := h.merchantService.CreateProfile(userID, &req)
	if err != nil {
		if err.Error() == "merchant profile already exists" {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "PROFILE_EXISTS",
				"message": "Merchant profile already exists. Use PUT to update.",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to create merchant profile",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Shop profile created successfully.",
		"data":    profileResp.Profile,
	})
}

// GetProfile handles GET /merchants/me/profile - get merchant shop profile
func (h *MerchantHandler) GetProfile(c *gin.Context) {
	// Get merchant ID by querying database
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found. Please create a profile first.",
		})
		return
	}

	profile, err := h.merchantService.GetProfile(merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to retrieve profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    profile.Profile,
	})
}

// UpdateProfile handles PUT /merchants/me/profile - update merchant shop profile
func (h *MerchantHandler) UpdateProfile(c *gin.Context) {
	var req models.UpdateMerchantProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request body",
		})
		return
	}

	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found",
		})
		return
	}

	err = h.merchantService.UpdateProfile(merchantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to update profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Shop profile updated.",
	})
}

// UploadLogo handles POST /merchants/me/logo - upload shop logo
func (h *MerchantHandler) UploadLogo(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found",
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

	// Validate file size (max 2MB)
	if file.Size > 2*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "FILE_TOO_LARGE",
			"message": "File size exceeds 2MB limit",
		})
		return
	}

	// For now, return a mock logo URL
	// In production, you would upload to DigitalOcean Spaces and return the actual URL
	logoURL := "https://cdn.yourdomain.com/shop-logos/" + merchantID.String() + ".png"

	err = h.merchantService.UploadLogo(merchantID, logoURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to upload logo",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"logo_url":    logoURL,
			"size_kb":     file.Size / 1024,
			"dimensions":  "200x200",
			"uploaded_at": time.Now(),
		},
	})
}

// Settings handlers

// GetSettings handles GET /merchants/me/settings - get merchant settings
func (h *MerchantHandler) GetSettings(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found",
		})
		return
	}

	settings, err := h.merchantService.GetSettings(merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to retrieve settings",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    settings.Settings,
	})
}

// UpdateSettings handles PUT /merchants/me/settings - update merchant settings
func (h *MerchantHandler) UpdateSettings(c *gin.Context) {
	var req models.UpdateMerchantSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request body",
		})
		return
	}

	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found",
		})
		return
	}

	err = h.merchantService.UpdateSettings(merchantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "INTERNAL_ERROR",
			"message": "Failed to update settings",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Shop settings updated.",
		"data": gin.H{
			"updated_settings": []string{"notification_preferences", "verification_preferences"},
			"updated_at":       time.Now(),
		},
	})
}

// Quota handlers

// GetQuota handles GET /merchants/me/quota - get current quota status
func (h *MerchantHandler) GetQuota(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "MERCHANT_NOT_FOUND",
			"message": "Merchant profile not found",
		})
		return
	}

	quota, err := h.merchantService.GetQuotaStatus(merchantID)
	if err != nil {
		// No active subscription — return the same field names as the
		// QuotaStatus success path so every frontend consumer relies on one
		// consistent contract. reset_date is explicitly null (not a zeroed
		// time.Time, which would serialize as "0001-01-01..." and defeat the
		// frontend's `reset_date ? ... : fallback` checks).
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"quota_limit": 0,
				"used":        0,
				"remaining":   0,
				"reset_date":  nil,
				"is_blocked":  false,
			},
			"message": "No active subscription. Please choose a plan to use slip verification features.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    quota,
	})
}

// GetMerchantAnalyticsDashboard handles GET /merchants/me/analytics/dashboard.
func (h *MerchantHandler) GetMerchantAnalyticsDashboard(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "Merchant profile not found",
		})
		return
	}

	dashboard, err := h.merchantRepo.GetMerchantAnalyticsDashboard(merchantID)
	if err != nil {
		log.Printf("Failed to load merchant analytics dashboard for %s: %v", merchantID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve merchant analytics",
		})
		return
	}

	if quota, err := h.merchantService.GetQuotaStatus(merchantID); err == nil {
		dashboard.RemainingQuota = quota.Remaining
		dashboard.ThisMonthScans = quota.Used
		dashboard.QuotaLimit = quota.QuotaLimit
		dashboard.QuotaResetDate = quota.ResetDate.Format("2006-01-02")
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dashboard,
	})
}

// GetMerchantAnalyticsUsage handles GET /merchants/me/analytics/usage.
func (h *MerchantHandler) GetMerchantAnalyticsUsage(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "Merchant profile not found",
		})
		return
	}

	days := 7
	switch c.DefaultQuery("period", "7d") {
	case "30d":
		days = 30
	case "90d":
		days = 90
	}

	usage, err := h.merchantRepo.GetMerchantAnalyticsUsage(merchantID, days)
	if err != nil {
		log.Printf("Failed to load merchant analytics usage for %s: %v", merchantID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve merchant usage analytics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    usage,
	})
}

// ExportMerchantAnalytics handles GET /merchants/me/analytics/export.
func (h *MerchantHandler) ExportMerchantAnalytics(c *gin.Context) {
	merchantID, err := getMerchantID(c, h.merchantRepo)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "Merchant profile not found",
		})
		return
	}

	if format := c.DefaultQuery("format", "csv"); format != "csv" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Only csv export is supported",
		})
		return
	}

	now := time.Now()
	startDate := now.AddDate(0, 0, -29)
	endDate := now

	if value := c.Query("start_date"); value != "" {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "VALIDATION_ERROR",
				"message": "start_date must be YYYY-MM-DD",
			})
			return
		}
		startDate = parsed
	}

	if value := c.Query("end_date"); value != "" {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "VALIDATION_ERROR",
				"message": "end_date must be YYYY-MM-DD",
			})
			return
		}
		endDate = parsed
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "end_date must be after start_date",
		})
		return
	}

	rows, err := h.merchantRepo.ListMerchantAnalyticsExport(merchantID, startDate, endDate)
	if err != nil {
		log.Printf("Failed to export merchant analytics for %s: %v", merchantID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to export merchant analytics",
		})
		return
	}

	filename := fmt.Sprintf("merchant-analytics-%s-%s.csv", startDate.Format("20060102"), endDate.Format("20060102"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	_ = writer.Write([]string{"date", "scans", "verified", "failed", "revenue"})
	for _, row := range rows {
		_ = writer.Write([]string{
			row.Date,
			strconv.Itoa(row.Scans),
			strconv.Itoa(row.Verified),
			strconv.Itoa(row.Failed),
			fmt.Sprintf("%.2f", row.Revenue),
		})
	}
}

// Helper functions for webhook processing

func (h *MerchantHandler) activateSubscription(userID uuid.UUID, checkoutSessionID, customerID, planID, billingCycle string) error {
	// Calculate subscription expiration based on billing cycle
	var expiresAt time.Time
	if billingCycle == "yearly" {
		expiresAt = time.Now().AddDate(1, 0, 0) // 1 year from now
	} else {
		expiresAt = time.Now().AddDate(0, 1, 0) // 1 month from now
	}

	// Resolve the merchant by its owner user ID from Stripe metadata.
	merchant, err := h.merchantRepo.FindByOwnerID(userID)
	if err != nil {
		profileReq := &models.CreateMerchantProfileRequest{
			ShopName:   "My Shop",
			StrictMode: true,
		}
		_, err = h.merchantService.CreateProfile(userID, profileReq)
		if err != nil {
			return fmt.Errorf("failed to create merchant profile: %w", err)
		}
		merchant, err = h.merchantRepo.FindByOwnerID(userID)
		if err != nil {
			return fmt.Errorf("failed to get created merchant profile: %w", err)
		}
	}

	if billingCycle != string(models.BillingCycleMonthly) && billingCycle != string(models.BillingCycleYearly) {
		return fmt.Errorf("invalid billing cycle %q", billingCycle)
	}

	stripeSubscriptionID := checkoutSessionID
	stripeCustomerID := customerID
	startedAt := time.Now()
	existingSubscription, existingErr := h.merchantRepo.FindByMerchantID(merchant.ID)
	isNewCheckout := existingErr != nil || existingSubscription == nil || existingSubscription.StripeSubscriptionID == nil || *existingSubscription.StripeSubscriptionID != checkoutSessionID
	if isNewCheckout {
		periodStart, _ := models.QuotaPeriodFor(startedAt, startedAt)
		if err := h.merchantRepo.ResetUsageCounter(merchant.ID, periodStart.Year(), int(periodStart.Month())); err != nil {
			return fmt.Errorf("failed to reset quota usage: %w", err)
		}
	}

	subscription := &models.Subscription{
		MerchantID:           merchant.ID,
		PlanID:               planID,
		Status:               models.SubscriptionStatusActive,
		BillingCycle:         models.BillingCycle(billingCycle),
		StripeSubscriptionID: &stripeSubscriptionID,
		StripeCustomerID:     &stripeCustomerID,
		StartedAt:            startedAt,
		ExpiresAt:            &expiresAt,
		AutoRenew:            true,
	}

	if err := h.merchantRepo.CreateSubscription(subscription); err != nil {
		return fmt.Errorf("failed to create subscription: %w", err)
	}

	amount, currency, err := h.stripeService.GetCheckoutSessionPayment(checkoutSessionID)
	if err != nil {
		return fmt.Errorf("failed to get successful payment details: %w", err)
	}
	paidAt := time.Now()
	payment := &models.PaymentLog{
		MerchantID:         merchant.ID,
		SubscriptionID:     &subscription.ID,
		Amount:             amount,
		Currency:           currency,
		Gateway:            "stripe",
		GatewayReferenceID: checkoutSessionID,
		Status:             "success",
		PaidAt:             &paidAt,
	}
	if err := h.merchantRepo.CreatePaymentLog(payment); err != nil {
		return fmt.Errorf("failed to record subscription payment: %w", err)
	}

	fmt.Printf("Subscription created for merchant %s, plan %s (%s), expires %s\n", merchant.ID, planID, billingCycle, expiresAt)
	return nil
}

// GetAdminPayments returns subscription payment history for administrators.
func (h *MerchantHandler) GetAdminPayments(c *gin.Context) {
	page := 1
	limit := 20
	if value, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil && value > 0 {
		page = value
	}
	if value, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil && value > 0 && value <= 100 {
		limit = value
	}

	status := c.Query("status")
	validStatuses := map[string]bool{"": true, "pending": true, "success": true, "failed": true, "refunded": true}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_STATUS",
			"message": "Status must be pending, success, failed, or refunded",
		})
		return
	}

	startDate, endDate, ok := readAdminDateRange(c)
	if !ok {
		return
	}

	payments, total, err := h.merchantRepo.ListPaymentLogs(status, startDate, endDate, limit, (page-1)*limit)
	if err != nil {
		log.Printf("Failed to list admin payments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve payment history",
		})
		return
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.PaymentLogListResponse{
			Items: payments, Page: page, Limit: limit, Total: total, TotalPages: totalPages,
		},
	})
}

// GetAdminUsers returns all platform users with merchant association for administrators.
func (h *MerchantHandler) GetAdminUsers(c *gin.Context) {
	page, limit := readPagination(c, 20)
	role := c.Query("role")
	if role != "" && role != string(models.RoleMerchant) && role != string(models.RoleAdmin) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_ROLE",
			"message": "Role must be merchant or admin",
		})
		return
	}

	startDate, endDate, ok := readAdminDateRange(c)
	if !ok {
		return
	}

	users, total, err := h.userRepo.ListAdminUsers(c.Query("search"), role, startDate, endDate, limit, (page-1)*limit)
	if err != nil {
		log.Printf("Failed to list admin users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve users",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.AdminUserListResponse{
			Items:      users,
			Pagination: buildPagination(page, limit, total),
		},
	})
}

// GetAdminMerchants returns all merchants with subscription and usage summary.
func (h *MerchantHandler) GetAdminMerchants(c *gin.Context) {
	page, limit := readPagination(c, 20)
	status := c.Query("status")
	validStatuses := map[string]bool{
		"": true, "active": true, "inactive": true, "trial": true,
		"pending": true, "suspended": true, "cancelled": true, "expired": true,
	}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_STATUS",
			"message": "Status must be active, inactive, trial, pending, suspended, cancelled, or expired",
		})
		return
	}

	startDate, endDate, ok := readAdminDateRange(c)
	if !ok {
		return
	}

	merchants, total, err := h.merchantRepo.ListAdminMerchants(status, c.Query("search"), startDate, endDate, limit, (page-1)*limit)
	if err != nil {
		log.Printf("Failed to list admin merchants: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve merchants",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.AdminMerchantListResponse{
			Items:      merchants,
			Pagination: buildPagination(page, limit, total),
		},
	})
}

// ExportAdminUsers streams all matching admin users as CSV.
func (h *MerchantHandler) ExportAdminUsers(c *gin.Context) {
	role := c.Query("role")
	if role != "" && role != string(models.RoleMerchant) && role != string(models.RoleAdmin) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_ROLE", "message": "Role must be merchant or admin"})
		return
	}

	startDate, endDate, ok := readAdminDateRange(c)
	if !ok {
		return
	}

	users, _, err := h.userRepo.ListAdminUsers(c.Query("search"), role, startDate, endDate, 100000, 0)
	if err != nil {
		log.Printf("Failed to export admin users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "DATABASE_ERROR", "message": "Failed to export users"})
		return
	}

	filename := fmt.Sprintf("admin-users-%s.csv", time.Now().Format("20060102-150405"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	_ = writer.Write([]string{"id", "name", "email", "role", "merchant_name", "line_linked", "email_verified", "created_at"})
	for _, u := range users {
		merchantName := u.MerchantName
		_ = writer.Write([]string{
			u.ID.String(), u.Name, u.Email, string(u.Role), merchantName,
			strconv.FormatBool(u.LineLinked), strconv.FormatBool(u.EmailVerified), u.CreatedAt.Format(time.RFC3339),
		})
	}
}

// ExportAdminMerchants streams all matching admin merchants as CSV.
func (h *MerchantHandler) ExportAdminMerchants(c *gin.Context) {
	status := c.Query("status")
	validStatuses := map[string]bool{
		"": true, "active": true, "inactive": true, "trial": true,
		"pending": true, "suspended": true, "cancelled": true, "expired": true,
	}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_STATUS", "message": "Status must be active, inactive, trial, pending, suspended, cancelled, or expired"})
		return
	}

	startDate, endDate, ok := readAdminDateRange(c)
	if !ok {
		return
	}

	merchants, _, err := h.merchantRepo.ListAdminMerchants(status, c.Query("search"), startDate, endDate, 100000, 0)
	if err != nil {
		log.Printf("Failed to export admin merchants: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "DATABASE_ERROR", "message": "Failed to export merchants"})
		return
	}

	filename := fmt.Sprintf("admin-merchants-%s.csv", time.Now().Format("20060102-150405"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	_ = writer.Write([]string{"id", "shop_name", "owner_email", "owner_name", "is_active", "subscription_status", "plan", "total_scans", "total_transactions", "line_connected", "created_at"})
	for _, m := range merchants {
		_ = writer.Write([]string{
			m.ID.String(), m.ShopName, m.OwnerEmail, m.OwnerName, strconv.FormatBool(m.IsActive),
			m.SubscriptionStatus, m.Plan, strconv.Itoa(m.TotalScans), strconv.Itoa(m.TotalTransactions),
			strconv.FormatBool(m.LineConnected), m.CreatedAt.Format(time.RFC3339),
		})
	}
}

// ExportAdminPayments streams all matching admin payment logs as CSV.
func (h *MerchantHandler) ExportAdminPayments(c *gin.Context) {
	status := c.Query("status")
	validStatuses := map[string]bool{"": true, "pending": true, "success": true, "failed": true, "refunded": true}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_STATUS", "message": "Status must be pending, success, failed, or refunded"})
		return
	}

	startDate, endDate, ok := readAdminDateRange(c)
	if !ok {
		return
	}

	payments, _, err := h.merchantRepo.ListPaymentLogs(status, startDate, endDate, 100000, 0)
	if err != nil {
		log.Printf("Failed to export admin payments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "DATABASE_ERROR", "message": "Failed to export payments"})
		return
	}

	filename := fmt.Sprintf("admin-payments-%s.csv", time.Now().Format("20060102-150405"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	_ = writer.Write([]string{"id", "merchant_name", "amount", "currency", "gateway", "gateway_reference_id", "status", "paid_at", "created_at"})
	for _, p := range payments {
		paidAt := ""
		if p.PaidAt != nil {
			paidAt = p.PaidAt.Format(time.RFC3339)
		}
		_ = writer.Write([]string{
			p.ID.String(), p.MerchantName, fmt.Sprintf("%.2f", p.Amount), p.Currency, p.Gateway,
			p.GatewayReferenceID, p.Status, paidAt, p.CreatedAt.Format(time.RFC3339),
		})
	}
}

// GetAdminBankStatus reports the status of the bank validation integration (mock or live).
func (h *MerchantHandler) GetAdminBankStatus(c *gin.Context) {
	banks, err := services.NewBankValidationService().GetBankStatus()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"configured": false,
				"message":    err.Error(),
				"banks":      []services.BankStatus{},
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"configured": true,
			"banks":      banks,
		},
	})
}

// GetAdminMerchantTransactions returns transaction logs for one merchant.
func (h *MerchantHandler) GetAdminMerchantTransactions(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid merchant ID",
		})
		return
	}

	if _, err := h.merchantRepo.FindByID(merchantID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "NOT_FOUND",
			"message": "Merchant not found",
		})
		return
	}

	page, limit := readPagination(c, 20)
	filters, ok := readAdminTransactionFilters(c, limit, (page-1)*limit)
	if !ok {
		return
	}

	transactions, err := h.transactionRepo.ListByMerchant(merchantID, filters)
	if err != nil {
		log.Printf("Failed to list admin merchant transactions for %s: %v", merchantID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve merchant transactions",
		})
		return
	}

	total, err := h.transactionRepo.CountByMerchant(merchantID, filters)
	if err != nil {
		log.Printf("Failed to count admin merchant transactions for %s: %v", merchantID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to count merchant transactions",
		})
		return
	}

	items := make([]models.Transaction, 0, len(transactions))
	for _, transaction := range transactions {
		items = append(items, *transaction)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.TransactionListResponse{
			Items:      items,
			Pagination: buildPagination(page, limit, total),
		},
	})
}

// GetAdminAnalyticsDashboard returns platform-level KPI analytics.
func (h *MerchantHandler) GetAdminAnalyticsDashboard(c *gin.Context) {
	dashboard, err := h.merchantRepo.GetAdminAnalyticsDashboard()
	if err != nil {
		log.Printf("Failed to load admin analytics dashboard: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve admin analytics dashboard",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    dashboard,
	})
}

// GetAdminRevenueAnalytics returns revenue analytics for administrators.
func (h *MerchantHandler) GetAdminRevenueAnalytics(c *gin.Context) {
	period := c.DefaultQuery("period", "monthly")
	if period != "monthly" && period != "yearly" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Period must be monthly or yearly",
		})
		return
	}

	revenue, err := h.merchantRepo.GetAdminRevenueAnalytics(period)
	if err != nil {
		log.Printf("Failed to load admin revenue analytics: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve admin revenue analytics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    revenue,
	})
}

// GetAdminMerchantPerformance returns merchant usage analytics for administrators.
func (h *MerchantHandler) GetAdminMerchantPerformance(c *gin.Context) {
	performance, err := h.merchantRepo.GetAdminMerchantPerformance()
	if err != nil {
		log.Printf("Failed to load admin merchant performance: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve admin merchant performance",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    performance,
	})
}

// GetAdminMerchantDetail returns full merchant detail for administrators.
func (h *MerchantHandler) GetAdminMerchantDetail(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid merchant ID",
		})
		return
	}

	merchant, err := h.merchantRepo.FindByID(merchantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "NOT_FOUND",
			"message": "Merchant not found",
		})
		return
	}

	var subscription *models.Subscription
	var usage models.AdminMerchantUsage
	if sub, err := h.merchantRepo.FindByMerchantID(merchantID); err == nil {
		subscription = sub
		periodStart, resetDate := models.QuotaPeriodFor(sub.StartedAt, time.Now())
		quota := 0
		remaining := 0
		if sub.Plan != nil {
			quota = sub.Plan.QuotaPerMonth
			remaining = sub.RemainingQuota
		}
		usage, err = h.merchantRepo.GetAdminMerchantUsage(merchantID, periodStart, quota, remaining, resetDate)
		if err != nil {
			log.Printf("Failed to load admin merchant usage for %s: %v", merchantID, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "DATABASE_ERROR",
				"message": "Failed to retrieve merchant usage",
			})
			return
		}
	} else {
		now := time.Now()
		usage, err = h.merchantRepo.GetAdminMerchantUsage(merchantID, now, 0, 0, now)
		if err != nil {
			log.Printf("Failed to load admin merchant usage for %s: %v", merchantID, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "DATABASE_ERROR",
				"message": "Failed to retrieve merchant usage",
			})
			return
		}
	}

	lineConfig, _ := h.merchantRepo.GetLINEWebhookConfig(merchantID)
	lineConnected := lineConfig != nil && lineConfig.IsConfigured

	payments, err := h.merchantRepo.ListPaymentLogsByMerchant(merchantID, 10)
	if err != nil {
		log.Printf("Failed to load admin merchant payments for %s: %v", merchantID, err)
		payments = []models.PaymentLog{}
	}

	billing, err := h.merchantRepo.GetAdminMerchantBillingSummary(merchantID)
	if err != nil {
		log.Printf("Failed to load admin merchant billing for %s: %v", merchantID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "DATABASE_ERROR",
			"message": "Failed to retrieve merchant billing summary",
		})
		return
	}

	users, err := h.userRepo.FindByMerchantID(merchantID)
	if err != nil {
		users = []*models.User{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": models.AdminMerchantDetailResponse{
			Merchant:      merchant,
			Subscription:  subscription,
			Usage:         usage,
			Billing:       billing,
			LineConnected: lineConnected,
			LineWebhook:   lineConfig,
			Payments:      payments,
			Users:         users,
		},
	})
}

func buildPagination(page int, limit int, total int) models.Pagination {
	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return models.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

// readAdminDateRange parses optional start_date/end_date query params (YYYY-MM-DD)
// shared by the admin users/merchants/payments list and export endpoints.
func readAdminDateRange(c *gin.Context) (startDate *time.Time, endDate *time.Time, ok bool) {
	if value := c.Query("start_date"); value != "" {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "Invalid start_date. Use YYYY-MM-DD"})
			return nil, nil, false
		}
		startDate = &parsed
	}

	if value := c.Query("end_date"); value != "" {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "Invalid end_date. Use YYYY-MM-DD"})
			return nil, nil, false
		}
		endDate = &parsed
	}

	if startDate != nil && endDate != nil && endDate.Before(*startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "VALIDATION_ERROR", "message": "end_date must be after start_date"})
		return nil, nil, false
	}

	return startDate, endDate, true
}

func readAdminTransactionFilters(c *gin.Context, limit int, offset int) (models.TransactionFilters, bool) {
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

func (h *MerchantHandler) deactivateSubscription(customerID string) error {
	// This would find the merchant by Stripe customer ID and update subscription status
	// For now, this is a placeholder
	return nil
}
