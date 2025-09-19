-- Check for real CentCom authentication data in your database
-- Run this in Supabase SQL Editor to see existing CentCom sessions

-- Check auth_logs for CentCom sessions
SELECT 
  'auth_logs' as source_table,
  COUNT(*) as total_centcom_auths,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as earliest_login,
  MAX(created_at) as latest_login
FROM auth_logs 
WHERE app_id = 'centcom' 
   OR session_type = 'centcom' 
   OR application_type = 'centcom';

-- Check user_activity_logs for CentCom sessions  
SELECT 
  'user_activity_logs' as source_table,
  COUNT(*) as total_centcom_activities,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as earliest_activity,
  MAX(created_at) as latest_activity
FROM user_activity_logs 
WHERE activity_type = 'login' 
  AND (description LIKE '%CentCom%' OR metadata->>'login_type' = 'centcom');

-- Show recent CentCom auth_logs entries (last 10)
SELECT 
  al.user_id,
  al.event_type,
  al.app_id,
  al.session_type,
  al.application_type,
  al.client_info,
  al.ip_address,
  al.success,
  al.created_at,
  -- Try to get user email for reference
  au.email
FROM auth_logs al
LEFT JOIN auth.users au ON al.user_id = au.id
WHERE al.app_id = 'centcom' 
   OR al.session_type = 'centcom' 
   OR al.application_type = 'centcom'
ORDER BY al.created_at DESC
LIMIT 10;

-- Show recent CentCom user_activity_logs entries (last 10)
SELECT 
  ual.user_id,
  ual.activity_type,
  ual.description,
  ual.ip_address,
  ual.user_agent,
  ual.metadata,
  ual.created_at,
  -- Try to get user email for reference
  au.email
FROM user_activity_logs ual
LEFT JOIN auth.users au ON ual.user_id = au.id
WHERE ual.activity_type = 'login' 
  AND (ual.description LIKE '%CentCom%' OR ual.metadata->>'login_type' = 'centcom')
ORDER BY ual.created_at DESC
LIMIT 10;

-- Check if we have data for your specific user ID
SELECT 
  'Your User Auth Logs' as check_type,
  COUNT(*) as centcom_logins
FROM auth_logs 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND (app_id = 'centcom' OR session_type = 'centcom' OR application_type = 'centcom');

SELECT 
  'Your User Activity Logs' as check_type,
  COUNT(*) as centcom_activities
FROM user_activity_logs 
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
  AND activity_type = 'login' 
  AND (description LIKE '%CentCom%' OR metadata->>'login_type' = 'centcom');
