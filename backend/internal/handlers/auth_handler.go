package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"slipsure-backend/internal/audit"
	"slipsure-backend/internal/models"
	"slipsure-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const blockedAccountMessage = "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService services.AuthService
	auditStore  *audit.Store
}

func (h *AuthHandler) SetAuditStore(store *audit.Store) { h.auditStore = store }

func (h *AuthHandler) recordAdminAuth(c *gin.Context, id *uuid.UUID, email, action, status string) {
	if h.auditStore == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	entry := audit.Entry{AdminID: id, AdminEmail: email, Action: action, Category: "authentication",
		Status: status, IPAddress: c.ClientIP(), UserAgent: c.Request.UserAgent()}
	if len(entry.UserAgent) > 500 {
		entry.UserAgent = entry.UserAgent[:500]
	}
	if err := h.auditStore.Write(ctx, entry); err != nil {
		log.Printf("Admin authentication audit write failed: %v", err)
	}
}

// NewAuthHandler creates a new auth handler instance
func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register handles POST /auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	response, err := h.authService.Register(&req)
	if err != nil {
		// Log the actual error for debugging
		log.Printf("Registration error for %s: %v", req.Email, err)

		// Check for specific error types
		statusCode := http.StatusConflict
		errorCode := "REGISTRATION_FAILED"

		errorMsg := err.Error()
		if strings.Contains(strings.ToLower(errorMsg), "email already registered") {
			errorCode = "EMAIL_EXISTS"
			statusCode = http.StatusConflict
		} else if strings.Contains(strings.ToLower(errorMsg), "failed to create user") {
			errorCode = "DATABASE_ERROR"
			statusCode = http.StatusInternalServerError
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   errorCode,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": response.Message,
		"data":    response,
	})
}

// VerifyOTP handles POST /auth/verify-otp
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req models.VerifyOTPRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	response, err := h.authService.VerifyOTP(&req)
	if err != nil {
		if errors.Is(err, services.ErrAccountBlocked) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "ACCOUNT_BLOCKED", "message": blockedAccountMessage})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "OTP_VERIFICATION_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": response.Message,
		"data":    response,
	})
}

// ResendOTP handles POST /auth/resend-otp
func (h *AuthHandler) ResendOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	err := h.authService.ResendOTP(req.Email)
	if err != nil {
		errorMsg := err.Error()
		if strings.Contains(strings.ToLower(errorMsg), "already verified") {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "EMAIL_ALREADY_VERIFIED",
				"message": "Email is already verified. You can login directly.",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "RESEND_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "New OTP sent successfully. Please check your email.",
	})
}

// Login handles POST /auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	response, err := h.authService.Login(&req)
	if err != nil {
		if h.auditStore != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
			adminID, isAdmin, lookupErr := h.auditStore.AdminByEmail(ctx, req.Email)
			cancel()
			if lookupErr == nil && isAdmin {
				h.recordAdminAuth(c, adminID, req.Email, "ADMIN_LOGIN", "failed")
			}
		}
		if errors.Is(err, services.ErrAccountBlocked) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "ACCOUNT_BLOCKED", "message": blockedAccountMessage})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": err.Error(),
		})
		return
	}
	if response.User.Role == models.RoleAdmin {
		id := response.User.ID
		h.recordAdminAuth(c, &id, response.User.Email, "ADMIN_LOGIN", "success")
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// LineLogin handles POST /auth/line-login
func (h *AuthHandler) LineLogin(c *gin.Context) {
	var req models.LineLoginRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	response, err := h.authService.LineLogin(&req)
	if err != nil {
		log.Printf("LINE login error: %v", err)
		if errors.Is(err, services.ErrAccountBlocked) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "ACCOUNT_BLOCKED", "message": blockedAccountMessage})
			return
		}

		errorCode := "LINE_LOGIN_FAILED"
		statusCode := http.StatusUnauthorized

		errorMsg := err.Error()
		if strings.Contains(strings.ToLower(errorMsg), "not configured") {
			errorCode = "SERVICE_UNAVAILABLE"
			statusCode = http.StatusServiceUnavailable
		} else if strings.Contains(strings.ToLower(errorMsg), "failed to authenticate") {
			errorCode = "INVALID_LINE_CODE"
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   errorCode,
			"message": err.Error(),
		})
		return
	}
	if response.User.Role == models.RoleAdmin {
		id := response.User.ID
		h.recordAdminAuth(c, &id, response.User.Email, "ADMIN_LINE_LOGIN", "success")
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ConnectLineAccount handles POST /auth/connect-line
func (h *AuthHandler) ConnectLineAccount(c *gin.Context) {
	// Get user ID from JWT context
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

	var req models.ConnectLineRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	response, err := h.authService.ConnectLineAccount(userID, &req)
	if err != nil {
		log.Printf("Connect LINE account error: %v", err)

		errorCode := "CONNECT_LINE_FAILED"
		statusCode := http.StatusBadRequest

		errorMsg := err.Error()
		if strings.Contains(strings.ToLower(errorMsg), "not available") {
			errorCode = "SERVICE_UNAVAILABLE"
			statusCode = http.StatusServiceUnavailable
		} else if strings.Contains(strings.ToLower(errorMsg), "already connected") {
			errorCode = "LINE_ALREADY_CONNECTED"
		} else if strings.Contains(strings.ToLower(errorMsg), "already linked") {
			errorCode = "LINE_ALREADY_LINKED_TO_ANOTHER_ACCOUNT"
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   errorCode,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ForgotPassword handles POST /auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	if err := h.authService.ForgotPassword(req.Email); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "FAILED_TO_SEND_RESET",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset OTP sent to email",
	})
}

// ResetPassword handles POST /auth/reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Call auth service
	if err := h.authService.ResetPassword(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "PASSWORD_RESET_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset successfully",
	})
}

// GetProfile handles GET /auth/me
func (h *AuthHandler) GetProfile(c *gin.Context) {
	// Get user ID from context (check existence first)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		log.Printf("GetProfile: user_id not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "User not authenticated",
		})
		return
	}

	// Parse UUID
	userUUID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		log.Printf("GetProfile UUID parsing failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_USER_ID",
			"message": "Invalid user ID",
		})
		return
	}

	// Call auth service
	profile, err := h.authService.GetProfile(userUUID)
	fmt.Println("profile :", profile)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "USER_NOT_FOUND",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    profile,
	})
}

// UpdateProfile handles PUT /auth/profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	// Get user ID from context (check existence first)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "User not authenticated",
		})
		return
	}

	var req models.UpdateProfileRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "VALIDATION_ERROR",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Parse UUID
	userUUID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_USER_ID",
			"message": "Invalid user ID",
		})
		return
	}

	// Call auth service
	if err := h.authService.UpdateProfile(userUUID, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "UPDATE_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
	})
}

// Logout handles POST /auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get user ID from context (check existence first)
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "UNAUTHORIZED",
			"message": "User not authenticated",
		})
		return
	}

	// Parse UUID
	userUUID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "INVALID_USER_ID",
			"message": "Invalid user ID",
		})
		return
	}

	// Call auth service
	if err := h.authService.Logout(userUUID); err != nil {
		if h.auditStore != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
			email, isAdmin, lookupErr := h.auditStore.Actor(ctx, userUUID)
			cancel()
			if lookupErr == nil && isAdmin {
				h.recordAdminAuth(c, &userUUID, email, "ADMIN_LOGOUT", "failed")
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "LOGOUT_FAILED",
			"message": err.Error(),
		})
		return
	}
	if h.auditStore != nil {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		email, isAdmin, lookupErr := h.auditStore.Actor(ctx, userUUID)
		cancel()
		if lookupErr == nil && isAdmin {
			h.recordAdminAuth(c, &userUUID, email, "ADMIN_LOGOUT", "success")
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}
