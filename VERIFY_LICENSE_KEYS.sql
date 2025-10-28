-- Verify your license in the license_keys table
-- This is what the download API will check

-- Check your license by user ID
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
FROM license_keys
WHERE assigned_to = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Also check by email (in case it's assigned by email)
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
FROM license_keys
WHERE assigned_to IN (
  SELECT email FROM auth.users WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
);

-- If no results, insert a test license
-- Only run this if the queries above return no rows
INSERT INTO license_keys (
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
)
VALUES (
  'CENTCOM-' || substring(gen_random_uuid()::text, 1, 8),
  'professional',
  'active',
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  NOW(),
  NOW() + INTERVAL '1 year'
)
RETURNING *;
