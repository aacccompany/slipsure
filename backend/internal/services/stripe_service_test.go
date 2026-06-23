package services

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	stripe "github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/webhook"
)

func TestStripeWebhookAcceptsDifferentAPIVersion(t *testing.T) {
	const secret = "whsec_test"
	payload := []byte(`{
		"id":"evt_test",
		"object":"event",
		"api_version":"2024-10-28.acacia",
		"created":1700000000,
		"data":{"object":{}},
		"livemode":false,
		"pending_webhooks":1,
		"type":"payment_intent.succeeded"
	}`)
	signed := webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{
		Payload: payload,
		Secret:  secret,
	})
	service := &StripeService{webhookSecret: secret}

	if err := service.VerifyWebhookSignature(payload, signed.Header); err != nil {
		t.Fatalf("expected valid signature: %v", err)
	}

	event, err := service.ProcessWebhook(payload, signed.Header)
	if err != nil {
		t.Fatalf("expected different API version to parse: %v", err)
	}
	if event.Type != "payment_intent.succeeded" {
		t.Fatalf("unexpected event type: %s", event.Type)
	}
}

func TestStripeWebhookRejectsInvalidSignature(t *testing.T) {
	payload := []byte(`{"id":"evt_test","object":"event"}`)
	signed := webhook.GenerateTestSignedPayload(&webhook.UnsignedPayload{
		Payload: payload,
		Secret:  "wrong_secret",
	})
	service := &StripeService{webhookSecret: "whsec_test"}

	if err := service.VerifyWebhookSignature(payload, signed.Header); err == nil {
		t.Fatal("expected invalid signature to be rejected")
	}
}

func TestCheckoutSessionIDFromPaymentIntent(t *testing.T) {
	raw := json.RawMessage(`{"payment_details":{"order_reference":"cs_live_test"}}`)

	checkoutSessionID, err := checkoutSessionIDFromPaymentIntent(raw)
	if err != nil {
		t.Fatalf("expected checkout session reference: %v", err)
	}
	if checkoutSessionID != "cs_live_test" {
		t.Fatalf("unexpected checkout session ID: %s", checkoutSessionID)
	}
}

func TestCheckoutSessionActivationData(t *testing.T) {
	userID := uuid.New()
	checkoutSession := &stripe.CheckoutSession{
		ID:       "cs_live_test",
		Customer: &stripe.Customer{ID: "cus_test"},
		Metadata: map[string]string{
			"user_id":       userID.String(),
			"plan_id":       "plan-starter",
			"billing_cycle": "monthly",
		},
	}

	gotUserID, sessionID, customerID, planID, billingCycle, err := checkoutSessionActivationData(checkoutSession)
	if err != nil {
		t.Fatalf("expected activation data: %v", err)
	}
	if gotUserID != userID || sessionID != "cs_live_test" || customerID != "cus_test" || planID != "plan-starter" || billingCycle != "monthly" {
		t.Fatalf("unexpected activation data: %s %s %s %s %s", gotUserID, sessionID, customerID, planID, billingCycle)
	}
}
