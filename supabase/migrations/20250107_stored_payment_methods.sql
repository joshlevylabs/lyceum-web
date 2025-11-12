-- Create stored_payment_methods table
CREATE TABLE IF NOT EXISTS stored_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_last_four TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  billing_zip TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_card UNIQUE (user_id, card_last_four, card_exp_month, card_exp_year)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_stored_payment_methods_user_id
ON stored_payment_methods(user_id);

-- Enable RLS
ALTER TABLE stored_payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment methods
CREATE POLICY "Users can view their own payment methods"
ON stored_payment_methods
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own payment methods
CREATE POLICY "Users can insert their own payment methods"
ON stored_payment_methods
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payment methods
CREATE POLICY "Users can update their own payment methods"
ON stored_payment_methods
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own payment methods
CREATE POLICY "Users can delete their own payment methods"
ON stored_payment_methods
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stored_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_stored_payment_methods_updated_at_trigger
BEFORE UPDATE ON stored_payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_stored_payment_methods_updated_at();

-- Comments
COMMENT ON TABLE stored_payment_methods IS 'Stores user payment methods for reuse (PCI-compliant - no full card numbers)';
COMMENT ON COLUMN stored_payment_methods.card_last_four IS 'Last 4 digits of card number';
COMMENT ON COLUMN stored_payment_methods.card_brand IS 'Card brand (visa, mastercard, amex, discover)';
COMMENT ON COLUMN stored_payment_methods.is_default IS 'Whether this is the default payment method';
