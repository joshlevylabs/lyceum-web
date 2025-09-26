-- Add missing Stripe confirmation fields to invoices table
-- These fields store detailed payment confirmation information for cross-referencing

-- Add Stripe charge ID (for transaction lookup)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

-- Add Stripe receipt URL (for user receipt access)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_receipt_url TEXT;

-- Add Stripe transaction ID (balance transaction ID)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_transaction_id TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.invoices.stripe_charge_id IS 'Stripe charge ID for transaction lookup and reconciliation';
COMMENT ON COLUMN public.invoices.stripe_receipt_url IS 'Stripe-generated receipt URL for customer access';
COMMENT ON COLUMN public.invoices.stripe_transaction_id IS 'Stripe balance transaction ID for accounting purposes';

-- Create index for faster Stripe lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_charge_id ON public.invoices(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_transaction_id ON public.invoices(stripe_transaction_id);

-- Success message (as a comment)
-- Migration complete: Added stripe_charge_id, stripe_receipt_url, and stripe_transaction_id columns
