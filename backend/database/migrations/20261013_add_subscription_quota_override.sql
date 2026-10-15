ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS quota_override INTEGER;

COMMENT ON COLUMN subscriptions.quota_override IS 'Optional extra monthly quota added on top of the subscription plan quota by admin.';
