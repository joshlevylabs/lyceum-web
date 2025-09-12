import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCentcomLicense } from '@/lib/licenses/centcom'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { plugin_id, user_id, expiration_days = 365, features = [], created_by = 'license_server', role = 'engineer' } = body

    if (!plugin_id) return NextResponse.json({ error: 'plugin_id required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const key_id = randomUUID()
    const expiration = new Date()
    expiration.setDate(expiration.getDate() + Number(expiration_days))

    const signingKey = process.env.CENTCOM_SIGNING_KEY || 'dev-signing-key'
    const license_key = createCentcomLicense({
      key_id,
      plugin_id,
      user_id: user_id || null,
      expiration_iso8601: expiration.toISOString(),
    }, signingKey)

    const { data, error } = await supabase
      .from('licenses')
      .insert([{
        key_id,
        plugin_id,
        user_id: user_id || null,
        license_key,
        features,
        created_by,
        expiration: expiration.toISOString(),
        revoked: false,
        role
      }])
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ license_key, key_id, expires_at: expiration.toISOString(), record: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
