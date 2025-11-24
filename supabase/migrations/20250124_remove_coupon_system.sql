-- =====================================================
-- Remove Coupon System Migration
-- Created: 2025-01-24
-- Purpose: Remove custom coupon system (use Stripe Promotion Codes instead)
-- =====================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Admins can view all coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can insert coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can update coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can delete coupons" ON coupons;
DROP POLICY IF EXISTS "Users can view their own coupons" ON user_coupons;
DROP POLICY IF EXISTS "Admins can manage user coupons" ON user_coupons;
DROP POLICY IF EXISTS "Users can view their own usage log" ON coupon_usage_log;
DROP POLICY IF EXISTS "System can insert usage logs" ON coupon_usage_log;

-- Drop triggers
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
DROP TRIGGER IF EXISTS update_user_coupons_updated_at ON user_coupons;
DROP TRIGGER IF EXISTS trigger_increment_coupon_usage ON coupon_usage_log;

-- Drop functions
DROP FUNCTION IF EXISTS increment_coupon_usage() CASCADE;
DROP FUNCTION IF EXISTS is_coupon_valid_for_user(UUID, UUID, BIGINT) CASCADE;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS coupon_usage_log CASCADE;
DROP TABLE IF EXISTS user_coupons CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Coupon system removed successfully!';
  RAISE NOTICE 'Use Stripe Promotion Codes for discounts instead.';
END $$;
