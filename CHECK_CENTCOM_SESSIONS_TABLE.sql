-- Check if centcom_sessions table exists and what columns it has
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'centcom_sessions'
ORDER BY ordinal_position;

-- If it doesn't exist or has wrong columns, you need to create/modify it
