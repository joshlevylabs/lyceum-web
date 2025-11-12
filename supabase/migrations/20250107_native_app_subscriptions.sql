-- Create native_app_subscriptions table
CREATE TABLE IF NOT EXISTS native_app_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('trial', 'paid')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_native_app_subscriptions_user_id
ON native_app_subscriptions(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_native_app_subscriptions_status
ON native_app_subscriptions(status);

-- Enable RLS
ALTER TABLE native_app_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON native_app_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
ON native_app_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
ON native_app_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_native_app_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_native_app_subscriptions_updated_at_trigger
BEFORE UPDATE ON native_app_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_native_app_subscriptions_updated_at();

-- Comments
COMMENT ON TABLE native_app_subscriptions IS 'Tracks user subscriptions for native/desktop application';
COMMENT ON COLUMN native_app_subscriptions.subscription_type IS 'Type of subscription: trial or paid';
COMMENT ON COLUMN native_app_subscriptions.status IS 'Current status: active, expired, or cancelled';
COMMENT ON COLUMN native_app_subscriptions.expires_at IS 'Expiration date for trial subscriptions (NULL for paid = lifetime)';
