INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular, is_active)
VALUES
  ('plan-free', 'Free', 'Perfect for trying out SlipSure', 0, 0, 50, '["slip_verify", "line_notify", "csv_export", "analytics"]'::jsonb, FALSE, TRUE),
  ('plan-havenovid', 'HAVENOVID', 'สำหรับธุรกิจขนาดย่อม', 35.99, 359.90, 150, '["เชื่อมต่อ API ทุกฟังก์ชั่น", "สามารถสร้างสาขาได้ไม่จำกัด", "เชิญพนักงานร้านค้าได้ไม่จำกัด", "สลิปคิด 0.24 บาท/เครดิต", "ตรวจสอบสลิปได้ 150 สลิป"]'::jsonb, FALSE, TRUE),
  ('plan-havestart', 'HAVESTART', 'สำหรับธุรกิจเริ่มต้น', 77.00, 770.00, 350, '["เชื่อมต่อ API ทุกฟังก์ชั่น", "สามารถสร้างสาขาได้ไม่จำกัด", "เชิญพนักงานร้านค้าได้ไม่จำกัด", "สลิปคิด 0.22 บาท/เครดิต", "ตรวจสอบสลิปได้ 350 สลิป"]'::jsonb, TRUE, TRUE),
  ('plan-havesme', 'HAVESME', 'ธุรกิจขนาดกลาง', 200.00, 2000.00, 1000, '["เชื่อมต่อ API ทุกฟังก์ชั่น", "สามารถสร้างสาขาได้ไม่จำกัด", "เชิญพนักงานร้านค้าได้ไม่จำกัด", "สลิปคิด 0.20 บาท/เครดิต", "ตรวจสอบสลิปได้ 1,000 สลิป"]'::jsonb, FALSE, TRUE),
  ('plan-haveenterprise', 'HAVEENTERPRISE', 'ธุรกิจขนาดใหญ่', 720.00, 7200.00, 4000, '["เชื่อมต่อ API ทุกฟังก์ชั่น", "สามารถสร้างสาขาได้ไม่จำกัด", "เชิญพนักงานร้านค้าได้ไม่จำกัด", "สลิปคิด 0.18 บาท/เครดิต", "ตรวจสอบสลิปได้ 4,000 สลิป"]'::jsonb, TRUE, TRUE),
  ('plan-havegold', 'HAVEGOLD', 'ธุรกิจขนาดใหญ่สุด', 2400.00, 24000.00, 15000, '["เชื่อมต่อ API ทุกฟังก์ชั่น", "สามารถสร้างสาขาได้ไม่จำกัด", "เชิญพนักงานร้านค้าได้ไม่จำกัด", "สลิปคิด 0.16 บาท/เครดิต", "ตรวจสอบสลิปได้ 15,000 สลิป"]'::jsonb, FALSE, TRUE),
  ('plan-havebusiness', 'HAVEBUSINESS', 'ธุรกิจขนาดใหญ่สุด', 5599.99, 55999.90, 40000, '["เชื่อมต่อ API ทุกฟังก์ชั่น", "สามารถสร้างสาขาได้ไม่จำกัด", "เชิญพนักงานร้านค้าได้ไม่จำกัด", "สลิปคิด 0.14 บาท/เครดิต", "ตรวจสอบสลิปได้ 40,000 สลิป"]'::jsonb, FALSE, TRUE)
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
WHERE id NOT IN (
  'plan-free',
  'plan-havenovid',
  'plan-havestart',
  'plan-havesme',
  'plan-haveenterprise',
  'plan-havegold',
  'plan-havebusiness'
);
