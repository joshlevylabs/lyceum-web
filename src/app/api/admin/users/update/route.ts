import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, email, full_name, username, company, is_active, role } = body
    if (!user_id && !email) return NextResponse.json({ success: false, error: 'user_id or email required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    let resolvedEmail = email as string | null

    // Resolve email if only user_id provided
    if (!resolvedEmail && user_id) {
      const { data, error } = await supabase.auth.admin.getUserById(user_id)
      if (error) return NextResponse.json({ success: false, error: `admin.getUserById failed: ${error.message}` }, { status: 400 })
      resolvedEmail = data?.user?.email || null
      if (!resolvedEmail) return NextResponse.json({ success: false, error: 'Email not found for user_id' }, { status: 400 })
    }

    // Upsert profile row
    const upsertData: any = { id: user_id, email: resolvedEmail }
    if (full_name !== undefined) upsertData.full_name = full_name
    if (username !== undefined) upsertData.username = username
    if (company !== undefined) upsertData.company = company
    if (is_active !== undefined) upsertData.is_active = is_active
    if (role !== undefined) upsertData.role = role

    const { data: profile, error: upsertError } = await supabase
      .from('user_profiles')
      .upsert([upsertData], { onConflict: 'id' })
      .select('*')
      .single()

    if (upsertError) return NextResponse.json({ success: false, error: upsertError.message, code: upsertError.code }, { status: 400 })

    return NextResponse.json({ success: true, profile })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}
