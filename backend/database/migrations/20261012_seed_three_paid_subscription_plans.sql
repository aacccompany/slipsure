INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular, is_active)
VALUES
  ('plan-free', 'Free', 'Perfect for trying out SlipSure', 0, 0, 50, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE, TRUE),
  ('plan-mini', 'Mini', 'For very small teams', 49, 0, 150, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE, TRUE),
  ('plan-starter', 'Starter', 'For small businesses', 99, 0, 300, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE, TRUE),
  ('plan-basic', 'Basic', 'For steady daily usage', 179, 0, 600, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE, TRUE),
  ('plan-standard', 'Standard', 'For growing businesses', 399, 0, 1500, '["slip_verify", "line_notify", "csv_export", "analytics", "priority_support"]'::jsonb, TRUE, TRUE),
  ('plan-pro', 'Pro', 'For high-volume businesses', 699, 0, 3000, '["slip_verify", "line_notify", "csv_export", "analytics", "priority_support", "higher_quota"]'::jsonb, FALSE, TRUE),
  ('plan-business', 'Business', 'For large-volume operations', 1299, 0, 6000, '["slip_verify", "line_notify", "csv_export", "analytics", "priority_support", "higher_quota"]'::jsonb, FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  quota_per_month = EXCLUDED.quota_per_month,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

UPDATE subscription_plans
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE id NOT IN ('plan-free', 'plan-mini', 'plan-starter', 'plan-basic', 'plan-standard', 'plan-pro', 'plan-business');
