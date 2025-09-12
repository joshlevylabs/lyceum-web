import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { base64UrlDecode, verifyCentcomLicense } from '@/lib/licenses/centcom'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { license_key, plugin_id, machine_fingerprint, client_version } = body

    if (!license_key || !plugin_id) {
      return NextResponse.json({ status: 'invalid', message: 'license_key and plugin_id required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const signingKey = process.env.CENTCOM_SIGNING_KEY || 'dev-signing-key'

    // 1) Verify key structure + signature
    const verification = verifyCentcomLicense(license_key, signingKey)
    if (!verification.valid) {
      return NextResponse.json({ status: 'invalid', message: verification.reason || 'Invalid license signature' })
    }

    const dataStr = base64UrlDecode(license_key.split('.')[0]).toString('utf8')
    const [key_id, licensePluginId, user_id = '', expiration = ''] = dataStr.split(':')

    if (licensePluginId !== plugin_id) {
      return NextResponse.json({ status: 'invalid', message: 'License not valid for this plugin' })
    }

    // 2) Check database record in `licenses`
    let row: any = null
    {
      const { data } = await supabase
        .from('licenses')
        .select('*')
        .eq('key_id', key_id)
        .maybeSingle()
      row = data
    }
    if (!row) {
      const { data } = await supabase
        .from('licenses')
        .select('*')
        .eq('license_key', license_key)
        .maybeSingle()
      row = data
    }
    if (!row) {
      return NextResponse.json({ status: 'invalid', message: 'License not found' })
    }

    // 3) Check revocation/expiration
    if (row.revoked) {
      return NextResponse.json({ status: 'revoked', message: row.revocation_reason || 'License revoked' })
    }

    const now = new Date()
    const expStr = expiration || row.expiration
    if (expStr) {
      const exp = new Date(expStr)
      if (!isNaN(exp.getTime()) && exp < now) {
        return NextResponse.json({ status: 'expired', message: 'License has expired' })
      }
    }

    // 4) Log validation (optional table procedure)
    try {
      await supabase
        .from('license_validations')
        .insert([{ key_id, machine_fingerprint: machine_fingerprint || null, client_version: client_version || null, validation_result: 'valid' }])
    } catch {}

    // 5) RBAC projection from features/plugins if needed
    const features = row.features || []
    const rbac = buildRolePermissions(row.role || 'engineer', [row.plugin_id].filter(Boolean), features)

    return NextResponse.json({
      status: 'valid',
      message: 'License validation successful',
      license_info: {
        key_id,
        plugin_id,
        user_id: row.user_id || user_id || null,
        features,
        expiration: expStr || null,
        created_at: row.created_at,
        created_by: row.created_by || 'license_server',
        revoked: false,
      },
      server_time: new Date().toISOString(),
      rbac,
    })
  } catch (e: any) {
    return NextResponse.json({ status: 'error', message: e?.message || 'Internal server error' }, { status: 500 })
  }
}

function buildRolePermissions(role: string, plugins: string[] = [], features: string[] = []) {
  const r = (role || 'engineer').toLowerCase()
  const perms = {
    read_basic: true,
    run_measurements: ['operator', 'technician', 'engineer', 'admin', 'super_admin'].includes(r),
    manage_sequences: ['technician', 'engineer', 'admin', 'super_admin'].includes(r),
    configure_devices: ['engineer', 'admin', 'super_admin'].includes(r),
    view_analytics: ['engineer', 'admin', 'super_admin'].includes(r),
    manage_users: ['admin', 'super_admin'].includes(r),
    configure_system: ['super_admin'].includes(r),
    plugin_access: plugins,
    feature_flags: features,
  }
  return perms
}
