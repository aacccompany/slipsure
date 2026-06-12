-- Clear encrypted webhook reference IDs and regenerate short ones
-- This will force merchants to get new short reference IDs

UPDATE merchants
SET webhook_reference_id = NULL,
    line_webhook_verified = false
WHERE webhook_reference_id IS NOT NULL;

-- Add comment explaining the reset
COMMENT ON COLUMN merchants.webhook_reference_id IS 'Short 4-character reference ID for webhooks (e.g., "aB3x")';