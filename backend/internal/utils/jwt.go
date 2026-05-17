package utils

import (
	"errors"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTClaims represents JWT claims structure
type JWTClaims struct {
	UserID    string `json:"sub"`
	MerchantID *string `json:"merchant_id,omitempty"`
	Role      string `json:"role"`
	Email     string `json:"email"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for a user
func GenerateToken(userID uuid.UUID, merchantID *uuid.UUID, role, email string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-super-secret-jwt-key-change-in-production"
	}

	expiresIn := os.Getenv("JWT_EXPIRES_IN")
	if expiresIn == "" {
		expiresIn = "3600" // 1 hour default
	}

	expirationTime, err := time.ParseDuration(expiresIn + "s")
	if err != nil {
		expirationTime = 1 * time.Hour
	}

	// Convert UUIDs to strings for JWT
	var merchantIDStr *string
	if merchantID != nil {
		str := merchantID.String()
		merchantIDStr = &str
	}

	claims := JWTClaims{
		UserID:    userID.String(),
		MerchantID: merchantIDStr,
		Role:      role,
		Email:     email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expirationTime)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenString string) (*JWTClaims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-super-secret-jwt-key-change-in-production"
	}

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		// Debug: log the extracted claims
		log.Printf("🔑 JWT: Extracted claims - UserID='%s', Email='%s', Role='%s'", claims.UserID, claims.Email, claims.Role)
		return claims, nil
	}

	return nil, errors.New("invalid token")
}