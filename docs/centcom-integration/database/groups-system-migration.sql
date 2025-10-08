-- ============================================
-- Groups/Teams System Database Migration
-- Version: 1.0
-- Date: October 7, 2025
-- ============================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  
  -- Limits and quotas
  max_members INTEGER DEFAULT 50,
  current_member_count INTEGER DEFAULT 1,
  
  -- CentCom integration (future)
  centcom_sync_enabled BOOLEAN DEFAULT false,
  centcom_group_id VARCHAR(255),
  last_synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT groups_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT groups_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT groups_max_members_positive CHECK (max_members > 0)
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_created ON groups(created_at);
CREATE INDEX IF NOT EXISTS idx_groups_centcom ON groups(centcom_group_id) WHERE centcom_group_id IS NOT NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_updated_at_trigger
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_groups_updated_at();

-- ============================================
-- 2. GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Permissions override (JSONB for flexibility)
  custom_permissions JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT group_members_unique_user_group UNIQUE(group_id, user_id),
  CONSTRAINT group_members_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer'))
);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active);

-- Trigger to update member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active THEN
    UPDATE groups SET current_member_count = current_member_count + 1 
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active THEN
    UPDATE groups SET current_member_count = current_member_count - 1 
    WHERE id = OLD.group_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active != OLD.is_active THEN
    IF NEW.is_active THEN
      UPDATE groups SET current_member_count = current_member_count + 1 
      WHERE id = NEW.group_id;
    ELSE
      UPDATE groups SET current_member_count = current_member_count - 1 
      WHERE id = NEW.group_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_members_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

-- ============================================
-- 3. GROUP INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT group_invitations_unique_email_group UNIQUE(group_id, email),
  CONSTRAINT group_invitations_role_check CHECK (role IN ('admin', 'editor', 'viewer')),
  CONSTRAINT group_invitations_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  CONSTRAINT group_invitations_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for group_invitations
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON group_invitations(email);
CREATE INDEX IF NOT EXISTS idx_group_invitations_expires ON group_invitations(expires_at);

-- ============================================
-- 4. GROUP RESOURCE ACCESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_resource_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID NOT NULL,
  access_level VARCHAR(50) DEFAULT 'viewer',
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT group_resource_unique_group_resource UNIQUE(group_id, resource_type, resource_id),
  CONSTRAINT group_resource_type_check CHECK (resource_type IN ('cluster', 'session', 'project', 'sequence', 'asset', 'license', 'workspace')),
  CONSTRAINT group_resource_access_level_check CHECK (access_level IN ('owner', 'admin', 'editor', 'viewer'))
);

-- Indexes for group_resource_access
CREATE INDEX IF NOT EXISTS idx_group_resource_group ON group_resource_access(group_id);
CREATE INDEX IF NOT EXISTS idx_group_resource_type ON group_resource_access(resource_type);
CREATE INDEX IF NOT EXISTS idx_group_resource_type_id ON group_resource_access(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_group_resource_granted ON group_resource_access(granted_at);

-- ============================================
-- 5. GROUP ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT group_activity_action_not_empty CHECK (LENGTH(TRIM(action)) > 0)
);

-- Indexes for group_activity_log
CREATE INDEX IF NOT EXISTS idx_group_activity_group ON group_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_user ON group_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_action ON group_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_group_activity_created ON group_activity_log(created_at);

-- Partition by month for better performance (optional, for large deployments)
-- CREATE TABLE group_activity_log_y2025m10 PARTITION OF group_activity_log
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to check if user has permission in group
CREATE OR REPLACE FUNCTION user_has_group_permission(
  p_user_id UUID,
  p_group_id UUID,
  p_required_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR;
  v_has_permission BOOLEAN := false;
BEGIN
  -- Get user's role in the group
  SELECT role INTO v_user_role
  FROM group_members
  WHERE user_id = p_user_id 
    AND group_id = p_group_id 
    AND is_active = true;
  
  -- If user is not a member, return false
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check permissions based on role hierarchy
  CASE p_required_permission
    WHEN 'view' THEN
      v_has_permission := v_user_role IN ('owner', 'admin', 'editor', 'viewer');
    WHEN 'edit' THEN
      v_has_permission := v_user_role IN ('owner', 'admin', 'editor');
    WHEN 'admin' THEN
      v_has_permission := v_user_role IN ('owner', 'admin');
    WHEN 'owner' THEN
      v_has_permission := v_user_role = 'owner';
    ELSE
      v_has_permission := false;
  END CASE;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user's groups
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name VARCHAR,
  group_slug VARCHAR,
  user_role VARCHAR,
  member_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.slug,
    gm.role,
    g.current_member_count,
    g.created_at
  FROM groups g
  INNER JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = p_user_id 
    AND gm.is_active = true 
    AND g.is_active = true
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to log group activity
CREATE OR REPLACE FUNCTION log_group_activity(
  p_group_id UUID,
  p_user_id UUID,
  p_action VARCHAR,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO group_activity_log (group_id, user_id, action, details)
  VALUES (p_group_id, p_user_id, p_action, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  UPDATE group_invitations
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_resource_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for groups table
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Group owners and admins can update groups"
  ON groups FOR UPDATE
  USING (
    user_has_group_permission(auth.uid(), id, 'admin')
  );

CREATE POLICY "Only group owners can delete groups"
  ON groups FOR DELETE
  USING (owner_id = auth.uid());

-- Policies for group_members table
CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Group admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    user_has_group_permission(auth.uid(), group_id, 'admin')
  );

CREATE POLICY "Group admins can update members"
  ON group_members FOR UPDATE
  USING (
    user_has_group_permission(auth.uid(), group_id, 'admin')
  );

CREATE POLICY "Group admins can remove members"
  ON group_members FOR DELETE
  USING (
    user_has_group_permission(auth.uid(), group_id, 'admin')
  );

-- Policies for group_invitations table
CREATE POLICY "Users can view invitations for their groups"
  ON group_invitations FOR SELECT
  USING (
    user_has_group_permission(auth.uid(), group_id, 'admin')
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Group admins can create invitations"
  ON group_invitations FOR INSERT
  WITH CHECK (
    user_has_group_permission(auth.uid(), group_id, 'admin')
  );

-- Policies for group_resource_access table
CREATE POLICY "Users can view resources of their groups"
  ON group_resource_access FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Group editors can add resources"
  ON group_resource_access FOR INSERT
  WITH CHECK (
    user_has_group_permission(auth.uid(), group_id, 'edit')
  );

-- Policies for group_activity_log table
CREATE POLICY "Users can view activity log of their groups"
  ON group_activity_log FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 8. INITIAL DATA / SEEDS (Optional)
-- ============================================

-- Create a default "Personal" group for existing users (optional)
-- Uncomment if you want to auto-create personal groups
/*
INSERT INTO groups (name, slug, owner_id, description, max_members)
SELECT 
  CONCAT(up.full_name, '''s Personal Workspace'),
  CONCAT('personal-', LOWER(REPLACE(up.full_name, ' ', '-')), '-', SUBSTRING(up.user_id::text, 1, 8)),
  up.user_id,
  'Personal workspace for organizing your resources',
  10
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM groups g WHERE g.owner_id = up.user_id
)
ON CONFLICT (slug) DO NOTHING;

-- Add owners as members
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT id, owner_id, 'owner', NOW()
FROM groups
WHERE owner_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;
*/

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE groups IS 'Main groups/teams table storing group information';
COMMENT ON TABLE group_members IS 'Junction table for group membership with roles';
COMMENT ON TABLE group_invitations IS 'Pending invitations to join groups';
COMMENT ON TABLE group_resource_access IS 'Tracks which resources are shared with groups';
COMMENT ON TABLE group_activity_log IS 'Audit log of all group activities';

COMMENT ON COLUMN groups.slug IS 'URL-friendly unique identifier for the group';
COMMENT ON COLUMN groups.centcom_sync_enabled IS 'Whether this group syncs with CentCom native app';
COMMENT ON COLUMN group_members.custom_permissions IS 'JSON object for role permission overrides';
COMMENT ON COLUMN group_invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN group_resource_access.metadata IS 'Additional resource-specific metadata';

-- ============================================
-- 10. SCHEDULED JOBS (Using pg_cron if available)
-- ============================================

-- Cleanup expired invitations daily
-- Requires pg_cron extension
-- SELECT cron.schedule('cleanup-expired-group-invitations', '0 2 * * *', 'SELECT cleanup_expired_invitations()');

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('groups', 'group_members', 'group_invitations', 'group_resource_access', 'group_activity_log')
ORDER BY table_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Groups system migration completed successfully!';
  RAISE NOTICE 'Created tables: groups, group_members, group_invitations, group_resource_access, group_activity_log';
  RAISE NOTICE 'Created functions: user_has_group_permission, get_user_groups, log_group_activity, cleanup_expired_invitations';
END $$;
