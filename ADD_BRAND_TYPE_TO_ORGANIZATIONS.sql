-- Add brand_type column to organizations table
-- This enables organization-based brand assignment

-- Add brand_type column with default 'lyceum'
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'lyceum'
CHECK (brand_type IN ('lyceum', 'centcom'));

-- Create index for performance on brand queries
CREATE INDEX IF NOT EXISTS idx_organizations_brand_type
ON organizations(brand_type);

-- Set default for all existing organizations
UPDATE organizations
SET brand_type = 'lyceum'
WHERE brand_type IS NULL;

-- Verify the update
SELECT
  id,
  name,
  brand_type,
  created_at
FROM organizations
ORDER BY name;

-- Expected: All organizations should now have brand_type = 'lyceum'
