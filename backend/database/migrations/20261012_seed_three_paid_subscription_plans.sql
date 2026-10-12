INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular, is_active)
VALUES
  ('plan-free', 'Free', 'Perfect for trying out SlipSure', 0, 0, 50, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE, TRUE),
  ('plan-starter', 'Starter', 'For small businesses', 299, 2990, 200, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE, TRUE),
  ('plan-pro', 'Pro', 'For growing businesses', 799, 7990, 1000, '["slip_verify", "line_notify", "csv_export", "analytics", "priority_support"]'::jsonb, TRUE, TRUE),
  ('plan-enterprise', 'Enterprise', 'For high-volume businesses', 999, 9990, 4000, '["slip_verify", "line_notify", "csv_export", "analytics", "priority_support", "higher_quota"]'::jsonb, FALSE, TRUE)
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
WHERE id NOT IN ('plan-free', 'plan-starter', 'plan-pro', 'plan-enterprise');
