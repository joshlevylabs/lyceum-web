-- Manually verify lyceum@yopmail.com
UPDATE public.user_profiles
SET email_verified = true
WHERE id = 'd6a3fed3-129f-41d3-a514-0f885ab3e308';

-- Verify the update
SELECT id, email, email_verified
FROM public.user_profiles
WHERE id = 'd6a3fed3-129f-41d3-a514-0f885ab3e308';
