package repositories

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

// MerchantRepository defines the interface for merchant data operations
type MerchantRepository interface {
	// Merchant profile operations
	CreateMerchant(merchant *models.MerchantProfile) error
	FindByID(id uuid.UUID) (*models.MerchantProfile, error)
	FindByOwnerID(ownerID uuid.UUID) (*models.MerchantProfile, error)
	UpdateMerchant(merchant *models.MerchantProfile) error
	UpdateLogo(merchantID uuid.UUID, logoURL string) error

	// Subscription operations
	CreateSubscription(subscription *models.Subscription) error
	FindByMerchantID(merchantID uuid.UUID) (*models.Subscription, error)
	UpdateSubscription(subscription *models.Subscription) error
	CancelSubscription(merchantID uuid.UUID, reason string) error

	// Plan operations
	GetAllPlans() ([]models.SubscriptionPlan, error)
	GetPlanByID(planID string) (*models.SubscriptionPlan, error)

	// Settings operations
	GetSettings(merchantID uuid.UUID) (*models.MerchantSettings, error)
	UpdateSettings(settings *models.MerchantSettings) error

	// Quota operations
	GetQuotaStatus(merchantID uuid.UUID) (*models.QuotaStatus, error)
	UpdateUsageCounter(merchantID uuid.UUID, year, month int, increment int) error
}

type merchantRepository struct {
	db *sql.DB
}

// NewMerchantRepository creates a new merchant repository instance
func NewMerchantRepository(db *sql.DB) MerchantRepository {
	return &merchantRepository{db: db}
}

// CreateMerchant inserts a new merchant into the database
func (r *merchantRepository) CreateMerchant(merchant *models.MerchantProfile) error {
	query := `
		INSERT INTO merchants (owner_id, shop_name, address, contact_email, contact_phone, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(query,
		merchant.OwnerID,
		merchant.ShopName,
		merchant.Address,
		merchant.ContactEmail,
		merchant.ContactPhone,
		merchant.IsActive,
	).Scan(&merchant.ID, &merchant.CreatedAt, &merchant.UpdatedAt)

	if err != nil {
		return err
	}

	return nil
}

// FindByID retrieves a merchant by ID
func (r *merchantRepository) FindByID(id uuid.UUID) (*models.MerchantProfile, error) {
	query := `
		SELECT id, owner_id, shop_name, address, contact_email, contact_phone,
		       logo_url, is_active, created_at, updated_at
		FROM merchants
		WHERE id = $1
	`

	var merchant models.MerchantProfile
	err := r.db.QueryRow(query, id).Scan(
		&merchant.ID,
		&merchant.OwnerID,
		&merchant.ShopName,
		&merchant.Address,
		&merchant.ContactEmail,
		&merchant.ContactPhone,
		&merchant.LogoURL,
		&merchant.IsActive,
		&merchant.CreatedAt,
		&merchant.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("merchant not found")
		}
		return nil, err
	}

	// Load additional settings
	merchant.BusinessHours = r.getBusinessHours(id)
	merchant.StrictMode = true // Default to strict mode (no duplicates allowed)

	return &merchant, nil
}

// FindByOwnerID retrieves a merchant by owner user ID
func (r *merchantRepository) FindByOwnerID(ownerID uuid.UUID) (*models.MerchantProfile, error) {
	query := `
		SELECT id, owner_id, shop_name, address, contact_email, contact_phone,
		       logo_url, is_active, created_at, updated_at
		FROM merchants
		WHERE owner_id = $1
	`

	var merchant models.MerchantProfile
	err := r.db.QueryRow(query, ownerID).Scan(
		&merchant.ID,
		&merchant.OwnerID,
		&merchant.ShopName,
		&merchant.Address,
		&merchant.ContactEmail,
		&merchant.ContactPhone,
		&merchant.LogoURL,
		&merchant.IsActive,
		&merchant.CreatedAt,
		&merchant.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("merchant not found")
		}
		return nil, err
	}

	// Load additional settings
	merchant.BusinessHours = r.getBusinessHours(merchant.ID)
	merchant.StrictMode = true // Default to strict mode (no duplicates allowed)

	return &merchant, nil
}

// UpdateMerchant updates merchant information
func (r *merchantRepository) UpdateMerchant(merchant *models.MerchantProfile) error {
	query := `
		UPDATE merchants
		SET shop_name = $2, address = $3, contact_email = $4, contact_phone = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query,
		merchant.ID,
		merchant.ShopName,
		merchant.Address,
		merchant.ContactEmail,
		merchant.ContactPhone,
	)

	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("merchant not found")
	}

	// Update business hours
	if merchant.BusinessHours != nil {
		r.updateBusinessHours(merchant.ID, merchant.BusinessHours)
	}

	return nil
}

// UpdateLogo updates merchant logo URL
func (r *merchantRepository) UpdateLogo(merchantID uuid.UUID, logoURL string) error {
	query := `
		UPDATE merchants
		SET logo_url = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query, merchantID, logoURL)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("merchant not found")
	}

	return nil
}

// CreateSubscription creates a new subscription
func (r *merchantRepository) CreateSubscription(subscription *models.Subscription) error {
	query := `
		INSERT INTO subscriptions (merchant_id, plan_id, status, billing_cycle, stripe_subscription_id, stripe_customer_id, started_at, expires_at, auto_renew)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(query,
		subscription.MerchantID,
		subscription.PlanID,
		subscription.Status,
		subscription.BillingCycle,
		subscription.StripeSubscriptionID,
		subscription.StripeCustomerID,
		subscription.StartedAt,
		subscription.ExpiresAt,
		subscription.AutoRenew,
	).Scan(&subscription.ID, &subscription.CreatedAt, &subscription.UpdatedAt)

	if err != nil {
		return err
	}

	return nil
}

// FindByMerchantID retrieves subscription by merchant ID
func (r *merchantRepository) FindByMerchantID(merchantID uuid.UUID) (*models.Subscription, error) {
	query := `
		SELECT s.id, s.merchant_id, s.plan_id, s.status, s.billing_cycle,
		       s.stripe_subscription_id, s.stripe_customer_id, s.started_at, s.expires_at,
		       s.auto_renew, s.cancelled_at, s.created_at, s.updated_at,
		       p.name as plan_name, p.price_monthly, p.price_yearly, p.quota_per_month,
		       p.features, p.is_popular
		FROM subscriptions s
		LEFT JOIN subscription_plans p ON s.plan_id = p.id
		WHERE s.merchant_id = $1
		ORDER BY s.created_at DESC
		LIMIT 1
	`

	var subscription models.Subscription
	var plan models.SubscriptionPlan
	var featuresJSON string

	err := r.db.QueryRow(query, merchantID).Scan(
		&subscription.ID,
		&subscription.MerchantID,
		&subscription.PlanID,
		&subscription.Status,
		&subscription.BillingCycle,
		&subscription.StripeSubscriptionID,
		&subscription.StripeCustomerID,
		&subscription.StartedAt,
		&subscription.ExpiresAt,
		&subscription.AutoRenew,
		&subscription.CancelledAt,
		&subscription.CreatedAt,
		&subscription.UpdatedAt,
		&plan.Name,
		&plan.PriceMonthly,
		&plan.PriceYearly,
		&plan.QuotaPerMonth,
		&featuresJSON,
		&plan.IsPopular,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("subscription not found")
		}
		return nil, err
	}

	// Parse features JSON
	if featuresJSON != "" {
		json.Unmarshal([]byte(featuresJSON), &plan.Features)
	}

	subscription.Plan = &plan

	// Load usage statistics
	subscription.UsageThisMonth = r.getUsageThisMonth(merchantID)
	subscription.RemainingQuota = plan.QuotaPerMonth - subscription.UsageThisMonth

	return &subscription, nil
}

// UpdateSubscription updates subscription information
func (r *merchantRepository) UpdateSubscription(subscription *models.Subscription) error {
	query := `
		UPDATE subscriptions
		SET status = $2, expires_at = $3, auto_renew = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query,
		subscription.ID,
		subscription.Status,
		subscription.ExpiresAt,
		subscription.AutoRenew,
	)

	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("subscription not found")
	}

	return nil
}

// CancelSubscription cancels a subscription
func (r *merchantRepository) CancelSubscription(merchantID uuid.UUID, reason string) error {
	query := `
		UPDATE subscriptions
		SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, auto_renew = false, updated_at = CURRENT_TIMESTAMP
		WHERE merchant_id = $1
	`

	result, err := r.db.Exec(query, merchantID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("subscription not found")
	}

	return nil
}

// GetAllPlans retrieves all active subscription plans
func (r *merchantRepository) GetAllPlans() ([]models.SubscriptionPlan, error) {
	query := `
		SELECT id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular, is_active, created_at, updated_at
		FROM subscription_plans
		WHERE is_active = true
		ORDER BY price_monthly ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []models.SubscriptionPlan

	for rows.Next() {
		var plan models.SubscriptionPlan
		var featuresJSON string

		err := rows.Scan(
			&plan.ID,
			&plan.Name,
			&plan.Description,
			&plan.PriceMonthly,
			&plan.PriceYearly,
			&plan.QuotaPerMonth,
			&featuresJSON,
			&plan.IsPopular,
			&plan.IsActive,
			&plan.CreatedAt,
			&plan.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		// Parse features JSON
		if featuresJSON != "" {
			json.Unmarshal([]byte(featuresJSON), &plan.Features)
		}

		plans = append(plans, plan)
	}

	return plans, nil
}

// GetPlanByID retrieves a plan by ID
func (r *merchantRepository) GetPlanByID(planID string) (*models.SubscriptionPlan, error) {
	query := `
		SELECT id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular, is_active, created_at, updated_at
		FROM subscription_plans
		WHERE id = $1
	`

	var plan models.SubscriptionPlan
	var featuresJSON string

	err := r.db.QueryRow(query, planID).Scan(
		&plan.ID,
		&plan.Name,
		&plan.Description,
		&plan.PriceMonthly,
		&plan.PriceYearly,
		&plan.QuotaPerMonth,
		&featuresJSON,
		&plan.IsPopular,
		&plan.IsActive,
		&plan.CreatedAt,
		&plan.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("plan not found")
		}
		return nil, err
	}

	// Parse features JSON
	if featuresJSON != "" {
		json.Unmarshal([]byte(featuresJSON), &plan.Features)
	}

	return &plan, nil
}

// GetSettings retrieves merchant settings
func (r *merchantRepository) GetSettings(merchantID uuid.UUID) (*models.MerchantSettings, error) {
	// For now, return default settings
	// In a full implementation, you'd store these in the database
	return &models.MerchantSettings{
		MerchantID: merchantID,
		NotificationPreferences: models.NotificationPreferences{
			SendLineNotifications:      true,
			SendEmailSummary:           true,
			NotifyOnFailedVerification: true,
			DailySummaryTime:           "18:00",
		},
		BusinessPreferences: models.BusinessPreferences{
			Currency: "THB",
			Timezone: "Asia/Bangkok",
			Language: "th",
		},
		UpdatedAt: time.Now(),
	}, nil
}

// UpdateSettings updates merchant settings
func (r *merchantRepository) UpdateSettings(settings *models.MerchantSettings) error {
	// For now, this is a placeholder
	// In a full implementation, you'd store these in the database
	return nil
}

// GetQuotaStatus retrieves quota usage status
func (r *merchantRepository) GetQuotaStatus(merchantID uuid.UUID) (*models.QuotaStatus, error) {
	// Get merchant's subscription to find quota limit
	subscription, err := r.FindByMerchantID(merchantID)
	if err != nil {
		return nil, err
	}

	// Get current usage
	now := time.Now()
	used := r.getUsageThisMonth(merchantID)

	// Calculate reset date (first day of next month)
	resetDate := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())

	quotaLimit := subscription.Plan.QuotaPerMonth
	remaining := quotaLimit - used
	isBlocked := used >= quotaLimit

	return &models.QuotaStatus{
		QuotaLimit: quotaLimit,
		Used:       used,
		Remaining:  remaining,
		ResetDate:  resetDate,
		IsBlocked:  isBlocked,
	}, nil
}

// UpdateUsageCounter updates usage counter for a merchant
func (r *merchantRepository) UpdateUsageCounter(merchantID uuid.UUID, year, month int, increment int) error {
	query := `
		INSERT INTO usage_counters (merchant_id, year, month, scan_count)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (merchant_id, year, month)
		DO UPDATE SET
			scan_count = usage_counters.scan_count + $4,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := r.db.Exec(query, merchantID, year, month, increment)
	return err
}

// Helper functions

func (r *merchantRepository) getBusinessHours(merchantID uuid.UUID) *models.BusinessHours {
	// Placeholder - in full implementation, query from database
	return &models.BusinessHours{
		Open:  "09:00",
		Close: "18:00",
		Days:  []string{"mon", "tue", "wed", "thu", "fri", "sat"},
	}
}

func (r *merchantRepository) updateBusinessHours(merchantID uuid.UUID, hours *models.BusinessHours) error {
	// Placeholder - in full implementation, store in database
	return nil
}

func (r *merchantRepository) getUsageThisMonth(merchantID uuid.UUID) int {
	now := time.Now()
	query := `
		SELECT COALESCE(scan_count, 0)
		FROM usage_counters
		WHERE merchant_id = $1 AND year = $2 AND month = $3
	`

	var count int
	err := r.db.QueryRow(query, merchantID, now.Year(), int(now.Month())).Scan(&count)
	if err != nil {
		return 0
	}

	return count
}