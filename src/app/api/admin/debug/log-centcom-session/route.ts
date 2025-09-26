import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, user_email } = body

    console.log('Manually logging CentCom session for:', user_id || user_email)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    let resolvedUserId = user_id

    // Get user ID from email if not provided
    if (!resolvedUserId && user_email) {
      const { data: user } = await supabase.auth.admin.listUsers()
      const foundUser = user?.users?.find(u => u.email === user_email)
      if (!foundUser) {
        return NextResponse.json({
          success: false,
          error: 'User not found'
        }, { status: 404 })
      }
      resolvedUserId = foundUser.id
    }

    if (!resolvedUserId) {
      return NextResponse.json({
        success: false,
        error: 'user_id or user_email required'
      }, { status: 400 })
    }

    // Insert into auth_logs
    const { data: authLog, error: authError } = await supabase
      .from('auth_logs')
      .insert({
        user_id: resolvedUserId,
        event_type: 'login',
        app_id: 'centcom',
        client_info: {
          source: 'manual_log',
          version: 'unknown',
          instance_id: 'manual-entry'
        },
        ip_address: 'unknown',
        success: true,
        session_type: 'centcom',
        application_type: 'centcom',
        created_at: new Date().toISOString()
      })
      .select()

    // Insert into user_activity_logs
    const { data: activityLog, error: activityError } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: resolvedUserId,
        activity_type: 'login',
        description: 'Manual CentCom login entry',
        ip_address: 'unknown',
        user_agent: 'CentCom Desktop Application',
        metadata: {
          app_id: 'centcom',
          login_type: 'centcom',
          source: 'manual_log'
        },
        created_at: new Date().toISOString()
      })
      .select()

    return NextResponse.json({
      success: true,
      message: 'CentCom session logged successfully',
      data: {
        auth_log: authLog,
        auth_error: authError?.message,
        activity_log: activityLog,
        activity_error: activityError?.message,
        user_id: resolvedUserId
      }
    })

  } catch (error: any) {
    console.error('Error logging CentCom session:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}





