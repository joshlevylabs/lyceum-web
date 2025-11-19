-- ============================================
-- Fix Plugin Licenses and Update APx500
-- ============================================

-- 1. Update APx500 plugin to monthly subscription
UPDATE public.plugins
SET
  pricing_model = 'subscription_monthly',
  base_price = 25.00,
  has_free_trial = true,
  trial_duration_days = 14,
  updated_at = NOW()
WHERE slug = 'apx500';

-- 2. Add tier column to license_keys if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='license_keys' AND column_name='tier') THEN
    ALTER TABLE public.license_keys ADD COLUMN tier TEXT DEFAULT 'basic';
  END IF;
END $$;

-- 3. Add license_category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='license_keys' AND column_name='license_category') THEN
    ALTER TABLE public.license_keys ADD COLUMN license_category TEXT DEFAULT 'main_application';
  END IF;
END $$;

-- 4. Update existing plugin licenses to have correct category and tier
UPDATE public.license_keys
SET
  license_category = 'plugin',
  tier = 'basic',
  license_config = COALESCE(license_config, '{}'::jsonb) ||
    jsonb_build_object('license_category', 'plugin')
WHERE license_type IN ('klippel_qc', 'apx500');

-- 5. Update trial plugin licenses to have status = 'trial' instead of 'active'
UPDATE public.license_keys
SET status = 'trial'
WHERE license_type IN ('klippel_qc', 'apx500')
  AND expires_at IS NOT NULL
  AND status = 'active';

-- 6. Verify changes
SELECT
  key_code,
  license_type,
  license_category,
  tier,
  status,
  expires_at,
  license_config->>'license_category' as config_category
FROM public.license_keys
WHERE license_type IN ('klippel_qc', 'apx500')
ORDER BY created_at DESC;
