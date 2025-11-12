-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('trial', 'paid')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  card_last_four TEXT,
  card_brand TEXT,
  billing_zip TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
ON payment_transactions(user_id);

-- Create index on transaction_id for lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id
ON payment_transactions(transaction_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
ON payment_transactions(status);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
ON payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can manage all payment transactions
CREATE POLICY "Service role can manage payment transactions"
ON payment_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_payment_transactions_updated_at_trigger
BEFORE UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Comments
COMMENT ON TABLE payment_transactions IS 'Tracks payment transactions for native app subscriptions';
COMMENT ON COLUMN payment_transactions.subscription_type IS 'Type of subscription: trial or paid';
COMMENT ON COLUMN payment_transactions.amount IS 'Payment amount in dollars';
COMMENT ON COLUMN payment_transactions.status IS 'Transaction status: pending, completed, failed, or refunded';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Unique transaction identifier from payment processor';
