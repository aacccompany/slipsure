package models

import (
	"time"

	"github.com/google/uuid"
)

// SubscriptionStatus represents subscription status
type SubscriptionStatus string

const (
	SubscriptionStatusTrial    SubscriptionStatus = "trial"
	SubscriptionStatusActive   SubscriptionStatus = "active"
	SubscriptionStatusSuspended SubscriptionStatus = "suspended"
	SubscriptionStatusCancelled SubscriptionStatus = "cancelled"
	SubscriptionStatusExpired  SubscriptionStatus = "expired"
	SubscriptionStatusPending  SubscriptionStatus = "pending"
)

// BillingCycle represents billing cycle type
type BillingCycle string

const (
	BillingCycleMonthly BillingCycle = "monthly"
	BillingCycleYearly  BillingCycle = "yearly"
)

// SubscriptionPlan represents a subscription plan
type SubscriptionPlan struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	PriceMonthly  float64   `json:"price_monthly"`
	PriceYearly   float64   `json:"price_yearly"`
	QuotaPerMonth int       `json:"quota_per_month"`
	Features      []string  `json:"features"`
	IsPopular     bool      `json:"is_popular"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Subscription represents a merchant subscription
type Subscription struct {
	ID                 uuid.UUID           `json:"id"`
	MerchantID         uuid.UUID           `json:"merchant_id"`
	PlanID             string              `json:"plan_id"`
	Status             SubscriptionStatus  `json:"status"`
	BillingCycle       BillingCycle        `json:"billing_cycle"`
	StripeSubscriptionID *string           `json:"stripe_subscription_id,omitempty"`
	StripeCustomerID   *string             `json:"stripe_customer_id,omitempty"`
	StartedAt          time.Time           `json:"started_at"`
	ExpiresAt          *time.Time          `json:"expires_at,omitempty"`
	AutoRenew          bool                `json:"auto_renew"`
	CancelledAt        *time.Time          `json:"cancelled_at,omitempty"`
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt          time.Time           `json:"updated_at"`

	// Computed fields (not in DB)
	Plan               *SubscriptionPlan  `json:"plan,omitempty"`
	UsageThisMonth     int                 `json:"usage_this_month,omitempty"`
	RemainingQuota     int                 `json:"remaining_quota,omitempty"`
}

// MerchantProfile represents merchant shop profile
type MerchantProfile struct {
	ID              uuid.UUID  `json:"id,omitempty"`         // Hide ID in responses
	OwnerID         uuid.UUID  `json:"-"`                   // Hide internal owner ID
	OwnerEmail      string     `json:"owner_email,omitempty"` // Show owner email instead
	ShopName        string     `json:"shop_name"`
	Address         *string    `json:"address,omitempty"`
	ContactEmail    *string    `json:"contact_email,omitempty"`
	ContactPhone    *string    `json:"contact_phone,omitempty"`
	LogoURL         *string    `json:"logo_url,omitempty"`
	BusinessHours   *BusinessHours `json:"business_hours,omitempty"`
	StrictMode      bool       `json:"strict_mode"`       // true = strict verification (no duplicates allowed)
	IsActive        bool       `json:"is_active"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// BusinessHours represents business operating hours
type BusinessHours struct {
	Open  string   `json:"open"`  // "09:00"
	Close string   `json:"close"` // "18:00"
	Days  []string `json:"days"`  // ["mon", "tue", "wed", "thu", "fri", "sat"]
}

// MerchantSettings represents merchant preferences
type MerchantSettings struct {
	MerchantID              uuid.UUID            `json:"merchant_id"`
	NotificationPreferences NotificationPreferences `json:"notification_preferences"`
	BusinessPreferences     BusinessPreferences   `json:"business_preferences"`
	UpdatedAt               time.Time            `json:"updated_at"`
}

// NotificationPreferences represents notification settings
type NotificationPreferences struct {
	SendLineNotifications      bool   `json:"send_line_notifications"`
	SendEmailSummary           bool   `json:"send_email_summary"`
	NotifyOnFailedVerification bool   `json:"notify_on_failed_verification"`
	DailySummaryTime           string `json:"daily_summary_time"` // "18:00"
}

// BusinessPreferences represents business settings
type BusinessPreferences struct {
	Currency  string `json:"currency"`  // "THB"
	Timezone  string `json:"timezone"`  // "Asia/Bangkok"
	Language  string `json:"language"`  // "th"
}

// QuotaStatus represents quota usage status
type QuotaStatus struct {
	QuotaLimit  int       `json:"quota_limit"`
	Used        int       `json:"used"`
	Remaining   int       `json:"remaining"`
	ResetDate   time.Time `json:"reset_date"`
	IsBlocked   bool      `json:"is_blocked"`
}

// Request/Response DTOs

// CreateMerchantProfileRequest represents initial merchant profile creation request
type CreateMerchantProfileRequest struct {
	ShopName        string          `json:"shop_name" binding:"required"`
	Address         *string         `json:"address,omitempty"`
	ContactEmail    *string         `json:"contact_email,omitempty"`
	ContactPhone    *string         `json:"contact_phone,omitempty"`
	BusinessHours   *BusinessHours  `json:"business_hours,omitempty"`
	StrictMode      bool            `json:"strict_mode"`       // true = strict verification (no duplicates allowed)
}

// UpdateMerchantProfileRequest represents profile update request
type UpdateMerchantProfileRequest struct {
	ShopName        string          `json:"shop_name" binding:"required"`
	Address         *string         `json:"address,omitempty"`
	ContactEmail    *string         `json:"contact_email,omitempty"`
	ContactPhone    *string         `json:"contact_phone,omitempty"`
	BusinessHours   *BusinessHours  `json:"business_hours,omitempty"`
	StrictMode      *bool           `json:"strict_mode,omitempty"` // Optional: can be updated separately
}

// UpdateMerchantSettingsRequest represents settings update request
type UpdateMerchantSettingsRequest struct {
	NotificationPreferences *NotificationPreferences `json:"notification_preferences,omitempty"`
	BusinessPreferences     *BusinessPreferences     `json:"business_preferences,omitempty"`
}

// CheckoutRequest represents checkout request
type CheckoutRequest struct {
	PlanID        string       `json:"plan_id" binding:"required"`
	BillingCycle  BillingCycle `json:"billing_cycle" binding:"required,oneof=monthly yearly"`
}

// CheckoutResponse represents checkout response
type CheckoutResponse struct {
	CheckoutSessionID string       `json:"checkout_session_id"`
	CheckoutURL        string       `json:"checkout_url"`
	Amount             float64      `json:"amount"`
	Currency           string       `json:"currency"`
	PlanID             string       `json:"plan_id"`
	BillingCycle       BillingCycle `json:"billing_cycle"`
	ExpiresAt          time.Time    `json:"expires_at"`
}

// CancelSubscriptionRequest represents cancellation request
type CancelSubscriptionRequest struct {
	CancelImmediately bool   `json:"cancel_immediately"`
	Reason            string `json:"reason"`
}

// PlanListResponse represents plan list response
type PlanListResponse struct {
	Plans []SubscriptionPlan `json:"plans"`
}

// MerchantProfileResponse represents merchant profile response
type MerchantProfileResponse struct {
	Profile *MerchantProfile `json:"profile"`
}

// MerchantSettingsResponse represents merchant settings response
type MerchantSettingsResponse struct {
	Settings *MerchantSettings `json:"settings"`
}

// SubscriptionResponse represents subscription response
type SubscriptionResponse struct {
	Subscription *Subscription `json:"subscription"`
}