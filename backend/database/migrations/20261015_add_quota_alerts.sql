CREATE TABLE IF NOT EXISTS quota_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    cycle_lot_id UUID NOT NULL REFERENCES credit_lots(id) ON DELETE CASCADE,
    threshold SMALLINT NOT NULL CHECK (threshold IN (20, 5, 0)),
    recipient_line_user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (merchant_id, cycle_lot_id, threshold)
);

CREATE INDEX IF NOT EXISTS idx_quota_alerts_pending
ON quota_alerts(next_attempt_at, created_at)
WHERE sent_at IS NULL AND failed_at IS NULL;
