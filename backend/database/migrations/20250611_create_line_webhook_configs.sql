-- Create LINE webhook configurations table for multi-merchant support
-- This table stores encrypted LINE credentials for each merchant

CREATE TABLE IF NOT EXISTS line_webhook_configs (
    merchant_id UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    line_channel_id VARCHAR(255) NOT NULL,
    encrypted_channel_secret TEXT NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    webhook_reference_id VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast webhook reference ID lookup
CREATE INDEX IF NOT EXISTS idx_line_webhook_configs_webhook_ref_id
ON line_webhook_configs(webhook_reference_id);

-- Add comment
COMMENT ON TABLE line_webhook_configs IS 'Stores LINE webhook credentials for multi-merchant support';
COMMENT ON COLUMN line_webhook_configs.encrypted_channel_secret IS 'AES-256 encrypted LINE channel secret';
COMMENT ON COLUMN line_webhook_configs.encrypted_access_token IS 'AES-256 encrypted LINE access token';
COMMENT ON COLUMN line_webhook_configs.webhook_reference_id IS 'Short ID for webhook URL routing (e.g., xY7a)';
