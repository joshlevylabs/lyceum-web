-- Create the licenses table that's missing from the database
-- This table is queried by the download API but doesn't exist yet

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL CHECK (license_type IN ('trial', 'standard', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'suspended')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

-- Add RLS policies (Row Level Security)
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Users can view their own licenses
CREATE POLICY "Users can view own licenses"
  ON licenses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all licenses (for API endpoints)
CREATE POLICY "Service role can manage licenses"
  ON licenses
  FOR ALL
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Now insert a license for your user
INSERT INTO licenses (
  user_id,
  license_type,
  status,
  issued_at,
  expires_at,
  metadata
)
VALUES (
  '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  'professional',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  jsonb_build_object(
    'product', 'centcom',
    'features', jsonb_build_array('desktop_app', 'api_access', 'support'),
    'notes', 'Initial license for Centcom desktop application access'
  )
)
ON CONFLICT DO NOTHING
RETURNING *;

-- Verify the license was created
SELECT
  l.id,
  l.user_id,
  l.license_type,
  l.status,
  u.email,
  l.issued_at,
  l.expires_at,
  l.metadata
FROM licenses l
JOIN auth.users u ON l.user_id = u.id
WHERE l.user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
