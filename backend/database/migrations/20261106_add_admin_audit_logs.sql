CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    admin_email VARCHAR(255),
    action VARCHAR(80) NOT NULL,
    category VARCHAR(40) NOT NULL,
    target_type VARCHAR(40),
    target_id UUID,
    target_name VARCHAR(255),
    status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'failed')),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    old_values JSONB,
    new_values JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_created ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_category_created ON admin_audit_logs(category, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_changes() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'admin audit logs are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_audit_logs_append_only ON admin_audit_logs;
CREATE TRIGGER admin_audit_logs_append_only
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_changes();
