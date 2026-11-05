-- A completed Checkout may have recorded its payment before credit-lot creation
-- failed. Repair only the current, unexpired paid subscription tied to that
-- exact Checkout Session; never infer historical package credits.
INSERT INTO credit_lots (
    merchant_id, subscription_id, payment_log_id, plan_id,
    credits_total, credits_remaining, started_at, expires_at
)
SELECT
    s.merchant_id, s.id, p.id, s.plan_id,
    sp.quota_per_month, sp.quota_per_month, s.started_at, s.expires_at
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
JOIN payment_logs p ON p.subscription_id = s.id
    AND p.merchant_id = s.merchant_id
    AND p.gateway = 'stripe'
    AND p.gateway_reference_id = s.stripe_subscription_id
    AND p.status = 'success'
WHERE s.status = 'active'
  AND s.plan_id <> 'plan-free'
  AND s.expires_at > CURRENT_TIMESTAMP
  AND sp.quota_per_month > 0
  AND NOT EXISTS (
      SELECT 1 FROM credit_lots l WHERE l.payment_log_id = p.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM credit_lots l
      WHERE l.subscription_id = s.id
        AND l.plan_id = s.plan_id
        AND l.started_at >= s.started_at - INTERVAL '1 minute'
        AND l.expires_at = s.expires_at
  );
