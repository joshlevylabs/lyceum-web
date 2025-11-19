-- =====================================================
-- Coupon System Migration
-- Created: 2025-01-14
-- Purpose: Add coupon/discount system for admin management
-- =====================================================

-- =====================================================
-- 1. COUPONS TABLE
-- Stores coupon definitions that can be assigned to users
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Coupon identification
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Discount configuration
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  -- For percentage: value is percentage (e.g., 20 = 20% off)
  -- For fixed_amount: value is dollars (e.g., 10.00 = $10 off)

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  times_used INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,

  -- Validity period
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Applicability rules (JSONB for flexibility)
  applies_to JSONB DEFAULT '{
    "all": true,
    "min_amount_cents": 0,
    "license_types": [],
    "cluster_types": []
  }'::jsonb,
  -- Example: { "all": false, "min_amount_cents": 1000, "license_types": ["professional", "enterprise"] }

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for coupons table
CREATE INDEX idx_coupons_code ON coupons(code) WHERE active = true;
CREATE INDEX idx_coupons_active ON coupons(active, valid_from, valid_until);
CREATE INDEX idx_coupons_created_by ON coupons(created_by);

COMMENT ON TABLE coupons IS 'Coupon definitions that can be applied to user billing';
COMMENT ON COLUMN coupons.discount_type IS 'Type of discount: percentage or fixed_amount';
COMMENT ON COLUMN coupons.discount_value IS 'Value of discount (percentage or dollar amount)';
COMMENT ON COLUMN coupons.max_uses IS 'Maximum number of times this coupon can be used globally (NULL = unlimited)';
COMMENT ON COLUMN coupons.max_uses_per_user IS 'Maximum number of times a single user can use this coupon';
COMMENT ON COLUMN coupons.applies_to IS 'JSON configuration for what this coupon applies to';

-- =====================================================
-- 2. USER_COUPONS TABLE
-- Tracks coupon assignments to specific users
-- =====================================================
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,

  -- Assignment details
  assigned_by UUID REFERENCES auth.users(id), -- Admin who assigned it
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  first_used_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Status
  active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  deactivated_by UUID REFERENCES auth.users(id),
  deactivation_reason TEXT,

  -- Notes
  admin_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure a user can only have one active assignment per coupon
  UNIQUE(user_id, coupon_id, active)
);

-- Indexes for user_coupons table
CREATE INDEX idx_user_coupons_user ON user_coupons(user_id) WHERE active = true;
CREATE INDEX idx_user_coupons_coupon ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_assigned_by ON user_coupons(assigned_by);
CREATE INDEX idx_user_coupons_active ON user_coupons(user_id, active, assigned_at DESC);

COMMENT ON TABLE user_coupons IS 'Tracks which coupons are assigned to which users';
COMMENT ON COLUMN user_coupons.times_used IS 'Number of times this user has used this specific coupon';
COMMENT ON COLUMN user_coupons.active IS 'Whether this coupon assignment is currently active for the user';

-- =====================================================
-- 3. COUPON_USAGE_LOG TABLE
-- Detailed log of when and how coupons were applied
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_coupon_id UUID NOT NULL REFERENCES user_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  billing_period_id UUID REFERENCES billing_periods(id),

  -- Discount details
  original_amount_cents BIGINT NOT NULL,
  discount_amount_cents BIGINT NOT NULL,
  final_amount_cents BIGINT NOT NULL,
  discount_percentage DECIMAL(5,2), -- Calculated percentage (for reporting)

  -- Application details
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by_system BOOLEAN DEFAULT true, -- false if manually applied by admin

  -- Snapshot of coupon config at time of use
  coupon_snapshot JSONB NOT NULL,
  -- Stores: { code, discount_type, discount_value, etc. }

  -- Additional context
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for coupon_usage_log table
CREATE INDEX idx_coupon_usage_user ON coupon_usage_log(user_id, applied_at DESC);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage_log(coupon_id, applied_at DESC);
CREATE INDEX idx_coupon_usage_invoice ON coupon_usage_log(invoice_id);
CREATE INDEX idx_coupon_usage_date ON coupon_usage_log(applied_at DESC);

COMMENT ON TABLE coupon_usage_log IS 'Audit log of all coupon applications to invoices';
COMMENT ON COLUMN coupon_usage_log.coupon_snapshot IS 'Snapshot of coupon configuration at time of use (for audit trail)';
COMMENT ON COLUMN coupon_usage_log.discount_percentage IS 'Calculated discount percentage for reporting (even if fixed amount)';

-- =====================================================
-- 4. UPDATE INVOICE LINE ITEMS FOR DISCOUNTS
-- Add support for discount line items
-- =====================================================
-- No schema change needed - existing invoice_line_items table supports
-- discount items with negative amounts. We'll use item_type = 'discount'

-- =====================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_coupons_updated_at
  BEFORE UPDATE ON user_coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment coupon usage counters
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment global coupon usage
  UPDATE coupons
  SET times_used = times_used + 1
  WHERE id = NEW.coupon_id;

  -- Increment user-specific coupon usage
  UPDATE user_coupons
  SET
    times_used = times_used + 1,
    last_used_at = NEW.applied_at,
    first_used_at = COALESCE(first_used_at, NEW.applied_at)
  WHERE id = NEW.user_coupon_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment usage when logged
CREATE TRIGGER trigger_increment_coupon_usage
  AFTER INSERT ON coupon_usage_log
  FOR EACH ROW
  EXECUTE FUNCTION increment_coupon_usage();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to check if a coupon is valid for a user
CREATE OR REPLACE FUNCTION is_coupon_valid_for_user(
  p_coupon_id UUID,
  p_user_id UUID,
  p_amount_cents BIGINT DEFAULT 0
)
RETURNS TABLE(
  valid BOOLEAN,
  reason TEXT,
  discount_amount_cents BIGINT,
  final_amount_cents BIGINT
) AS $$
DECLARE
  v_coupon RECORD;
  v_user_coupon RECORD;
  v_discount_cents BIGINT;
  v_final_cents BIGINT;
BEGIN
  -- Get coupon details
  SELECT * INTO v_coupon
  FROM coupons
  WHERE id = p_coupon_id;

  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Coupon not found', 0::BIGINT, p_amount_cents;
    RETURN;
  END IF;

  -- Check if coupon is active
  IF NOT v_coupon.active THEN
    RETURN QUERY SELECT false, 'Coupon is inactive', 0::BIGINT, p_amount_cents;
    RETURN;
  END IF;

  -- Check validity dates
  IF v_coupon.valid_from > NOW() THEN
    RETURN QUERY SELECT false, 'Coupon not yet valid', 0::BIGINT, p_amount_cents;
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN QUERY SELECT false, 'Coupon has expired', 0::BIGINT, p_amount_cents;
    RETURN;
  END IF;

  -- Check global usage limit
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.times_used >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, 'Coupon usage limit reached', 0::BIGINT, p_amount_cents;
    RETURN;
  END IF;

  -- Check user assignment
  SELECT * INTO v_user_coupon
  FROM user_coupons
  WHERE user_id = p_user_id
    AND coupon_id = p_coupon_id
    AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Coupon not assigned to user', 0::BIGINT, p_amount_cents;
    RETURN;
  END IF;

  -- Check per-user usage limit
  IF v_coupon.max_uses_per_user IS NOT NULL
     AND v_user_coupon.times_used >= v_coupon.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'User has reached usage limit for this coupon', 0::BIGINT, p_amount_cents;
    RETURN;
  END IF;

  -- Check minimum amount requirement
  IF (v_coupon.applies_to->>'min_amount_cents')::BIGINT > p_amount_cents THEN
    RETURN QUERY SELECT false,
      'Order does not meet minimum amount requirement',
      0::BIGINT,
      p_amount_cents;
    RETURN;
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_cents := (p_amount_cents * v_coupon.discount_value / 100)::BIGINT;
  ELSE -- fixed_amount
    v_discount_cents := (v_coupon.discount_value * 100)::BIGINT; -- Convert dollars to cents
  END IF;

  -- Ensure discount doesn't exceed total
  IF v_discount_cents > p_amount_cents THEN
    v_discount_cents := p_amount_cents;
  END IF;

  v_final_cents := p_amount_cents - v_discount_cents;

  -- Coupon is valid!
  RETURN QUERY SELECT true, 'Coupon is valid', v_discount_cents, v_final_cents;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_coupon_valid_for_user IS 'Validates if a coupon can be applied to a user and calculates discount';

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage_log ENABLE ROW LEVEL SECURITY;

-- Coupons policies
CREATE POLICY "Admins can view all coupons"
  ON coupons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can insert coupons"
  ON coupons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update coupons"
  ON coupons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete coupons"
  ON coupons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- User coupons policies
CREATE POLICY "Users can view their own coupons"
  ON user_coupons FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can manage user coupons"
  ON user_coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Coupon usage log policies
CREATE POLICY "Users can view their own usage log"
  ON coupon_usage_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "System can insert usage logs"
  ON coupon_usage_log FOR INSERT
  WITH CHECK (true); -- Allow system inserts

-- =====================================================
-- 8. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert some sample coupons (commented out by default)
/*
INSERT INTO coupons (code, name, description, discount_type, discount_value, max_uses, active, created_by)
VALUES
  ('WELCOME20', 'Welcome Discount', '20% off for new customers', 'percentage', 20.00, NULL, true, (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)),
  ('SAVE10', 'Save $10', '$10 off your monthly bill', 'fixed_amount', 10.00, 100, true, (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)),
  ('VIP50', 'VIP Discount', '50% off for VIP customers', 'percentage', 50.00, NULL, true, (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1));
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coupons') THEN
    RAISE NOTICE 'SUCCESS: coupons table created';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_coupons') THEN
    RAISE NOTICE 'SUCCESS: user_coupons table created';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coupon_usage_log') THEN
    RAISE NOTICE 'SUCCESS: coupon_usage_log table created';
  END IF;

  RAISE NOTICE 'Coupon system migration completed successfully!';
END $$;
