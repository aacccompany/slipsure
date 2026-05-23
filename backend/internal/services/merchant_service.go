package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
)

// MerchantService handles merchant business logic
type MerchantService struct {
	merchantRepo repositories.MerchantRepository
	stripeService *StripeService
}

// NewMerchantService creates a new merchant service instance
func NewMerchantService(merchantRepo repositories.MerchantRepository, stripeService *StripeService) *MerchantService {
	return &MerchantService{
		merchantRepo:  merchantRepo,
		stripeService: stripeService,
	}
}

// Plan operations

// GetAllPlans retrieves all available subscription plans
func (s *MerchantService) GetAllPlans() (*models.PlanListResponse, error) {
	plans, err := s.merchantRepo.GetAllPlans()
	if err != nil {
		return nil, err
	}

	return &models.PlanListResponse{
		Plans: plans,
	}, nil
}

// GetPlanByID retrieves a specific plan
func (s *MerchantService) GetPlanByID(planID string) (*models.SubscriptionPlan, error) {
	return s.merchantRepo.GetPlanByID(planID)
}

// Subscription operations

// CreateCheckout creates a Stripe checkout session for subscription
func (s *MerchantService) CreateCheckout(userID uuid.UUID, userEmail string, req *models.CheckoutRequest) (*models.CheckoutResponse, error) {
	// Check if Stripe service is available
	if s.stripeService == nil {
		return nil, errors.New("stripe service is not available. please configure STRIPE_SECRET_KEY and STRIPE_PRICE_ID_* environment variables")
	}

	// Validate plan exists
	plan, err := s.merchantRepo.GetPlanByID(req.PlanID)
	if err != nil {
		return nil, fmt.Errorf("invalid plan ID '%s': %w", req.PlanID, err)
	}

	// Log plan validation
	fmt.Printf("Plan validated: %s (%s) - %.2f THB/%s for user %s\n", plan.Name, plan.ID, plan.PriceMonthly, req.BillingCycle, userEmail)

	// Create Stripe checkout session with real email
	checkoutResp, err := s.stripeService.CreateCheckoutSession(userID, userEmail, req.PlanID, string(req.BillingCycle))
	if err != nil {
		return nil, fmt.Errorf("stripe checkout failed: %w", err)
	}

	return checkoutResp, nil
}

// GetSubscription retrieves current merchant subscription
func (s *MerchantService) GetSubscription(merchantID uuid.UUID) (*models.SubscriptionResponse, error) {
	subscription, err := s.merchantRepo.FindByMerchantID(merchantID)
	if err != nil {
		return nil, err
	}

	return &models.SubscriptionResponse{
		Subscription: subscription,
	}, nil
}

// CancelSubscription cancels merchant subscription
func (s *MerchantService) CancelSubscription(merchantID uuid.UUID, req *models.CancelSubscriptionRequest) error {
	subscription, err := s.merchantRepo.FindByMerchantID(merchantID)
	if err != nil {
		return err
	}

	// Cancel in Stripe if there's a subscription ID
	if subscription.StripeSubscriptionID != nil {
		// Check if Stripe service is available
		if s.stripeService == nil {
			return errors.New("stripe service is not available. please configure STRIPE_SECRET_KEY")
		}

		err := s.stripeService.CancelSubscription(*subscription.StripeSubscriptionID, !req.CancelImmediately)
		if err != nil {
			return err
		}
	}

	// Update in database
	err = s.merchantRepo.CancelSubscription(merchantID, req.Reason)
	if err != nil {
		return err
	}

	return nil
}

// Merchant profile operations

// CreateProfile creates a new merchant shop profile
func (s *MerchantService) CreateProfile(ownerID uuid.UUID, req *models.CreateMerchantProfileRequest) (*models.MerchantProfileResponse, error) {
	// Check if merchant already exists
	_, err := s.merchantRepo.FindByOwnerID(ownerID)
	if err == nil {
		return nil, errors.New("merchant profile already exists")
	}

	// Create new merchant profile
	profile := &models.MerchantProfile{
		ID:            uuid.New(),
		OwnerID:       ownerID,
		ShopName:      req.ShopName,
		Address:       req.Address,
		ContactEmail:  req.ContactEmail,
		ContactPhone:  req.ContactPhone,
		BusinessHours: req.BusinessHours,
		StrictMode:    req.StrictMode, // Direct boolean field
		IsActive:      true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Save to database
	err = s.merchantRepo.CreateMerchant(profile)
	if err != nil {
		return nil, err
	}

	return &models.MerchantProfileResponse{
		Profile: profile,
	}, nil
}

// GetProfile retrieves merchant shop profile
func (s *MerchantService) GetProfile(merchantID uuid.UUID) (*models.MerchantProfileResponse, error) {
	profile, err := s.merchantRepo.FindByID(merchantID)
	if err != nil {
		return nil, err
	}

	return &models.MerchantProfileResponse{
		Profile: profile,
	}, nil
}

// UpdateProfile updates merchant shop profile
func (s *MerchantService) UpdateProfile(merchantID uuid.UUID, req *models.UpdateMerchantProfileRequest) error {
	profile, err := s.merchantRepo.FindByID(merchantID)
	if err != nil {
		return err
	}

	// Update fields
	profile.ShopName = req.ShopName
	profile.Address = req.Address
	profile.ContactEmail = req.ContactEmail
	profile.ContactPhone = req.ContactPhone
	profile.BusinessHours = req.BusinessHours
	if req.StrictMode != nil {
		profile.StrictMode = *req.StrictMode
	}

	// Save to database
	return s.merchantRepo.UpdateMerchant(profile)
}

// UploadLogo updates merchant logo URL
func (s *MerchantService) UploadLogo(merchantID uuid.UUID, logoURL string) error {
	return s.merchantRepo.UpdateLogo(merchantID, logoURL)
}

// Settings operations

// GetSettings retrieves merchant settings
func (s *MerchantService) GetSettings(merchantID uuid.UUID) (*models.MerchantSettingsResponse, error) {
	settings, err := s.merchantRepo.GetSettings(merchantID)
	if err != nil {
		return nil, err
	}

	return &models.MerchantSettingsResponse{
		Settings: settings,
	}, nil
}

// UpdateSettings updates merchant settings
func (s *MerchantService) UpdateSettings(merchantID uuid.UUID, req *models.UpdateMerchantSettingsRequest) error {
	// Get current settings
	currentSettings, err := s.merchantRepo.GetSettings(merchantID)
	if err != nil {
		return err
	}

	// Update provided settings
	if req.NotificationPreferences != nil {
		currentSettings.NotificationPreferences = *req.NotificationPreferences
	}
	if req.BusinessPreferences != nil {
		currentSettings.BusinessPreferences = *req.BusinessPreferences
	}

	currentSettings.UpdatedAt = time.Now()

	// Save to database
	return s.merchantRepo.UpdateSettings(currentSettings)
}

// Quota operations

// GetQuotaStatus retrieves current quota usage status
func (s *MerchantService) GetQuotaStatus(merchantID uuid.UUID) (*models.QuotaStatus, error) {
	return s.merchantRepo.GetQuotaStatus(merchantID)
}

// IncrementUsage increments merchant usage counter
func (s *MerchantService) IncrementUsage(merchantID uuid.UUID) error {
	now := time.Now()
	return s.merchantRepo.UpdateUsageCounter(merchantID, now.Year(), int(now.Month()), 1)
}

// ProcessWebhookEvent processes Stripe webhook events
func (s *MerchantService) ProcessWebhookEvent(eventType string, event interface{}) error {
	switch eventType {
	case "checkout.session.completed":
		// Activate subscription
		return s.handleCheckoutCompleted(event)
	case "customer.subscription.deleted":
		// Deactivate subscription
		return s.handleSubscriptionDeleted(event)
	case "invoice.paid":
		// Update quota/billing
		return s.handleInvoicePaid(event)
	default:
		// Log unhandled event type
		return nil
	}
}

// handleCheckoutCompleted handles checkout.session.completed event
func (s *MerchantService) handleCheckoutCompleted(event interface{}) error {
	// This would be called from the webhook handler
	// The actual implementation would extract the needed data from the event
	// and update the database accordingly
	return nil
}

// handleSubscriptionDeleted handles customer.subscription.deleted event
func (s *MerchantService) handleSubscriptionDeleted(event interface{}) error {
	// This would be called from the webhook handler
	// The actual implementation would extract the customer ID and update the database
	return nil
}

// handleInvoicePaid handles invoice.paid event
func (s *MerchantService) handleInvoicePaid(event interface{}) error {
	// This would be called from the webhook handler
	// The actual implementation would reset usage counters or update billing status
	return nil
}