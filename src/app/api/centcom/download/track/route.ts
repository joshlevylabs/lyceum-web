import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { download_id, status, error_message } = body

    if (!download_id) {
      return NextResponse.json({
        success: false,
        error: 'Download ID is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Update download record
    const { error } = await supabase
      .from('application_downloads')
      .update({
        download_completed_at: new Date().toISOString(),
        was_successful: status === 'success',
        error_message: error_message || null
      })
      .eq('id', download_id)

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update download record'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Download tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
