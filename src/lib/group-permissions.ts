/**
 * Group Permission Enforcement Utilities
 * 
 * Helper functions to check and enforce group permissions
 * throughout the application.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = createClient(supabaseUrl, serviceKey)

export type GroupRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type Permission = 'view' | 'edit' | 'admin' | 'owner'

/**
 * Permission hierarchy
 * owner > admin > editor > viewer
 */
const roleHierarchy: Record<GroupRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1
}

/**
 * Check if a user has a specific permission level in a group
 */
export async function hasGroupPermission(
  userId: string,
  groupId: string,
  requiredPermission: Permission
): Promise<boolean> {
  try {
    // Get user's role in the group
    const { data: membership, error } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('is_active', true)
      .single()

    if (error || !membership) {
      return false
    }

    const userRole = membership.role as GroupRole

    // Check permission based on role hierarchy
    switch (requiredPermission) {
      case 'view':
        return roleHierarchy[userRole] >= roleHierarchy.viewer
      case 'edit':
        return roleHierarchy[userRole] >= roleHierarchy.editor
      case 'admin':
        return roleHierarchy[userRole] >= roleHierarchy.admin
      case 'owner':
        return userRole === 'owner'
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking group permission:', error)
    return false
  }
}

/**
 * Get user's role in a group
 */
export async function getUserGroupRole(
  userId: string,
  groupId: string
): Promise<GroupRole | null> {
  try {
    const { data: membership, error } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('is_active', true)
      .single()

    if (error || !membership) {
      return null
    }

    return membership.role as GroupRole
  } catch (error) {
    console.error('Error getting user group role:', error)
    return null
  }
}

/**
 * Check if user can access a resource through group membership
 */
export async function canAccessGroupResource(
  userId: string,
  resourceType: string,
  resourceId: string,
  requiredAccessLevel: 'viewer' | 'editor' | 'admin' = 'viewer'
): Promise<boolean> {
  try {
    // Find all groups that have access to this resource
    const { data: resourceAccess, error: resourceError } = await supabaseAdmin
      .from('group_resource_access')
      .select('group_id, access_level')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)

    if (resourceError || !resourceAccess || resourceAccess.length === 0) {
      return false
    }

    // Check if user is a member of any of these groups with sufficient permissions
    for (const access of resourceAccess) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('group_members')
        .select('role')
        .eq('user_id', userId)
        .eq('group_id', access.group_id)
        .eq('is_active', true)
        .single()

      if (membershipError || !membership) {
        continue
      }

      // Check if user's role meets the required access level
      const userRoleLevel = roleHierarchy[membership.role as GroupRole] || 0
      const resourceAccessLevel = roleHierarchy[access.access_level as GroupRole] || 0
      const requiredLevel = requiredAccessLevel === 'viewer' ? 1 : requiredAccessLevel === 'editor' ? 2 : 3

      if (userRoleLevel >= requiredLevel && userRoleLevel >= resourceAccessLevel) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error checking resource access:', error)
    return false
  }
}

/**
 * Get all groups user has access to
 */
export async function getUserGroups(userId: string): Promise<any[]> {
  try {
    const { data: memberships, error } = await supabaseAdmin
      .from('group_members')
      .select(`
        group_id,
        role,
        groups (
          id,
          name,
          description,
          slug,
          owner_id
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error || !memberships) {
      return []
    }

    return memberships.map(m => ({
      ...m.groups,
      user_role: m.role
    }))
  } catch (error) {
    console.error('Error getting user groups:', error)
    return []
  }
}

/**
 * Middleware helper to require group permission
 */
export async function requireGroupPermission(
  userId: string,
  groupId: string,
  requiredPermission: Permission
): Promise<{ hasPermission: boolean; role: GroupRole | null; error?: string }> {
  const role = await getUserGroupRole(userId, groupId)
  
  if (!role) {
    return {
      hasPermission: false,
      role: null,
      error: 'User is not a member of this group'
    }
  }

  const hasPermission = await hasGroupPermission(userId, groupId, requiredPermission)
  
  if (!hasPermission) {
    return {
      hasPermission: false,
      role,
      error: `Insufficient permissions. Required: ${requiredPermission}, Current role: ${role}`
    }
  }

  return {
    hasPermission: true,
    role
  }
}

/**
 * Log group activity
 */
export async function logGroupActivity(
  groupId: string,
  userId: string,
  action: string,
  details?: any
): Promise<void> {
  try {
    await supabaseAdmin
      .from('group_activity_log')
      .insert({
        group_id: groupId,
        user_id: userId,
        action,
        details: details || {}
      })
  } catch (error) {
    console.error('Error logging group activity:', error)
    // Don't throw error - logging failures shouldn't break the app
  }
}


