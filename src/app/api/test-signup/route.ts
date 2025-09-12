import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTU0MTYsImV4cCI6MjA2ODQ3MTQxNn0.5Wzzoat1TsoLLbsqjuoUEKyawJgYmvrMYbJ-uvosdu0'
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    const body = await request.json()
    const { email, password } = body
    
    console.log('Attempting signup with:', { email, password: '***' })
    
    // Test signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    return NextResponse.json({
      success: !error,
      data: data,
      error: error ? {
        message: error.message,
        status: error.status,
        details: error
      } : null,
      timestamp: new Date().toISOString()
    }, { 
      status: error ? 400 : 200 
    })
    
  } catch (error) {
    console.error('Test signup error:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    }, { status: 500 })
  }
}

