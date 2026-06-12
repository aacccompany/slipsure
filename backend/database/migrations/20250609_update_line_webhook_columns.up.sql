-- Migration: Update LINE webhook columns for proper sizing
-- Date: 2025-06-09
-- Description: Fix webhook_reference_id column size and adjust data types

-- Update webhook_reference_id to VARCHAR(100) and ensure it's not encrypted
ALTER TABLE merchants
ALTER COLUMN webhook_reference_id TYPE VARCHAR(100);

-- Update line_channel_secret to TEXT to handle encrypted data
ALTER TABLE merchants
ALTER COLUMN line_channel_secret TYPE TEXT;

-- Add comment for clarity
COMMENT ON COLUMN merchants.webhook_reference_id IS 'Plain text webhook reference ID (used in URLs)';
COMMENT ON COLUMN merchants.line_channel_secret IS 'AES-256 encrypted LINE channel secret';
COMMENT ON COLUMN merchants.line_access_token IS 'AES-256 encrypted LINE access token';
COMMENT ON COLUMN merchants.line_channel_id IS 'LINE channel ID (plain text)';