-- Monthly Billing & Invoicing System Schema
-- This builds on the existing flexible pricing system to add monthly billing
-- Run this in Supabase SQL Console

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- 1. BILLING PERIODS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Period definition
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  period_label TEXT NOT NULL, -- "January 2025", "2025-01", etc.
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'billed', 'closed', 'cancelled')),
  
  -- Usage summary (copied from usage tracking at billing time)
  total_licenses INTEGER DEFAULT 0,
  total_clusters INTEGER DEFAULT 0,
  additional_users_count INTEGER DEFAULT 0,
  storage_overage_gb DECIMAL(10,2) DEFAULT 0,
  
  -- Pricing snapshot (preserves pricing at time of billing)
  pricing_config JSONB,
  
  -- Billing info
  billed_at TIMESTAMP WITH TIME ZONE,
  total_amount_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, period_start)
);

-- ====================================
-- 2. INVOICES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE CASCADE,
  
  -- Invoice identification
  invoice_number TEXT NOT NULL UNIQUE, -- INV-2025-001-USER123
  
  -- Invoice details
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  
  -- Amounts (in cents)
  subtotal_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  -- Tax information
  tax_rate DECIMAL(5,4) DEFAULT 0, -- e.g., 0.0875 for 8.75%
  tax_jurisdiction TEXT, -- "California, USA"
  
  -- Payment information
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  payment_method_last4 TEXT,
  payment_method_brand TEXT,
  
  -- Billing address (snapshot at time of invoice)
  billing_address JSONB,
  
  -- Metadata
  notes TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 3. INVOICE LINE ITEMS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- Line item details
  item_type TEXT NOT NULL, -- 'platform_fee', 'license', 'cluster', 'additional_users', 'storage_overage'
  name TEXT NOT NULL, -- "Professional Licenses", "Large Production Clusters"
  description TEXT NOT NULL, -- "3 professional licenses at $15/month each"
  
  -- Pricing
  quantity INTEGER DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_price_cents INTEGER NOT NULL,
  
  -- Item metadata (for detailed breakdown)
  item_metadata JSONB, -- license details, cluster info, etc.
  
  -- Line order for display
  line_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 4. BILLING USAGE SNAPSHOTS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS public.billing_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE CASCADE,
  
  -- Usage snapshot date
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snapshot_type TEXT DEFAULT 'monthly' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'billing')),
  
  -- License usage
  licenses_breakdown JSONB, -- {"basic": 2, "professional": 3, "enterprise": 1}
  
  -- Cluster usage
  clusters_breakdown JSONB, -- {"small": {"development": 1, "production": 2}, "medium": {...}}
  
  -- User counts
  base_users INTEGER DEFAULT 0,
  additional_users INTEGER DEFAULT 0,
  
  -- Storage usage
  total_storage_gb DECIMAL(10,2) DEFAULT 0,
  storage_limit_gb DECIMAL(10,2) DEFAULT 0,
  storage_overage_gb DECIMAL(10,2) DEFAULT 0,
  
  -- Computed totals (for easy querying)
  total_license_cost_cents INTEGER DEFAULT 0,
  total_cluster_cost_cents INTEGER DEFAULT 0,
  total_user_cost_cents INTEGER DEFAULT 0,
  total_storage_cost_cents INTEGER DEFAULT 0,
  estimated_monthly_cost_cents INTEGER DEFAULT 0,
  
  -- Raw usage data (full snapshot)
  raw_usage_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 5. BILLING AUTOMATION LOG
-- ====================================
CREATE TABLE IF NOT EXISTS public.billing_automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Log details
  event_type TEXT NOT NULL, -- 'period_created', 'invoice_generated', 'payment_processed', 'reminder_sent'
  event_status TEXT DEFAULT 'success' CHECK (event_status IN ('success', 'error', 'warning', 'skipped')),
  
  -- Related entities
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_period_id UUID REFERENCES public.billing_periods(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- Automation details
  trigger_type TEXT, -- 'scheduled', 'manual', 'webhook'
  processor TEXT, -- 'stripe_webhook', 'cron_job', 'admin_action'
  
  -- Event data
  event_data JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================
-- 6. INDEXES FOR PERFORMANCE
-- ====================================

-- Billing periods indexes
CREATE INDEX IF NOT EXISTS idx_billing_periods_user_date ON public.billing_periods(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_billing_periods_status ON public.billing_periods(status, period_start);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON public.invoices(user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON public.invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- Line items indexes
CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON public.invoice_line_items(invoice_id, line_order);
CREATE INDEX IF NOT EXISTS idx_line_items_type ON public.invoice_line_items(item_type);

-- Usage snapshots indexes
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_user_date ON public.billing_usage_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_period ON public.billing_usage_snapshots(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_type ON public.billing_usage_snapshots(snapshot_type, snapshot_date);

-- Automation log indexes
CREATE INDEX IF NOT EXISTS idx_automation_log_date ON public.billing_automation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_log_user ON public.billing_automation_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_log_event ON public.billing_automation_log(event_type, event_status);

-- ====================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ====================================

-- Enable RLS on all tables
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_automation_log ENABLE ROW LEVEL SECURITY;

-- Billing periods policies
CREATE POLICY IF NOT EXISTS "Users can view their own billing periods" ON public.billing_periods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can view all billing periods" ON public.billing_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Invoices policies
CREATE POLICY IF NOT EXISTS "Users can view their own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can view all invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Line items policies (inherit from invoice access)
CREATE POLICY IF NOT EXISTS "Users can view line items for their invoices" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE id = invoice_line_items.invoice_id AND user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can view all line items" ON public.invoice_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Usage snapshots policies
CREATE POLICY IF NOT EXISTS "Users can view their own usage snapshots" ON public.billing_usage_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can view all usage snapshots" ON public.billing_usage_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Automation log policies (admin only)
CREATE POLICY IF NOT EXISTS "Admins can view automation logs" ON public.billing_automation_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ====================================
-- 8. TRIGGER FUNCTIONS
-- ====================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_billing_periods_updated_at 
  BEFORE UPDATE ON public.billing_periods 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON public.invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


