ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_verification_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_valid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider_cached BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider_charged_credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_response JSONB;

CREATE INDEX IF NOT EXISTS idx_transactions_provider_verification_id
  ON transactions(provider, provider_verification_id)
  WHERE provider_verification_id IS NOT NULL;
