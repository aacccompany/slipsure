-- Reduce the standard free grant without restoring credits already spent.
UPDATE credit_lots
SET credits_remaining = LEAST(credits_remaining, GREATEST(20 - (credits_total - credits_remaining), 0)),
    credits_total = 20,
    updated_at = CURRENT_TIMESTAMP
WHERE plan_id = 'plan-free' AND credits_total = 50;

UPDATE subscription_plans
SET quota_per_month = 20, updated_at = CURRENT_TIMESTAMP
WHERE id = 'plan-free';
