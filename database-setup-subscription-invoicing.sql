-- Enhanced Subscription Management and Invoicing System
-- Run this SQL in Supabase SQL Editor after the base user management schema

-- 1. Subscription Plans (predefined plans available)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(255) NOT NULL UNIQUE,
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('trial', 'basic', 'professional', 'enterprise', 'custom')),
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  yearly_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  max_users INTEGER,
  max_storage_gb INTEGER,
  max_api_calls_monthly BIGINT,
  max_compute_hours_monthly DECIMAL(10,2),
  max_database_clusters INTEGER,
  included_plugins JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Subscriptions (active subscriptions per user)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  custom_plan_name VARCHAR(255), -- for custom plans not in subscription_plans
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled', 'expired')),
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'one-time')),
  monthly_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  trial_end_date TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One active subscription per user
);

-- 3. License Subscriptions (individual license-based subscriptions)
CREATE TABLE IF NOT EXISTS public.license_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  plugin_id VARCHAR(255) NOT NULL,
  subscription_type VARCHAR(50) DEFAULT 'monthly' CHECK (subscription_type IN ('monthly', 'yearly', 'perpetual', 'trial')),
  price_per_month DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')),
  auto_renew BOOLEAN DEFAULT TRUE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, license_id)
);

-- 4. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  external_invoice_id VARCHAR(255), -- Stripe, etc.
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Invoice Line Items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('subscription', 'license', 'addon', 'overage', 'discount', 'tax')),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payment Methods (encrypted storage)
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('credit_card', 'bank_account', 'paypal', 'stripe', 'other')),
  is_default BOOLEAN DEFAULT FALSE,
  last_four_digits VARCHAR(4), -- Only store last 4 digits
  card_brand VARCHAR(20), -- visa, mastercard, etc.
  expiry_month INTEGER,
  expiry_year INTEGER,
  cardholder_name VARCHAR(255),
  billing_address JSONB,
  external_payment_method_id VARCHAR(255), -- Stripe payment method ID
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Subscription Changes Log
CREATE TABLE IF NOT EXISTS public.subscription_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id),
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'suspended', 'reactivated')),
  old_plan VARCHAR(255),
  new_plan VARCHAR(255),
  old_amount DECIMAL(10,2),
  new_amount DECIMAL(10,2),
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id), -- admin who made the change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Usage Billing (for overage charges)
CREATE TABLE IF NOT EXISTS public.usage_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN ('storage', 'bandwidth', 'api_calls', 'compute_hours')),
  included_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  used_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  overage_amount DECIMAL(15,2) DEFAULT 0,
  overage_rate DECIMAL(10,4) DEFAULT 0, -- rate per unit of overage
  overage_charge DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_type ON public.subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_license_subscriptions_user_id ON public.license_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_license_subscriptions_license_id ON public.license_subscriptions(license_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user_id ON public.user_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_change_log_user_id ON public.subscription_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_billing_user_id ON public.usage_billing(user_id);

-- Create updated_at triggers
CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_license_subscriptions_updated_at
  BEFORE UPDATE ON public.license_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_payment_methods_updated_at
  BEFORE UPDATE ON public.user_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_billing ENABLE ROW LEVEL SECURITY;

-- Service role policies (admin access)
CREATE POLICY "Service role can manage subscription plans" ON public.subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage user subscriptions" ON public.user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage license subscriptions" ON public.license_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage invoices" ON public.invoices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage invoice line items" ON public.invoice_line_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage payment methods" ON public.user_payment_methods
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage subscription changes" ON public.subscription_change_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage usage billing" ON public.usage_billing
  FOR ALL USING (auth.role() = 'service_role');

-- User policies (users can view their own data)
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own license subscriptions" ON public.license_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoice line items" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own payment methods" ON public.user_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.subscription_plans TO service_role;
GRANT ALL ON public.user_subscriptions TO service_role;
GRANT ALL ON public.license_subscriptions TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.invoice_line_items TO service_role;
GRANT ALL ON public.user_payment_methods TO service_role;
GRANT ALL ON public.subscription_change_log TO service_role;
GRANT ALL ON public.usage_billing TO service_role;

GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.license_subscriptions TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.invoice_line_items TO authenticated;
GRANT SELECT ON public.user_payment_methods TO authenticated;

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_name, plan_type, description, monthly_price, yearly_price, max_users, max_storage_gb, max_api_calls_monthly, max_compute_hours_monthly, max_database_clusters, included_plugins, features) VALUES
('Trial', 'trial', '30-day free trial with basic features', 0, 0, 1, 1, 1000, 10, 1, '["basic"]', '{"support": "community", "sla": "none"}'),
('Basic', 'basic', 'Perfect for individual users and small projects', 19.99, 199.99, 1, 5, 10000, 50, 2, '["basic", "analytics"]', '{"support": "email", "sla": "48h"}'),
('Professional', 'professional', 'Advanced features for growing teams', 49.99, 499.99, 5, 25, 50000, 200, 5, '["basic", "analytics", "klippel_qc"]', '{"support": "priority", "sla": "24h"}'),
('Enterprise', 'enterprise', 'Full feature set for large organizations', 149.99, 1499.99, 50, 100, 200000, 1000, 20, '["basic", "analytics", "klippel_qc", "apx500"]', '{"support": "dedicated", "sla": "4h", "custom_integrations": true}')
ON CONFLICT (plan_name) DO NOTHING;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  invoice_num TEXT;
BEGIN
  year_month := to_char(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';
  
  invoice_num := 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;





