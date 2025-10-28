-- Check what license-related tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%license%'
ORDER BY table_name;

-- Check the structure of license_keys table (if it exists)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'license_keys'
ORDER BY ordinal_position;

-- Check if you have any active license keys
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to,
  created_at,
  expires_at
FROM license_keys
WHERE assigned_to = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
   OR assigned_to IN (
     SELECT email FROM auth.users WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
   );
