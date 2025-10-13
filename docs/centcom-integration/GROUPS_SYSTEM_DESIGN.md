# Groups/Teams System - Design Document

## Overview
A comprehensive groups system that allows users to organize into teams with role-based access control to resources like test data, projects, sequences, analytics sessions, and assets.

## Core Concepts

### Group
A collection of users with shared access to resources.
- Created by a user (becomes the group owner/admin)
- Has a name, description, and settings
- Can have multiple members with different roles
- Can have access to various resources

### Group Roles
1. **Owner** - Creator of the group, full control
2. **Admin** - Can manage members and resources, cannot delete group
3. **Editor** - Can create/edit resources within group
4. **Viewer** - Read-only access to group resources

### Resources That Can Be Shared
- Test data projects
- Sequences
- Analytics studio sessions
- Assets (files, documents)
- Database clusters (view/manage based on role)
- License keys (view only)

## Database Schema

### Table: `groups`
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly identifier
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}', -- Group-specific settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Limits and quotas
  max_members INTEGER DEFAULT 50,
  current_member_count INTEGER DEFAULT 1,
  
  -- CentCom integration
  centcom_sync_enabled BOOLEAN DEFAULT false,
  centcom_group_id VARCHAR(255), -- For future CentCom sync
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX idx_groups_owner ON groups(owner_id);
CREATE INDEX idx_groups_slug ON groups(slug);
CREATE INDEX idx_groups_active ON groups(is_active);
```

### Table: `group_members`
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Permissions override
  custom_permissions JSONB, -- Can override default role permissions
  
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(role);
```

### Table: `group_invitations`
```sql
CREATE TABLE group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  token VARCHAR(255) UNIQUE NOT NULL, -- For invitation link
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(group_id, email)
);

CREATE INDEX idx_group_invitations_token ON group_invitations(token);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
```

### Table: `group_resource_access`
```sql
CREATE TABLE group_resource_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  resource_type VARCHAR(100) NOT NULL, -- 'cluster', 'session', 'project', 'sequence', 'asset'
  resource_id UUID NOT NULL, -- ID of the resource
  access_level VARCHAR(50) DEFAULT 'viewer' CHECK (access_level IN ('owner', 'admin', 'editor', 'viewer')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(group_id, resource_type, resource_id)
);

CREATE INDEX idx_group_resource_group ON group_resource_access(group_id);
CREATE INDEX idx_group_resource_type ON group_resource_access(resource_type, resource_id);
```

### Table: `group_activity_log`
```sql
CREATE TABLE group_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL, -- 'member_added', 'member_removed', 'role_changed', 'resource_shared', etc.
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_activity_group ON group_activity_log(group_id);
CREATE INDEX idx_group_activity_created ON group_activity_log(created_at);
```

## Permission Matrix

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| View group details | ✅ | ✅ | ✅ | ✅ |
| Edit group settings | ✅ | ✅ | ❌ | ❌ |
| Delete group | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ (not owner/admin) | ❌ | ❌ |
| Share resources | ✅ | ✅ | ✅ | ❌ |
| Edit shared resources | ✅ | ✅ | ✅ | ❌ |
| View shared resources | ✅ | ✅ | ✅ | ✅ |
| Create resources in group | ✅ | ✅ | ✅ | ❌ |

## API Endpoints

### Groups Management
- `POST /api/groups` - Create new group
- `GET /api/groups` - List user's groups
- `GET /api/groups/[id]` - Get group details
- `PATCH /api/groups/[id]` - Update group
- `DELETE /api/groups/[id]` - Delete group

### Members Management
- `GET /api/groups/[id]/members` - List group members
- `POST /api/groups/[id]/members` - Add member to group
- `PATCH /api/groups/[id]/members/[userId]` - Update member role
- `DELETE /api/groups/[id]/members/[userId]` - Remove member

### Invitations
- `POST /api/groups/[id]/invitations` - Send invitation
- `GET /api/groups/invitations/[token]` - Get invitation details
- `POST /api/groups/invitations/[token]/accept` - Accept invitation
- `POST /api/groups/invitations/[token]/decline` - Decline invitation

### Resource Access
- `POST /api/groups/[id]/resources` - Share resource with group
- `GET /api/groups/[id]/resources` - List group resources
- `DELETE /api/groups/[id]/resources/[resourceId]` - Unshare resource
- `PATCH /api/groups/[id]/resources/[resourceId]` - Update access level

### Activity Log
- `GET /api/groups/[id]/activity` - Get group activity log

## UI Components

### 1. Groups Dashboard (`/groups`)
- List of user's groups
- Create new group button
- Group cards showing:
  - Name, description
  - Member count
  - Recent activity
  - Role badge

### 2. Group Details Page (`/groups/[id]`)
Tabs:
- **Overview** - Group info, stats
- **Members** - Member list with roles
- **Resources** - Shared resources
- **Settings** - Group settings (admin only)
- **Activity** - Activity log

### 3. Group Creation Wizard
Steps:
1. Basic info (name, description)
2. Initial members (optional)
3. Settings (visibility, permissions)

### 4. Member Management Interface
- Add member by email
- Role selector
- Member list with:
  - Avatar, name, email
  - Role badge
  - Actions (change role, remove)

### 5. Resource Sharing Interface
- Select resource type
- Search/select resource
- Set access level
- Share button

## Integration Points

### With Existing Systems

#### 1. Clusters
- Add group_id column to unified_clusters
- Check group permissions before cluster operations
- Show clusters in group resources

#### 2. Analytics Sessions
- Add group_id to analytics_sessions
- Group members can view/edit based on role
- Sync session access with group permissions

#### 3. User Settings
- Add "Groups" tab to settings page
- Show user's groups and roles
- Quick actions to manage groups

#### 4. Admin Panel
- Add Groups management to admin panel
- View all groups
- Manage group limits and quotas

### With CentCom (Future)

#### Sync Protocol
```json
{
  "action": "sync_group",
  "group": {
    "id": "uuid",
    "name": "Engineering Team",
    "members": [
      {"email": "user@example.com", "role": "admin"}
    ],
    "resources": [
      {"type": "cluster", "id": "cluster-123", "access": "editor"}
    ]
  }
}
```

#### CentCom Endpoints (Placeholder)
- `POST /api/centcom/groups/sync` - Sync group from CentCom
- `GET /api/centcom/groups/[id]` - Get CentCom group details
- `POST /api/centcom/groups/[id]/push` - Push changes to CentCom

## Security Considerations

1. **Permission Checks**
   - Every API call checks user's role in group
   - Middleware validates permissions before action
   - Resource access validated through group membership

2. **Invitation Security**
   - Tokens are cryptographically secure
   - Invitations expire after 7 days
   - Email verification required

3. **Data Isolation**
   - Users only see groups they're members of
   - Resources only accessible to authorized groups
   - Activity logs track all actions

4. **Rate Limiting**
   - Limit group creation (5 per user)
   - Limit invitations (100 per group per day)
   - Prevent spam/abuse

## Implementation Phases

### Phase 1: Core Groups System ✅ (This implementation)
- Database schema
- Basic CRUD APIs
- Groups management UI
- Member management

### Phase 2: Resource Integration
- Link clusters to groups
- Link sessions to groups
- Permission enforcement in existing APIs

### Phase 3: Advanced Features
- Group templates
- Nested groups/subgroups
- Advanced permissions
- Audit logs

### Phase 4: CentCom Integration
- Sync protocol implementation
- Real-time updates
- Conflict resolution
- Offline support

## Success Metrics

- Number of groups created
- Average group size
- Resource sharing adoption rate
- Invitation acceptance rate
- User satisfaction with permissions

## Future Enhancements

1. **Group Templates** - Pre-configured group structures
2. **Nested Groups** - Subgroups within groups
3. **External Sharing** - Share with non-Lyceum users
4. **SSO Integration** - Auto-add users from SSO groups
5. **Slack/Teams Integration** - Sync with communication tools
6. **Mobile App Support** - Manage groups on mobile
7. **Workspace Hierarchy** - Organizations > Teams > Groups

---

**Version**: 1.0  
**Last Updated**: October 7, 2025  
**Status**: Ready for Implementation


