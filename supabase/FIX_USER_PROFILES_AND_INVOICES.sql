-- Fix User Profiles and Invoices Issues
-- Run this in Supabase SQL Editor

-- ========================================
-- Part 1: Create User Profile Trigger
-- ========================================

-- Function to create user profile when a new user is created
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    username,
    full_name,
    company,
    role,
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    'engineer', -- default role
    true
  ) ON CONFLICT (id) DO NOTHING; -- Don't overwrite existing profiles

  -- Also create onboarding record if table exists
  BEGIN
    INSERT INTO public.user_onboarding (
      user_id,
      onboarding_stage
    ) VALUES (
      NEW.id,
      'pending'
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      NULL; -- Ignore if table doesn't exist
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Set function owner and permissions
ALTER FUNCTION public.create_user_profile() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;

-- ========================================
-- Part 2: Backfill Missing User Profiles
-- ========================================

-- Insert user_profiles for any auth.users that don't have a profile
INSERT INTO public.user_profiles (
  id,
  email,
  username,
  full_name,
  company,
  role,
  is_active,
  created_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'user_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'company', ''),
  'engineer',
  true,
  au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- Part 3: Check and Create Invoices Table
-- ========================================

-- Check if invoices table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    CREATE TABLE public.invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      due_date TIMESTAMP WITH TIME ZONE,
      status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
      subtotal_cents BIGINT NOT NULL DEFAULT 0,
      tax_cents BIGINT NOT NULL DEFAULT 0,
      total_cents BIGINT NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create index for faster lookups
    CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
    CREATE INDEX idx_invoices_status ON public.invoices(status);
    CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date DESC);

    -- Enable RLS
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    CREATE POLICY "Users can view their own invoices"
      ON public.invoices FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Service role can manage all invoices"
      ON public.invoices FOR ALL
      USING (auth.role() = 'service_role');

    RAISE NOTICE 'Invoices table created successfully';
  ELSE
    RAISE NOTICE 'Invoices table already exists';
  END IF;
END $$;

-- ========================================
-- Part 4: Check and Create Billing Periods Table
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_periods') THEN
    CREATE TABLE public.billing_periods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      period_label VARCHAR(50) NOT NULL,
      period_start TIMESTAMP WITH TIME ZONE NOT NULL,
      period_end TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'invoiced')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_billing_periods_user_id ON public.billing_periods(user_id);
    CREATE INDEX idx_billing_periods_dates ON public.billing_periods(period_start, period_end);

    -- Enable RLS
    ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own billing periods"
      ON public.billing_periods FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Service role can manage all billing periods"
      ON public.billing_periods FOR ALL
      USING (auth.role() = 'service_role');

    RAISE NOTICE 'Billing periods table created successfully';
  ELSE
    RAISE NOTICE 'Billing periods table already exists';
  END IF;
END $$;

-- ========================================
-- Part 5: Check and Create Invoice Line Items Table
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_line_items') THEN
    CREATE TABLE public.invoice_line_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
      unit_price_cents BIGINT NOT NULL,
      total_price_cents BIGINT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

    -- Enable RLS
    ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view line items for their invoices"
      ON public.invoice_line_items FOR SELECT
      USING (
        invoice_id IN (
          SELECT id FROM public.invoices WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "Service role can manage all line items"
      ON public.invoice_line_items FOR ALL
      USING (auth.role() = 'service_role');

    RAISE NOTICE 'Invoice line items table created successfully';
  ELSE
    RAISE NOTICE 'Invoice line items table already exists';
  END IF;
END $$;

-- ========================================
-- Summary
-- ========================================

DO $$
DECLARE
  missing_profiles_count INT;
  total_auth_users INT;
  total_profiles INT;
  invoices_exist BOOLEAN;
BEGIN
  -- Count auth users and profiles
  SELECT COUNT(*) INTO total_auth_users FROM auth.users;
  SELECT COUNT(*) INTO total_profiles FROM public.user_profiles;
  SELECT COUNT(*) INTO missing_profiles_count
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.id
  WHERE up.id IS NULL;

  -- Check if invoices table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoices'
  ) INTO invoices_exist;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total auth.users: %', total_auth_users;
  RAISE NOTICE 'Total user_profiles: %', total_profiles;
  RAISE NOTICE 'Missing profiles (should be 0): %', missing_profiles_count;
  RAISE NOTICE 'Invoices table exists: %', invoices_exist;
  RAISE NOTICE '========================================';
END $$;
