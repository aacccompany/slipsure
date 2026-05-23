-- Migration: Add Stripe subscription columns
-- This adds the missing Stripe subscription fields to the subscriptions table

-- Add Stripe subscription and customer columns
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add comments
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID for payment processing';
