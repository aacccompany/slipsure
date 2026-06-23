package models

import (
	"time"

	"github.com/google/uuid"
)

// SubscriptionStatus represents subscription status
type SubscriptionStatus string

const (
	SubscriptionStatusTrial     SubscriptionStatus = "trial"
	SubscriptionStatusActive    SubscriptionStatus = "active"
	SubscriptionStatusSuspended SubscriptionStatus = "suspended"
	SubscriptionStatusCancelled SubscriptionStatus = "cancelled"
	SubscriptionStatusExpired   SubscriptionStatus = "expired"
	SubscriptionStatusPending   SubscriptionStatus = "pending"
)

// BillingCycle represents billing cycle type
type BillingCycle string

const (
	BillingCycleMonthly BillingCycle = "monthly"
	BillingCycleYearly  BillingCycle = "yearly"
)

// Pagination represents pagination metadata
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

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
	ID                   uuid.UUID          `json:"id"`
	MerchantID           uuid.UUID          `json:"merchant_id"`
	PlanID               string             `json:"plan_id"`
	Status               SubscriptionStatus `json:"status"`
	BillingCycle         BillingCycle       `json:"billing_cycle"`
	StripeSubscriptionID *string            `json:"stripe_subscription_id,omitempty"`
	StripeCustomerID     *string            `json:"stripe_customer_id,omitempty"`
	StartedAt            time.Time          `json:"started_at"`
	ExpiresAt            *time.Time         `json:"expires_at,omitempty"`
	AutoRenew            bool               `json:"auto_renew"`
	CancelledAt          *time.Time         `json:"cancelled_at,omitempty"`
	CreatedAt            time.Time          `json:"created_at"`
	UpdatedAt            time.Time          `json:"updated_at"`

	// Computed fields (not in DB)
	Plan           *SubscriptionPlan `json:"plan,omitempty"`
	UsageThisMonth int               `json:"usage_this_month,omitempty"`
	RemainingQuota int               `json:"remaining_quota,omitempty"`
}

// PaymentLog represents an auditable subscription payment.
type PaymentLog struct {
	ID                 uuid.UUID  `json:"id"`
	MerchantID         uuid.UUID  `json:"merchant_id"`
	MerchantName       string     `json:"merchant_name"`
	SubscriptionID     *uuid.UUID `json:"subscription_id,omitempty"`
	Amount             float64    `json:"amount"`
	Currency           string     `json:"currency"`
	Gateway            string     `json:"gateway"`
	GatewayReferenceID string     `json:"gateway_reference_id"`
	Status             string     `json:"status"`
	PaidAt             *time.Time `json:"paid_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
}

// PaymentLogListResponse represents paginated admin payment history.
type PaymentLogListResponse struct {
	Items      []PaymentLog `json:"items"`
	Page       int          `json:"page"`
	Limit      int          `json:"limit"`
	Total      int          `json:"total"`
	TotalPages int          `json:"total_pages"`
}

// MerchantProfile represents merchant shop profile
type MerchantProfile struct {
	ID            uuid.UUID      `json:"id,omitempty"`          // Hide ID in responses
	OwnerID       uuid.UUID      `json:"-"`                     // Hide internal owner ID
	OwnerEmail    string         `json:"owner_email,omitempty"` // Show owner email instead
	ShopName      string         `json:"shop_name"`
	Address       *string        `json:"address,omitempty"`
	ContactEmail  *string        `json:"contact_email,omitempty"`
	ContactPhone  *string        `json:"contact_phone,omitempty"`
	LogoURL       *string        `json:"logo_url,omitempty"`
	BusinessHours *BusinessHours `json:"business_hours,omitempty"`
	StrictMode    bool           `json:"strict_mode"` // true = strict verification (no duplicates allowed)
	IsActive      bool           `json:"is_active"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// BusinessHours represents business operating hours
type BusinessHours struct {
	Open  string   `json:"open"`  // "09:00"
	Close string   `json:"close"` // "18:00"
	Days  []string `json:"days"`  // ["mon", "tue", "wed", "thu", "fri", "sat"]
}

// MerchantSettings represents merchant preferences
type MerchantSettings struct {
	MerchantID              uuid.UUID               `json:"merchant_id"`
	NotificationPreferences NotificationPreferences `json:"notification_preferences"`
	BusinessPreferences     BusinessPreferences     `json:"business_preferences"`
	UpdatedAt               time.Time               `json:"updated_at"`
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
	Currency string `json:"currency"` // "THB"
	Timezone string `json:"timezone"` // "Asia/Bangkok"
	Language string `json:"language"` // "th"
}

// QuotaStatus represents quota usage status
type QuotaStatus struct {
	QuotaLimit int       `json:"quota_limit"`
	Used       int       `json:"used"`
	Remaining  int       `json:"remaining"`
	ResetDate  time.Time `json:"reset_date"`
	IsBlocked  bool      `json:"is_blocked"`
}

// QuotaPeriodFor returns the monthly quota window anchored to the subscription start date.
func QuotaPeriodFor(startedAt, now time.Time) (time.Time, time.Time) {
	if now.Before(startedAt) {
		return startedAt, addMonthsAnchored(startedAt, 1)
	}

	months := (now.Year()-startedAt.Year())*12 + int(now.Month()-startedAt.Month())
	periodStart := addMonthsAnchored(startedAt, months)
	if periodStart.After(now) {
		months--
		periodStart = addMonthsAnchored(startedAt, months)
	}

	return periodStart, addMonthsAnchored(startedAt, months+1)
}

func addMonthsAnchored(anchor time.Time, months int) time.Time {
	firstOfMonth := time.Date(
		anchor.Year(), anchor.Month()+time.Month(months), 1,
		anchor.Hour(), anchor.Minute(), anchor.Second(), anchor.Nanosecond(), anchor.Location(),
	)
	lastDay := time.Date(firstOfMonth.Year(), firstOfMonth.Month()+1, 0, 0, 0, 0, 0, anchor.Location()).Day()
	day := anchor.Day()
	if day > lastDay {
		day = lastDay
	}

	return time.Date(
		firstOfMonth.Year(), firstOfMonth.Month(), day,
		anchor.Hour(), anchor.Minute(), anchor.Second(), anchor.Nanosecond(), anchor.Location(),
	)
}

// Request/Response DTOs

// CreateMerchantProfileRequest represents initial merchant profile creation request
type CreateMerchantProfileRequest struct {
	ShopName      string         `json:"shop_name" binding:"required"`
	Address       *string        `json:"address,omitempty"`
	ContactEmail  *string        `json:"contact_email,omitempty"`
	ContactPhone  *string        `json:"contact_phone,omitempty"`
	BusinessHours *BusinessHours `json:"business_hours,omitempty"`
	StrictMode    bool           `json:"strict_mode"` // true = strict verification (no duplicates allowed)
}

// UpdateMerchantProfileRequest represents profile update request
type UpdateMerchantProfileRequest struct {
	ShopName      string         `json:"shop_name" binding:"required"`
	Address       *string        `json:"address,omitempty"`
	ContactEmail  *string        `json:"contact_email,omitempty"`
	ContactPhone  *string        `json:"contact_phone,omitempty"`
	BusinessHours *BusinessHours `json:"business_hours,omitempty"`
	StrictMode    *bool          `json:"strict_mode,omitempty"` // Optional: can be updated separately
}

// UpdateMerchantSettingsRequest represents settings update request
type UpdateMerchantSettingsRequest struct {
	NotificationPreferences *NotificationPreferences `json:"notification_preferences,omitempty"`
	BusinessPreferences     *BusinessPreferences     `json:"business_preferences,omitempty"`
}

// CheckoutRequest represents checkout request
type CheckoutRequest struct {
	PlanID       string       `json:"plan_id" binding:"required"`
	BillingCycle BillingCycle `json:"billing_cycle" binding:"required,oneof=monthly yearly"`
}

// CheckoutResponse represents checkout response
type CheckoutResponse struct {
	CheckoutSessionID string       `json:"checkout_session_id"`
	CheckoutURL       string       `json:"checkout_url"`
	Amount            float64      `json:"amount"`
	Currency          string       `json:"currency"`
	PlanID            string       `json:"plan_id"`
	BillingCycle      BillingCycle `json:"billing_cycle"`
	ExpiresAt         time.Time    `json:"expires_at"`
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

// LINEWebhookConfig represents LINE webhook configuration for a merchant
type LINEWebhookConfig struct {
	MerchantID         uuid.UUID `json:"merchant_id"`
	LINEChannelID      string    `json:"line_channel_id"`
	IsConfigured       bool      `json:"is_configured"`
	WebhookReferenceID *string   `json:"webhook_reference_id,omitempty"`
	WebhookURL         *string   `json:"webhook_url,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// UpdateLINEWebhookRequest represents LINE webhook configuration update request
type UpdateLINEWebhookRequest struct {
	LINEChannelID     string `json:"line_channel_id" binding:"required"`
	LINEChannelSecret string `json:"line_channel_secret" binding:"required"`
	LINEAccessToken   string `json:"line_access_token" binding:"required"`
}

// LINEWebhookTestResponse represents LINE webhook test response
type LINEWebhookTestResponse struct {
	WebhookStatus       string    `json:"webhook_status"`
	ConnectionStatus    string    `json:"connection_status"`
	SignatureValidation string    `json:"signature_validation"`
	APIAccess           string    `json:"api_access"`
	TestedAt            time.Time `json:"tested_at"`
	ResponseTimeMs      int64     `json:"response_time_ms"`
}
