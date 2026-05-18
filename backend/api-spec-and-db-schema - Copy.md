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
6. [Module 6 — Admin Backoffice](#6-admin-backoffice)
7. [Module 7 — Merchant Analytics](#7-merchant-analytics)
8. [Module 8 — Admin Analytics](#8-admin-analytics)
9. [Database Schema](#9-database-schema)

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
{ "line_code": "code_from_line_oauth", "redirect_uri": "http://app.yourdomain.com/auth/callback" }
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
      "name": "free",
      "price_monthly": 0,
      "price_yearly": 0,
      "quota_per_month": 50,
      "features": ["slip_verify", "line_notify", "csv_export","analytics"],
      "is_popular": false
    },
    {
      "id": "plan-starter",
      "name": "Starter",
      "price_monthly": 299,
      "price_yearly": 2990,
      "quota_per_month": 200,
      "features": ["slip_verify", "line_notify", "csv_export","analytics"],
      "is_popular": false
    },
    {
      "id": "plan-pro",
      "name": "Pro",
      "price_monthly": 799,
      "price_yearly": 7990,
      "quota_per_month": 1000,
      "features": ["slip_verify", "line_notify", "csv_export", "analytics", "priority_support"],
      "is_popular": true
    }
  ]
}
```

---

### POST `/checkout`
Create subscription checkout session.

**Request:**
```json
{
  "plan_id": "plan-pro",
  "billing_cycle": "monthly",
  "payment_method": "promptpay"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "checkout_id": "chk-uuid",
    "amount": 799,
    "currency": "THB",
    "qr_code_url": "https://cdn.yourdomain.com/qr/chk-uuid.png",
    "expires_at": "2025-05-08T13:30:00Z"
  }
}
```

---

### POST `/checkout/webhook`
Receive payment gateway callback. *(Internal / Gateway)*

**Request (from gateway):**
```json
{
  "event": "payment.success",
  "reference": "chk-uuid",
  "amount": 799,
  "paid_at": "2025-05-08T13:22:00Z"
}
```
**Response 200:**
```json
{ "received": true }
```

---

### GET `/merchants/me/subscription`
Get current merchant's active subscription.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub-uuid",
    "plan": { "name": "Pro", "quota_per_month": 2000 },
    "status": "active",
    "billing_cycle": "monthly",
    "started_at": "2025-05-01T00:00:00Z",
    "expires_at": "2025-06-01T00:00:00Z",
    "auto_renew": true,
    "usage_this_month": 342,
    "remaining_quota": 1658
  }
}
```

---

### POST `/merchants/me/subscription/cancel`
Cancel subscription (end of period).

**Response 200:**
```json
{ "success": true, "message": "Subscription will end on 2025-06-01.", "cancelled_at": "2025-05-08T00:00:00Z" }
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
