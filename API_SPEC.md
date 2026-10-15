# FlowSlip API Spec

Current as of 2026-10-13.

## Base URLs

```text
Local API:      http://localhost:8080
Local frontend: http://localhost:3000
UAT frontend:   https://flowslip-test.aacc-ai.com
```

Frontend calls API paths under `/v1`, for example:

```text
https://flowslip-test.aacc-ai.com/v1/auth/login
```

## Current Product Flow

FlowSlip verifies payment slips through a merchant LINE bot:

1. Merchant registers/logs in.
2. Merchant profile is created. Free tier is auto-activated.
3. Merchant configures LINE Official Account credentials.
4. FlowSlip generates a merchant webhook URL: `/v1/line/webhook/:ref_id`.
5. Customer sends a slip image to the merchant LINE bot.
6. Backend validates the LINE signature, replies immediately with a received/processing message, and queues the image verification job.
7. A LINE queue worker downloads the image from LINE, extracts QR data, sends it to HaveSLIP, stores slip/transaction result, increments quota, and pushes the result back to LINE.
8. Merchant views dashboard, transactions, usage, payment history, and subscription.

Direct customer-facing slip upload/scan endpoints are not part of the current app flow.

## Background Jobs

LINE image verification uses a Redis-backed queue:

```text
queue:line_webhook:image_jobs
```

If Redis is unavailable, the backend falls back to an in-process channel so the LINE webhook still returns quickly. The fallback is not durable across process restarts, so production should run Redis.

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

Admin endpoints additionally require `role = admin`.

## Response Envelope

Most JSON responses use:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

## Health

### GET `/health`

Checks API/database health.

```json
{
  "status": "ok",
  "service": "Slip Verification API",
  "version": "1.0.0",
  "port": "8080",
  "database": "connected"
}
```

### GET `/v1/`

Returns API info.

## Auth

### POST `/v1/auth/register`

Creates a merchant user. A default merchant profile and free plan are created automatically.

```json
{
  "name": "Unik",
  "email": "unik@example.com",
  "password": "password123",
  "phone": "02078974620"
}
```

### POST `/v1/auth/verify-otp`

Verifies email OTP and returns tokens.

```json
{
  "email": "unik@example.com",
  "otp": "123456"
}
```

### POST `/v1/auth/resend-otp`

```json
{
  "email": "unik@example.com"
}
```

### POST `/v1/auth/login`

```json
{
  "email": "unik@example.com",
  "password": "password123"
}
```

Response data:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "expires_in": 86400,
  "user": {
    "id": "uuid",
    "name": "Unik",
    "email": "unik@example.com",
    "role": "merchant",
    "merchant_id": "uuid",
    "line_linked": false,
    "email_verified": true,
    "created_at": "2026-10-13T00:00:00Z"
  }
}
```

### POST `/v1/auth/line-login`

LINE Login OAuth.

```json
{
  "line_code": "authorization_code",
  "redirect_uri": "http://localhost:3000/auth/line/callback"
}
```

### POST `/v1/auth/forgot-password`

```json
{
  "email": "unik@example.com"
}
```

### POST `/v1/auth/reset-password`

```json
{
  "email": "unik@example.com",
  "otp": "123456",
  "new_password": "newpassword123"
}
```

### GET `/v1/auth/me`

Protected. Returns current user profile.

### PUT `/v1/auth/profile`

Protected. Updates name/phone.

```json
{
  "name": "Unik",
  "phone": "02078974620"
}
```

### POST `/v1/auth/connect-line`

Protected. Connects a LINE account to the logged-in user.

```json
{
  "line_code": "authorization_code",
  "redirect_uri": "http://localhost:3000/auth/line/callback"
}
```

### POST `/v1/auth/logout`

Protected. Logs out the current user.

## Plans and Checkout

### GET `/v1/plans`

Public. Returns active plans from `subscription_plans`.

Current active plan IDs:

```text
plan-free
plan-starter
plan-pro
plan-enterprise
```

Example response data:

```json
[
  {
    "id": "plan-free",
    "name": "Free",
    "price_monthly": 0,
    "price_yearly": 0,
    "quota_per_month": 50,
    "is_active": true
  },
  {
    "id": "plan-starter",
    "name": "Starter",
    "price_monthly": 299,
    "price_yearly": 2990,
    "quota_per_month": 200,
    "is_active": true
  },
  {
    "id": "plan-pro",
    "name": "Pro",
    "price_monthly": 799,
    "price_yearly": 7990,
    "quota_per_month": 1000,
    "is_popular": true,
    "is_active": true
  },
  {
    "id": "plan-enterprise",
    "name": "Enterprise",
    "price_monthly": 999,
    "price_yearly": 9990,
    "quota_per_month": 4000,
    "is_active": true
  }
]
```

### POST `/v1/checkout`

Protected. Creates a Stripe Checkout session for a paid plan or activates free plan where applicable.

```json
{
  "plan_id": "plan-pro",
  "billing_cycle": "monthly"
}
```

`billing_cycle`: `monthly` or `yearly`.

Response data:

```json
{
  "checkout_session_id": "cs_test_...",
  "checkout_url": "https://checkout.stripe.com/...",
  "amount": 799,
  "currency": "THB",
  "plan_id": "plan-pro",
  "billing_cycle": "monthly",
  "expires_at": "2026-10-13T12:30:00Z"
}
```

### POST `/v1/checkout/webhook`

Public Stripe webhook endpoint.

Recommended Stripe events:

```text
checkout.session.completed
payment_intent.succeeded
invoice.paid
customer.subscription.deleted
```

Checkout is currently created in Stripe `payment` mode. The backend manages plan period/expiry in its own `subscriptions` table.

## Merchant Profile

All endpoints in this section are protected.

### POST `/v1/merchants/me/profile`

Creates merchant profile. In the current product, duplicate checks are always enabled.

```json
{
  "shop_name": "Unik Shop",
  "address": "13 South Road, Thakhek",
  "contact_email": "shop@example.com",
  "contact_phone": "02078974620",
  "business_hours": {
    "open": "09:00",
    "close": "18:00",
    "days": ["mon", "tue", "wed", "thu", "fri"]
  }
}
```

### GET `/v1/merchants/me/profile`

Returns merchant profile.

### PUT `/v1/merchants/me/profile`

Updates merchant profile.

### POST `/v1/merchants/me/logo`

Multipart upload.

```text
logo: <image file>
```

Response data:

```json
{
  "logo_url": "https://..."
}
```

## Merchant Settings

### GET `/v1/merchants/me/settings`

Protected. Returns notification/business preferences.

### PUT `/v1/merchants/me/settings`

Protected. Updates notification/business preferences.

```json
{
  "notification_preferences": {
    "send_line_notifications": true,
    "send_email_summary": false,
    "notify_on_failed_verification": true,
    "daily_summary_time": "18:00"
  },
  "business_preferences": {
    "currency": "THB",
    "timezone": "Asia/Bangkok",
    "language": "th"
  }
}
```

## Subscription, Quota, Payments

### GET `/v1/merchants/me/subscription`

Protected. Returns current subscription and whether free plan has been used.

Response data:

```json
{
  "subscription": {
    "id": "uuid",
    "merchant_id": "uuid",
    "plan_id": "plan-pro",
    "status": "active",
    "billing_cycle": "monthly",
    "stripe_subscription_id": "cs_test_...",
    "stripe_customer_id": "cus_...",
    "started_at": "2026-10-13T00:00:00Z",
    "expires_at": "2026-11-13T00:00:00Z",
    "auto_renew": true,
    "cancelled_at": null,
    "plan": {
      "id": "plan-pro",
      "name": "Pro",
      "quota_per_month": 1000
    },
    "usage_this_month": 10,
    "remaining_quota": 990
  },
  "free_plan_used": true
}
```

### POST `/v1/merchants/me/subscription/cancel`

Protected. Cancels renewal only. Access remains active until `expires_at`.

```json
{
  "cancel_immediately": false,
  "reason": "No longer needed"
}
```

### GET `/v1/merchants/me/payments`

Protected. Lists merchant payment history.

Query:

```text
limit=100
```

Response data:

```json
{
  "items": [
    {
      "id": "uuid",
      "merchant_id": "uuid",
      "merchant_name": "Unik Shop",
      "subscription_id": "uuid",
      "amount": 799,
      "currency": "thb",
      "gateway": "stripe",
      "gateway_reference_id": "cs_test_...",
      "status": "success",
      "paid_at": "2026-10-13T00:00:00Z",
      "created_at": "2026-10-13T00:00:00Z"
    }
  ],
  "total": 1
}
```

### GET `/v1/merchants/me/quota`

Protected.

```json
{
  "quota_limit": 1000,
  "used": 10,
  "remaining": 990,
  "reset_date": "2026-11-13T00:00:00Z",
  "is_blocked": false
}
```

## Merchant Analytics

### GET `/v1/merchants/me/analytics/dashboard`

Protected. Returns dashboard summary: scan totals, success rate, amount totals, client counts, duplicate counts, and plan usage.

### GET `/v1/merchants/me/analytics/usage`

Protected.

Query:

```text
period=7d
period=30d
```

Returns daily verified/failed counts, failed reason summary, and credit usage.

### GET `/v1/merchants/me/analytics/export`

Protected. Exports analytics CSV.

Query:

```text
format=csv
```

## LINE Webhook Configuration

Protected endpoints for merchant LINE bot setup.

### GET `/v1/merchants/me/line-webhook`

Returns saved LINE config metadata. Secrets/tokens are not returned in plaintext.

### PUT `/v1/merchants/me/line-webhook`

Creates or updates LINE credentials.

```json
{
  "line_channel_id": "2000000000",
  "line_channel_secret": "LINE channel secret",
  "line_access_token": "LINE Messaging API access token"
}
```

### DELETE `/v1/merchants/me/line-webhook`

Deletes merchant LINE webhook config.

### GET `/v1/merchants/me/webhook-url`

Generates/returns the merchant LINE webhook URL.

Response data:

```json
{
  "webhook_url": "https://flowslip-test.aacc-ai.com/v1/line/webhook/h6sP",
  "webhook_reference_id": "h6sP"
}
```

### POST `/v1/line/webhook/:ref_id`

Public endpoint called by LINE.

Headers:

```http
X-Line-Signature: <signature>
```

LINE image messages trigger queued slip verification. The backend replies immediately with a received/processing message, enqueues the image job, then a background worker pushes the verification result to the LINE user.

## Slips

Current direct slip API is read-only for dashboard/history. Slip creation happens through the LINE webhook flow.

### GET `/v1/slips`

Protected. Lists slips.

Query:

```text
page=1
limit=20
status=pending|processing|verified|failed
```

### GET `/v1/slips/stats`

Protected. Returns slip stats.

### GET `/v1/slips/:slip_id`

Protected. Returns slip detail and linked transaction if available.

## Transactions

### GET `/v1/transactions`

Protected. Lists transaction history.

Query:

```text
page=1
limit=15
status=success|failed|pending|processing
start_date=2026-10-01
end_date=2026-10-13
search=SCB
```

### GET `/v1/transactions/:id`

Protected. Returns full transaction detail.

### GET `/v1/transactions/export`

Protected. Exports CSV.

Query:

```text
format=csv
status=success
start_date=2026-10-01
end_date=2026-10-13
search=SCB
```

## Admin

All admin endpoints require an authenticated admin user.

### GET `/v1/admin/users`

Query:

```text
page=1
limit=20
search=unik
role=merchant|admin
start_date=2026-10-01
end_date=2026-10-13
```

### GET `/v1/admin/users/export`

Exports users CSV.

### GET `/v1/admin/merchants`

Lists merchants with subscription/usage summary.

### GET `/v1/admin/merchants/export`

Exports merchants CSV.

### GET `/v1/admin/merchants/:id`

Full merchant detail: profile, users, subscription, usage, payments, billing, and recent transactions.

### GET `/v1/admin/merchants/:id/transactions`

Lists transactions for one merchant.

Query supports `page`, `limit`, `status`, `start_date`, `end_date`, and `search`.

### GET `/v1/admin/payments`

Lists payment logs.

### GET `/v1/admin/payments/export`

Exports payment logs CSV.

### GET `/v1/admin/analytics/dashboard`

Platform dashboard analytics.

Includes real platform data from `transactions`, `slips`, `merchants`, `users`, `line_webhook_configs`, `usage_counters`, and `payment_logs`.

Important fields:

```json
{
  "total_transactions": 4,
  "successful_transactions": 4,
  "failed_transactions": 0,
  "active_merchants": 2,
  "total_merchants": 2,
  "connected_bots": 1,
  "total_scans": 3,
  "total_revenue": 1100,
  "today_transactions": 2,
  "today_revenue": 0,
  "system_error_rate": 0,
  "provider_credits_used": 4,
  "provider_cached_count": 0,
  "failed_scan_reasons": [
    { "reason": "DUPLICATE_SLIP", "count": 2 }
  ],
  "recent_verifications": [
    {
      "transaction_id": "uuid",
      "merchant_id": "uuid",
      "merchant_name": "unik",
      "slip_id": "uuid",
      "amount": 300,
      "status": "success",
      "provider": "haveslip",
      "provider_verification_id": "ver_xxx",
      "provider_status": "completed",
      "provider_valid": true,
      "provider_cached": false,
      "provider_charged_credits": 1,
      "sender_bank": "KBank",
      "receiver_bank": "SCB",
      "created_at": "2026-10-13T08:00:00Z"
    }
  ]
}
```

### GET `/v1/admin/analytics/revenue`

Revenue analytics.

### GET `/v1/admin/analytics/merchants/performance`

Merchant performance analytics.

### GET `/v1/admin/bank/status`

Returns configured verification provider status. Current provider is HaveSLIP when:

```env
SLIP_VALIDATION_PROVIDER=haveslip
HAVESLIP_MOCK_MODE=false
```

## Verification Provider: HaveSLIP

Current slip validation provider:

```env
SLIP_VALIDATION_PROVIDER=haveslip
HAVESLIP_API_URL=https://api.haveslip.com/api
HAVESLIP_API_KEY=<secret>
HAVESLIP_MOCK_MODE=false
```

Backend flow:

1. Extract QR from slip image.
2. Parse Thai bank QR/ref/amount.
3. Send verification request to HaveSLIP.
4. Store HaveSLIP response fields in `transactions.provider_*` and `transactions.provider_response`.
5. Mark duplicate/failed/success result.

No public direct HaveSLIP endpoint is exposed by FlowSlip.

## Removed / Not Current

These were in older specs but are not current registered routes:

```text
POST /v1/slips/upload
POST /v1/slips/scan
POST /v1/slips/:slip_id/reprocess
POST /v1/merchants/me/test
```

Use the LINE webhook flow for verification.

## Status Values

### User roles

```text
merchant
admin
```

### Subscription status

```text
trial
active
suspended
cancelled
expired
pending
```

Cancel currently disables renewal but keeps verification usable until `expires_at`.

### Slip status

```text
pending
processing
verified
failed
```

### Transaction status

```text
pending
processing
success
failed
```

### Fail reasons

```text
DUPLICATE_SLIP
AMOUNT_MISMATCH
TIMEOUT
INVALID_QR
BANK_ERROR
EXPIRED_SLIP
```

## Common HTTP Status Codes

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

## Deployment Notes

Important env names used by the backend:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER_MONTHLY=
STRIPE_PRICE_ID_STARTER_YEARLY=
STRIPE_PRICE_ID_PRO_MONTHLY=
STRIPE_PRICE_ID_PRO_YEARLY=
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=
STRIPE_SUCCESS_URL=http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/billing
```

Do not use `PRICE_ID_STARTER_MONTHLY`; backend reads `STRIPE_PRICE_ID_STARTER_MONTHLY`.

