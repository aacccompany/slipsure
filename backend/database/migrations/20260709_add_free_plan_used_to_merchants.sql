-- Track one-time use of the Free plan per merchant account.
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS free_plan_used BOOLEAN DEFAULT FALSE;

UPDATE merchants m
SET free_plan_used = TRUE
WHERE EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.merchant_id = m.id
      AND s.plan_id = 'plan-free'
);
