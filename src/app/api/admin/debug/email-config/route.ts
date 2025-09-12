import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get all users to check email confirmation status
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError) {
      return NextResponse.json({
        success: false,
        error: usersError.message
      }, { status: 400 })
    }

    // Check project settings (this might not work with client SDK)
    const diagnostics = {
      timestamp: new Date().toISOString(),
      supabase_url: supabaseUrl,
      environment: {
        site_url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594',
        node_env: process.env.NODE_ENV
      },
      users_summary: {
        total_users: users?.users.length || 0,
        confirmed_users: users?.users.filter(u => u.email_confirmed_at).length || 0,
        unconfirmed_users: users?.users.filter(u => !u.email_confirmed_at).length || 0
      },
      users_detail: users?.users.map(user => ({
        id: user.id,
        email: user.email,
        confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
        providers: user.app_metadata?.providers || []
      })) || [],
      common_issues: {
        development_limitations: "Supabase development tier has email limitations",
        email_confirmation_required: "Users need confirmed emails for password resets",
        smtp_configuration: "Custom SMTP may be required for production",
        rate_limiting: "Supabase has rate limits on emails"
      },
      suggested_solutions: [
        "Check Supabase Dashboard > Authentication > Settings",
        "Verify SMTP configuration in Supabase",
        "Confirm user emails manually in Supabase Dashboard",
        "Check spam folder for emails",
        "Use admin invite method as fallback",
        "Consider custom email service for production"
      ]
    }

    return NextResponse.json({
      success: true,
      diagnostics
    })

  } catch (error: any) {
    console.error('Email config debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { test_email } = body

    if (!test_email) {
      return NextResponse.json({
        success: false,
        error: 'test_email is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, serviceKey)

    console.log('Testing email sending to:', test_email)

    // Test different email methods
    const results = {
      timestamp: new Date().toISOString(),
      test_email,
      methods: {} as any
    }

    // Method 1: Generate Link
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: test_email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`
        }
      })

      results.methods.generateLink = {
        success: !linkError,
        error: linkError?.message,
        link_generated: !!linkData?.properties?.action_link,
        action_link: linkData?.properties?.action_link
      }
    } catch (error: any) {
      results.methods.generateLink = {
        success: false,
        error: error.message
      }
    }

    // Method 2: Reset Password
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(test_email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`
      })

      results.methods.resetPasswordForEmail = {
        success: !resetError,
        error: resetError?.message
      }
    } catch (error: any) {
      results.methods.resetPasswordForEmail = {
        success: false,
        error: error.message
      }
    }

    // Method 3: Admin Invite
    try {
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(test_email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`
      })

      results.methods.adminInvite = {
        success: !inviteError,
        error: inviteError?.message
      }
    } catch (error: any) {
      results.methods.adminInvite = {
        success: false,
        error: error.message
      }
    }

    return NextResponse.json({
      success: true,
      test_results: results
    })

  } catch (error: any) {
    console.error('Email test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
