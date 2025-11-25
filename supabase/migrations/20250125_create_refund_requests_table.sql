-- Create refund_requests table to store user refund requests
-- This replaces immediate Stripe refunds with an admin approval workflow

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charge_id TEXT NOT NULL,
  refund_id TEXT NULL, -- Populated when refund is actually processed in Stripe
  amount_refunded INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT NULL, -- User's reason for refund request
  admin_notes TEXT NULL, -- Admin's notes when approving/rejecting
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_charge_id ON public.refund_requests(charge_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own refund requests
CREATE POLICY "Users can view own refund requests"
  ON public.refund_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Policy: Admins can view all refund requests
CREATE POLICY "Admins can view all refund requests"
  ON public.refund_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Policy: Users can create refund requests for their own charges
CREATE POLICY "Users can create refund requests"
  ON public.refund_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() = requested_by
  );

-- Policy: Only admins can update refund requests (approve/reject)
CREATE POLICY "Admins can update refund requests"
  ON public.refund_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Policy: Only admins can delete refund requests (cleanup)
CREATE POLICY "Admins can delete refund requests"
  ON public.refund_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_refund_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_refund_requests_updated_at();

-- Add comment to table
COMMENT ON TABLE public.refund_requests IS 'Stores user refund requests that require admin approval before processing in Stripe';
