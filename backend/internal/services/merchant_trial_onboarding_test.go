package services

import (
	"database/sql"
	"testing"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
)

type onboardingMerchantRepo struct {
	repositories.MerchantRepository
	subscription *models.Subscription
	grants       int
}

func (r *onboardingMerchantRepo) FindByOwnerID(uuid.UUID) (*models.MerchantProfile, error) {
	return nil, sql.ErrNoRows
}

func (r *onboardingMerchantRepo) CreateMerchant(*models.MerchantProfile) error { return nil }

func (r *onboardingMerchantRepo) CreateSubscription(subscription *models.Subscription) error {
	r.subscription = subscription
	return nil
}

func (r *onboardingMerchantRepo) ActivateFreePlan(*models.Subscription, int) error {
	r.grants++
	return nil
}

type onboardingUserRepo struct{ repositories.UserRepository }

func (onboardingUserRepo) FindByID(id uuid.UUID) (*models.User, error) {
	return &models.User{ID: id}, nil
}

func (onboardingUserRepo) Update(*models.User) error { return nil }

func TestCreateProfileWaitsForLINEBeforeGrantingTrial(t *testing.T) {
	merchantRepo := &onboardingMerchantRepo{}
	service := NewMerchantService(merchantRepo, nil, onboardingUserRepo{})
	profile, err := service.CreateProfile(uuid.New(), &models.CreateMerchantProfileRequest{ShopName: "Test Shop"})
	if err != nil {
		t.Fatal(err)
	}
	if profile.Profile.ID == uuid.Nil || merchantRepo.subscription == nil {
		t.Fatal("merchant profile and pending subscription must be created")
	}
	if merchantRepo.subscription.PlanID != "plan-free" || merchantRepo.grants != 0 {
		t.Fatalf("plan = %q, trial grants = %d; want plan-free and 0", merchantRepo.subscription.PlanID, merchantRepo.grants)
	}
}
