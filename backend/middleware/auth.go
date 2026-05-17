package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"slipsure-backend/internal/utils"
)

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
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
			log.Printf("❌ Auth: Token validation failed: %v", err)
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
		log.Printf("DEBUG: MerchantID from claims: %v", claims.MerchantID)

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		if claims.MerchantID != nil {
			c.Set("merchant_id", *claims.MerchantID)
		}

		// Debug: log the user ID being set
		log.Printf("🔐 Auth: Setting user_id='%s' for email=%s", claims.UserID, claims.Email)

		c.Next()
	}
}