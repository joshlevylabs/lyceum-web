-- ====================================
-- CLEANUP TEST SESSIONS
-- Run this script in Supabase SQL Console to remove test/dummy data
-- ====================================

-- Show sessions that will be deleted
SELECT 'Sessions to be deleted:' as message;
SELECT id, title, user_id, status, created_at
FROM public.onboarding_sessions
WHERE title LIKE '%Centcom Onboarding Session%' 
   OR title LIKE '%test%' 
   OR title LIKE '%dummy%'
   OR title LIKE '%Test%'
   OR title LIKE '%Dummy%';

-- Delete test sessions
DELETE FROM public.onboarding_sessions
WHERE title LIKE '%Centcom Onboarding Session%' 
   OR title LIKE '%test%' 
   OR title LIKE '%dummy%'
   OR title LIKE '%Test%'
   OR title LIKE '%Dummy%';

-- Show remaining sessions (should be empty for fresh start)
SELECT 'Remaining sessions after cleanup:' as message;
SELECT id, title, user_id, status, created_at
FROM public.onboarding_sessions;

-- Also clean up any orphaned progress records
DELETE FROM public.onboarding_progress
WHERE NOT EXISTS (
    SELECT 1 FROM public.onboarding_sessions 
    WHERE onboarding_sessions.user_id = onboarding_progress.user_id
    AND onboarding_sessions.license_key_id = onboarding_progress.license_key_id
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Test session data cleanup completed!';
  RAISE NOTICE 'Database is now ready for real onboarding sessions.';
END $$;
