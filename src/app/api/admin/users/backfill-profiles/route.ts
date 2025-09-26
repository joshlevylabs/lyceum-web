import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() { return backfill() }
export async function POST() { return backfill() }

async function backfill() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: list, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    const authUsers = list?.users || []
    const userIds = authUsers.map(u => u.id)
    const emails = authUsers.map(u => u.email).filter(Boolean) as string[]

    // Existing profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id')
      .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])

    const existing = new Set((profiles || []).map(p => p.id))

    // Licenses to derive role
    const { data: licenses } = await supabase
      .from('licenses')
      .select('user_id, role')
      .in('user_id', emails.length ? emails : ['__none__'])

    const roleByEmail = new Map<string, string>()
    ;(licenses || []).forEach(l => { if (l.user_id && l.role) roleByEmail.set(l.user_id, l.role) })

    const upserts: any[] = []
    const onboardingUpserts: any[] = []

    for (const u of authUsers) {
      if (existing.has(u.id)) continue
      const email = u.email || ''
      const username = email.split('@')[0] || u.user_metadata?.user_name || ''
      const fullName = u.user_metadata?.full_name || username
      const role = roleByEmail.get(email) || 'engineer'

      upserts.push({ id: u.id, email, username, full_name: fullName, company: '', role, is_active: true })
      onboardingUpserts.push({ user_id: u.id, onboarding_stage: 'pending' })
    }

    let profileResult = null
    if (upserts.length) {
      const { data, error: upErr } = await supabase
        .from('user_profiles')
        .upsert(upserts, { onConflict: 'id' })
        .select('id')
      if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 400 })
      profileResult = data
    }

    if (onboardingUpserts.length) {
      await supabase.from('user_onboarding').upsert(onboardingUpserts, { onConflict: 'user_id' })
    }

    return NextResponse.json({ success: true, created: upserts.length, users_scanned: authUsers.length, profiles: profileResult })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}







