package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

// RedisOTPService handles OTP operations using Redis for fast storage with auto-expiration
type RedisOTPService struct {
	client      *redis.Client
	emailService EmailService
}

// OTPData represents the structure stored in Redis
type OTPData struct {
	OTP       string    `json:"otp"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// NewRedisOTPService creates a new Redis-based OTP service
func NewRedisOTPService(redisAddr string, emailService EmailService) (*RedisOTPService, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("✅ Redis OTP service initialized")
	return &RedisOTPService{
		client:      client,
		emailService: emailService,
	}, nil
}

// GenerateOTP generates a 6-digit OTP code
func (s *RedisOTPService) GenerateOTP() string {
	max := int64(1000000)
	otp := fmt.Sprintf("%06d", time.Now().UnixNano()%max)
	return otp
}

// StoreOTP stores OTP in Redis with 15-minute expiration
func (s *RedisOTPService) StoreOTP(userID uuid.UUID, otp string) error {
	ctx := context.Background()

	// OTP expires in 15 minutes
	expiresAt := time.Now().Add(15 * time.Minute)

	otpData := OTPData{
		OTP:       otp,
		CreatedAt: time.Now(),
		ExpiresAt: expiresAt,
	}

	// Serialize to JSON
	data, err := json.Marshal(otpData)
	if err != nil {
		return fmt.Errorf("failed to serialize OTP data: %w", err)
	}

	// Store in Redis with auto-expiration (15 minutes)
	key := s.getOTPKey(userID)
	if err := s.client.Set(ctx, key, data, 15*time.Minute).Err(); err != nil {
		return fmt.Errorf("failed to store OTP in Redis: %w", err)
	}

	log.Printf("🔐 OTP stored in Redis for user %s, expires at %s", userID, expiresAt.Format("15:04:05"))
	return nil
}

// VerifyOTP verifies an OTP code for a user
func (s *RedisOTPService) VerifyOTP(userID uuid.UUID, otp string) (bool, error) {
	ctx := context.Background()
	key := s.getOTPKey(userID)

	// Get OTP data from Redis
	val, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return false, nil // OTP not found or expired
		}
		return false, fmt.Errorf("failed to get OTP from Redis: %w", err)
	}

	// Deserialize OTP data
	var otpData OTPData
	if err := json.Unmarshal([]byte(val), &otpData); err != nil {
		return false, fmt.Errorf("failed to deserialize OTP data: %w", err)
	}

	// Check if OTP matches
	if otpData.OTP != otp {
		log.Printf("⚠️  Invalid OTP attempt for user %s", userID)
		return false, nil
	}

	// Check if expired
	if time.Now().After(otpData.ExpiresAt) {
		log.Printf("⏰ OTP expired for user %s", userID)
		return false, nil
	}

	// Delete OTP after successful verification (one-time use)
	s.client.Del(ctx, key)

	log.Printf("✅ OTP verified successfully for user %s", userID)
	return true, nil
}

// SendOTP sends OTP via email
func (s *RedisOTPService) SendOTP(email, otp string) error {
	return s.emailService.SendOTPEmail(email, otp)
}

// SendPasswordResetOTP sends password reset OTP via email
func (s *RedisOTPService) SendPasswordResetOTP(email, otp string) error {
	return s.emailService.SendPasswordResetEmail(email, otp)
}

// ClearOTP manually clears an OTP (optional)
func (s *RedisOTPService) ClearOTP(userID uuid.UUID) error {
	ctx := context.Background()
	key := s.getOTPKey(userID)
	return s.client.Del(ctx, key).Err()
}

// getOTPKey generates the Redis key for OTP storage
func (s *RedisOTPService) getOTPKey(userID uuid.UUID) string {
	return fmt.Sprintf("otp:%s", userID)
}

// Close closes the Redis connection
func (s *RedisOTPService) Close() error {
	return s.client.Close()
}