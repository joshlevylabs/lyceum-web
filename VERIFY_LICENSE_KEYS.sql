-- Verify your license in the license_keys table
-- This is what the download API will check

-- First, check what type assigned_to column is
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'license_keys'
  AND column_name = 'assigned_to';

-- Check your license by user ID (if assigned_to is UUID)
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
FROM license_keys
WHERE assigned_to::text = '2c3d4747-8d67-45af-90f5-b5e9058ec246';

-- Check by email (if assigned_to stores email as text)
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
FROM license_keys
WHERE assigned_to::text = (
  SELECT email FROM auth.users WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
);

-- Check ALL licenses (to see what exists)
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
FROM license_keys
LIMIT 10;

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
