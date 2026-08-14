-- Track unique LINE users who interact with each merchant bot.
CREATE TABLE IF NOT EXISTS line_bot_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    line_user_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unfollowed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id, line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_line_bot_clients_merchant_id
ON line_bot_clients(merchant_id);

CREATE INDEX IF NOT EXISTS idx_line_bot_clients_last_seen_at
ON line_bot_clients(last_seen_at);
