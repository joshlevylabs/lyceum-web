import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get licenses from both tables for comprehensive view
    let allLicenses: any[] = []

    // 1. Get Centcom licenses (primary)
    try {
      const { data: centcomLicenses, error: centcomError } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false })

      if (centcomLicenses) {
        allLicenses = [...allLicenses, ...centcomLicenses]
      }
    } catch (e) {
      console.warn('Could not fetch from licenses table:', e)
    }

    // 2. Get legacy licenses
    try {
      const { data: legacyLicenses, error: legacyError } = await supabase
        .from('license_keys')
        .select('*')
        .order('created_at', { ascending: false })

      if (legacyLicenses) {
        // Transform legacy format to match Centcom format
        const transformedLegacy = legacyLicenses.map(license => ({
          ...license,
          key_id: license.id,
          key_code: license.key_code,
          user_id: license.assigned_to,
          license_type: license.license_type || 'legacy'
        }))
        allLicenses = [...allLicenses, ...transformedLegacy]
      }
    } catch (e) {
      console.warn('Could not fetch from license_keys table:', e)
    }

    // 3. Get user information for assigned licenses
    const userIds = allLicenses
      .map(l => l.user_id)
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index) // unique

    let userMap = new Map()
    
    if (userIds.length > 0) {
      // Get users from auth
      const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const authUserMap = new Map((authUsers?.users || []).map(u => [u.id, u]))
      
      // Get user profiles
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds)

      const profileMap = new Map((profiles || []).map(p => [p.id, p]))

      // Create combined user info
      userIds.forEach(userId => {
        const authUser = authUserMap.get(userId) || authUsers?.users?.find(u => u.email === userId)
        const profile = profileMap.get(userId)
        
        if (authUser || profile) {
          userMap.set(userId, {
            id: authUser?.id || userId,
            email: authUser?.email || userId,
            full_name: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Unknown User'
          })
        }
      })
    }

    // 4. Enhance licenses with user information
    const enhancedLicenses = allLicenses.map(license => ({
      ...license,
      assigned_to: license.user_id ? userMap.get(license.user_id) : null
    }))

    return NextResponse.json({ success: true, licenses: enhancedLicenses })
  } catch (err) {
    console.error('License list error:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
