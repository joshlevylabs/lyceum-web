import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    console.log('Admin set password request:', { email, has_password: !!password })

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // First, find the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Failed to list users:', listError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to find user: ${listError.message}` 
      }, { status: 400 })
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.log('User not found, creating new user with password:', email)
      
      // Create the user if they don't exist
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: email.split('@')[0],
          user_name: email.split('@')[0],
          company: '',
          role: 'engineer',
          created_by_admin: true
        }
      })

      if (createError) {
        console.error('Failed to create user:', createError)
        return NextResponse.json({ 
          success: false, 
          error: `Failed to create user: ${createError.message}` 
        }, { status: 400 })
      }

      const userId = authData.user?.id
      if (!userId) {
        return NextResponse.json({ 
          success: false, 
          error: 'User creation succeeded but no user ID returned' 
        }, { status: 500 })
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: userId,
          email: email,
          username: email.split('@')[0],
          full_name: email.split('@')[0],
          company: '',
          role: 'engineer',
          is_active: true
        }])

      if (profileError) {
        console.error('Failed to create user profile:', profileError)
        // Don't fail the request for profile error, user auth is more important
      }

      console.log('Successfully created new user with password:', { userId, email })
      
      return NextResponse.json({
        success: true,
        message: `User ${email} created successfully with password`,
        user_id: userId,
        created: true
      })
    }

    // User exists, update their password
    const userId = user.id
    
    console.log('Found existing user, updating password:', { userId, email })

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to update password: ${updateError.message}` 
      }, { status: 400 })
    }

    console.log('Successfully updated password for user:', { userId, email })

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${email}`,
      user_id: userId,
      updated: true
    })

  } catch (error: any) {
    console.error('Admin set password error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    }, { status: 500 })
  }
}
