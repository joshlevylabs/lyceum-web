-- =====================================================
-- Remove Invoice System Migration
-- Created: 2025-01-24
-- Purpose: Remove custom invoice system (use Stripe Invoices instead)
-- =====================================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view line items for their invoices" ON invoice_line_items;
DROP POLICY IF EXISTS "Service role can manage all invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Service role can manage all invoices" ON invoices;

-- Drop indexes
DROP INDEX IF EXISTS idx_invoice_line_items_invoice_id;
DROP INDEX IF EXISTS idx_invoices_user_id;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_billing_period;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- NOTE: We're keeping billing_periods and billing_usage_snapshots
-- These are still needed for usage tracking and metered billing

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Invoice system removed successfully!';
  RAISE NOTICE 'Use Stripe Invoices for billing instead.';
  RAISE NOTICE 'Kept: billing_periods and billing_usage_snapshots for usage tracking.';
END $$;
