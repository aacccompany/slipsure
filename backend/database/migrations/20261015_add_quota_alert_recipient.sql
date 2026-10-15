ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS quota_alert_recipient_line_user_id VARCHAR(255);
