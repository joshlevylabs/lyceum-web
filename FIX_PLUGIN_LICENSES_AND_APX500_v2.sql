-- ============================================
-- Fix Plugin Licenses and Update APx500
-- ============================================

-- 1. Drop existing status check constraint and recreate with 'trial' included
ALTER TABLE public.license_keys DROP CONSTRAINT IF EXISTS license_keys_status_check;

ALTER TABLE public.license_keys
ADD CONSTRAINT license_keys_status_check
CHECK (status IN ('active', 'expired', 'revoked', 'suspended', 'trial'));

-- 2. Update APx500 plugin to monthly subscription
UPDATE public.plugins
SET
  pricing_model = 'subscription_monthly',
  base_price = 25.00,
  monthly_price = 25.00,
  has_free_trial = true,
  trial_duration_days = 14,
  updated_at = NOW()
WHERE slug = 'apx500';

-- 3. Add tier column to license_keys if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='license_keys' AND column_name='tier') THEN
    ALTER TABLE public.license_keys ADD COLUMN tier TEXT DEFAULT 'basic';
  END IF;
END $$;

-- 4. Add license_category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='license_keys' AND column_name='license_category') THEN
    ALTER TABLE public.license_keys ADD COLUMN license_category TEXT DEFAULT 'main_application';
  END IF;
END $$;

-- 5. Update existing plugin licenses to have correct category and tier
UPDATE public.license_keys
SET
  license_category = 'plugin',
  tier = 'basic',
  license_config = COALESCE(license_config, '{}'::jsonb) ||
    jsonb_build_object('license_category', 'plugin')
WHERE license_type IN ('klippel_qc', 'apx500');

-- 6. Update trial plugin licenses to have status = 'trial' instead of 'active'
UPDATE public.license_keys
SET status = 'trial'
WHERE license_type IN ('klippel_qc', 'apx500')
  AND expires_at IS NOT NULL
  AND status = 'active';

-- 7. Update main application licenses to have tier and category set
UPDATE public.license_keys
SET
  license_category = 'main_application',
  tier = CASE
    WHEN license_type = 'enterprise' THEN 'enterprise'
    WHEN license_type = 'professional' THEN 'professional'
    WHEN license_type LIKE '%enterprise%' THEN 'enterprise'
    WHEN license_type LIKE '%professional%' THEN 'professional'
    ELSE 'basic'
  END,
  license_config = COALESCE(license_config, '{}'::jsonb) ||
    jsonb_build_object('license_category', 'main_application')
WHERE license_type NOT IN ('klippel_qc', 'apx500')
  AND (license_category IS NULL OR license_category = 'main_application');

-- 8. Verify changes (ALL licenses)
SELECT
  key_code,
  license_type,
  license_category,
  tier,
  status,
  expires_at,
  license_config->>'license_category' as config_category
FROM public.license_keys
ORDER BY created_at DESC;
