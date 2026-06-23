package services

import (
	"errors"
	"testing"
	"time"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/utils"

	"github.com/google/uuid"
)

type fakeUserRepository struct {
	user                *models.User
	updatePasswordCalls int
}

func (r *fakeUserRepository) Create(user *models.User) error {
	r.user = user
	return nil
}

func (r *fakeUserRepository) FindByID(id uuid.UUID) (*models.User, error) {
	if r.user != nil && r.user.ID == id {
		return r.user, nil
	}
	return nil, errors.New("user not found")
}

func (r *fakeUserRepository) FindByEmail(email string) (*models.User, error) {
	if r.user != nil && r.user.Email == email {
		return r.user, nil
	}
	return nil, errors.New("user not found")
}

func (r *fakeUserRepository) FindByLineUserID(lineUserID string) (*models.User, error) {
	if r.user != nil && r.user.LineUserID != nil && *r.user.LineUserID == lineUserID {
		return r.user, nil
	}
	return nil, errors.New("user not found")
}

func (r *fakeUserRepository) Update(user *models.User) error {
	r.user = user
	return nil
}

func (r *fakeUserRepository) UpdatePassword(userID uuid.UUID, passwordHash string) error {
	if r.user == nil || r.user.ID != userID {
		return errors.New("user not found")
	}
	r.updatePasswordCalls++
	r.user.PasswordHash = passwordHash
	r.user.UpdatedAt = time.Now()
	return nil
}

func (r *fakeUserRepository) UpdateEmailVerification(userID uuid.UUID, verified bool) error {
	if r.user == nil || r.user.ID != userID {
		return errors.New("user not found")
	}
	r.user.EmailVerified = verified
	return nil
}

func (r *fakeUserRepository) EmailExists(email string) (bool, error) {
	return r.user != nil && r.user.Email == email, nil
}

func (r *fakeUserRepository) LinkLineAccount(userID uuid.UUID, lineUserID string) error {
	if r.user == nil || r.user.ID != userID {
		return errors.New("user not found")
	}
	r.user.LineUserID = &lineUserID
	r.user.LineLinked = true
	return nil
}

func (r *fakeUserRepository) FindByMerchantID(merchantID uuid.UUID) ([]*models.User, error) {
	return nil, nil
}

type fakeOTPService struct {
	valid bool
}

func (s fakeOTPService) GenerateOTP() string { return "123456" }
func (s fakeOTPService) StoreOTP(userID uuid.UUID, otp string) error {
	return nil
}
func (s fakeOTPService) SendOTP(email, otp string) error { return nil }
func (s fakeOTPService) SendPasswordResetOTP(email, otp string) error {
	return nil
}
func (s fakeOTPService) VerifyOTP(userID uuid.UUID, otp string) (bool, error) {
	return s.valid, nil
}

func TestResetPasswordUpdatesPasswordHash(t *testing.T) {
	oldHash, err := utils.HashPassword("old-password")
	if err != nil {
		t.Fatalf("hash old password: %v", err)
	}

	userRepo := &fakeUserRepository{
		user: &models.User{
			ID:           uuid.New(),
			Name:         "Unik",
			Email:        "unik@example.com",
			PasswordHash: oldHash,
			Role:         models.RoleMerchant,
		},
	}
	authService := NewAuthServiceWithOTP(userRepo, nil, fakeOTPService{valid: true}, nil)

	err = authService.ResetPassword(&models.ResetPasswordRequest{
		Email:       "unik@example.com",
		OTP:         "123456",
		NewPassword: "new-password",
	})
	if err != nil {
		t.Fatalf("reset password: %v", err)
	}

	if userRepo.updatePasswordCalls != 1 {
		t.Fatalf("UpdatePassword calls = %d, want 1", userRepo.updatePasswordCalls)
	}
	if utils.CheckPassword("old-password", userRepo.user.PasswordHash) {
		t.Fatal("old password still matches after reset")
	}
	if !utils.CheckPassword("new-password", userRepo.user.PasswordHash) {
		t.Fatal("new password does not match stored hash")
	}
}

func TestLoginAllowsUnverifiedEmail(t *testing.T) {
	passwordHash, err := utils.HashPassword("new-password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	userRepo := &fakeUserRepository{
		user: &models.User{
			ID:            uuid.New(),
			Name:          "Unik",
			Email:         "unik@example.com",
			PasswordHash:  passwordHash,
			Role:          models.RoleMerchant,
			EmailVerified: false,
		},
	}
	authService := NewAuthServiceWithOTP(userRepo, nil, fakeOTPService{valid: true}, nil)

	response, err := authService.Login(&models.LoginRequest{
		Email:    "unik@example.com",
		Password: "new-password",
	})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if response.AccessToken == "" {
		t.Fatal("expected access token")
	}
}
