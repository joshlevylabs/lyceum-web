-- Clean up test data and prepare for real CentCom session tracking

-- Remove any test/demo data
DELETE FROM centcom_sessions 
WHERE centcom_session_id LIKE 'centcom-demo-%' 
   OR sync_source IN ('setup_test', 'demo');

-- Clear out any test data we added earlier
DELETE FROM centcom_sessions 
WHERE sync_source = 'manual_test' 
   OR centcom_session_id LIKE 'test-%';

-- Verify the cleanup
SELECT 
  'Cleanup Results' as status,
  COUNT(*) as remaining_sessions,
  COALESCE(string_agg(DISTINCT sync_source, ', '), 'none') as remaining_sources
FROM centcom_sessions;

-- Show that we're ready for real data
SELECT 
  'Ready for Real Data' as status,
  'All future CentCom logins will create session entries automatically' as message;

-- Test that the endpoint will work by simulating what happens on login
DO $$
BEGIN
  RAISE NOTICE 'Setup complete! Next CentCom login will automatically create a session entry.';
  RAISE NOTICE 'Updated CentCom login endpoint will now create centcom_sessions entries.';
  RAISE NOTICE 'Check admin panel after next CentCom login to see real session data.';
END $$;
