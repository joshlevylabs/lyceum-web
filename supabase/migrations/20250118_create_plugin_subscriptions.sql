-- Create plugin_subscriptions table for managing plugin trial and paid subscriptions
CREATE TABLE IF NOT EXISTS plugin_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plugin_type TEXT NOT NULL CHECK (plugin_type IN ('klippel_qc', 'apx500')),
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('trial', 'paid')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),

  -- Stripe integration
  stripe_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,

  -- Payment info
  amount_paid_cents INTEGER,
  currency TEXT DEFAULT 'usd',

  -- Trial dates (for trial subscriptions)
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,

  -- Cancellation tracking
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one active subscription per user per plugin
  UNIQUE(user_id, plugin_type, status)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plugin_subscriptions_user_id ON plugin_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_subscriptions_plugin_type ON plugin_subscriptions(plugin_type);
CREATE INDEX IF NOT EXISTS idx_plugin_subscriptions_status ON plugin_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_plugin_subscriptions_user_plugin ON plugin_subscriptions(user_id, plugin_type);

-- Enable RLS
ALTER TABLE plugin_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view own plugin subscriptions"
  ON plugin_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscriptions (via API with proper validation)
CREATE POLICY "Users can create own plugin subscriptions"
  ON plugin_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions (e.g., cancel)
CREATE POLICY "Users can update own plugin subscriptions"
  ON plugin_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all plugin subscriptions"
  ON plugin_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can delete subscriptions
CREATE POLICY "Admins can delete plugin subscriptions"
  ON plugin_subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_plugin_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plugin_subscriptions_updated_at
  BEFORE UPDATE ON plugin_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_plugin_subscriptions_updated_at();

-- Add comment
COMMENT ON TABLE plugin_subscriptions IS 'Manages trial and paid subscriptions for individual plugins (Klippel QC, APx500, etc.)';
