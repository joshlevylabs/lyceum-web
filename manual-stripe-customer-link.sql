-- Manual fix to link Stripe customers to user profiles
-- Run this in your Supabase SQL Editor

-- Update josh@thelyceum.io profile with their Stripe customer ID
UPDATE user_profiles 
SET 
  stripe_customer_id = 'cus_T7ZjWDtzZA3IG6',
  subscription_status = 'setup_complete',
  updated_at = NOW()
WHERE email = 'josh@thelyceum.io';

-- Check the update worked
SELECT 
  email, 
  full_name, 
  stripe_customer_id, 
  subscription_status 
FROM user_profiles 
WHERE email = 'josh@thelyceum.io';

-- Also check all users with customer IDs
SELECT 
  email, 
  full_name, 
  stripe_customer_id, 
  subscription_status 
FROM user_profiles 
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id != '';
