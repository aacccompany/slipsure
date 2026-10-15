CREATE TABLE IF NOT EXISTS credit_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    payment_log_id UUID REFERENCES payment_logs(id) ON DELETE SET NULL,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    credits_total INTEGER NOT NULL CHECK (credits_total >= 0),
    credits_remaining INTEGER NOT NULL CHECK (credits_remaining >= 0),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_lots_merchant_fifo
ON credit_lots(merchant_id, expires_at, started_at)
WHERE credits_remaining > 0;

INSERT INTO credit_lots (
    merchant_id, subscription_id, plan_id,
    credits_total, credits_remaining, started_at, expires_at
)
SELECT
    s.merchant_id,
    s.id,
    s.plan_id,
    (sp.quota_per_month + COALESCE(s.quota_override, 0)) AS credits_total,
    GREATEST((sp.quota_per_month + COALESCE(s.quota_override, 0)) - COALESCE(uc.scan_count, 0), 0) AS credits_remaining,
    s.started_at,
    COALESCE(s.expires_at, s.started_at + INTERVAL '1 month') AS expires_at
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
LEFT JOIN usage_counters uc
    ON uc.merchant_id = s.merchant_id
   AND uc.year = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::int
   AND uc.month = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)::int
WHERE NOT EXISTS (
    SELECT 1
    FROM credit_lots cl
    WHERE cl.subscription_id = s.id
);
