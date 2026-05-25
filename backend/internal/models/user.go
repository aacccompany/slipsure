package models

import (
	"time"

	"github.com/google/uuid"
)

// UserRole represents user roles in the system
type UserRole string

const (
	RoleMerchant UserRole = "merchant"
	RoleAdmin    UserRole = "admin"
)

// User represents the domain model for a user
type User struct {
	ID             uuid.UUID  `json:"id,omitempty"` // Hide ID in responses unless explicitly requested
	Name           string     `json:"name"`
	Email          string     `json:"email"` // Email is the primary identifier
	Phone          *string    `json:"phone,omitempty"`
	PasswordHash   string     `json:"-"`
	Role           UserRole   `json:"role"`
	MerchantID     *uuid.UUID `json:"-"` // Hide internal merchant ID
	LineUserID     *string    `json:"line_user_id,omitempty"`
	LineLinked     bool       `json:"line_linked"`
	EmailVerified  bool       `json:"email_verified"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// Merchant represents the domain model for a merchant
type Merchant struct {
	ID           uuid.UUID `json:"id"`
	OwnerID      uuid.UUID `json:"owner_id"`
	ShopName     string    `json:"shop_name"`
	LogoURL      *string   `json:"logo_url,omitempty"`
	Address      *string   `json:"address,omitempty"`
	ContactEmail *string   `json:"contact_email,omitempty"`
	ContactPhone *string   `json:"contact_phone,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// RegisterRequest represents user registration request
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Phone    string `json:"phone,omitempty"`
}

// LoginRequest represents user login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	User         User   `json:"user"`
}

// RegisterResponse represents registration response
type RegisterResponse struct {
	Email   string `json:"email"`
	OTPSent bool   `json:"otp_sent_to"`
	Message string `json:"message"`
}

// VerifyOTPRequest represents OTP verification request
type VerifyOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required"`
}

// VerifyOTPResponse represents OTP verification response
type VerifyOTPResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Message      string `json:"message"`
}

// ForgotPasswordRequest represents forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents reset password request
type ResetPasswordRequest struct {
	Email       string `json:"email" binding:"required,email"`
	OTP         string `json:"otp" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// LineLoginRequest represents LINE login request
type LineLoginRequest struct {
	Code        string `json:"line_code" binding:"required"`
	RedirectURI string `json:"redirect_uri" binding:"required"`
}

// ConnectLineRequest represents connect LINE account request
type ConnectLineRequest struct {
	Code        string `json:"line_code" binding:"required"`
	RedirectURI string `json:"redirect_uri" binding:"required"`
}

// ConnectLineResponse represents connect LINE account response
type ConnectLineResponse struct {
	Message string `json:"message"`
	User    User   `json:"user"`
}

// UpdateProfileRequest represents profile update request
type UpdateProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Phone string `json:"phone,omitempty"`
}

// UserProfileResponse represents user profile response
type UserProfileResponse struct {
	ID           uuid.UUID  `json:"id"`
	Name         string     `json:"name"`
	Email        string     `json:"email"`
	Phone        *string    `json:"phone,omitempty"`
	Role         UserRole   `json:"role"`
	MerchantID   *uuid.UUID `json:"merchant_id,omitempty"`
	LineLinked   bool       `json:"line_linked"`
	EmailVerified bool      `json:"email_verified"`
	CreatedAt    time.Time  `json:"created_at"`
}

// LogoutResponse represents logout response
type LogoutResponse struct {
	Message string `json:"message"`
}

// LineLoginResponse represents LINE login response
type LineLoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	IsNewUser    bool   `json:"is_new_user"`
	User         User   `json:"user"`
}