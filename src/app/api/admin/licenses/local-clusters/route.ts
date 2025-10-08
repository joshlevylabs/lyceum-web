import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: licenses, error } = await supabase
      .from('license_keys')
      .select(`
        *,
        user:assigned_to (email),
        usage:local_cluster_usage (storage_used_gb, queries_this_month)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const enriched = licenses?.map(l => ({
      ...l,
      user_email: l.user?.email,
      current_usage: l.usage?.[0]
    }))

    return NextResponse.json({ success: true, licenses: enriched })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
  }
}




