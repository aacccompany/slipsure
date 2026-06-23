// API Types based on API_SPEC.md

// Common Types
export type UserRole = 'merchant' | 'admin';
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired' | 'pending';
export type BillingCycle = 'monthly' | 'yearly';
export type SlipStatus = 'pending' | 'processing' | 'verified' | 'failed';
export type FailReason = 'DUPLICATE_SLIP' | 'AMOUNT_MISMATCH' | 'TIMEOUT' | 'INVALID_QR' | 'BANK_ERROR' | 'EXPIRED_SLIP';
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'processing';

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  line_linked: boolean;
  email_verified: boolean;
  created_at: string;
  merchant_id?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterResponse {
  email: string;
  otp_sent_to: boolean;
  message: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  new_password: string;
}

export interface LineLoginRequest {
  line_code: string;
  redirect_uri: string;
}

export interface UpdateProfileRequest {
  name: string;
  phone?: string;
}

// Merchant Types
export interface BusinessHours {
  open: string; // "09:00"
  close: string; // "18:00"
  days: string[]; // ["mon", "tue", ...]
}

export interface MerchantProfile {
  id?: string;
  shop_name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_url?: string;
  business_hours?: BusinessHours;
  strict_mode: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  send_line_notifications: boolean;
  send_email_summary: boolean;
  notify_on_failed_verification: boolean;
  daily_summary_time: string; // "18:00"
}

export interface BusinessPreferences {
  currency: string; // "THB"
  timezone: string; // "Asia/Bangkok"
  language: string; // "th"
}

export interface MerchantSettings {
  merchant_id: string;
  notification_preferences: NotificationPreferences;
  business_preferences: BusinessPreferences;
  updated_at: string;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  quota_per_month: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  merchant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  started_at: string;
  expires_at?: string;
  auto_renew: boolean;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
  usage_this_month?: number;
  remaining_quota?: number;
}

export interface CheckoutRequest {
  plan_id: string;
  billing_cycle: BillingCycle;
}

export interface CheckoutResponse {
  checkout_session_id: string;
  checkout_url: string;
  amount: number;
  currency: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  expires_at: string;
}

export interface QuotaStatus {
  quota_limit: number;
  used: number;
  remaining: number;
  reset_date: string;
  is_blocked: boolean;
}

// Slip Types
export interface Transaction {
  id: string;
  slip_id: string;
  merchant_id: string;
  reference_no: string;
  amount: number;
  sender_bank: string;
  sender_account: string;
  receiver_bank: string;
  receiver_account: string;
  transaction_time?: string;
  transaction_date?: string;
  status: TransactionStatus;
  is_duplicate: boolean;
  fail_reason?: string;
}

export interface Slip {
  id: string;
  merchant_id: string;
  image_url: string;
  qr_raw_data?: string;
  status: SlipStatus;
  fail_reason?: FailReason;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  updated_at: string;
  transaction?: Transaction;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface SlipListResponse {
  slips: Slip[];
  pagination: Pagination;
}

export interface DailySlipStats {
  day: string;
  verified: number;
  failed: number;
}

export interface SlipStatsResponse {
  total: number;
  verified: number;
  failed: number;
  pending: number;
  processing: number;
  success_rate: number;
  last_7_days: DailySlipStats[];
}

// LINE Webhook Types
export interface LINEWebhookConfig {
  merchant_id: string;
  line_channel_id: string;
  is_configured: boolean;
  webhook_reference_id?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateLINEWebhookRequest {
  line_channel_id: string;
  line_channel_secret: string;
  line_access_token: string;
}

export interface LINEWebhookTestResponse {
  webhook_status: string;
  connection_status: string;
  signature_validation: string;
  api_access: string;
  tested_at: string;
  response_time_ms: number;
}

// Health Check
export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  port: string;
  database: string;
}
