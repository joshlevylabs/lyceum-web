-- Manual Billing Tables Setup
-- Run this in your Supabase SQL Editor if automated setup failed

-- 1. Billing periods table
CREATE TABLE IF NOT EXISTS public.billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  period_label TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'billed', 'closed', 'cancelled')),
  total_licenses INTEGER DEFAULT 0,
  total_clusters INTEGER DEFAULT 0,
  additional_users_count INTEGER DEFAULT 0,
  storage_overage_gb DECIMAL(10,2) DEFAULT 0,
  pricing_config JSONB,
  billed_at TIMESTAMP WITH TIME ZONE,
  total_amount_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- 2. Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  subtotal_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_jurisdiction TEXT,
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  payment_method_last4 TEXT,
  payment_method_brand TEXT,
  billing_address JSONB,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Invoice line items table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_price_cents INTEGER NOT NULL,
  item_metadata JSONB,
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Billing usage snapshots table  
CREATE TABLE IF NOT EXISTS public.billing_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snapshot_type TEXT DEFAULT 'monthly' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'billing')),
  licenses_breakdown JSONB,
  clusters_breakdown JSONB,
  base_users INTEGER DEFAULT 0,
  additional_users INTEGER DEFAULT 0,
  total_storage_gb DECIMAL(10,2) DEFAULT 0,
  storage_limit_gb DECIMAL(10,2) DEFAULT 0,
  storage_overage_gb DECIMAL(10,2) DEFAULT 0,
  total_license_cost_cents INTEGER DEFAULT 0,
  total_cluster_cost_cents INTEGER DEFAULT 0,
  total_user_cost_cents INTEGER DEFAULT 0,
  total_storage_cost_cents INTEGER DEFAULT 0,
  estimated_monthly_cost_cents INTEGER DEFAULT 0,
  raw_usage_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Billing automation log table
CREATE TABLE IF NOT EXISTS public.billing_automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_status TEXT DEFAULT 'success' CHECK (event_status IN ('success', 'error', 'warning', 'skipped')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_period_id UUID REFERENCES public.billing_periods(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  trigger_type TEXT,
  processor TEXT,
  event_data JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_automation_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own billing periods" ON public.billing_periods;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view line items for their invoices" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins can view all billing data" ON public.billing_periods;
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;

-- Create policies for users to access their own data
CREATE POLICY "Users can view their own billing periods" ON public.billing_periods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view line items for their invoices" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE id = invoice_line_items.invoice_id AND user_id = auth.uid()
    )
  );

-- Admin policies
CREATE POLICY "Admins can view all billing data" ON public.billing_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can view all invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_periods_user_date ON public.billing_periods(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON public.invoices(user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON public.invoice_line_items(invoice_id, line_order);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_user_date ON public.billing_usage_snapshots(user_id, snapshot_date DESC);

-- Insert a test billing period for the admin user
INSERT INTO public.billing_periods (user_id, period_start, period_end, period_label, status)
VALUES (
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '15 days', 
  'January 2025',
  'active'
) ON CONFLICT (user_id, period_start) DO NOTHING;


