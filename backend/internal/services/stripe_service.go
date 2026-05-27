package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"slipsure-backend/internal/models"

	"github.com/google/uuid"
	stripe "github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/checkout/session"
	"github.com/stripe/stripe-go/v74/customer"
	"github.com/stripe/stripe-go/v74/subscription"
	"github.com/stripe/stripe-go/v74/webhook"
)

// StripeService handles Stripe integration
type StripeService struct {
	apiKey         string
	webhookSecret  string
	priceIDMapping map[string]string
	successURL     string
	cancelURL      string
}

// NewStripeService creates a new Stripe service instance
func NewStripeService() (*StripeService, error) {
	apiKey := os.Getenv("STRIPE_SECRET_KEY")
	if apiKey == "" {
		return nil, errors.New("STRIPE_SECRET_KEY not set")
	}

	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")

	// Debug logging
	if webhookSecret == "" {
		fmt.Printf("WARNING: STRIPE_WEBHOOK_SECRET is empty or not set!\n")
	} else {
		fmt.Printf("Loaded STRIPE_WEBHOOK_SECRET: %s... (first 10 chars)\n", webhookSecret[:10])
	}

	// Initialize Stripe
	stripe.Key = apiKey

	// Build price ID mapping
	priceIDMapping := map[string]string{
		"plan-free":           os.Getenv("STRIPE_PRICE_ID_FREE"),
		"plan-starter":        os.Getenv("STRIPE_PRICE_ID_STARTER_MONTHLY"),
		"plan-starter-yearly": os.Getenv("STRIPE_PRICE_ID_STARTER_YEARLY"),
		"plan-pro":            os.Getenv("STRIPE_PRICE_ID_PRO_MONTHLY"),
		"plan-pro-yearly":     os.Getenv("STRIPE_PRICE_ID_PRO_YEARLY"),
	}

	successURL := os.Getenv("STRIPE_SUCCESS_URL")
	if successURL == "" {
		successURL = "https://app.yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}"
	}

	cancelURL := os.Getenv("STRIPE_CANCEL_URL")
	if cancelURL == "" {
		cancelURL = "https://app.yourdomain.com/billing"
	}

	return &StripeService{
		apiKey:         apiKey,
		webhookSecret:  webhookSecret,
		priceIDMapping: priceIDMapping,
		successURL:     successURL,
		cancelURL:      cancelURL,
	}, nil
}

// CreateCheckoutSession creates a Stripe checkout session for subscription
func (s *StripeService) CreateCheckoutSession(userID uuid.UUID, userEmail string, planID, billingCycle string) (*models.CheckoutResponse, error) {
	fmt.Printf("Creating Stripe checkout for user %s (%s), plan %s, cycle %s\n", userID, userEmail, planID, billingCycle)

	// Map plan and billing cycle to Stripe price ID
	priceID, err := s.getPriceID(planID, billingCycle)
	if err != nil {
		return nil, fmt.Errorf("failed to get price ID for plan %s: %w", planID, err)
	}

	fmt.Printf("Using Stripe price ID: %s\n", priceID)

	// Get or create Stripe customer
	customerID, err := s.getOrCreateCustomer(userID, userEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to get/create customer: %w", err)
	}

	fmt.Printf("Stripe customer ID: %s\n", customerID)

	// Create checkout session with PromptPay (one-time payment, manage subscriptions ourselves)
	params := &stripe.CheckoutSessionParams{
		Customer:           stripe.String(customerID),
		PaymentMethodTypes: stripe.StringSlice([]string{"card", "promptpay"}), // PromptPay works in one-time mode!
		Mode:               stripe.String("payment"), // One-time payment mode (not subscription)
		SuccessURL:         stripe.String(s.successURL),
		CancelURL:          stripe.String(s.cancelURL),
		Locale:             stripe.String("th"),  // Thai locale
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		Params: stripe.Params{
			Metadata: map[string]string{
				"user_id":       userID.String(),
				"plan_id":       planID,
				"billing_cycle": billingCycle,
			},
		},
		ExpiresAt: stripe.Int64(time.Now().Add(30 * time.Minute).Unix()),
	}

	sess, err := session.New(params)
	if err != nil {
		return nil, err
	}

	// Calculate amount based on plan
	amount := s.calculateAmount(planID, billingCycle)

	return &models.CheckoutResponse{
		CheckoutSessionID: sess.ID,
		CheckoutURL:       sess.URL,
		Amount:            amount,
		Currency:          "THB",
		PlanID:            planID,
		BillingCycle:      models.BillingCycle(billingCycle),
		ExpiresAt:         time.Unix(sess.ExpiresAt, 0),
	}, nil
}

// ProcessWebhook processes incoming Stripe webhook events
func (s *StripeService) ProcessWebhook(payload []byte, signature string) (stripe.Event, error) {
	// Verify webhook signature
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return stripe.Event{}, fmt.Errorf("webhook signature verification failed: %v", err)
	}

	return event, nil
}

// HandleCheckoutSessionCompleted handles checkout.session.completed event
func (s *StripeService) HandleCheckoutSessionCompleted(event stripe.Event) (uuid.UUID, string, string, string, string, error) {
	// Parse the checkout session from the event
	var session stripe.CheckoutSession
	err := json.Unmarshal(event.Data.Raw, &session)
	if err != nil {
		return uuid.Nil, "", "", "", "", err
	}

	// Extract data from session
	checkoutSessionID := session.ID
	customerID := session.Customer.ID
	userID := session.Metadata["user_id"]
	planID := session.Metadata["plan_id"]
	billingCycle := session.Metadata["billing_cycle"]

	// Parse UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, "", "", "", "", err
	}

	// In payment mode, there's no subscription object from Stripe
	// We'll use checkout session ID as the reference and manage subscription ourselves

	return userUUID, checkoutSessionID, customerID, planID, billingCycle, nil
}

// HandleSubscriptionDeleted handles customer.subscription.deleted event
func (s *StripeService) HandleSubscriptionDeleted(event stripe.Event) (string, error) {
	// Parse the subscription from the event
	var sub stripe.Subscription
	err := json.Unmarshal(event.Data.Raw, &sub)
	if err != nil {
		return "", err
	}

	return sub.Customer.ID, nil
}

// GetOrCreateCustomer gets existing Stripe customer or creates new one
func (s *StripeService) getOrCreateCustomer(userID uuid.UUID, userEmail string) (string, error) {
	// For now, create a new customer each time
	// In production, you'd store stripe_customer_id in the users table and check first
	params := &stripe.CustomerParams{
		Email: stripe.String(userEmail), // Use real email instead of user-UUID@example.com
		Name:  stripe.String(fmt.Sprintf("Customer %s", userEmail)),
	}

	// Set metadata to track our internal user ID and market
	params.AddMetadata("internal_user_id", userID.String())
	params.AddMetadata("market", "thailand")

	cust, err := customer.New(params)
	if err != nil {
		return "", err
	}

	return cust.ID, nil
}

// CancelSubscription cancels a Stripe subscription
func (s *StripeService) CancelSubscription(subscriptionID string, cancelAtPeriodEnd bool) error {
	if cancelAtPeriodEnd {
		// Cancel at period end
		_, err := subscription.Update(subscriptionID, &stripe.SubscriptionParams{
			CancelAtPeriodEnd: stripe.Bool(true),
		})
		return err
	}

	// Cancel immediately
	_, err := subscription.Cancel(subscriptionID, nil)
	return err
}

// GetSubscription retrieves subscription details from Stripe
func (s *StripeService) GetSubscription(subscriptionID string) (*stripe.Subscription, error) {
	return subscription.Get(subscriptionID, nil)
}

// Helper functions

func (s *StripeService) getPriceID(planID, billingCycle string) (string, error) {
	key := planID
	if billingCycle == "yearly" && planID != "plan-free" {
		key = fmt.Sprintf("%s-yearly", planID)
	}

	priceID, exists := s.priceIDMapping[key]
	if !exists {
		return "", fmt.Errorf("no Stripe price ID found for plan: %s, billing: %s", planID, billingCycle)
	}

	return priceID, nil
}

func (s *StripeService) calculateAmount(planID, billingCycle string) float64 {
	// Calculate amount based on plan and billing cycle
	// In production, you'd fetch this from Stripe price API or your database
	amounts := map[string]float64{
		"plan-free":           0,
		"plan-starter":        299,
		"plan-starter-yearly": 2990,
		"plan-pro":            799,
		"plan-pro-yearly":     7990,
	}

	key := planID
	if billingCycle == "yearly" && planID != "plan-free" {
		key = fmt.Sprintf("%s-yearly", planID)
	}

	if amount, exists := amounts[key]; exists {
		return amount
	}

	return 0
}

// VerifyWebhookSignature verifies Stripe webhook signature
func (s *StripeService) VerifyWebhookSignature(payload []byte, signature string) error {
	if s.webhookSecret == "" {
		return errors.New("webhook secret not configured")
	}

	_, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	return err
}

// GetCustomer retrieves a Stripe customer
func (s *StripeService) GetCustomer(customerID string) (*stripe.Customer, error) {
	return customer.Get(customerID, nil)
}

// WebhookEvent represents a processed webhook event
type WebhookEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	Livemode  bool                   `json:"livemode"`
	CreatedAt int64                  `json:"created"`
}

// ParseWebhookEvent parses a webhook event from JSON
func ParseWebhookEvent(r *http.Request) (*WebhookEvent, error) {
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	defer r.Body.Close()

	var event WebhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, err
	}

	return &event, nil
}

// HandleInvoicePaid handles invoice.paid event
// Note: In payment mode, this event won't fire for checkout sessions
// This is kept for future subscription mode support
func (s *StripeService) HandleInvoicePaid(event stripe.Event) (string, string, error) {
	// Parse the invoice from the event
	var invoice stripe.Invoice
	err := json.Unmarshal(event.Data.Raw, &invoice)
	if err != nil {
		return "", "", err
	}

	customerID := invoice.Customer.ID
	subscriptionID := ""
	if invoice.Subscription != nil {
		subscriptionID = invoice.Subscription.ID
	}

	return customerID, subscriptionID, nil
}
