import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { pluginId } = await request.json()

    if (!pluginId) {
      return NextResponse.json({ error: 'Plugin ID is required' }, { status: 400 })
    }

    // 1. Get plugin details
    const { data: plugin, error: pluginError } = await supabaseAdmin
      .from('plugins')
      .select('*')
      .eq('id', pluginId)
      .single()

    if (pluginError || !plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })
    }

    // 2. Check if plugin offers free trial
    if (!plugin.free_trial_days || plugin.free_trial_days === 0) {
      return NextResponse.json({ error: 'This plugin does not offer a free trial' }, { status: 400 })
    }

    // 3. Check if payment method is required and if user has one
    if (plugin.trial_requires_payment) {
      const { data: hasPayment } = await supabaseAdmin
        .rpc('user_has_payment_method', { p_user_id: user.id })

      if (!hasPayment) {
        return NextResponse.json({
          error: 'Payment method required',
          message: 'Please add a payment method to your account before starting a free trial'
        }, { status: 400 })
      }
    }

    // 4. Check if user already activated a trial for this plugin
    const { data: existingTrials } = await supabaseAdmin
      .from('plugin_licenses')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('plugin_id', pluginId)
      .eq('license_type', 'trial')

    if (existingTrials && existingTrials.length > 0) {
      return NextResponse.json({
        error: 'Trial already used',
        message: 'You have already activated a trial for this plugin'
      }, { status: 400 })
    }

    // 5. Check if user already has an active license
    const { data: activeLicenses } = await supabaseAdmin
      .from('plugin_licenses')
      .select('id, status, expires_at')
      .eq('user_id', user.id)
      .eq('plugin_id', pluginId)
      .eq('status', 'active')

    if (activeLicenses && activeLicenses.length > 0) {
      return NextResponse.json({
        error: 'License already active',
        message: 'You already have an active license for this plugin'
      }, { status: 400 })
    }

    // 6. Calculate expiration date
    const activatedAt = new Date()
    const expiresAt = new Date(activatedAt)
    expiresAt.setDate(expiresAt.getDate() + plugin.free_trial_days)

    // 7. Generate license key using the database function
    const { data: licenseKeyData, error: keyError } = await supabaseAdmin
      .rpc('generate_license_key', { p_plugin_id: pluginId })

    if (keyError || !licenseKeyData) {
      console.error('Error generating license key:', keyError)
      return NextResponse.json({ error: 'Failed to generate license key' }, { status: 500 })
    }

    // 8. Create trial license
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('plugin_licenses')
      .insert({
        user_id: user.id,
        plugin_id: pluginId,
        license_key: licenseKeyData,
        license_type: 'trial',
        status: 'active',
        activated_at: activatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: false
      })
      .select(`
        *,
        plugin:plugins (
          id,
          name,
          slug,
          version,
          icon_url
        )
      `)
      .single()

    if (licenseError) {
      console.error('Error creating trial license:', licenseError)
      return NextResponse.json({ error: 'Failed to create trial license' }, { status: 500 })
    }

    // 9. Increment trial activations count on plugin
    await supabaseAdmin
      .from('plugins')
      .update({
        trial_activations: (plugin.trial_activations || 0) + 1
      })
      .eq('id', pluginId)

    return NextResponse.json({
      success: true,
      license,
      message: `Free trial activated! Your trial expires on ${expiresAt.toLocaleDateString()}`
    })

  } catch (error: any) {
    console.error('Trial activation API error:', error)
    return NextResponse.json(
      { error: 'Failed to activate trial', details: error.message },
      { status: 500 }
    )
  }
}
