ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE users
SET is_active = TRUE
WHERE is_active IS NULL;

ALTER TABLE users
ALTER COLUMN is_active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
