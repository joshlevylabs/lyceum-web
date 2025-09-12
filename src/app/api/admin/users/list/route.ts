import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // 1) List auth users (admin API)
    const { data: authList, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (authErr) return NextResponse.json({ success: false, error: authErr.message }, { status: 400 })
    const authUsers = authList?.users || []
    
    const userIds = authUsers.map(u => u.id)
    const emails = authUsers.map(u => u.email).filter(Boolean) as string[]

    // 2) Profiles (optional)
    let profiles: any[] | null = null
    try {
      const res = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      profiles = res.data || []
    } catch { profiles = [] }

    // 3) Licenses (Centcom model + legacy) - check both user IDs and emails
    let licenses: any[] | null = null
    try {
      // First try Centcom licenses table by user IDs
      const resById = await supabase
        .from('licenses')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      
      // Then try Centcom licenses by emails as fallback
      const resByEmail = await supabase
        .from('licenses')
        .select('*')
        .in('user_id', emails.length ? emails : ['__none__'])
      
      // Also try legacy license_keys table
      let legacyLicenses: any[] = []
      try {
        const searchIds = userIds.concat(emails).filter(Boolean)
        let legacyRes = { data: [] }
        if (searchIds.length > 0) {
          // Use individual queries for each ID (workaround for Supabase .in() issue)
          for (const searchId of searchIds) {
            const singleRes = await supabase
              .from('license_keys')
              .select('*')
              .eq('assigned_to', searchId)
            
            if (singleRes.data && singleRes.data.length > 0) {
              legacyRes.data = [...legacyRes.data, ...singleRes.data]
            }
          }
        }
        legacyLicenses = legacyRes.data || []
      } catch (e) { 
        console.log('Legacy license fetch error:', e)
      }
      
      // Combine results, preferring ID matches
      const byIdResults = resById.data || []
      const byEmailResults = resByEmail.data || []
      
      // Create a map to avoid duplicates, preferring ID matches
      const licenseMap = new Map()
      
      // Add legacy licenses first (lowest priority) - normalize the user_id field
      legacyLicenses.forEach(l => licenseMap.set(l.id, { 
        ...l, 
        key_id: l.id, 
        key_code: l.key_code,
        user_id: l.assigned_to // Map assigned_to to user_id for consistency
      }))
      
      // Add email matches (medium priority)
      byEmailResults.forEach(l => licenseMap.set(l.key_id || l.id, l))
      
      // Add ID matches (highest priority)
      byIdResults.forEach(l => licenseMap.set(l.key_id || l.id, l))
      
      licenses = Array.from(licenseMap.values())
    } catch { licenses = [] }

    // 4) Onboarding (optional)
    let onboarding: any[] | null = null
    try {
      const res = await supabase
        .from('user_onboarding')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      onboarding = res.data || []
    } catch { onboarding = [] }

    // 5) Activity counts (fetch rows and aggregate client-side)
    let projectsRows: any[] | null = null
    try {
      const res = await supabase
        .from('projects')
        .select('created_by')
        .in('created_by', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      projectsRows = res.data || []
    } catch { projectsRows = [] }

    let sessionsRows: any[] | null = null
    try {
      const res = await supabase
        .from('analytics_sessions')
        .select('created_by')
        .in('created_by', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      sessionsRows = res.data || []
    } catch { sessionsRows = [] }

    const profileById = new Map((profiles || []).map(p => [p.id, p]))
    const onboardingByUser = new Map<string, any>()
    ;(onboarding || []).forEach(o => {
      if (!onboardingByUser.has(o.user_id)) onboardingByUser.set(o.user_id, o)
    })
    const licenseByUser = new Map<string, any>()
    ;(licenses || []).forEach(l => {
      // Try to match by user ID first, then by email, then by assigned_to (legacy)
      let userId = authUsers.find(u => u.id === l.user_id || u.email === l.user_id || u.id === l.assigned_to || u.email === l.assigned_to)?.id
      
      
      if (userId) {
        // keep latest by created_at if multiple
        const prev = licenseByUser.get(userId)
        if (!prev) {
          licenseByUser.set(userId, l)
        } else {
          const prevTs = new Date(prev.created_at || 0).getTime()
          const curTs = new Date(l.created_at || 0).getTime()
          licenseByUser.set(userId, curTs >= prevTs ? l : prev)
        }
      }
    })

    const projCountByUser = new Map<string, number>()
    ;(projectsRows || []).forEach(p => projCountByUser.set(p.created_by, (projCountByUser.get(p.created_by) || 0) + 1))
    const sessCountByUser = new Map<string, number>()
    ;(sessionsRows || []).forEach(s => sessCountByUser.set(s.created_by, (sessCountByUser.get(s.created_by) || 0) + 1))

    // 6) Payment status
    let paymentStatuses: any[] | null = null
    try {
      const res = await supabase
        .from('user_payment_status')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      paymentStatuses = res.data || []
    } catch { paymentStatuses = [] }

    // 7) Resource usage
    let resourceUsage: any[] | null = null
    try {
      const res = await supabase
        .from('user_resource_usage')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      resourceUsage = res.data || []
    } catch { resourceUsage = [] }

    // 8) Database clusters
    let dbClusters: any[] | null = null
    try {
      const res = await supabase
        .from('user_database_clusters')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      dbClusters = res.data || []
    } catch { dbClusters = [] }

    // 9) All user licenses (not just primary) - check both user IDs and emails
    let allLicenses: any[] | null = null
    try {
      // First try Centcom licenses by user IDs
      const resById = await supabase
        .from('licenses')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      
      // Then try Centcom licenses by emails as fallback
      const resByEmail = await supabase
        .from('licenses')
        .select('*')
        .in('user_id', emails.length ? emails : ['__none__'])
      
      // Also try legacy license_keys table
      let allLegacyLicenses: any[] = []
      try {
        const searchIds = userIds.concat(emails).filter(Boolean)
        let legacyRes = { data: [] }
        if (searchIds.length > 0) {
          // Use individual queries for each ID
          for (const searchId of searchIds) {
            const singleRes = await supabase
              .from('license_keys')
              .select('*')
              .eq('assigned_to', searchId)
            
            if (singleRes.data && singleRes.data.length > 0) {
              legacyRes.data = [...legacyRes.data, ...singleRes.data]
            }
          }
        }
        allLegacyLicenses = legacyRes.data || []
      } catch (e) { 
        console.log('All legacy license fetch error:', e)
      }
      
      // Combine results, preferring ID matches
      const byIdResults = resById.data || []
      const byEmailResults = resByEmail.data || []
      
      // Create a map to avoid duplicates, preferring ID matches
      const allLicenseMap = new Map()
      
      // Add legacy licenses first (lowest priority) - normalize the user_id field
      allLegacyLicenses.forEach(l => allLicenseMap.set(l.id, { 
        ...l, 
        key_id: l.id, 
        key_code: l.key_code,
        user_id: l.assigned_to // Map assigned_to to user_id for consistency
      }))
      
      // Add email matches (medium priority)
      byEmailResults.forEach(l => allLicenseMap.set(l.key_id || l.id, l))
      
      // Add ID matches (highest priority)
      byIdResults.forEach(l => allLicenseMap.set(l.key_id || l.id, l))
      
      allLicenses = Array.from(allLicenseMap.values())
    } catch { allLicenses = [] }

    // Create maps for quick lookup
    const paymentByUser = new Map<string, any>()
    ;(paymentStatuses || []).forEach(p => paymentByUser.set(p.user_id, p))

    const usageByUser = new Map<string, any>()
    ;(resourceUsage || []).forEach(r => usageByUser.set(r.user_id, r))

    const clustersByUser = new Map<string, any[]>()
    ;(dbClusters || []).forEach(c => {
      if (!clustersByUser.has(c.user_id)) clustersByUser.set(c.user_id, [])
      clustersByUser.get(c.user_id)!.push(c)
    })

    const allLicensesByUser = new Map<string, any[]>()
    ;(allLicenses || []).forEach(l => {
      // Try to match by user ID first, then by email, then by assigned_to (legacy)
      const userId = authUsers.find(u => u.id === l.user_id || u.email === l.user_id || u.id === l.assigned_to || u.email === l.assigned_to)?.id
      
      
      if (userId) {
        if (!allLicensesByUser.has(userId)) allLicensesByUser.set(userId, [])
        allLicensesByUser.get(userId)!.push(l)
      }
    })

    // 10) User subscriptions
    let subscriptions: any[] | null = null
    try {
      const res = await supabase
        .from('user_subscriptions')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      subscriptions = res.data || []
    } catch { subscriptions = [] }

    // 11) Recent invoices (last 5 per user)
    let invoices: any[] | null = null
    try {
      const res = await supabase
        .from('invoices')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })
        .limit(100) // Get recent invoices, we'll group by user
      invoices = res.data || []
    } catch { invoices = [] }

    // 12) Payment methods
    let paymentMethods: any[] | null = null
    try {
      const res = await supabase
        .from('user_payment_methods')
        .select('*')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('is_active', true)
      paymentMethods = res.data || []
    } catch { paymentMethods = [] }

    // Create additional maps
    const subscriptionByUser = new Map<string, any>()
    ;(subscriptions || []).forEach(s => subscriptionByUser.set(s.user_id, s))

    const invoicesByUser = new Map<string, any[]>()
    ;(invoices || []).forEach(inv => {
      if (!invoicesByUser.has(inv.user_id)) invoicesByUser.set(inv.user_id, [])
      invoicesByUser.get(inv.user_id)!.push(inv)
    })

    const paymentMethodsByUser = new Map<string, any[]>()
    ;(paymentMethods || []).forEach(pm => {
      if (!paymentMethodsByUser.has(pm.user_id)) paymentMethodsByUser.set(pm.user_id, [])
      paymentMethodsByUser.get(pm.user_id)!.push(pm)
    })

    const users = authUsers.map(u => {
      const prof = profileById.get(u.id) || {}
      const lic = licenseByUser.get(u.id)
      const onb = onboardingByUser.get(u.id)
      const payment = paymentByUser.get(u.id)
      const usage = usageByUser.get(u.id)
      const clusters = clustersByUser.get(u.id) || []
      const userLicenses = allLicensesByUser.get(u.id) || []
      const subscription = subscriptionByUser.get(u.id)
      const userInvoices = invoicesByUser.get(u.id) || []
      const userPaymentMethods = paymentMethodsByUser.get(u.id) || []

      const status = lic?.revoked ? 'revoked' : (lic?.expiration && new Date(lic.expiration) < new Date() ? 'expired' : 'active')

      return {
        id: u.id,
        email: u.email,
        username: prof.username || '',
        full_name: prof.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || '',
        company: prof.company || '',
        role: lic?.role || prof.role || 'engineer',
        is_active: prof.is_active ?? true,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        license: lic ? {
          id: lic.key_id || lic.id,
          key_code: lic.key_code || lic.license_key,
          license_type: lic.license_type || 'centcom',
          status,
          expires_at: lic.expires_at || lic.expiration
        } : undefined,
        onboarding_status: onb ? (onb.onboarding_stage === 'completed' ? 'completed' : 'pending') : undefined,
        projects_count: projCountByUser.get(u.id) || 0,
        sessions_count: sessCountByUser.get(u.id) || 0,
        
        // Enhanced data
        payment_status: payment ? {
          status: payment.payment_status,
          subscription_type: payment.subscription_type,
          monthly_amount: payment.monthly_amount,
          currency: payment.currency,
          next_billing_date: payment.next_billing_date,
          last_payment_date: payment.last_payment_date,
          payment_failures: payment.payment_failures || 0
        } : undefined,
        
        resource_usage: usage ? {
          database_clusters_count: clusters.length,
          storage_used_mb: usage.storage_used_mb || 0,
          storage_limit_mb: usage.storage_limit_mb || 1024,
          bandwidth_used_mb: usage.bandwidth_used_mb || 0,
          bandwidth_limit_mb: usage.bandwidth_limit_mb || 10240,
          api_calls_count: usage.api_calls_count || 0,
          api_calls_limit: usage.api_calls_limit || 10000,
          compute_hours_used: usage.compute_hours_used || 0,
          compute_hours_limit: usage.compute_hours_limit || 100
        } : {
          database_clusters_count: clusters.length,
          storage_used_mb: 0,
          storage_limit_mb: 1024,
          bandwidth_used_mb: 0,
          bandwidth_limit_mb: 10240,
          api_calls_count: 0,
          api_calls_limit: 10000,
          compute_hours_used: 0,
          compute_hours_limit: 100
        },
        
        database_clusters: clusters.map(c => ({
          id: c.id,
          cluster_name: c.cluster_name,
          cluster_type: c.cluster_type,
          status: c.status,
          region: c.region,
          storage_size_mb: c.storage_size_mb,
          last_accessed: c.last_accessed
        })),
        
        all_licenses: userLicenses.map(l => ({
          id: l.key_id || l.id,
          key_code: l.key_code || l.license_key,
          license_type: l.license_type || 'centcom',
          plugin_id: l.plugin_id,
          status: l.revoked ? 'revoked' : (l.expires_at && new Date(l.expires_at) < new Date() ? 'expired' : 'active'),
          expires_at: l.expires_at || l.expiration,
          assigned_at: l.assigned_at || l.created_at
        })),

        // Subscription data
        subscription: subscription ? {
          id: subscription.id,
          plan_name: subscription.custom_plan_name || 'Unknown',
          status: subscription.status,
          billing_cycle: subscription.billing_cycle,
          monthly_amount: subscription.monthly_amount,
          currency: subscription.currency,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end
        } : undefined,

        // Invoice data (recent)
        invoices: userInvoices.slice(0, 5).map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          status: inv.status,
          total_amount: inv.total_amount,
          currency: inv.currency,
          due_date: inv.due_date,
          paid_date: inv.paid_date
        })),

        // Payment methods
        payment_methods: userPaymentMethods.map(pm => ({
          id: pm.id,
          payment_type: pm.payment_type,
          last_four_digits: pm.last_four_digits,
          card_brand: pm.card_brand,
          is_default: pm.is_default,
          is_active: pm.is_active
        }))
      }
    })

    return NextResponse.json({ success: true, users })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}
