# API Specification & DB Schema
## Slip Verification SaaS Platform (QR-Only)

> Base URL: `https://api.yourdomain.com/v1`
> Auth: Bearer JWT (except public endpoints)
> Content-Type: `application/json`
> **Verification Method:** QR Code scanning only (no OCR) - extracts EMVCo data from slip QR

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Module 1 — Authenticate](#1-authenticate)
3. [Module 2 — Merchant Management & Subscription](#2-merchant-management--subscription)
4. [Module 3 — Slip Verification Engine](#3-slip-verification-engine)
5. [Module 4 — Transaction & History](#4-transaction--history)
6. [Module 5 — LINE Bot & Notification](#5-line-bot--notification)
   - [5.1 Custom Webhook Management (Future)](#51-custom-webhook-management-future)
   - [5.2 Bank Validation](#52-bank-validation)
   - [5.3 Custom Branding (Future)](#53-custom-branding-future)
7. [Module 6 — Admin Backoffice](#6-admin-backoffice)
8. [Module 7 — Merchant Analytics](#7-merchant-analytics)
9. [Module 8 — Admin Analytics](#8-admin-analytics)
10. [Database Schema](#10-database-schema)

---

## Architecture Overview

**Service Model:** One merchant per LINE Bot / LINE Official Account

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│ Customer        │───▶│ Merchant Bot │───▶│ Your API    │
│ (sends slip)    │    │ Merchant Bot │    │             │
└─────────────────┘    └──────────────┘    └─────────────┘
                                              │
                                              ▼
                                      ┌─────────────┐
                                      │ KBank API   │
                                      │ (validation)│
                                      └─────────────┘
```

**Key Points:**
- **Each merchant uses their own LINE Bot / LINE Official Account**
- **Each merchant configures their own LINE channel ID, channel secret, and access token**
- **SlipSure generates a unique webhook URL per merchant**
- **Bank validation** is the core feature (verifies genuine transactions)
- **Simple merchant profiles** (shop name, contact info)
- **Customer flow**: Send slip to merchant bot → SlipSure verifies → Get verification

**MVP Features:**
- ✅ Slip verification with bank validation
- ✅ Merchant shop settings (profile, logo, preferences)
- ✅ Transaction history & search
- ✅ Duplicate detection
- ✅ Basic analytics & reporting

**Merchant Shop Settings:**
- 🏪 **Shop Profile**: Name, address, contact information
- 🖼️ **Shop Logo**: Basic logo for identification
- ⚙️ **Business Settings**: Hours, timezone, currency
- 🔔 **Notification Preferences**: How/when to receive alerts
- ✅ **Verification Limits**: Auto-approve thresholds, manual confirm rules

**Future Features:**
- 🔧 Custom webhooks
- 🔧 White-label branding
- 🔧 Shared SlipSure LINE Bot marketplace/discovery flow

---

## 1.1 Stripe Payment Integration

### Stripe Configuration

**Required Environment Variables:**
```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx        # Secret key for backend API calls
STRIPE_PUBLISHABLE_KEY=pk_test_xxx   # Public key for frontend (via API)
STRIPE_WEBHOOK_SECRET=whsec_xxx      # Webhook signing secret for verification

# Plan Pricing (THB) - For reference, actual prices set in Stripe Dashboard
PRICE_STARTER_MONTHLY=299
PRICE_STARTER_YEARLY=2990           # 17% discount (10 months price)
PRICE_PRO_MONTHLY=799
PRICE_PRO_YEARLY=7990               # 17% discount (10 months price)

# Plan Quotas (scans per month) - Same quota regardless of billing cycle
QUOTA_FREE=50
QUOTA_STARTER=200
QUOTA_PRO=1000

# Stripe Price IDs (Product mapping) - Configured in Stripe Dashboard
# Note: Yearly prices are discounted (10 months price for 12 months = 2 months free)
STRIPE_PRICE_ID_FREE=price_free
STRIPE_PRICE_ID_STARTER_MONTHLY=price_starter_monthly    # 299 THB/month
STRIPE_PRICE_ID_STARTER_YEARLY=price_starter_yearly      # 2990 THB/year (10× monthly, 2 months free)
STRIPE_PRICE_ID_PRO_MONTHLY=price_pro_monthly            # 799 THB/month
STRIPE_PRICE_ID_PRO_YEARLY=price_pro_yearly              # 7990 THB/year (10× monthly, 2 months free)

# Stripe Configuration
STRIPE_SUCCESS_URL=https://app.yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://app.yourdomain.com/billing
```

### Stripe Product Setup

**Pricing Strategy - Yearly Discount Model:**
- **Monthly Plans**: Standard monthly billing
- **Yearly Plans**: 17% discount (pay for 10 months, get 2 months free)
- **Quota**: Same monthly quota regardless of billing cycle (quota_per_month)
  - Example: Starter plan = 200 scans/month whether billed monthly or yearly

**Create Products in Stripe Dashboard:**
1. **Free Plan** - No price needed (50 scans/month quota)
2. **Starter Plan** - 299 THB/month, 2990 THB/year (10 months price = 2 months free)
3. **Pro Plan** - 799 THB/month, 7990 THB/year (10 months price = 2 months free)

**Price Configuration:**
```javascript
// Stripe Dashboard → Products → Create pricing
// Starter Monthly: 299 THB/month, 200 scans/month quota
Recurring: Monthly, THB 299
Price ID: price_starter_monthly

// Starter Yearly: 2990 THB/year (17% discount), 200 scans/month quota
Recurring: Yearly, THB 2990 (10 months price, 2 months free)
Price ID: price_starter_yearly

// Pro Monthly: 799 THB/month, 1000 scans/month quota
Recurring: Monthly, THB 799
Price ID: price_pro_monthly

// Pro Yearly: 7990 THB/year (17% discount), 1000 scans/month quota
Recurring: Yearly, THB 7990 (10 months price, 2 months free)
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

**Billing & Quota Model:**
- `billing_cycle: "monthly"` → Billed monthly, quota resets monthly (200 scans/month)
- `billing_cycle: "yearly"` → Billed yearly (17% discount), quota still resets monthly (200 scans/month)
- Yearly plans get discounted pricing but same monthly quota structure
- Unused monthly quota does not roll over between months

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

### GET `/merchants/me/profile`
Get current merchant shop profile.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "shop_name": "ร้านดอกไม้ขอนแก่น",
    "address": "123 ถ.มิตรภาพ ขอนแก่น",
    "contact_email": "shop@flower.com",
    "contact_phone": "0812345678",
    "logo_url": "https://cdn.yourdomain.com/shop-logos/merchant-uuid.png",
    "business_hours": {
      "open": "09:00",
      "close": "18:00",
      "days": ["mon", "tue", "wed", "thu", "fri", "sat"]
    },
    "verification_settings": {
      "auto_verify_limit": 1000,
      "require_confirmation_above": 5000
    },
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-05-22T10:30:00Z"
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
  "contact_email": "shop@flower.com",
  "contact_phone": "0812345678",
  "business_hours": {
    "open": "09:00",
    "close": "18:00",
    "days": ["mon", "tue", "wed", "thu", "fri", "sat"]
  },
  "verification_settings": {
    "auto_verify_limit": 1000,
    "require_confirmation_above": 5000
  }
}
```
**Response 200:**
```json
{ "success": true, "message": "Shop profile updated." }
```

**Implementation Notes:**
- Merchants use YOUR main LINE Bot service (no need for their own LINE Bot)
- Shop name appears in customer-facing messages and dashboard
- Business hours determine when verification is active
- Auto-verify limit: amounts under this are automatically verified
- Manual confirmation required for amounts above threshold

---

### POST `/merchants/me/logo`
Upload shop logo for identification. *(multipart/form-data)*

**Request:** `file`: image file (PNG/JPG, max 2MB)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "logo_url": "https://cdn.yourdomain.com/shop-logos/merchant-uuid.png",
    "size_kb": 145,
    "dimensions": "200x200",
    "uploaded_at": "2025-05-22T10:35:00Z"
  }
}
```

**Implementation Notes:**
- Logo used for merchant identification in dashboard
- Simple upload to DigitalOcean Spaces
- No custom branding (white-label) in MVP
- Logo helps customers identify the merchant

---

### PUT `/merchants/me/settings`
Update merchant shop settings and preferences.

**Request:**
```json
{
  "notification_preferences": {
    "send_line_notifications": true,
    "send_email_summary": true,
    "notify_on_failed_verification": true,
    "daily_summary_time": "18:00"
  },
  "verification_preferences": {
    "auto_verify_limit": 1000,
    "require_confirmation_above": 5000,
    "strict_mode": false,
    "allow_duplicates": false
  },
  "business_preferences": {
    "currency": "THB",
    "timezone": "Asia/Bangkok",
    "language": "th"
  }
}
```
**Response 200:**
```json
{
  "success": true,
  "message": "Shop settings updated.",
  "data": {
    "updated_settings": ["notification_preferences", "verification_preferences"],
    "updated_at": "2025-05-22T10:40:00Z"
  }
}
```

**Implementation Notes:**
- **Notification preferences**: How merchant receives alerts
- **Verification preferences**: Auto-approve limits, confirmation rules
- **Business preferences**: Currency, timezone, language settings

---

### GET `/merchants/me/settings`
Get current merchant shop settings.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "notification_preferences": {
      "send_line_notifications": true,
      "send_email_summary": true,
      "notify_on_failed_verification": true,
      "daily_summary_time": "18:00"
    },
    "verification_preferences": {
      "auto_verify_limit": 1000,
      "require_confirmation_above": 5000,
      "strict_mode": false,
      "allow_duplicates": false
    },
    "business_preferences": {
      "currency": "THB",
      "timezone": "Asia/Bangkok",
      "language": "th"
    },
    "updated_at": "2025-05-22T10:40:00Z"
  }
}
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

Slip verification is started from LINE only. Customers send a slip image to the merchant's LINE Bot, LINE calls `POST /line/webhook/:ref_id`, and the backend downloads the image and runs verification internally.

The `/slips/*` endpoints are dashboard support endpoints for viewing results and stats. They are not part of the normal customer verification flow.

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
      "time_window_ok": true,
      "bank_format_ok": true,
      "duplicate": false,
      "receiver_account_match": true
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

### GET `/slips`
List merchant slips for dashboard history.

**Query Params:** `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "slips": [],
    "pagination": { "page": 1, "limit": 20, "total": 0 }
  }
}
```

---

### GET `/slips/stats`
Get merchant slip verification stats for dashboard overview.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_slips": 0,
    "verified_slips": 0,
    "failed_slips": 0,
    "success_rate": 0
  }
}
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

### GET `/transactions/export`
Export transactions as CSV/Excel.

**Query Params:** Same filters as list + `format=csv|excel`

**Response 200:** File download (application/octet-stream)

---

## 5. LINE Bot & Notification

Merchants connect their own LINE Bot / LINE Official Account by saving LINE Messaging API credentials. SlipSure generates a merchant-specific webhook URL that the merchant enters in the LINE Developers console.

### GET `/merchants/me/line-webhook`
Get the current merchant LINE webhook configuration.

**Response 200:**
```json
{
  "config": {
    "is_configured": true,
    "line_channel_id": "2000000000",
    "webhook_reference_id": "A1b2",
    "webhook_url": "https://api.yourdomain.com/v1/line/webhook/A1b2"
  }
}
```

---

### PUT `/merchants/me/line-webhook`
Create or update the merchant LINE webhook configuration.

**Request:**
```json
{
  "line_channel_id": "2000000000",
  "line_channel_secret": "line-channel-secret",
  "line_access_token": "line-access-token"
}
```

**Response 200:**
```json
{
  "message": "LINE webhook configuration updated successfully",
  "config": {
    "is_configured": true,
    "webhook_reference_id": "A1b2",
    "webhook_url": "https://api.yourdomain.com/v1/line/webhook/A1b2"
  }
}
```

---

### DELETE `/merchants/me/line-webhook`
Remove the merchant LINE webhook configuration.

**Response 200:**
```json
{ "message": "LINE webhook configuration deleted successfully" }
```

---

### GET `/merchants/me/webhook-url`
Return the generated LINE webhook URL for the merchant.

**Response 200:**
```json
{
  "webhook_url": "https://api.yourdomain.com/v1/line/webhook/A1b2",
  "webhook_reference_id": "A1b2"
}
```

---

### POST `/line/webhook/:ref_id`
Receive LINE messaging API events. *(LINE Platform → Server)*

**Architecture:**
- **One merchant = one LINE Bot / LINE Official Account**
- Each merchant has their own LINE channel ID, channel secret, and access token
- SlipSure generates a unique webhook URL for each merchant
- Customers send slips directly to the merchant's LINE Bot
- Processed results are returned in that merchant LINE chat

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

**Implementation Notes:**
- Use the merchant's saved LINE Messaging API configuration
- Customer flow: Send slip to merchant bot → SlipSure verifies → Get verification result
- Merchant flow: See verified transactions in dashboard

---

## 5.1 Custom Webhook Management (Future Feature)

**NOT IMPLEMENTED IN MVP**

Custom webhook management will be available in future versions, allowing merchants to:
- Register custom webhook URLs for real-time notifications
- Configure event types (slip.verified, slip.failed, slip.duplicate)
- Test webhook delivery
- Monitor webhook success rates

**For MVP:** All notifications go through LINE Bot responses and merchant dashboard.

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
    "bank_status_code": "0000",
    "bank_message": "Success",
    "transaction": {
      "transaction_id": "txn_bank_xxx",
      "reference_no": "REF20250518001",
      "amount": 500.00,
      "sender_bank": "KBANK",
      "sender_account": "xxx-x-xx123-x",
      "receiver_bank": "SCB",
      "receiver_account": "xxx-x-xx456-x",
      "transfer_time": "2025-05-18T10:30:00Z"
    },
    "bank_response_time_ms": 450,
    "validated_at": "2025-05-18T10:30:05Z"
  }
}
```

**Authentication Flow:**

**Bank API Security Requirements:**
- OAuth2 Client Credentials flow for K API access
- mTLS for production environments
- Access token caching with automatic refresh
- Retry logic with exponential backoff

**Implementation Notes:**
1. Obtain access token on service startup
2. Refresh token 5 minutes before expiration
3. Use circuit breaker pattern for bank API calls
4. Log all bank API interactions for audit trails

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

## 5.3 Custom Branding (Future Feature)

**NOT IMPLEMENTED IN MVP**

Custom branding will be available in future versions, allowing merchants to:
- Upload custom logos
- Set brand colors and themes
- Configure white-label options

**For MVP:** Merchants use their own LINE Bot with default SlipSure result messages.

---

## 6. Admin Backoffice

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

**Query Params:** `status=pending|success|failed|refunded`, `page`, `limit` (maximum 100)

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
    "this_month_scans": 342,
    "daily_revenue": 45000.00,
    "pending_confirmations": 5,
    "completed_today": 23
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
