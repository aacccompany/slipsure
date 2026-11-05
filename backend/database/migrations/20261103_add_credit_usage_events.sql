CREATE TABLE IF NOT EXISTS credit_usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    verification_id UUID NOT NULL UNIQUE,
    credit_lot_id UUID REFERENCES credit_lots(id) ON DELETE SET NULL,
    credits_used INTEGER NOT NULL CHECK (credits_used > 0),
    lot_balance_after INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS credit_usage_events_merchant_date_idx
    ON credit_usage_events (merchant_id, created_at DESC);
