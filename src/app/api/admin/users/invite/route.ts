import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCentcomLicenseKey } from '@/lib/licenses/centcom'
import { Resend } from 'resend'
import { userInviteTemplate } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      email, 
      full_name, 
      username, 
      company, 
      role = 'engineer',
      send_email = true,
      create_license = false,
      license_type = 'standard',
      license_plugin = 'basic'
    } = body

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    if (!company || !company.trim()) {
      return NextResponse.json({ success: false, error: 'Company is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Generate a temporary password
    const tempPassword = `Lyceum${Math.random().toString(36).slice(-8)}!`

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: !send_email, // Auto-confirm if not sending email
      user_metadata: {
        full_name: full_name || username || email.split('@')[0],
        user_name: username || email.split('@')[0],
        company: company,
        role: role,
        invited_by_admin: true
      }
    })

    if (authError) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create user: ${authError.message}` 
      }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User creation failed - no user ID returned' 
      }, { status: 500 })
    }

    // Create user profile
    const profileData = {
      id: userId,
      email,
      username: username || email.split('@')[0],
      full_name: full_name || username || email.split('@')[0],
      company: company,
      role,
      is_active: true
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert([profileData], { onConflict: 'id' })

    if (profileError) {
      console.warn('Profile creation failed:', profileError)
      // Don't fail the whole process for profile errors
    }

    // Create onboarding record
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert([{ user_id: userId, onboarding_stage: 'pending' }], { onConflict: 'user_id' })

    if (onboardingError) {
      console.warn('Onboarding record creation failed:', onboardingError)
    }

    let licenseInfo = null

    // Create license if requested
    if (create_license) {
      try {
        // Calculate expiration based on license type
        let expirationDate = null
        if (license_type === 'trial') {
          expirationDate = new Date()
          expirationDate.setDate(expirationDate.getDate() + 30) // 30-day trial
        }
        // Standard, professional, enterprise are unlimited (null expiration)

        // Generate Centcom license
        const { license_key, key_id } = generateCentcomLicenseKey(
          license_plugin,
          email, // Use email as user_id for Centcom compatibility
          expirationDate
        )

        // Insert into licenses table
        const { data: licenseData, error: licenseError } = await supabase
          .from('licenses')
          .insert([{
            key_id,
            key_code: license_key,
            user_id: email,
            plugin_id: license_plugin,
            license_type,
            role,
            status: 'active',
            expires_at: expirationDate?.toISOString(),
            created_at: new Date().toISOString(),
            issued_by: 'admin_invite'
          }])
          .select()
          .single()

        if (licenseError) {
          console.error('License creation failed:', licenseError)
          // Don't fail the whole process for license errors
          licenseInfo = { error: licenseError.message }
        } else {
          licenseInfo = licenseData
        }
      } catch (licenseErr: any) {
        console.error('License generation failed:', licenseErr)
        licenseInfo = { error: licenseErr.message }
      }
    }

    // Send invitation email if requested
    let emailInfo = null
    if (send_email) {
      try {
        // Generate invitation link via admin API
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thelyceum.io'}/auth/callback`
          }
        })

        if (linkError || !linkData?.properties?.action_link) {
          console.error('Invitation link generation failed:', linkError)
          emailInfo = { error: linkError?.message || 'Failed to generate invitation link' }
        } else {
          // Send beautiful invitation email via Resend
          const inviteLink = linkData.properties.action_link
          const resend = new Resend(process.env.RESEND_API_KEY!)

          const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Lyceum <noreply@thelyceum.io>',
            to: [email],
            subject: 'You\'re invited to join Lyceum',
            html: userInviteTemplate(inviteLink, 'Your administrator', company)
          })

          if (emailError) {
            console.error('Resend email error:', emailError)
            emailInfo = { error: emailError.message }
          } else {
            console.log('Invitation email sent successfully via Resend:', {
              emailId: emailData?.id,
              to: email
            })
            emailInfo = {
              sent: true,
              message: 'Invitation email sent successfully',
              emailId: emailData?.id
            }
          }
        }
      } catch (emailErr: any) {
        console.error('Invitation email error:', emailErr)
        emailInfo = { error: emailErr.message }
      }
    }

    const response: any = {
      success: true,
      user: authData.user,
      profile: profileData,
      message: 'User created successfully'
    }

    if (licenseInfo) {
      response.license = licenseInfo
    }

    if (emailInfo) {
      response.email = emailInfo
    }

    if (!send_email) {
      response.temp_password = tempPassword
      response.message += `. Temporary password: ${tempPassword}`
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Invite user error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}







