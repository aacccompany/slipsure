-- LINE Login profiles may not have an email address. Keep email uniqueness
-- for users who have one while allowing multiple LINE-only accounts.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
UPDATE users SET email = NULL WHERE email = '';
