package middleware

import (
	"log"
	"net/http"
	"strings"

	"slipsure-backend/internal/utils"
	"slipsure-backend/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestPath := c.Request.URL.Path
		log.Printf("AuthMiddleware: START %s", requestPath)

		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Printf("AuthMiddleware: FAIL - Missing auth header for %s", requestPath)
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "Missing authorization header",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			log.Printf("AuthMiddleware: FAIL - Invalid auth format for %s", requestPath)
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "Invalid authorization format",
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			log.Printf("AuthMiddleware: FAIL - Token validation failed for %s: %v", requestPath, err)
			tokenPreview := tokenString
			if len(tokenString) > 20 {
				tokenPreview = tokenString[:20] + "..."
			}
			log.Printf(" Auth: Failed token preview: %s", tokenPreview)
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Debug logging
		log.Printf("DEBUG: UserID from claims: %s (type: %T)", claims.UserID, claims.UserID)

		// Set user context (only user_id, email, role)
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)

		// Debug: log the user ID being set
		log.Printf("AuthMiddleware: SUCCESS - Setting user_id='%s' for email=%s, path=%s", claims.UserID, claims.Email, requestPath)

		c.Next()

		log.Printf("AuthMiddleware: END %s (after handler)", requestPath)
	}
}

// EmailVerificationMiddleware checks if user's email is verified
func EmailVerificationMiddleware(userRepo repositories.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context (set by AuthMiddleware)
		userIDStr, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		// Parse user ID
		userID, err := uuid.Parse(userIDStr.(string))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "INVALID_USER_ID",
				"message": "Invalid user ID format",
			})
			c.Abort()
			return
		}

		// Get user from database
		user, err := userRepo.FindByID(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "USER_NOT_FOUND",
				"message": "User not found",
			})
			c.Abort()
			return
		}

		// Check if email is verified
		if !user.EmailVerified {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "EMAIL_NOT_VERIFIED",
				"message": "Please verify your email before accessing this feature. Check your inbox for the OTP code.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
