-- Enhanced User Management Schema
-- Run this SQL in Supabase SQL Editor

-- 1. User Payment Information (encrypted/secure)
CREATE TABLE IF NOT EXISTS public.user_payment_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('active', 'pending', 'overdue', 'suspended', 'cancelled')),
  subscription_type VARCHAR(50) DEFAULT 'trial',
  monthly_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one-time')),
  next_billing_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  payment_failures INTEGER DEFAULT 0,
  stripe_customer_id VARCHAR(255), -- for Stripe integration
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Resource Usage Tracking
CREATE TABLE IF NOT EXISTS public.user_resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_clusters_count INTEGER DEFAULT 0,
  storage_used_mb BIGINT DEFAULT 0,
  storage_limit_mb BIGINT DEFAULT 1024, -- 1GB default
  bandwidth_used_mb BIGINT DEFAULT 0,
  bandwidth_limit_mb BIGINT DEFAULT 10240, -- 10GB default
  api_calls_count BIGINT DEFAULT 0,
  api_calls_limit BIGINT DEFAULT 10000,
  compute_hours_used DECIMAL(10,2) DEFAULT 0,
  compute_hours_limit DECIMAL(10,2) DEFAULT 100,
  last_usage_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. User Database Clusters
CREATE TABLE IF NOT EXISTS public.user_database_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_name VARCHAR(255) NOT NULL,
  cluster_type VARCHAR(50) DEFAULT 'basic' CHECK (cluster_type IN ('basic', 'standard', 'premium', 'enterprise')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  region VARCHAR(50) DEFAULT 'us-east-1',
  storage_size_mb BIGINT DEFAULT 512,
  cpu_cores INTEGER DEFAULT 1,
  ram_mb INTEGER DEFAULT 1024,
  connection_string TEXT, -- encrypted in production
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enhanced License Management
CREATE TABLE IF NOT EXISTS public.user_license_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  UNIQUE(user_id, license_id)
);

-- 5. User Activity Logs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payment Transactions History
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('payment', 'refund', 'chargeback', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50),
  external_transaction_id VARCHAR(255), -- Stripe, PayPal, etc.
  description TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_payment_status_user_id ON public.user_payment_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resource_usage_user_id ON public.user_resource_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_database_clusters_user_id ON public.user_database_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_license_assignments_user_id ON public.user_license_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_payment_status_updated_at
  BEFORE UPDATE ON public.user_payment_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_resource_usage_updated_at
  BEFORE UPDATE ON public.user_resource_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_database_clusters_updated_at
  BEFORE UPDATE ON public.user_database_clusters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security Policies
ALTER TABLE public.user_payment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resource_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_database_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_license_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for service role (admin access)
CREATE POLICY "Service role can manage all payment status" ON public.user_payment_status
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all resource usage" ON public.user_resource_usage
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all database clusters" ON public.user_database_clusters
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all license assignments" ON public.user_license_assignments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all activity logs" ON public.user_activity_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all payment transactions" ON public.payment_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Users can only view their own data
CREATE POLICY "Users can view own payment status" ON public.user_payment_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own resource usage" ON public.user_resource_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own database clusters" ON public.user_database_clusters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own license assignments" ON public.user_license_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_payment_status TO service_role;
GRANT ALL ON public.user_resource_usage TO service_role;
GRANT ALL ON public.user_database_clusters TO service_role;
GRANT ALL ON public.user_license_assignments TO service_role;
GRANT ALL ON public.user_activity_logs TO service_role;
GRANT ALL ON public.payment_transactions TO service_role;

GRANT SELECT ON public.user_payment_status TO authenticated;
GRANT SELECT ON public.user_resource_usage TO authenticated;
GRANT SELECT ON public.user_database_clusters TO authenticated;
GRANT SELECT ON public.user_license_assignments TO authenticated;





