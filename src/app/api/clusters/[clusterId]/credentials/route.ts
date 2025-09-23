import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

// GET /api/clusters/[clusterId]/credentials - Get cluster connection credentials
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params
    const url = new URL(request.url)
    const includePasswords = url.searchParams.get('include_passwords') === 'true'

    // Get cluster and check access
    const { data: cluster, error: accessError } = await dbOperations.getClusterById(clusterId, user.id)
    if (accessError || !cluster) {
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 })
    }

    if (cluster.status !== 'active') {
      return NextResponse.json({ 
        error: 'Cluster is not active',
        status: cluster.status 
      }, { status: 400 })
    }

    // Get user's role to determine access level
    const userAccess = cluster.cluster_team_access?.find((access: any) => access.user_id === user.id)
    const userRole = userAccess?.role || (cluster.created_by === user.id ? 'admin' : null)

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Base endpoints
    const endpoints = {
      http: `https://${cluster.clickhouse_cluster_id}.lyceum.com:8443`,
      native: `clickhouse://${cluster.clickhouse_cluster_id}.lyceum.com:9000`,
      mysql: `mysql://${cluster.clickhouse_cluster_id}.lyceum.com:9004`
    }

    // Base response
    const response: any = {
      success: true,
      cluster_id: cluster.id,
      cluster_name: cluster.name,
      connection_string: cluster.connection_string,
      endpoints,
      user_role: userRole
    }

    // Provide appropriate credentials based on role
    if (userRole === 'admin' || userRole === 'editor') {
      // Admin and editor get read-write access
      response.credentials = {
        username: cluster.admin_username,
        readonly_username: cluster.readonly_username
      }
      
      // Only include passwords if explicitly requested and user has admin role
      if (includePasswords && userRole === 'admin') {
        // In a real implementation, you'd decrypt the stored password hashes
        // For now, we'll generate temporary credentials
        response.credentials.password = '[Use API to generate temporary password]'
        response.credentials.readonly_password = '[Use API to generate temporary password]'
        response.warning = 'Password generation endpoint should be used for security'
      }
    } else {
      // Analyst and viewer get read-only access
      response.credentials = {
        username: cluster.readonly_username
      }
      
      if (includePasswords && (userRole === 'analyst' || userRole === 'viewer')) {
        response.credentials.password = '[Use API to generate temporary password]'
        response.warning = 'Password generation endpoint should be used for security'
      }
    }

    // Add connection examples
    response.examples = {
      clickhouse_client: {
        http: `curl "${endpoints.http}/" --user "${response.credentials.username}:[PASSWORD]" --data "SELECT 1"`,
        python: `
import clickhouse_connect

client = clickhouse_connect.get_client(
    host='${cluster.clickhouse_cluster_id}.lyceum.com',
    port=8443,
    username='${response.credentials.username}',
    password='[PASSWORD]',
    secure=True
)

result = client.query('SELECT 1')
print(result.result_rows)
        `.trim()
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/clusters/[clusterId]/credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clusters/[clusterId]/credentials/generate - Generate temporary credentials
export async function POST(
  request: NextRequest,
  { params }: { params: { clusterId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId } = params
    const body = await request.json()
    const { access_type = 'readonly', duration_hours = 24 } = body

    // Validate duration (max 7 days)
    if (duration_hours > 168) {
      return NextResponse.json({ 
        error: 'Maximum credential duration is 168 hours (7 days)' 
      }, { status: 400 })
    }

    // Check permissions based on requested access type
    const requiredPermission = access_type === 'readwrite' ? 'data_write' : 'data_read'
    const { data: hasAccess } = await supabase
      .rpc('check_cluster_permission', {
        user_uuid: user.id,
        cluster_uuid: clusterId,
        required_permission: requiredPermission
      })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get cluster info
    const { data: cluster, error } = await supabase
      .from('database_clusters')
      .select('clickhouse_cluster_id, status')
      .eq('id', clusterId)
      .single()

    if (error || !cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }

    if (cluster.status !== 'active') {
      return NextResponse.json({ 
        error: 'Cluster is not active',
        status: cluster.status 
      }, { status: 400 })
    }

    // Generate temporary credentials
    const crypto = require('node:crypto')
    const tempUsername = `temp_${user.id.slice(0, 8)}_${Date.now()}`
    const tempPassword = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000)

    // Store temporary credential record
    const { data: token, error: tokenError } = await supabase
      .from('cluster_access_tokens')
      .insert({
        cluster_id: clusterId,
        user_id: user.id,
        token_hash: crypto.createHash('sha256').update(tempPassword).digest('hex'),
        token_name: `Temporary ${access_type} access`,
        permissions: { access_type, generated_at: new Date().toISOString() },
        expires_at: expiresAt.toISOString(),
        created_by_ip: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })
      .select()
      .single()

    if (tokenError) {
      console.error('Error creating access token:', tokenError)
      return NextResponse.json({ error: 'Failed to generate credentials' }, { status: 500 })
    }

    // TODO: Create temporary user in ClickHouse cluster
    // await createTemporaryClickHouseUser(cluster.clickhouse_cluster_id, tempUsername, tempPassword, access_type, expiresAt)

    return NextResponse.json({
      success: true,
      credentials: {
        username: tempUsername,
        password: tempPassword,
        access_type,
        expires_at: expiresAt.toISOString(),
        duration_hours
      },
      connection_info: {
        host: `${cluster.clickhouse_cluster_id}.lyceum.com`,
        port: 8443,
        secure: true,
        database: 'default'
      },
      warning: 'Store these credentials securely. They cannot be retrieved again.',
      token_id: token.id
    })

  } catch (error) {
    console.error('Error in POST /api/clusters/[clusterId]/credentials/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clusters/[clusterId]/credentials/[tokenId] - Revoke temporary credentials
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clusterId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId } = params
    const url = new URL(request.url)
    const tokenId = url.searchParams.get('tokenId')

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID required' }, { status: 400 })
    }

    // Check if user owns this token or has admin access
    const { data: token } = await supabase
      .from('cluster_access_tokens')
      .select('user_id, revoked_at')
      .eq('id', tokenId)
      .eq('cluster_id', clusterId)
      .single()

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    // Check permissions - user can revoke their own tokens, or admins can revoke any
    const canRevoke = token.user_id === user.id
    
    if (!canRevoke) {
      const { data: hasAdmin } = await supabase
        .rpc('check_cluster_permission', {
          user_uuid: user.id,
          cluster_uuid: clusterId,
          required_permission: 'user_management'
        })
      
      if (!hasAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    if (token.revoked_at) {
      return NextResponse.json({ error: 'Token already revoked' }, { status: 400 })
    }

    // Revoke token
    const { error } = await supabase
      .from('cluster_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId)

    if (error) {
      console.error('Error revoking token:', error)
      return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
    }

    // TODO: Remove user from ClickHouse cluster
    // await removeTemporaryClickHouseUser(clusterId, tokenId)

    return NextResponse.json({
      success: true,
      message: 'Credentials revoked successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/clusters/[clusterId]/credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
