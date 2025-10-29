-- Create Organizations and Organization Members Tables
-- Run this BEFORE the FINAL_DEPLOYMENT.sql script

-- ============================================================
-- STEP 1: Create organizations table
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_type TEXT DEFAULT 'lyceum' CHECK (brand_type IN ('lyceum', 'centcom')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_brand_type ON organizations(brand_type);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- ============================================================
-- STEP 2: Create organization_members table
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);

-- ============================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: Create RLS Policies
-- ============================================================

-- Organizations: Users can view organizations they're members of
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Organizations: Service role can do anything (for API)
DROP POLICY IF EXISTS "Service role can manage all organizations" ON organizations;
CREATE POLICY "Service role can manage all organizations" ON organizations
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Organization Members: Users can view memberships they're part of
DROP POLICY IF EXISTS "Users can view their memberships" ON organization_members;
CREATE POLICY "Users can view their memberships" ON organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Organization Members: Service role can do anything (for API)
DROP POLICY IF EXISTS "Service role can manage all memberships" ON organization_members;
CREATE POLICY "Service role can manage all memberships" ON organization_members
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- STEP 5: Create a default organization for existing users
-- ============================================================

-- Create a default Lyceum organization
INSERT INTO organizations (name, brand_type, description)
VALUES ('Default Lyceum Organization', 'lyceum', 'Default organization for all users')
ON CONFLICT DO NOTHING
RETURNING id, name, brand_type;

-- Get the organization ID (you'll need this for the next step)
-- Store it in a variable
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Get or create default organization
  SELECT id INTO default_org_id
  FROM organizations
  WHERE name = 'Default Lyceum Organization'
  LIMIT 1;

  -- If it doesn't exist, create it
  IF default_org_id IS NULL THEN
    INSERT INTO organizations (name, brand_type, description)
    VALUES ('Default Lyceum Organization', 'lyceum', 'Default organization for all users')
    RETURNING id INTO default_org_id;
  END IF;

  -- Add all existing users to the default organization
  INSERT INTO organization_members (organization_id, user_id, role, status)
  SELECT
    default_org_id,
    u.id,
    'member',
    'active'
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = u.id
      AND om.organization_id = default_org_id
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RAISE NOTICE 'Default organization created and all users added: %', default_org_id;
END $$;

-- ============================================================
-- STEP 6: Verify the setup
-- ============================================================

-- Check organizations
SELECT
  id,
  name,
  brand_type,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- Check organization members
SELECT
  o.name as organization_name,
  o.brand_type,
  u.email as user_email,
  om.role,
  om.status
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
JOIN auth.users u ON om.user_id = u.id
ORDER BY o.name, u.email;

-- ============================================================
-- SETUP COMPLETE!
-- ============================================================

-- Summary:
-- ✅ Created organizations table with brand_type column
-- ✅ Created organization_members table for user-org relationships
-- ✅ Set up RLS policies for security
-- ✅ Created default Lyceum organization
-- ✅ Added all existing users to default organization

-- Next step:
-- Run FINAL_DEPLOYMENT.sql to add brand support to application_versions
