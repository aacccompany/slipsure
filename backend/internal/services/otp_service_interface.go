package services

import (
	"github.com/google/uuid"
)

// OTPService defines the interface for OTP operations
// This interface is implemented by RedisOTPService for fast, ephemeral OTP storage
type OTPService interface {
	GenerateOTP() string
	StoreOTP(userID uuid.UUID, otp string) error
	SendOTP(email, otp string) error
	SendPasswordResetOTP(email, otp string) error
	VerifyOTP(userID uuid.UUID, otp string) (bool, error)
}
