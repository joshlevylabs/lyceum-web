-- Check the exact role value for josh@thelyceum.io
SELECT
  up.id,
  up.role,
  LENGTH(up.role) as role_length,
  au.email,
  -- Show if it matches different formats
  CASE
    WHEN up.role = 'super_admin' THEN 'Matches: super_admin (with underscore)'
    WHEN up.role = 'superadmin' THEN 'Matches: superadmin (no underscore)'
    WHEN up.role = 'SUPER_ADMIN' THEN 'Matches: SUPER_ADMIN (uppercase with underscore)'
    WHEN up.role = 'SUPERADMIN' THEN 'Matches: SUPERADMIN (uppercase no underscore)'
    ELSE 'No match - value is: ' || up.role
  END as role_format_check
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.email = 'josh@thelyceum.io';

-- Also check all unique roles in the database
SELECT DISTINCT role, COUNT(*) as count
FROM public.user_profiles
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;
