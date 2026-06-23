'use client';

import React, { useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface Endpoint {
  method: Method;
  path: string;
  description: string;
  auth: boolean;
  request?: string;
  response: string;
  note?: string;
}

interface Section {
  id: string;
  label: string;
  endpoints: Endpoint[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.flowslip.ai/v1';

const sections: Section[] = [
  {
    id: 'authentication',
    label: 'Authentication',
    endpoints: [
      {
        method: 'POST',
        path: '/auth/register',
        description: 'Register a new merchant account. An OTP is sent to the provided email.',
        auth: false,
        request: `{
  "name": "สมชาย ใจดี",
  "email": "somchai@shop.com",
  "password": "P@ssw0rd123",
  "phone": "0812345678"
}`,
        response: `{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "email": "somchai@shop.com",
    "otp_sent": true
  }
}`,
      },
      {
        method: 'POST',
        path: '/auth/verify-otp',
        description: 'Verify your email with the OTP received. Returns a JWT token on success.',
        auth: false,
        request: `{
  "email": "somchai@shop.com",
  "otp": "482910"
}`,
        response: `{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_in": 3600
  }
}`,
      },
      {
        method: 'POST',
        path: '/auth/login',
        description: 'Login with email and password. Email must be verified first.',
        auth: false,
        request: `{
  "email": "somchai@shop.com",
  "password": "P@ssw0rd123"
}`,
        response: `{
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
}`,
      },
      {
        method: 'POST',
        path: '/auth/line-login',
        description: 'Login or register using LINE OAuth. Creates an account if the LINE user is new.',
        auth: false,
        request: `{
  "line_code": "code_from_line_oauth",
  "redirect_uri": "https://app.flowslip.ai/auth/line/callback"
}`,
        response: `{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "expires_in": 3600,
    "is_new_user": false,
    "user": {
      "id": "uuid-xxx",
      "name": "สมชาย",
      "line_user_id": "Uxxxxxx",
      "line_linked": true
    }
  }
}`,
      },
      {
        method: 'POST',
        path: '/auth/forgot-password',
        description: 'Send an OTP to the email address for password reset.',
        auth: false,
        request: `{ "email": "somchai@shop.com" }`,
        response: `{ "success": true, "message": "Password reset OTP sent to email." }`,
      },
      {
        method: 'POST',
        path: '/auth/reset-password',
        description: 'Reset password using the OTP received by email.',
        auth: false,
        request: `{
  "email": "somchai@shop.com",
  "otp": "748201",
  "new_password": "NewP@ss456"
}`,
        response: `{ "success": true, "message": "Password reset successfully." }`,
      },
      {
        method: 'GET',
        path: '/auth/me',
        description: "Get the currently authenticated user's profile.",
        auth: true,
        response: `{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "name": "สมชาย ใจดี",
    "email": "somchai@shop.com",
    "phone": "0812345678",
    "role": "merchant",
    "merchant_id": "uuid-merchant",
    "line_linked": true,
    "email_verified": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}`,
      },
    ],
  },
  {
    id: 'slip-verification',
    label: 'Slip Verification',
    endpoints: [
      {
        method: 'POST',
        path: '/slips/upload',
        description: 'Upload a slip image (JPG/PNG, max 10MB) for verification. Returns immediately with a slip_id — poll GET /slips/:slip_id for the result.',
        auth: true,
        request: `# multipart/form-data
file=@slip.jpg`,
        response: `{
  "success": true,
  "message": "Slip received and queued for verification.",
  "data": {
    "slip_id": "slip-uuid",
    "status": "processing",
    "estimated_seconds": 3
  }
}`,
        note: 'Use multipart/form-data with field name "file". Poll GET /slips/:slip_id until status is verified or failed.',
      },
      {
        method: 'POST',
        path: '/slips/scan',
        description: 'Submit raw EMVCo QR data directly (e.g. from a QR scanner device). Skips image upload.',
        auth: true,
        request: `{ "qr_raw_data": "00020101021..." }`,
        response: `{
  "success": true,
  "data": {
    "slip_id": "slip-uuid",
    "status": "processing",
    "estimated_seconds": 2
  }
}`,
      },
      {
        method: 'GET',
        path: '/slips/:slip_id',
        description: 'Get the verification result for a slip. Poll this endpoint after upload until status is verified or failed.',
        auth: true,
        response: `// status: verified
{
  "success": true,
  "data": {
    "slip_id": "slip-uuid",
    "status": "verified",
    "transaction": {
      "reference_no": "REF20250508001",
      "amount": 500.00,
      "sender_bank": "KBANK",
      "sender_account": "xxx-x-xx123-x",
      "receiver_bank": "SCB",
      "receiver_account": "xxx-x-xx456-x",
      "transfer_at": "2025-05-08T10:22:00Z",
      "is_duplicate": false
    },
    "fail_reason": null
  }
}

// status: failed
{
  "success": true,
  "data": {
    "slip_id": "slip-uuid",
    "status": "failed",
    "fail_reason": "DUPLICATE_SLIP",
    "transaction": null
  }
}`,
        note: 'Possible fail_reason values: DUPLICATE_SLIP, AMOUNT_MISMATCH, INVALID_QR, BANK_ERROR, TIMEOUT, EXPIRED_SLIP',
      },
      {
        method: 'GET',
        path: '/slips',
        description: 'List all slips for the authenticated merchant with pagination.',
        auth: true,
        request: `# Query params
?page=1&limit=20`,
        response: `{
  "success": true,
  "data": {
    "slips": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 342,
      "total_pages": 18
    }
  }
}`,
      },
      {
        method: 'GET',
        path: '/slips/stats',
        description: 'Get aggregate verification statistics for the merchant including last 7 days breakdown.',
        auth: true,
        response: `{
  "success": true,
  "data": {
    "total": 342,
    "verified": 330,
    "failed": 12,
    "success_rate": 96.5,
    "last_7_days": [
      { "date": "2025-06-17", "total": 48, "verified": 46, "failed": 2 }
    ]
  }
}`,
      },
      {
        method: 'POST',
        path: '/slips/:slip_id/reprocess',
        description: 'Manually trigger re-verification on a failed slip.',
        auth: true,
        response: `{
  "success": true,
  "message": "Slip queued for reprocessing.",
  "data": {
    "slip_id": "slip-uuid",
    "status": "processing"
  }
}`,
      },
    ],
  },
  {
    id: 'merchant',
    label: 'Merchant & Subscription',
    endpoints: [
      {
        method: 'GET',
        path: '/plans',
        description: 'List all available subscription plans. Public endpoint — no auth required.',
        auth: false,
        response: `{
  "success": true,
  "data": [
    { "id": "plan-free", "name": "Free", "price_monthly": 0, "quota_per_month": 50 },
    { "id": "plan-starter", "name": "Starter", "price_monthly": 299, "quota_per_month": 200 },
    { "id": "plan-pro", "name": "Pro", "price_monthly": 799, "quota_per_month": 1000, "is_popular": true }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/checkout',
        description: 'Create a Stripe Checkout session to subscribe to a plan.',
        auth: true,
        request: `{
  "plan_id": "plan-pro",
  "billing_cycle": "monthly"
}`,
        response: `{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/pay/cs_test_xxx",
    "amount": 799,
    "currency": "THB",
    "plan_id": "plan-pro"
  }
}`,
      },
      {
        method: 'GET',
        path: '/merchants/me/profile',
        description: "Get the current merchant's shop profile.",
        auth: true,
        response: `{
  "success": true,
  "data": {
    "shop_name": "ร้านดอกไม้ขอนแก่น",
    "address": "123 ถ.มิตรภาพ ขอนแก่น",
    "contact_email": "shop@flower.com",
    "contact_phone": "0812345678",
    "logo_url": "https://cdn.flowslip.ai/logos/uuid.png"
  }
}`,
      },
      {
        method: 'PUT',
        path: '/merchants/me/profile',
        description: "Update the merchant's shop profile.",
        auth: true,
        request: `{
  "shop_name": "ร้านดอกไม้ขอนแก่น",
  "address": "123 ถ.มิตรภาพ ขอนแก่น",
  "contact_email": "shop@flower.com",
  "contact_phone": "0812345678"
}`,
        response: `{ "success": true, "message": "Shop profile updated." }`,
      },
      {
        method: 'GET',
        path: '/merchants/me/subscription',
        description: 'Get the current subscription status, billing cycle, and quota usage.',
        auth: true,
        response: `{
  "success": true,
  "data": {
    "plan": { "id": "plan-pro", "name": "Pro", "quota_per_month": 1000 },
    "status": "active",
    "billing_cycle": "monthly",
    "expires_at": "2025-07-01T00:00:00Z",
    "auto_renew": true
  }
}`,
      },
      {
        method: 'GET',
        path: '/merchants/me/quota',
        description: 'Get the current monthly quota usage and remaining scans.',
        auth: true,
        response: `{
  "success": true,
  "data": {
    "quota_limit": 1000,
    "used": 342,
    "remaining": 658,
    "reset_date": "2025-07-01",
    "is_blocked": false
  }
}`,
      },
      {
        method: 'GET',
        path: '/merchants/me/settings',
        description: 'Get notification and verification preferences.',
        auth: true,
        response: `{
  "success": true,
  "data": {
    "notification_preferences": { "send_line_notifications": true, "send_email_summary": true },
    "verification_preferences": { "auto_verify_limit": 1000, "allow_duplicates": false }
  }
}`,
      },
      {
        method: 'PUT',
        path: '/merchants/me/settings',
        description: 'Update notification and verification preferences.',
        auth: true,
        request: `{
  "notification_preferences": { "send_line_notifications": true, "send_email_summary": false },
  "verification_preferences": { "auto_verify_limit": 2000, "allow_duplicates": false }
}`,
        response: `{ "success": true, "message": "Shop settings updated." }`,
      },
    ],
  },
  {
    id: 'line-webhook',
    label: 'LINE Webhook',
    endpoints: [
      {
        method: 'GET',
        path: '/merchants/me/line-webhook',
        description: 'Get the current LINE webhook configuration and generated webhook URL.',
        auth: true,
        response: `{
  "success": true,
  "data": {
    "is_configured": true,
    "line_channel_id": "1234567890",
    "webhook_url": "https://api.flowslip.ai/v1/line/webhook/ref-uuid"
  }
}`,
      },
      {
        method: 'PUT',
        path: '/merchants/me/line-webhook',
        description: 'Configure LINE Messaging API credentials. Channel secret is stored encrypted.',
        auth: true,
        request: `{
  "line_channel_id": "1234567890",
  "line_channel_secret": "your-channel-secret",
  "line_access_token": "your-access-token"
}`,
        response: `{
  "success": true,
  "data": {
    "webhook_url": "https://api.flowslip.ai/v1/line/webhook/ref-uuid"
  }
}`,
        note: 'Copy the returned webhook_url into your LINE Developers Console → Messaging API → Webhook URL.',
      },
      {
        method: 'POST',
        path: '/line/webhook/:ref_id',
        description: 'Public endpoint called by the LINE platform when a user sends a message. Set this URL in LINE Developers Console.',
        auth: false,
        response: `{ "status": "ok" }`,
        note: 'This endpoint is called by LINE, not by your app. Slip images sent by customers are auto-verified and a result is replied in the LINE chat.',
      },
    ],
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<Method, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="text-zinc-400 hover:text-zinc-200 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{label ?? 'code'}</span>
        <CopyButton text={code} />
      </div>
      <pre className="px-4 py-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre">{code.trim()}</pre>
    </div>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const curlExample = ep.method === 'GET'
    ? `curl ${ep.auth ? '-H "Authorization: Bearer $TOKEN" \\\n  ' : ''}"${BASE_URL}${ep.path.replace(':slip_id', '{slip_id}').replace(':ref_id', '{ref_id}')}"`
    : ep.request?.startsWith('#')
      ? `curl -X ${ep.method} "${BASE_URL}${ep.path}" \\\n  ${ep.auth ? '-H "Authorization: Bearer $TOKEN" \\\n  ' : ''}-F "file=@slip.jpg"`
      : `curl -X ${ep.method} "${BASE_URL}${ep.path}" \\\n  ${ep.auth ? '-H "Authorization: Bearer $TOKEN" \\\n  ' : ''}-H "Content-Type: application/json" \\\n  -d '${ep.request ?? '{}'}'`;

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-md w-14 text-center shrink-0 ${METHOD_COLORS[ep.method]}`}>
          {ep.method}
        </span>
        <code className="text-sm font-mono text-zinc-800 flex-1">{ep.path}</code>
        {ep.auth && (
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">AUTH</span>
        )}
        <ChevronRight className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-5 py-5 space-y-4 bg-zinc-50">
          <p className="text-sm text-zinc-600 leading-relaxed">{ep.description}</p>

          {ep.note && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-700 leading-relaxed">{ep.note}</p>
            </div>
          )}

          <CodeBlock code={curlExample} label="curl example" />
          {ep.request && !ep.request.startsWith('#') && (
            <CodeBlock code={ep.request} label="request body" />
          )}
          <CodeBlock code={ep.response} label="response" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardDocsPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* Sidebar */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-8 space-y-8">
              <div>
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-4">/ API Reference</p>
                <nav className="space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-blue-800 transition-colors py-1.5"
                    >
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      {s.label}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="border-t border-zinc-200 pt-5 space-y-2">
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Base URL</p>
                <code className="text-xs text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-lg block break-all">{BASE_URL}</code>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Status Codes</p>
                <div className="space-y-1.5 text-xs text-zinc-500">
                  {[['200', 'OK'], ['202', 'Accepted (async)'], ['400', 'Validation error'], ['401', 'Unauthorized'], ['422', 'Quota exceeded'], ['500', 'Server error']].map(([code, label]) => (
                    <div key={code} className="flex gap-2">
                      <code className="text-zinc-700 font-mono w-8 shrink-0">{code}</code>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-9 space-y-12">

            {/* Header */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-6">
              <div>
                <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest mb-3">/ API Documentation</p>
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">FlowSlip API</h1>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  RESTful API สำหรับตรวจสอบสลิปโอนเงินผ่าน QR Code ด้วย Bank API validation และตรวจจับสลิปซ้ำอัตโนมัติ
                </p>
              </div>

              {/* Quick start */}
              <div className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Quick start — 3 steps</span>
                </div>
                <div className="p-4 space-y-4 text-xs font-mono">
                  <div>
                    <p className="text-zinc-500 mb-1"># 1. Login → get JWT</p>
                    <pre className="text-zinc-300 overflow-x-auto">{`curl -X POST "${BASE_URL}/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@shop.com","password":"P@ssw0rd"}' \\
  | jq -r '.data.access_token'`}</pre>
                  </div>
                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-zinc-500 mb-1"># 2. Upload slip → get slip_id</p>
                    <pre className="text-zinc-300 overflow-x-auto">{`curl -X POST "${BASE_URL}/slips/upload" \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "file=@slip.jpg"`}</pre>
                  </div>
                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-zinc-500 mb-1"># 3. Poll result until status != "processing"</p>
                    <pre className="text-zinc-300 overflow-x-auto">{`curl "${BASE_URL}/slips/{slip_id}" \\
  -H "Authorization: Bearer $TOKEN"`}</pre>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                  <p className="font-bold text-zinc-800 mb-1 text-sm">JWT Authentication</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Pass <code className="bg-zinc-200 px-1 rounded text-zinc-700">access_token</code> as{' '}
                    <code className="bg-zinc-200 px-1 rounded text-zinc-700">Authorization: Bearer &lt;token&gt;</code>.
                    Tokens expire in 3600s.
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                  <p className="font-bold text-zinc-800 mb-1 text-sm">Async Verification</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Upload returns <code className="bg-zinc-200 px-1 rounded text-zinc-700">202</code> immediately.
                    Poll every ~1.5s until status is <code className="bg-zinc-200 px-1 rounded text-zinc-700">verified</code> or{' '}
                    <code className="bg-zinc-200 px-1 rounded text-zinc-700">failed</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <div key={section.id} id={section.id} className="space-y-3 scroll-mt-8">
                <div className="flex items-center gap-3 pb-2 border-b border-zinc-200">
                  <h2 className="text-base font-black text-zinc-900 tracking-tight">{section.label}</h2>
                  <span className="text-xs text-zinc-400 font-mono">{section.endpoints.length} endpoints</span>
                </div>
                {section.endpoints.map((ep) => (
                  <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
                ))}
              </div>
            ))}

            {/* Error format */}
            <div id="errors" className="space-y-3 scroll-mt-8">
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-200">
                <h2 className="text-base font-black text-zinc-900 tracking-tight">Error Format</h2>
              </div>
              <div className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">All errors follow this shape</span>
                </div>
                <pre className="px-4 py-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">{`{
  "success": false,
  "error": "QUOTA_EXCEEDED",
  "message": "Monthly scan limit reached. Please upgrade your plan.",
  "details": {}
}`}</pre>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  ['400', 'VALIDATION_ERROR', 'Invalid request body'],
                  ['401', 'UNAUTHORIZED', 'Missing or invalid JWT'],
                  ['403', 'FORBIDDEN', 'Insufficient role/plan'],
                  ['404', 'NOT_FOUND', 'Resource not found'],
                  ['409', 'DUPLICATE', 'Resource already exists'],
                  ['422', 'QUOTA_EXCEEDED', 'Monthly scan limit reached'],
                  ['429', 'RATE_LIMITED', 'Too many requests'],
                  ['500', 'INTERNAL_ERROR', 'Server-side error'],
                ].map(([status, code, desc]) => (
                  <div key={code} className="flex items-start gap-3 bg-white border border-zinc-100 rounded-xl px-4 py-3">
                    <code className="text-xs font-mono text-zinc-400 w-8 shrink-0 pt-0.5">{status}</code>
                    <div>
                      <code className="text-xs font-mono text-zinc-700 font-bold">{code}</code>
                      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
