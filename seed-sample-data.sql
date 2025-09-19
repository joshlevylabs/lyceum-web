-- Sample Data for Enhanced User Management System
-- Run this after setting up the enhanced schema

-- First, ensure we have some test users (replace with actual user IDs from your Supabase Auth)
-- You can get user IDs from the admin users list or Supabase Auth dashboard

-- Sample Payment Status Data
INSERT INTO public.user_payment_status (user_id, payment_status, subscription_type, monthly_amount, currency, next_billing_date, last_payment_date, payment_failures) VALUES
-- Replace these UUIDs with actual user IDs from your auth.users table
('00000000-0000-0000-0000-000000000001', 'active', 'professional', 49.99, 'USD', '2025-10-10', '2025-09-10', 0),
('00000000-0000-0000-0000-000000000002', 'overdue', 'basic', 19.99, 'USD', '2025-09-05', '2025-08-05', 2)
ON CONFLICT (user_id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  subscription_type = EXCLUDED.subscription_type,
  monthly_amount = EXCLUDED.monthly_amount,
  updated_at = NOW();

-- Sample Resource Usage Data
INSERT INTO public.user_resource_usage (user_id, database_clusters_count, storage_used_mb, storage_limit_mb, bandwidth_used_mb, bandwidth_limit_mb, api_calls_count, api_calls_limit, compute_hours_used, compute_hours_limit) VALUES
('00000000-0000-0000-0000-000000000001', 3, 2048, 10240, 1500, 20480, 7500, 50000, 25.5, 100),
('00000000-0000-0000-0000-000000000002', 1, 512, 2048, 300, 5120, 1200, 10000, 5.2, 20)
ON CONFLICT (user_id) DO UPDATE SET
  storage_used_mb = EXCLUDED.storage_used_mb,
  bandwidth_used_mb = EXCLUDED.bandwidth_used_mb,
  api_calls_count = EXCLUDED.api_calls_count,
  compute_hours_used = EXCLUDED.compute_hours_used,
  last_usage_update = NOW();

-- Sample Database Clusters
INSERT INTO public.user_database_clusters (user_id, cluster_name, cluster_type, status, region, storage_size_mb, cpu_cores, ram_mb, last_accessed) VALUES
('00000000-0000-0000-0000-000000000001', 'Production Analytics', 'premium', 'active', 'us-east-1', 4096, 4, 8192, NOW() - INTERVAL '2 hours'),
('00000000-0000-0000-0000-000000000001', 'Development Test', 'standard', 'active', 'us-west-2', 1024, 2, 4096, NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000001', 'Staging Environment', 'standard', 'suspended', 'eu-west-1', 2048, 2, 4096, NOW() - INTERVAL '1 week'),
('00000000-0000-0000-0000-000000000002', 'Personal Project', 'basic', 'active', 'us-east-1', 512, 1, 2048, NOW() - INTERVAL '3 hours');

-- Sample Activity Logs
INSERT INTO public.user_activity_logs (user_id, activity_type, description, ip_address, metadata) VALUES
('00000000-0000-0000-0000-000000000001', 'login', 'User logged in successfully', '192.168.1.100', '{"browser": "Chrome", "os": "Windows"}'),
('00000000-0000-0000-0000-000000000001', 'cluster_created', 'Created new database cluster: Production Analytics', '192.168.1.100', '{"cluster_type": "premium", "region": "us-east-1"}'),
('00000000-0000-0000-0000-000000000002', 'payment_failed', 'Payment attempt failed', '10.0.0.50', '{"amount": 19.99, "reason": "insufficient_funds"}'),
('00000000-0000-0000-0000-000000000002', 'login', 'User logged in successfully', '10.0.0.50', '{"browser": "Firefox", "os": "macOS"}');

-- Sample Payment Transactions
INSERT INTO public.payment_transactions (user_id, transaction_type, amount, currency, status, payment_method, external_transaction_id, description, processed_at) VALUES
('00000000-0000-0000-0000-000000000001', 'payment', 49.99, 'USD', 'completed', 'credit_card', 'stripe_pi_1234567890', 'Monthly subscription - Professional plan', NOW() - INTERVAL '10 days'),
('00000000-0000-0000-0000-000000000002', 'payment', 19.99, 'USD', 'failed', 'credit_card', 'stripe_pi_0987654321', 'Monthly subscription - Basic plan', NOW() - INTERVAL '5 days'),
('00000000-0000-0000-0000-000000000002', 'payment', 19.99, 'USD', 'failed', 'credit_card', 'stripe_pi_1122334455', 'Retry payment - Basic plan', NOW() - INTERVAL '3 days');

-- Update user_resource_usage with correct cluster counts
UPDATE public.user_resource_usage 
SET database_clusters_count = (
  SELECT COUNT(*) 
  FROM public.user_database_clusters 
  WHERE user_database_clusters.user_id = user_resource_usage.user_id
);

-- Instructions for use:
-- 1. First run the main schema file: database-setup-user-management-enhancement.sql
-- 2. Replace the sample UUIDs above with actual user IDs from your auth.users table
-- 3. Run this seed data file
-- 4. Access /admin/users and expand user details to see the enhanced information

-- To get actual user IDs, run this query in Supabase SQL Editor:
-- SELECT id, email FROM auth.users LIMIT 10;





