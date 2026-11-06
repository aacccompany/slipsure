ALTER TABLE credit_lots
ADD COLUMN IF NOT EXISTS grant_source VARCHAR(16) NOT NULL DEFAULT 'plan';

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'credit_lots_grant_source_check'
    ) THEN
        ALTER TABLE credit_lots ADD CONSTRAINT credit_lots_grant_source_check
        CHECK (grant_source IN ('plan', 'admin_extra'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_credit_lots_admin_extra
ON credit_lots(merchant_id, expires_at)
WHERE grant_source = 'admin_extra';
