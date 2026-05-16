-- Slip Verification SaaS Platform Database Schema
-- Database: slipsure

-- ============================================
-- Extension and Enums
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('merchant_owner', 'merchant_staff', 'admin', 'superadmin');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled', 'expired');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed', 'processing');
CREATE TYPE slip_status AS ENUM ('pending', 'verified', 'failed', 'processing');
CREATE TYPE fail_reason AS ENUM ('DUPLICATE_SLIP', 'AMOUNT_MISMATCH', 'TIMEOUT', 'INVALID_QR', 'BANK_ERROR', 'EXPIRED_SLIP');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE payment_gateway AS ENUM ('promptpay', 'stripe', 'omise');
CREATE TYPE log_level AS ENUM ('info', 'warning', 'error', 'critical');

-- ============================================
-- Users Table
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'merchant_owner',
    line_user_id VARCHAR(255),
    line_linked BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Subscription Plans Table
-- ============================================

CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) DEFAULT 0,
    price_yearly DECIMAL(10, 2) DEFAULT 0,
    quota_per_month INTEGER DEFAULT 50,
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Merchants Table
-- ============================================

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    line_channel_id VARCHAR(50),
    line_channel_secret VARCHAR(255),
    line_access_token TEXT,
    line_webhook_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Subscriptions Table
-- ============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status subscription_status DEFAULT 'trial',
    billing_cycle billing_cycle DEFAULT 'monthly',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id)
);

-- ============================================
-- Payment Logs Table
-- ============================================

CREATE TABLE payment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'THB',
    gateway payment_gateway DEFAULT 'promptpay',
    gateway_reference_id VARCHAR(255),
    status payment_status DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Slips Table
-- ============================================

CREATE TABLE slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    qr_raw_data TEXT,
    status slip_status DEFAULT 'pending',
    fail_reason fail_reason,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Transactions Table
-- ============================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slip_id UUID UNIQUE NOT NULL REFERENCES slips(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    reference_no VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    sender_bank VARCHAR(10),
    sender_account VARCHAR(50),
    receiver_bank VARCHAR(10),
    receiver_account VARCHAR(50),
    transfer_at TIMESTAMP WITH TIME ZONE,
    transaction_date DATE,
    transaction_time TIME,
    status transaction_status DEFAULT 'pending',
    is_duplicate BOOLEAN DEFAULT FALSE,
    fail_reason TEXT,
    recheck_count INTEGER DEFAULT 0,
    last_rechecked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'line', 'email', 'webhook'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    recipient VARCHAR(255) NOT NULL,
    content TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Usage Counters Table
-- ============================================

CREATE TABLE usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    scan_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id, year, month)
);

-- ============================================
-- System Logs Table
-- ============================================

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    level log_level DEFAULT 'info',
    service VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_line_user_id ON users(line_user_id);

-- Merchants
CREATE INDEX idx_merchants_owner_id ON merchants(owner_id);
CREATE INDEX idx_merchants_is_active ON merchants(is_active);

-- Subscriptions
CREATE INDEX idx_subscriptions_merchant_id ON subscriptions(merchant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Payment Logs
CREATE INDEX idx_payment_logs_merchant_id ON payment_logs(merchant_id);
CREATE INDEX idx_payment_logs_status ON payment_logs(status);
CREATE INDEX idx_payment_logs_created_at ON payment_logs(created_at);

-- Slips
CREATE INDEX idx_slips_merchant_id ON slips(merchant_id);
CREATE INDEX idx_slips_status ON slips(status);
CREATE INDEX idx_slips_created_at ON slips(created_at);

-- Transactions
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_reference_no ON transactions(reference_no);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_transfer_at ON transactions(transfer_at);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);

-- Notifications
CREATE INDEX idx_notifications_transaction_id ON notifications(transaction_id);
CREATE INDEX idx_notifications_merchant_id ON notifications(merchant_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Usage Counters
CREATE INDEX idx_usage_counters_merchant_id ON usage_counters(merchant_id);
CREATE INDEX idx_usage_counters_year_month ON usage_counters(year, month);

-- System Logs
CREATE INDEX idx_system_logs_merchant_id ON system_logs(merchant_id);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- ============================================
-- Initial Data - Subscription Plans
-- ============================================

INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular) VALUES
('plan-free', 'Free', 'Perfect for trying out SlipSure', 0, 0, 50, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE),
('plan-starter', 'Starter', 'For small businesses', 299, 2990, 200, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE),
('plan-pro', 'Pro', 'For growing businesses', 799, 7990, 1000, '["slip_verify", "line_notify", "csv_export", "analytics", "priority_support"]'::jsonb, TRUE);