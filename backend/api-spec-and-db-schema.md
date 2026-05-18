# API Specification & DB Schema
## Slip Verification SaaS Platform (QR-Only)

> Base URL: `https://api.yourdomain.com/v1`
> Auth: Bearer JWT (except public endpoints)
> Content-Type: `application/json`
> **Verification Method:** QR Code scanning only (no OCR) - extracts EMVCo data from slip QR

---

## Table of Contents
1. [Module 1 — Authenticate](#1-authenticate)
2. [Module 2 — Merchant Management & Subscription](#2-merchant-management--subscription)
3. [Module 3 — Slip Verification Engine](#3-slip-verification-engine)
4. [Module 4 — Transaction & History](#4-transaction--history)
5. [Module 5 — LINE Bot & Notification](#5-line-bot--notification)
   - [5.1 Webhook Management](#51-webhook-management)
   - [5.2 Bank Validation](#52-bank-validation)
   - [5.3 Custom Branding](#53-custom-branding)
6. [Module 6 — Admin Backoffice](#6-admin-backoffice)
7. [Module 7 — Merchant Analytics](#7-merchant-analytics)
8. [Module 8 — Admin Analytics](#8-admin-analytics)
9. [Database Schema](#9-database-schema)

---

## 1.1 Stripe Payment Integration

### Stripe Configuration

**Required Environment Variables:**
```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx        # Secret key for backend API calls
STRIPE_PUBLISHABLE_KEY=pk_test_xxx   # Public key for frontend (via API)
STRIPE_WEBHOOK_SECRET=whsec_xxx      # Webhook signing secret for verification

# Stripe Price IDs (Product mapping)
STRIPE_PRICE_ID_FREE=price_free_monthly
STRIPE_PRICE_ID_STARTER_MONTHLY=price_starter_monthly
STRIPE_PRICE_ID_STARTER_YEARLY=price_starter_yearly
STRIPE_PRICE_ID_PRO_MONTHLY=price_pro_monthly
STRIPE_PRICE_ID_PRO_YEARLY=price_pro_yearly

# Stripe Configuration
STRIPE_SUCCESS_URL=https://app.yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://app.yourdomain.com/billing
```

### Stripe Product Setup

**Create Products in Stripe Dashboard:**
1. **Free Plan** - No price needed
2. **Starter Plan** - 299 THB/month, 2990 THB/year
3. **Pro Plan** - 799 THB/month, 7990 THB/year

**Price Configuration:**
```javascript
// Stripe Dashboard → Products → Create pricing
// Starter Monthly
Recurring: Monthly, THB 299
Price ID: price_starter_monthly

// Starter Yearly (10 months + 2 months free)
Recurring: Yearly, THB 2990
Price ID: price_starter_yearly

// Pro Monthly
Recurring: Monthly, THB 799
Price ID: price_pro_monthly

// Pro Yearly (10 months + 2 months free)
Recurring: Yearly, THB 7990
Price ID: price_pro_yearly
```

### Webhook Configuration

**Set up Stripe webhook:**
1. Go to: Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.yourdomain.com/v1/checkout/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Customer Management

**Stripe Customer Lifecycle:**
```go
// 1. Create customer on registration
customer, _ := stripe.Customer.New(&stripe.CustomerParams{
  Email: "user@example.com",
  Name: "Somchai Jaidee",
  Metadata: map[string]string{"user_id": "uuid-xxx"},
})

// 2. Store stripe_customer_id in database
UPDATE users SET stripe_customer_id = 'cus_xxx' WHERE id = 'uuid-xxx'

// 3. Attach payment method automatically via Checkout
// Stripe Checkout handles payment method attachment

// 4. Update customer info
stripe.Customer.Update(customerID, &stripe.CustomerParams{
  Email: "newemail@example.com",
})
```

### Subscription Status Mapping

**Stripe → Internal Status:**
| Stripe Status | Internal Status | Description |
|---------------|-----------------|-------------|
| `trialing` | `trial` | Free trial period |
| `active` | `active` | Active subscription |
| `past_due` | `past_due` | Payment failed, grace period |
| `canceled` | `cancelled` | Cancelled by user |
| `unpaid` | `expired` | Payment failed, access revoked |
| `incomplete` | `pending` | Awaiting first payment |

### Error Handling

**Stripe-Specific Error Codes:**
| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `STRIPE_CARD_DECLINED` | Card declined | 402 |
| `STRIPE_INSUFFICIENT_FUNDS` | Insufficient funds | 402 |
| `STRIPE_PAYMENT_FAILED` | Payment processing failed | 402 |
| `STRIPE_WEBHOOK_INVALID` | Invalid webhook signature | 401 |
| `STRIPE_CUSTOMER_NOT_FOUND` | Customer doesn't exist | 404 |
| `STRIPE_SUBSCRIPTION_NOT_FOUND` | Subscription doesn't exist | 404 |

---

## 1. Authenticate

### POST `/auth/register`
Register new merchant account.

**Request:**
```json
{
  "name": "สมชาย ใจดี",
  "email": "somchai@shop.com",
  "password": "P@ssw0rd123",
  "phone": "0812345678"
}
```
**Response 201:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user_id": "uuid-xxx",
    "email": "somchai@shop.com",
    "otp_sent_to": "somchai@shop.com"
  }
}
```

---

### POST `/auth/verify-otp`
Verify email via OTP.

**Request:**
```json
{ "email": "somchai@shop.com", "otp": "482910" }
```
**Response 200:**
```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_in": 3600
  }
}
```

---

### POST `/auth/login`
Standard email/password login.

**Request:**
```json
{ "email": "somchai@shop.com", "password": "P@ssw0rd123" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_in": 3600,
    "user": {
      "id": "uuid-xxx",
      "name": "สมชาย ใจดี",
      "email": "somchai@shop.com",
      "role": "merchant",
      "merchant_id": "uuid-merchant"
    }
  }
}
```

---

### POST `/auth/line-login`
Login / register via LINE OAuth.

**Request:**
```json
{ "line_code": "code_from_line_oauth", "redirect_uri": "https://app.yourdomain.com/auth/callback" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "is_new_user": false,
    "user": { "id": "uuid-xxx", "name": "สมชาย", "line_user_id": "Uxxxxxx" }
  }
}
```

---

### POST `/auth/forgot-password`
Send OTP reset link to email.

**Request:**
```json
{ "email": "somchai@shop.com" }
```
**Response 200:**
```json
{ "success": true, "message": "Password reset OTP sent to email." }
```

---

### POST `/auth/reset-password`
Reset password using OTP.

**Request:**
```json
{ "email": "somchai@shop.com", "otp": "748201", "new_password": "NewP@ss456" }
```
**Response 200:**
```json
{ "success": true, "message": "Password reset successfully." }
```

---

### GET `/auth/me`
Get current user profile.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "name": "สมชาย ใจดี",
    "email": "somchai@shop.com",
    "phone": "0812345678",
    "role": "merchant_owner",
    "merchant_id": "uuid-merchant",
    "line_linked": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### PUT `/auth/profile`
Update personal info.

**Request:**
```json
{ "name": "สมชาย ใจใหญ่", "phone": "0898765432" }
```
**Response 200:**
```json
{ "success": true, "message": "Profile updated.", "data": { "name": "สมชาย ใจใหญ่" } }
```

---

### POST `/auth/logout`
Invalidate token.

**Response 200:**
```json
{ "success": true, "message": "Logged out successfully." }
```

---

## 2. Merchant Management & Subscription

### GET `/plans`
List all available subscription plans. *(Public)*

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan-free",
      "name": "Free",
      "price_monthly": 0,
      "price_yearly": 0,
      "quota_per_month": 50,
      "features": ["slip_verify", "api_access", "webhook", "bank_validation", "historical_data", "duplicate_detection", "custom_branding"],
      "is_popular": false
    },
    {
      "id": "plan-starter",
      "name": "Starter",
      "price_monthly": 299,
      "price_yearly": 2990,
      "quota_per_month": 200,
      "features": ["slip_verify", "api_access", "webhook", "bank_validation", "historical_data", "duplicate_detection", "custom_branding"],
      "is_popular": false
    },
    {
      "id": "plan-pro",
      "name": "Pro",
      "price_monthly": 799,
      "price_yearly": 7990,
      "quota_per_month": 1000,
      "features": ["slip_verify", "api_access", "webhook", "bank_validation", "historical_data", "duplicate_detection", "custom_branding"],
      "is_popular": true
    }
  ]
}
```

---

### POST `/checkout` **NOTE using stripe**
Create Stripe Checkout session for subscription.

**Request:**
```json
{
  "plan_id": "plan-pro",
  "billing_cycle": "monthly"
}
```

**Implementation Notes:**
- Maps `plan_id` to Stripe `price_id` (configured in environment)
- Creates/gets Stripe Customer for current user
- Uses Stripe Checkout Session with `subscription` mode
- Sets `success_url` and `cancel_url` for frontend redirect
- Stores `stripe_session_id` in database for tracking

**Stripe Integration:**
```go
// Price ID mapping (from env)
STRIPE_PRICE_ID_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_ID_STARTER_YEARLY=price_xxx
STRIPE_PRICE_ID_PRO_MONTHLY=price_xxx
STRIPE_PRICE_ID_PRO_YEARLY=price_xxx

// Checkout session creation
stripe.CheckoutSession{
  Mode: "subscription",
  Customer: "cus_xxx",
  LineItems: [{Price: "price_xxx", Quantity: 1}],
  SuccessURL: "https://app.yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}",
  CancelURL: "https://app.yourdomain.com/billing",
  Metadata: {user_id: "uuid", plan_id: "plan-pro"}
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "checkout_session_id": "cs_test_xxx",
    "checkout_url": "https://checkout.stripe.com/pay/cs_test_xxx",
    "amount": 799,
    "currency": "THB",
    "plan_id": "plan-pro",
    "billing_cycle": "monthly",
    "expires_at": "2025-05-08T13:30:00Z"
  }
}
```

---

### POST `/checkout/webhook`
Receive Stripe webhook events for subscription/payment updates. *(Stripe → Server)*

**Security:**
- Verify Stripe webhook signature using `STRIPE_WEBHOOK_SECRET`
- Process only events with valid signatures
- Handle idempotency using Stripe event IDs

**Request (from Stripe):**
```json
{
  "id": "evt_xxx",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_xxx",
      "mode": "subscription",
      "customer": "cus_xxx",
      "subscription": "sub_xxx",
      "metadata": {
        "user_id": "uuid-xxx",
        "plan_id": "plan-pro"
      },
      "status": "complete",
      "payment_status": "paid"
    }
  }
}
```

**Supported Stripe Events:**
| Event Type | Description | Action |
|------------|-------------|---------|
| `checkout.session.completed` | Checkout successful | Create/activate subscription |
| `customer.subscription.created` | New subscription | Log subscription creation |
| `customer.subscription.updated` | Subscription changed | Update subscription status |
| `customer.subscription.deleted` | Subscription cancelled | Deactivate user access |
| `invoice.paid` | Payment successful | Update quota/billing |
| `invoice.payment_failed` | Payment failed | Send notifications, grace period |
| `payment_intent.succeeded` | One-time payment | Log payment |

**Implementation Notes:**
```go
// Webhook signature verification
endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
event, err := stripe.ConstructEvent(payload, headers["Stripe-Signature"], endpointSecret)

// Process events based on type
switch event.Type {
case "checkout.session.completed":
  session := event.Data.Object.(stripe.CheckoutSession)
  // Update user subscription in database
  activateSubscription(session.Metadata["user_id"], session.Subscription)
case "customer.subscription.deleted":
  subscription := event.Data.Object.(stripe.Subscription)
  // Deactivate user access
  deactivateSubscription(subscription.Metadata["user_id"])
}
```

**Response 200:**
```json
{ "received": true }
```

---

### GET `/merchants/me/subscription`
Get current merchant's active subscription with Stripe details.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub_xxx",
    "stripe_subscription_id": "sub_xxx",
    "stripe_customer_id": "cus_xxx",
    "plan": {
      "id": "plan-pro",
      "name": "Pro",
      "quota_per_month": 2000
    },
    "status": "active",
    "billing_cycle": "monthly",
    "current_period_start": "2025-05-01T00:00:00Z",
    "current_period_end": "2025-06-01T00:00:00Z",
    "cancel_at_period_end": false,
    "auto_renew": true,
    "usage_this_month": 342,
    "remaining_quota": 1658,
    "latest_invoice": {
      "id": "in_xxx",
      "status": "paid",
      "amount": 799,
      "currency": "THB"
    }
  }
}
```

**Implementation Notes:**
- Query both local database and Stripe API for current status
- Cache Stripe responses to reduce API calls
- Handle subscription status mapping (Stripe→Internal)
- Calculate quota based on current billing period

---

### POST `/merchants/me/subscription/cancel`
Cancel subscription (end of current billing period).

**Request:**
```json
{
  "cancel_immediately": false,
  "reason": "Service no longer needed"
}
```

**Implementation Notes:**
- If `cancel_immediately: false` → Cancel at period end (Stripe default)
- If `cancel_immediately: true` → Cancel immediately (not recommended)
- Update local database to reflect cancellation
- Send confirmation email with cancellation details

**Stripe Integration:**
```go
// Cancel at period end
stripe.Subscription.Cancel(subscriptionID, &stripe.SubscriptionCancelParams{
  CancelAtPeriodEnd: true,
})

// Or immediately cancel
stripe.Subscription.Cancel(subscriptionID, nil)
```

**Response 200:**
```json
{
  "success": true,
  "message": "Subscription will end on 2025-06-01.",
  "data": {
    "subscription_id": "sub_xxx",
    "status": "cancelling",
    "cancelled_at": "2025-05-08T00:00:00Z",
    "access_until": "2025-06-01T00:00:00Z",
    "can_reactivate": true
  }
}
```

---

### PUT `/merchants/me/profile`
Update shop profile.

**Request:**
```json
{
  "shop_name": "ร้านดอกไม้ขอนแก่น",
  "address": "123 ถ.มิตรภาพ ขอนแก่น",
  "contact_email": "shop@flower.com"
}
```
**Response 200:**
```json
{ "success": true, "message": "Shop profile updated." }
```

---

### POST `/merchants/me/logo`
Upload shop logo. *(multipart/form-data)*

**Response 200:**
```json
{ "success": true, "data": { "logo_url": "https://cdn.yourdomain.com/logos/uuid.png" } }
```

---

### POST `/merchants/me/line-token`
Save LINE channel credentials.

**Request:**
```json
{
  "line_channel_id": "1234567890",
  "line_channel_secret": "abcdef...",
  "line_access_token": "eyJhbGci..."
}
```
**Response 200:**
```json
{ "success": true, "message": "LINE integration saved." }
```

---

### GET `/merchants/me/quota`
Get current quota status.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "quota_limit": 2000,
    "used": 342,
    "remaining": 1658,
    "reset_date": "2025-06-01",
    "is_blocked": false
  }
}
```

---

## 3. Slip Verification Engine

### POST `/slips/upload`
Upload slip image for verification. *(multipart/form-data)*

**Request:** `file`: image file (jpg/png), `amount`: expected amount (optional)

**Response 202:**
```json
{
  "success": true,
  "message": "Slip received and queued for verification.",
  "data": {
    "slip_id": "slip-uuid",
    "status": "processing",
    "estimated_seconds": 3
  }
}
```

---

### POST `/slips/scan`
Submit raw QR data from scanner.

**Request:**
```json
{ "qr_raw_data": "00020101021...", "expected_amount": 500.00 }
```
**Response 202:**
```json
{
  "success": true,
  "data": { "slip_id": "slip-uuid", "status": "processing" }
}
```

---

### GET `/slips/:slip_id`
Get verification result for a slip.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "slip_id": "slip-uuid",
    "status": "verified",
    "transaction": {
      "reference_no": "REF20250508001",
      "amount": 500.00,
      "sender_bank": "KBANK",
      "receiver_bank": "SCB",
      "transfer_at": "2025-05-08T10:22:00Z",
      "is_duplicate": false
    },
    "validation": {
      "amount_match": true,
      "time_window_ok": true,
      "bank_format_ok": true,
      "duplicate": false
    },
    "fail_reason": null
  }
}
```
**Response (failed):**
```json
{
  "success": true,
  "data": {
    "slip_id": "slip-uuid",
    "status": "failed",
    "fail_reason": "DUPLICATE_SLIP",
    "transaction": null
  }
}
```

---

### POST `/slips/:slip_id/reprocess`
Manually trigger re-verification.

**Response 202:**
```json
{ "success": true, "message": "Slip queued for reprocessing.", "data": { "slip_id": "slip-uuid", "status": "processing" } }
```

---

## 4. Transaction & History

### GET `/transactions`
List transactions with filters.

**Query Params:**
| Param | Type | Example |
|-------|------|---------|
| `status` | string | `success`, `failed`, `pending` |
| `start_date` | date | `2025-05-01` |
| `end_date` | date | `2025-05-31` |
| `search` | string | reference no / amount |
| `page` | int | `1` |
| `limit` | int | `20` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "txn-uuid",
        "reference_no": "REF20250508001",
        "amount": 500.00,
        "status": "success",
        "sender_bank": "KBANK",
        "transfer_at": "2025-05-08T10:22:00Z",
        "slip_id": "slip-uuid"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 342, "total_pages": 18 }
  }
}
```

---

### GET `/transactions/:id`
Get single transaction detail.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "txn-uuid",
    "reference_no": "REF20250508001",
    "amount": 500.00,
    "status": "success",
    "sender_bank": "KBANK",
    "sender_account": "xxx-x-xx123-x",
    "receiver_bank": "SCB",
    "receiver_account": "xxx-x-xx456-x",
    "transfer_at": "2025-05-08T10:22:00Z",
    "is_duplicate": false,
    "fail_reason": null,
    "recheck_count": 0,
    "slip": { "id": "slip-uuid", "image_url": "https://cdn.yourdomain.com/slips/uuid.jpg" },
    "created_at": "2025-05-08T10:22:05Z"
  }
}
```

---

### POST `/transactions/:id/retry`
Retry verification on a failed transaction.

**Response 202:**
```json
{ "success": true, "message": "Retry queued.", "data": { "transaction_id": "txn-uuid", "status": "pending" } }
```

---

### POST `/transactions/:id/manual-recheck`
Admin manually recheck and override status.

**Request:**
```json
{ "status": "success", "note": "Verified by ops team" }
```
**Response 200:**
```json
{ "success": true, "message": "Transaction status updated manually." }
```

---

### GET `/transactions/export`
Export transactions as CSV/Excel.

**Query Params:** Same filters as list + `format=csv|excel`

**Response 200:** File download (application/octet-stream)

---

## 5. LINE Bot & Notification

### POST `/line/webhook`

### POST `/line/webhook`
Receive LINE messaging API events. *(LINE Platform → Server)*

**Request (from LINE):**
```json
{
  "destination": "Uxxxxxx",
  "events": [
    {
      "type": "message",
      "replyToken": "nHuyWiB7yP5...",
      "source": { "userId": "Uxxxxxx", "type": "user" },
      "message": { "type": "image", "id": "12345" }
    }
  ]
}
```
**Response 200:**
```json
{ "status": "ok" }
```

---

### GET `/merchants/me/line-status`
Check LINE integration connection status.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "channel_name": "ร้านดอกไม้ Bot",
    "webhook_verified": true,
    "last_message_at": "2025-05-08T09:00:00Z"
  }
}
```

---

### POST `/notifications/:id/retry`
Retry failed notification delivery.

**Response 200:**
```json
{ "success": true, "message": "Notification retry queued." }
```

---

## 5.1 Webhook Management

### POST `/webhooks/register`
Register webhook URL for slip verification notifications.

**Request:**
```json
{
  "url": "https://yourdomain.com/webhooks/slips",
  "events": ["slip.verified", "slip.failed", "slip.duplicate"],
  "secret": "your_webhook_secret_for_signature_verification"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "webhook_id": "web_xxx",
    "url": "https://yourdomain.com/webhooks/slips",
    "events": ["slip.verified", "slip.failed", "slip.duplicate"],
    "status": "active",
    "created_at": "2025-05-18T10:00:00Z"
  }
}
```

---

### GET `/webhooks`
List all registered webhooks.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "webhook_id": "web_xxx",
      "url": "https://yourdomain.com/webhooks/slips",
      "events": ["slip.verified", "slip.failed"],
      "status": "active",
      "last_triggered": "2025-05-18T09:45:00Z",
      "success_rate": 98.5
    }
  ]
}
```

---

### POST `/webhooks/:webhook_id/test`
Test webhook delivery with sample event.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "test_event_id": "evt_test_xxx",
    "delivered": true,
    "response_code": 200,
    "response_time_ms": 245
  }
}
```

---

### DELETE `/webhooks/:webhook_id`
Delete webhook subscription.

**Response 200:**
```json
{ "success": true, "message": "Webhook deleted successfully." }
```

---

## 5.2 Bank Validation

### POST `/banks/validate`
Validate payment slip directly with bank API (real-time verification).

**Request:**
```json
{
  "qr_raw_data": "00020101021...",
  "bank_code": "KBANK",
  "reference_no": "REF20250518001"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "validation_source": "bank_api",
    "is_valid": true,
    "transaction": {
      "reference_no": "REF20250518001",
      "amount": 500.00,
      "sender_bank": "KBANK",
      "sender_account": "xxx-x-xx123-x",
      "receiver_bank": "SCB",
      "receiver_account": "xxx-x-xx456-x",
      "transfer_time": "2025-05-18T10:30:00Z",
      "transaction_id": "txn_bank_xxx"
    },
    "bank_response_time_ms": 450,
    "validated_at": "2025-05-18T10:30:05Z"
  }
}
```

---

### GET `/banks/status`
Check bank API connectivity and status.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "banks": [
      {
        "bank_code": "KBANK",
        "bank_name": "Kasikornbank",
        "status": "operational",
        "response_time_ms": 320,
        "last_check": "2025-05-18T10:28:00Z"
      },
      {
        "bank_code": "SCB",
        "bank_name": "Siam Commercial Bank",
        "status": "operational",
        "response_time_ms": 410,
        "last_check": "2025-05-18T10:28:00Z"
      }
    ],
    "overall_status": "all_systems_operational"
  }
}
```

---

### POST `/banks/sync`
Force sync with bank APIs for pending transactions.

**Response 202:**
```json
{
  "success": true,
  "message": "Bank sync initiated",
  "data": {
    "sync_id": "sync_xxx",
    "estimated_seconds": 30,
    "pending_count": 15
  }
}
```

---

## 5.3 Custom Branding

### PUT `/merchants/me/branding`
Update merchant branding settings.

**Request:**
```json
{
  "primary_color": "#FF5733",
  "secondary_color": "#3498DB",
  "logo_url": "https://cdn.yourdomain.com/logos/custom-logo.png",
  "company_name": "My Custom Shop Name",
  "custom_css": ".header { background: #FF5733; }",
  "email_template": "custom_template_id"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Branding settings updated",
  "data": {
    "branding_id": "brand_xxx",
    "preview_url": "https://app.yourdomain.com/preview/brand_xxx",
    "applied_at": "2025-05-18T10:35:00Z"
  }
}
```

---

### GET `/merchants/me/branding`
Get current branding settings.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "primary_color": "#FF5733",
    "secondary_color": "#3498DB",
    "logo_url": "https://cdn.yourdomain.com/logos/custom-logo.png",
    "company_name": "My Custom Shop Name",
    "has_custom_css": true,
    "white_label_enabled": true,
    "custom_domain": "verify.myshop.com"
  }
}
```

---

### POST `/merchants/me/logo`
Upload custom logo for branding.

**Request:** `file`: image file (PNG/JPG, max 2MB)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "logo_url": "https://cdn.yourdomain.com/logos/merchant-xxx.png",
    "size_kb": 145,
    "dimensions": "200x200",
    "uploaded_at": "2025-05-18T10:40:00Z"
  }
}
```

---

### DELETE `/merchants/me/logo`
Remove custom logo and revert to default.

**Response 200:**
```json
{ "success": true, "message": "Logo removed, using default branding." }
```

---

### POST `/merchants-me/branding/preview`
Generate preview of custom branding.

**Request:**
```json
{
  "primary_color": "#FF5733",
  "logo_url": "https://cdn.yourdomain.com/logos/test.png"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "preview_url": "https://app.yourdomain.com/preview/temp_xxx",
    "expires_at": "2025-05-18T11:40:00Z"
  }
}
```

---

## 6. Admin Backoffice

> Requires role: `admin`

### GET `/admin/merchants`
List all merchants.

**Query Params:** `status`, `search`, `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid-merchant",
        "shop_name": "ร้านดอกไม้ขอนแก่น",
        "owner_email": "somchai@shop.com",
        "subscription_status": "active",
        "plan": "Pro",
        "total_scans": 342,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 150 }
  }
}
```

---

### GET `/admin/merchants/:id`
Get full merchant detail.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "merchant": { "id": "uuid", "shop_name": "ร้านดอกไม้", "logo_url": "...", "address": "..." },
    "subscription": { "plan": "Pro", "status": "active", "expires_at": "2025-06-01" },
    "usage": { "this_month": 342, "quota": 2000 },
    "line_connected": true
  }
}
```

---

### GET `/admin/subscriptions`
List all subscriptions with status filter.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "sub-uuid",
        "merchant_name": "ร้านดอกไม้",
        "plan": "Pro",
        "status": "active",
        "billing_cycle": "monthly",
        "expires_at": "2025-06-01"
      }
    ]
  }
}
```

---

### POST `/admin/subscriptions/:id/activate`
Force activate a subscription.

**Response 200:**
```json
{ "success": true, "message": "Subscription activated." }
```

---

### POST `/admin/subscriptions/:id/suspend`
Suspend a subscription.

**Request:**
```json
{ "reason": "Payment overdue" }
```
**Response 200:**
```json
{ "success": true, "message": "Subscription suspended." }
```

---

### GET `/admin/payments`
List payment logs.

**Query Params:** `status=pending|success|failed`, `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "pay-uuid",
        "merchant_name": "ร้านดอกไม้",
        "amount": 799,
        "gateway": "promptpay",
        "status": "pending",
        "created_at": "2025-05-08T10:00:00Z"
      }
    ]
  }
}
```

---

### POST `/admin/payments/:id/approve`
Manually approve a payment.

**Request:**
```json
{ "note": "Confirmed via bank statement" }
```
**Response 200:**
```json
{ "success": true, "message": "Payment approved and subscription activated." }
```

---

### GET `/admin/monitoring/usage`
Platform-wide usage overview.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_scans_today": 1204,
    "total_scans_month": 28450,
    "active_merchants": 87,
    "error_rate_percent": 1.2
  }
}
```

---

### GET `/admin/monitoring/errors`
System and error logs.

**Query Params:** `level=error|warning|critical`, `service`, `start_date`, `page`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "log-uuid",
        "level": "error",
        "service": "slip_verification",
        "message": "Timeout connecting to bank validation API",
        "merchant_id": "uuid-merchant",
        "created_at": "2025-05-08T09:15:00Z"
      }
    ]
  }
}
```

---

## 7. Merchant Analytics

### GET `/merchants/me/analytics/dashboard`
Merchant dashboard summary.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_scans": 342,
    "success_rate": 97.4,
    "remaining_quota": 1658,
    "today_scans": 28,
    "this_month_scans": 342
  }
}
```

---

### GET `/merchants/me/analytics/usage`
Usage analytics breakdown.

**Query Params:** `period=7d|30d|90d`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "usage_per_day": [
      { "date": "2025-05-01", "count": 42 },
      { "date": "2025-05-02", "count": 38 }
    ],
    "peak_time": "14:00-16:00",
    "failed_scan_reasons": [
      { "reason": "DUPLICATE_SLIP", "count": 5 },
      { "reason": "AMOUNT_MISMATCH", "count": 3 }
    ]
  }
}
```

---

### GET `/merchants/me/analytics/export`
Export merchant report.

**Query Params:** `format=csv|excel`, `start_date`, `end_date`

**Response 200:** File download

---

## 8. Admin Analytics

### GET `/admin/analytics/dashboard`
Platform-level KPI summary.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_transactions": 128450,
    "active_merchants": 87,
    "total_revenue": 63500,
    "system_error_rate": 0.8
  }
}
```

---

### GET `/admin/analytics/revenue`
Revenue analytics.

**Query Params:** `period=monthly|yearly`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "revenue_by_plan": [
      { "plan": "Starter", "revenue": 8970 },
      { "plan": "Pro", "revenue": 54530 }
    ],
    "mrr": 63500,
    "growth_percent": 12.4,
    "churn_rate": 3.1,
    "renewal_rate": 96.9
  }
}
```

---

### GET `/admin/analytics/merchants/performance`
Merchant performance breakdown.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "usage_per_merchant": [
      { "merchant_id": "uuid", "shop_name": "ร้านดอกไม้", "scans": 342, "quota_percent": 17.1 }
    ],
    "top_active": [ { "shop_name": "ร้านข้าว", "scans": 1850 } ],
    "low_usage": [ { "shop_name": "ร้านเสื้อ", "scans": 12, "last_scan": "2025-04-20" } ]
  }
}
```

---

### GET `/admin/analytics/export`
Admin report export (PDF/Excel).

**Query Params:** `format=pdf|excel`, `type=revenue|performance`, `period`

**Response 200:** File download

---

---

# 9. Database Schema

## Entity Relationship Overview

```
users ──< merchants (owner_id)
merchants ──< subscriptions
subscriptions >── subscription_plans
merchants ──< payment_logs
merchants ──< slips
slips ──< transactions (1:1)
transactions ──< notifications
merchants ──< usage_counters
merchants ──< system_logs
```

---

## Common Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}
}
```

| HTTP Status | Error Code | Meaning |
|-------------|------------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient role/plan |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `DUPLICATE` | Resource already exists |
| 422 | `QUOTA_EXCEEDED` | Monthly scan limit reached |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## JWT Payload Structure

```json
{
  "sub": "user-uuid",
  "merchant_id": "merchant-uuid",
  "role": "merchant_owner",
  "plan": "pro",
  "iat": 1715000000,
  "exp": 1715003600
}
```

---

*Generated from architecture diagrams — 8 modules, 42 endpoints, 11 DB tables*
