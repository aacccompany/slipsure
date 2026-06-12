# SlipSure API Documentation

## Base URL
```
Production: https://api.slipsure.com
Development: http://localhost:8080
```

## Authentication
Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "error": "Error message if failed"
}
```

---

## Health Check

### GET /health
Check API health status.

**Response:**
```json
{
  "status": "ok",
  "service": "Slip Verification API",
  "version": "1.0.0",
  "port": "8080",
  "database": "connected"
}
```

---

## Authentication Endpoints

### POST /v1/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+66812345678"
}
```

**Validation:**
- `name`: required
- `email`: required, must be valid email
- `password`: required, minimum 8 characters
- `phone`: optional

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "john@example.com",
    "otp_sent_to": true,
    "message": "OTP sent to your email. Please verify to complete registration."
  }
}
```

---

### POST /v1/auth/verify-otp
Verify OTP code sent to email.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 86400,
    "message": "Email verified successfully"
  }
}
```

---

### POST /v1/auth/resend-otp
Resend OTP to email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "OTP resent successfully"
  }
}
```

---

### POST /v1/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "merchant",
      "line_linked": false,
      "email_verified": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### POST /v1/auth/line-login
Login with LINE OAuth.

**Request Body:**
```json
{
  "line_code": "authorization_code_from_LINE",
  "redirect_uri": "https://yourapp.com/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 86400,
    "is_new_user": false,
    "user": { ... }
  }
}
```

---

### POST /v1/auth/forgot-password
Request password reset via email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset OTP sent to your email"
  }
}
```

---

### POST /v1/auth/reset-password
Reset password with OTP.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

## Protected Auth Endpoints (Require Auth + Email Verification)

### GET /v1/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+66812345678",
    "role": "merchant",
    "merchant_id": "uuid",
    "line_linked": false,
    "email_verified": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### PUT /v1/auth/profile
Update user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+66812345678"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

### POST /v1/auth/connect-line
Connect LINE account to user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "line_code": "authorization_code",
  "redirect_uri": "https://yourapp.com/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "LINE account connected successfully",
    "user": { ... }
  }
}
```

---

### POST /v1/auth/logout
Logout current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Subscription & Plans Endpoints

### GET /v1/plans
Get available subscription plans.

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "price_free",
        "name": "Free Plan",
        "description": "Basic slip verification",
        "price_monthly": 0,
        "price_yearly": 0,
        "quota_per_month": 50,
        "features": [
          "50 verifications/month",
          "Basic support",
          "24-hour data retention"
        ],
        "is_popular": false,
        "is_active": true
      },
      {
        "id": "price_starter_monthly",
        "name": "Starter Plan",
        "description": "For small businesses",
        "price_monthly": 299,
        "price_yearly": 2900,
        "quota_per_month": 500,
        "features": [
          "500 verifications/month",
          "Priority support",
          "30-day data retention",
          "LINE webhook integration"
        ],
        "is_popular": true,
        "is_active": true
      },
      {
        "id": "price_pro_monthly",
        "name": "Pro Plan",
        "description": "For growing businesses",
        "price_monthly": 999,
        "price_yearly": 9900,
        "quota_per_month": 2000,
        "features": [
          "2000 verifications/month",
          "24/7 support",
          "90-day data retention",
          "LINE webhook integration",
          "API access",
          "Custom branding"
        ],
        "is_popular": false,
        "is_active": true
      }
    ]
  }
}
```

---

### POST /v1/checkout
Create a checkout session for subscription.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "plan_id": "price_starter_monthly",
  "billing_cycle": "monthly"
}
```

**Validation:**
- `plan_id`: required
- `billing_cycle`: required, must be "monthly" or "yearly"

**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_session_id": "cs_...",
    "checkout_url": "https://checkout.stripe.com/...",
    "amount": 299,
    "currency": "THB",
    "plan_id": "price_starter_monthly",
    "billing_cycle": "monthly",
    "expires_at": "2024-01-01T01:00:00Z"
  }
}
```

---

### POST /v1/checkout/webhook
Stripe webhook endpoint (public - called by Stripe).

**Request:** Stripe webhook payload

---

## Merchant Profile Endpoints (Require Auth + Email Verification)

### POST /v1/merchants/me/profile
Create merchant profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "shop_name": "My Coffee Shop",
  "address": "123 Street, Bangkok",
  "contact_email": "shop@example.com",
  "contact_phone": "+66812345678",
  "business_hours": {
    "open": "09:00",
    "close": "18:00",
    "days": ["mon", "tue", "wed", "thu", "fri", "sat"]
  },
  "strict_mode": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "uuid",
      "shop_name": "My Coffee Shop",
      "address": "123 Street, Bangkok",
      "contact_email": "shop@example.com",
      "contact_phone": "+66812345678",
      "logo_url": null,
      "business_hours": {
        "open": "09:00",
        "close": "18:00",
        "days": ["mon", "tue", "wed", "thu", "fri", "sat"]
      },
      "strict_mode": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### GET /v1/merchants/me/profile
Get merchant profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** Same as POST /v1/merchants/me/profile

---

### PUT /v1/merchants/me/profile
Update merchant profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** Same as POST /v1/merchants/me/profile (all fields optional except shop_name)

**Response:** Same as POST /v1/merchants/me/profile

---

### POST /v1/merchants/me/logo
Upload merchant logo.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
```
logo: <file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logo_url": "https://cdn.slipsure.com/merchants/uuid/logo.png"
  }
}
```

---

### GET /v1/merchants/me/settings
Get merchant settings.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": {
      "merchant_id": "uuid",
      "notification_preferences": {
        "send_line_notifications": true,
        "send_email_summary": true,
        "notify_on_failed_verification": true,
        "daily_summary_time": "18:00"
      },
      "business_preferences": {
        "currency": "THB",
        "timezone": "Asia/Bangkok",
        "language": "th"
      },
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### PUT /v1/merchants/me/settings
Update merchant settings.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
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

**Response:** Same as GET /v1/merchants/me/settings

---

### GET /v1/merchants/me/subscription
Get merchant subscription details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "merchant_id": "uuid",
      "plan_id": "price_starter_monthly",
      "status": "active",
      "billing_cycle": "monthly",
      "stripe_subscription_id": "sub_...",
      "stripe_customer_id": "cus_...",
      "started_at": "2024-01-01T00:00:00Z",
      "expires_at": "2024-02-01T00:00:00Z",
      "auto_renew": true,
      "cancelled_at": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "plan": {
        "id": "price_starter_monthly",
        "name": "Starter Plan",
        "quota_per_month": 500
      },
      "usage_this_month": 150,
      "remaining_quota": 350
    }
  }
}
```

---

### POST /v1/merchants/me/subscription/cancel
Cancel subscription.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "cancel_immediately": false,
  "reason": "No longer needed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Subscription will be cancelled at the end of the billing period"
  }
}
```

---

### GET /v1/merchants/me/quota
Get quota usage status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quota_limit": 500,
    "used": 150,
    "remaining": 350,
    "reset_date": "2024-02-01T00:00:00Z",
    "is_blocked": false
  }
}
```

---

## LINE Webhook Configuration Endpoints (Require Auth + Email Verification)

### GET /v1/merchants/me/line-webhook
Get LINE webhook configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "merchant_id": "uuid",
      "line_channel_id": "1234567890",
      "is_configured": true,
      "webhook_reference_id": "BDhX",
      "webhook_url": "https://api.slipsure.com/v1/line/webhook/BDhX",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### PUT /v1/merchants/me/line-webhook
Update LINE webhook configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "line_channel_id": "1234567890",
  "line_channel_secret": "channel_secret_from_LINE_developers",
  "line_access_token": "access_token_from_LINE_developers"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "LINE webhook configuration updated successfully",
    "config": { ... }
  }
}
```

---

### DELETE /v1/merchants/me/line-webhook
Delete LINE webhook configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "LINE webhook configuration deleted successfully"
  }
}
```

---

### POST /v1/merchants/me/test
Test LINE webhook connectivity.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {
      "webhook_status": "active",
      "connection_status": "connected",
      "signature_validation": "passed",
      "api_access": "working",
      "tested_at": "2024-01-01T00:00:00Z",
      "response_time_ms": 250
    }
  }
}
```

---

### GET /v1/merchants/me/webhook-url
Generate webhook URL for merchant.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "webhook_url": "https://api.slipsure.com/v1/line/webhook/BDhX",
    "webhook_reference_id": "BDhX"
  }
}
```

---

### POST /v1/line/webhook/:ref_id
LINE webhook endpoint (public - called by LINE Platform).

**Parameters:**
- `ref_id`: Webhook reference ID (e.g., "BDhX")

**Headers:**
```
X-Line-Signature: <signature_from_LINE>
```

**Request:** LINE webhook event payload

**Response:**
```json
{
  "status": "ok"
}
```

---

## Slip Verification Endpoints (Require Auth + Email Verification)

### POST /v1/slips/upload
Upload slip for verification.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
```
file: <image_file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slip_id": "uuid",
    "status": "pending",
    "estimated_seconds": 10
  }
}
```

---

### POST /v1/slips/scan
Scan QR data from slip image.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "qr_raw_data": "0041000600000101030040220016073114414BPP011615102TH910479F0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qr_data": {
      "reference_no": "016073114414BPP01161",
      "amount": 10103.00,
      "sender_bank": "KBank",
      "sender_account": "1234567890",
      "transaction_time": "2024-01-01T17:57:00Z"
    }
  }
}
```

---

### GET /v1/slips/:slip_id
Get slip details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slip": {
      "id": "uuid",
      "merchant_id": "uuid",
      "image_url": "https://cdn.slipsure.com/...",
      "qr_raw_data": "0041000600000101030040220016073114414BPP011615102TH910479F0",
      "status": "verified",
      "processing_started_at": "2024-01-01T00:00:00Z",
      "processing_completed_at": "2024-01-01T00:00:10Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:10Z",
      "transaction": {
        "id": "uuid",
        "reference_no": "016073114414BPP01161",
        "amount": 10103.00,
        "sender_bank": "KBank",
        "sender_account": "1234567890",
        "receiver_bank": "KBank",
        "receiver_account": "9876543210",
        "transaction_time": "2024-01-01T17:57:00Z",
        "status": "success",
        "is_duplicate": false
      }
    }
  }
}
```

---

### POST /v1/slips/:slip_id/reprocess
Reprocess failed slip.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "force_verify": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slip_id": "uuid",
    "status": "processing"
  }
}
```

---

### GET /v1/slips
List all slips with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (optional: pending, processing, verified, failed)

**Response:**
```json
{
  "success": true,
  "data": {
    "slips": [
      { ...slip_object... },
      { ...slip_object... }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (email not verified, no quota)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Common Error Messages

| Error | Description |
|-------|-------------|
| `invalid_token` | Token is invalid or expired |
| `email_not_verified` | Email requires verification |
| `quota_exceeded` | Monthly quota exceeded |
| `subscription_required` | Active subscription required |
| `invalid_credentials` | Email or password incorrect |
| `duplicate_email` | Email already registered |
| `invalid_otp` | OTP code is invalid or expired |
| `merchant_not_found` | Merchant profile not found |

---

## Rate Limiting

- **Authenticated requests**: 100 requests/minute
- **Unauthenticated requests**: 20 requests/minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Webhooks

### Stripe Webhook
- **Endpoint**: `POST /v1/checkout/webhook`
- **Purpose**: Receive subscription events from Stripe

### LINE Webhook
- **Endpoint**: `POST /v1/line/webhook/:ref_id`
- **Purpose**: Receive payment slip images from LINE

---

## Data Models

### User Roles
- `merchant` - Business owner
- `admin` - System administrator

### Subscription Status
- `trial` - Trial period
- `active` - Active subscription
- `suspended` - Temporarily suspended
- `cancelled` - Cancelled by user
- `expired` - Subscription expired
- `pending` - Pending activation

### Slip Status
- `pending` - Waiting to be processed
- `processing` - Currently being verified
- `verified` - Successfully verified
- `failed` - Verification failed

### Fail Reasons
- `DUPLICATE_SLIP` - Slip already processed
- `AMOUNT_MISMATCH` - Amount doesn't match
- `TIMEOUT` - Bank API timeout
- `INVALID_QR` - Cannot read QR code
- `BANK_ERROR` - Bank API error
- `EXPIRED_SLIP` - Slip is too old

---

## SDK / Client Libraries

For frontend integration, you can use the API directly with:

```javascript
// Example API client
const api = {
  baseURL: 'http://localhost:8080/v1',
  token: localStorage.getItem('access_token'),

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response.json();
  },

  // Auth
  register: (data) => api.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  login: (data) => api.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Merchant
  getProfile: () => api.request('/merchants/me/profile'),

  // Slips
  uploadSlip: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${api.baseURL}/slips/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${api.token}` },
      body: formData
    }).then(r => r.json());
  }
};
```

---

## Changelog

### v1.0.0 (Current)
- User authentication with email verification
- Merchant profile management
- Subscription management with Stripe
- Slip verification with QR code parsing
- LINE webhook integration for multi-merchant support
- Quota management
- Settings management

---

## Support

For API support, contact:
- Email: support@slipsure.com
- Documentation: https://docs.slipsure.com
- Status Page: https://status.slipsure.com
