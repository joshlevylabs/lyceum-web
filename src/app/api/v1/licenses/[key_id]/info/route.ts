import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest, { params }: { params: { key_id: string } }) {
  try {
    const { key_id } = params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('key_id', key_id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'License not found' }, { status: 404 })

    return NextResponse.json({
      license_info: {
        key_id: data.key_id,
        plugin_id: data.plugin_id,
        user_id: data.user_id,
        features: data.features || [],
        created_at: data.created_at,
        expiration: data.expiration,
        status: data.revoked ? 'revoked' : (data.expiration && new Date(data.expiration) < new Date() ? 'expired' : 'active')
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
