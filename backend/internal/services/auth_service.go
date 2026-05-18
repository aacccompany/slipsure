package services

import (
	"errors"
	"fmt"
	"log"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
	"slipsure-backend/internal/utils"

	"github.com/google/uuid"
)

// AuthService defines the interface for authentication business logic
type AuthService interface {
	Register(req *models.RegisterRequest) (*models.RegisterResponse, error)
	Login(req *models.LoginRequest) (*models.AuthResponse, error)
	LineLogin(req *models.LineLoginRequest) (*models.LineLoginResponse, error)
	VerifyOTP(req *models.VerifyOTPRequest) (*models.VerifyOTPResponse, error)
	ResendOTP(email string) error
	ForgotPassword(email string) error
	ResetPassword(req *models.ResetPasswordRequest) error
	GetProfile(userID uuid.UUID) (*models.UserProfileResponse, error)
	UpdateProfile(userID uuid.UUID, req *models.UpdateProfileRequest) error
	Logout(userID uuid.UUID) error
}

// authService implements AuthService interface
type authService struct {
	userRepo   repositories.UserRepository
	otpService OTPService
	lineOAuth  *LineOAuthService
}

// NewAuthService creates a new auth service instance with Redis OTP
func NewAuthService(userRepo repositories.UserRepository) AuthService {
	// This should not be called directly, use NewAuthServiceWithOTP instead
	panic("Use NewAuthServiceWithOTP with Redis OTP service")
}

// NewAuthServiceWithOTP creates a new auth service instance with custom OTP and LINE OAuth services
func NewAuthServiceWithOTP(userRepo repositories.UserRepository, otpService OTPService, lineOAuth *LineOAuthService) AuthService {
	return &authService{
		userRepo:   userRepo,
		otpService: otpService,
		lineOAuth:  lineOAuth,
	}
}

// Register handles user registration logic
func (s *authService) Register(req *models.RegisterRequest) (*models.RegisterResponse, error) {
	// Check if email already exists
	emailExists, err := s.userRepo.EmailExists(req.Email)
	if err != nil {
		log.Printf("Error checking email existence: %v", err)
		return nil, errors.New("failed to validate email")
	}

	if emailExists {
		return nil, errors.New("email already registered")
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		return nil, errors.New("failed to process password")
	}

	// Create user model
	user := &models.User{
		Name:          req.Name,
		Email:         req.Email,
		PasswordHash:  hashedPassword,
		Role:          models.RoleMerchant,
		EmailVerified: false,
	}

	if req.Phone != "" {
		user.Phone = &req.Phone
	}

	// Debug logging
	log.Printf("Creating user with role: %s", user.Role)

	// Save user to database
	log.Printf("Attempting to create user: %s (%s)", user.Name, user.Email)
	if err := s.userRepo.Create(user); err != nil {
		log.Printf("Error creating user: %v", err)
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	log.Printf("User created successfully with ID: %s", user.ID)

	// Generate and store OTP
	log.Printf("Generating OTP for user %s", user.ID)
	otp := s.otpService.GenerateOTP()
	log.Printf("OTP generated: %s", otp)

	if err := s.otpService.StoreOTP(user.ID, otp); err != nil {
		log.Printf("Error storing OTP: %v", err)
		return nil, errors.New("failed to generate verification code")
	}
	log.Printf("OTP stored successfully for user %s", user.ID)

	// Send OTP email
	if err := s.otpService.SendOTP(user.Email, otp); err != nil {
		log.Printf("Error sending OTP email: %v", err)
		return &models.RegisterResponse{
			UserID:  user.ID,
			Email:   user.Email,
			OTPSent: false,
			Message: "Registration successful but failed to send verification email.",
		}, nil
	}

	return &models.RegisterResponse{
		UserID:  user.ID,
		Email:   user.Email,
		OTPSent: true,
		Message: "Registration successful. Please verify your email.",
	}, nil
}

// Login handles user login logic
func (s *authService) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	// Find user by email
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		log.Printf("Error finding user by email: %v", err)
		return nil, errors.New("invalid email or password")
	}

	// Verify password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	// Check if email is verified
	if !user.EmailVerified {
		// For now, allow login even if email not verified
		// TODO: You might want to enforce email verification
		log.Printf("Warning: User %s logging in without email verification", req.Email)
	}

	// Generate JWT token
	accessToken, err := utils.GenerateToken(user.ID, nil, string(user.Role), user.Email)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		return nil, errors.New("failed to generate authentication token")
	}

	// TODO: Generate refresh token (for now, use access token as both)
	refreshToken := accessToken // TODO: Implement proper refresh token logic

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600, // 1 hour
		User:         *user,
	}, nil
}

// LineLogin handles LINE OAuth login logic
func (s *authService) LineLogin(req *models.LineLoginRequest) (*models.LineLoginResponse, error) {
	if s.lineOAuth == nil {
		return nil, errors.New("LINE OAuth service is not configured")
	}

	// Exchange authorization code for access token
	tokenResp, err := s.lineOAuth.ExchangeCodeForToken(req.Code, req.RedirectURI)
	if err != nil {
		log.Printf("Error exchanging code for token: %v", err)
		return nil, errors.New("failed to authenticate with LINE")
	}

	// Get user profile from LINE
	profile, err := s.lineOAuth.GetUserProfile(tokenResp.AccessToken)
	if err != nil {
		log.Printf("Error getting LINE user profile: %v", err)
		return nil, errors.New("failed to retrieve user profile from LINE")
	}

	// Check if user exists by LINE user ID
	user, err := s.userRepo.FindByLineUserID(profile.UserID)
	isNewUser := false

	if err != nil {
		// User not found, create new user
		isNewUser = true

		// Create new user from LINE profile
		user = &models.User{
			Name:          profile.DisplayName,
			Email:         "", // LINE doesn't provide email by default
			Role:          models.RoleMerchant,
			LineUserID:    &profile.UserID,
			LineLinked:    true,
			EmailVerified: false, // Will need to add email later
			PasswordHash:  "",    // No password for LINE users
		}

		// Save user to database
		if err := s.userRepo.Create(user); err != nil {
			log.Printf("Error creating LINE user: %v", err)
			return nil, errors.New("failed to create user account")
		}

		log.Printf("New user created via LINE login: %s (LINE ID: %s)", user.ID, profile.UserID)
	} else {
		// Existing user found, update LINE link status
		if !user.LineLinked {
			user.LineLinked = true
			user.LineUserID = &profile.UserID
			if err := s.userRepo.Update(user); err != nil {
				log.Printf("Error updating user LINE link: %v", err)
				// Continue anyway
			}
		}
		log.Printf("Existing user logged in via LINE: %s (LINE ID: %s)", user.ID, profile.UserID)
	}

	// Generate JWT token
	accessToken, err := utils.GenerateToken(user.ID, user.MerchantID, string(user.Role), user.Email)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		return nil, errors.New("failed to generate authentication token")
	}

	return &models.LineLoginResponse{
		AccessToken:  accessToken,
		RefreshToken: accessToken, // TODO: Implement proper refresh token
		ExpiresIn:    3600,
		IsNewUser:    isNewUser,
		User:         *user,
	}, nil
}

// VerifyOTP handles OTP verification logic
func (s *authService) VerifyOTP(req *models.VerifyOTPRequest) (*models.VerifyOTPResponse, error) {
	// Find user by email
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		log.Printf("Error finding user by email: %v", err)
		return nil, errors.New("user not found")
	}

	// Verify OTP
	valid, err := s.otpService.VerifyOTP(user.ID, req.OTP)
	if err != nil {
		return nil, err
	}

	if !valid {
		return nil, errors.New("invalid or expired OTP")
	}

	// Mark email as verified
	if err := s.userRepo.UpdateEmailVerification(user.ID, true); err != nil {
		log.Printf("Error updating email verification: %v", err)
		return nil, errors.New("failed to verify email")
	}

	// Generate JWT token
	accessToken, err := utils.GenerateToken(user.ID, user.MerchantID, string(user.Role), user.Email)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		return nil, errors.New("failed to generate authentication token")
	}

	return &models.VerifyOTPResponse{
		AccessToken:  accessToken,
		RefreshToken: accessToken, // TODO: Implement proper refresh token
		ExpiresIn:    3600,
		Message:      "Email verified successfully",
	}, nil
}

// ResendOTP handles resending OTP for email verification
func (s *authService) ResendOTP(email string) error {
	// Find user by email
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		// Don't reveal if email exists or not
		log.Printf("Resend OTP attempt for non-existent email: %s", email)
		return nil
	}

	// Check if email is already verified
	if user.EmailVerified {
		return errors.New("email is already verified")
	}

	// Generate and store new OTP
	otp := s.otpService.GenerateOTP()
	if err := s.otpService.StoreOTP(user.ID, otp); err != nil {
		log.Printf("Error storing OTP for resend: %v", err)
		return errors.New("failed to generate verification code")
	}

	// Send OTP email
	if err := s.otpService.SendOTP(user.Email, otp); err != nil {
		log.Printf("Error sending OTP email: %v", err)
		return errors.New("failed to send verification email")
	}

	log.Printf("✅ OTP resent to %s", email)
	return nil
}

// ForgotPassword handles forgot password logic
func (s *authService) ForgotPassword(email string) error {
	// Find user by email
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		// Don't reveal if email exists or not
		log.Printf("Forgot password attempt for non-existent email: %s", email)
		return nil
	}

	// Generate and store OTP
	otp := s.otpService.GenerateOTP()
	if err := s.otpService.StoreOTP(user.ID, otp); err != nil {
		log.Printf("Error storing OTP for password reset: %v", err)
		return errors.New("failed to generate reset code")
	}

	// Send OTP email
	if err := s.otpService.SendPasswordResetOTP(user.Email, otp); err != nil {
		log.Printf("Error sending password reset email: %v", err)
		return errors.New("failed to send reset email")
	}

	log.Printf("Password reset OTP sent to %s", email)
	return nil
}

// ResetPassword handles password reset logic
func (s *authService) ResetPassword(req *models.ResetPasswordRequest) error {
	// Find user by email
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return errors.New("user not found")
	}

	// Verify OTP
	valid, err := s.otpService.VerifyOTP(user.ID, req.OTP)
	if err != nil {
		return err
	}

	if !valid {
		return errors.New("invalid or expired reset code")
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		return errors.New("failed to process password")
	}

	// Update user password
	user.PasswordHash = hashedPassword
	if err := s.userRepo.Update(user); err != nil {
		log.Printf("Error updating password: %v", err)
		return errors.New("failed to update password")
	}

	log.Printf("Password reset successful for user %s", user.Email)
	return nil
}

// GetProfile retrieves user profile
func (s *authService) GetProfile(userID uuid.UUID) (*models.UserProfileResponse, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	return &models.UserProfileResponse{
		ID:            user.ID,
		Name:          user.Name,
		Email:         user.Email,
		Phone:         user.Phone,
		Role:          user.Role,
		MerchantID:    user.MerchantID,
		LineLinked:    user.LineLinked,
		EmailVerified: user.EmailVerified,
		CreatedAt:     user.CreatedAt,
	}, nil
}

// UpdateProfile updates user profile
func (s *authService) UpdateProfile(userID uuid.UUID, req *models.UpdateProfileRequest) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return errors.New("user not found")
	}

	// Update fields
	user.Name = req.Name
	if req.Phone != "" {
		user.Phone = &req.Phone
	}

	if err := s.userRepo.Update(user); err != nil {
		log.Printf("Error updating user profile: %v", err)
		return errors.New("failed to update profile")
	}

	return nil
}

// Logout handles user logout (TODO: implement token invalidation)
func (s *authService) Logout(userID uuid.UUID) error {
	// TODO: Implement token invalidation logic
	// For now, just log the logout
	log.Printf("User %s logged out", userID)
	return nil
}
