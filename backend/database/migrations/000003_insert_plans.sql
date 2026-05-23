-- Migration: Insert default subscription plans
-- This seeds the subscription_plans table with default plans

-- Insert Free Plan
INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, quota_per_month, features, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Free',
    0.00,
    0.00,
    50,
    ARRAY['50 verifications/month', 'Basic support', 'Single shop'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    quota_per_month = EXCLUDED.quota_per_month,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Insert Starter Plan
INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, quota_per_month, features, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'Starter',
    299.00,
    2990.00,
    200,
    ARRAY['200 verifications/month', 'Email support', 'Up to 3 shops', 'Basic analytics'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    quota_per_month = EXCLUDED.quota_per_month,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Insert Pro Plan
INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, quota_per_month, features, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440003',
    'Pro',
    799.00,
    7990.00,
    1000,
    ARRAY['1000 verifications/month', 'Priority support', 'Unlimited shops', 'Advanced analytics', 'API access'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    quota_per_month = EXCLUDED.quota_per_month,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_price_monthly ON subscription_plans(price_monthly);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_quota_per_month ON subscription_plans(quota_per_month);