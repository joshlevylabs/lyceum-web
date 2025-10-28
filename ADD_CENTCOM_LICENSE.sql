-- Add Centcom license for the current user
-- This will enable downloads of the Centcom desktop application

-- First, let's check what licenses exist (if any)
SELECT
  id,
  user_id,
  license_type,
  status,
  created_at
FROM licenses
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
   OR user_id IN (
     SELECT email FROM auth.users WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
   );

-- If no licenses exist, insert a new Centcom license
-- Note: Only run this INSERT if the SELECT above returns no rows
INSERT INTO licenses (
  user_id,
  license_type,
  status,
  issued_at,
  expires_at,
  metadata
)
VALUES (
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  'professional', -- or 'enterprise', 'standard', 'trial'
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  jsonb_build_object(
    'product', 'centcom',
    'features', jsonb_build_array('desktop_app', 'api_access', 'support')
  )
)
ON CONFLICT DO NOTHING
RETURNING *;

-- Also check legacy license_keys table
SELECT
  id,
  key_code,
  license_type,
  status,
  assigned_to
FROM license_keys
WHERE assigned_to = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
   OR assigned_to IN (
     SELECT email FROM auth.users WHERE id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
   );

-- Verify the license was added
SELECT
  l.id,
  l.user_id,
  l.license_type,
  l.status,
  u.email,
  l.issued_at,
  l.expires_at
FROM licenses l
JOIN auth.users u ON l.user_id = u.id
WHERE l.user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
