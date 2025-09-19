import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { key_id, license_id, email, user_id } = body
    const targetKeyId = key_id || license_id
    if (!targetKeyId || (!email && !user_id)) return NextResponse.json({ success: false, error: 'license_id/key_id and email or user_id required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    let targetEmail = email
    if (!targetEmail && user_id) {
      const { data } = await supabase.auth.admin.getUserById(user_id)
      targetEmail = data?.user?.email || null
    }
    if (!targetEmail) return NextResponse.json({ success: false, error: 'target email not found' }, { status: 400 })

    // Get user ID if email was provided
    let targetUserId = user_id
    if (!targetUserId && targetEmail) {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', targetEmail)
        .single()
      
      if (userData) {
        targetUserId = userData.id
      } else {
        console.warn('User not found for email:', targetEmail)
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 400 })
      }
    }

    // Update license_keys table only
    const { data, error } = await supabase
      .from('license_keys')
      .update({ 
        assigned_to: targetUserId,
        assigned_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', targetKeyId)
      .select('*')
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    console.log('License assignment successful:', {
      license_id: targetKeyId,
      user_id: targetUserId,
      assigned_data: data
    })

    return NextResponse.json({ success: true, record: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}
