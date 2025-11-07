import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { validateEmail } from '@/lib/email-validator'

/**
 * Check if an email is disposable/throwaway
 * GET /api/admin/users/check-email?email=test@example.com
 * POST /api/admin/users/check-email with body: { email: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { success, response } = await requireAdmin(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'email parameter is required' }, { status: 400 })
    }

    const validation = validateEmail(email)

    return NextResponse.json({
      success: true,
      email,
      ...validation
    })

  } catch (error: any) {
    console.error('Check email error:', error)
    return NextResponse.json(
      { error: 'Failed to check email', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { success, response } = await requireAdmin(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, emails } = body

    if (!email && !emails) {
      return NextResponse.json({ error: 'email or emails[] is required' }, { status: 400 })
    }

    // Single email check
    if (email) {
      const validation = validateEmail(email)
      return NextResponse.json({
        success: true,
        email,
        ...validation
      })
    }

    // Bulk email check
    if (Array.isArray(emails)) {
      const results = emails.map(e => ({
        email: e,
        ...validateEmail(e)
      }))

      return NextResponse.json({
        success: true,
        results,
        total: results.length,
        disposable_count: results.filter(r => r.isDisposable).length
      })
    }

    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })

  } catch (error: any) {
    console.error('Check email error:', error)
    return NextResponse.json(
      { error: 'Failed to check email', details: error.message },
      { status: 500 }
    )
  }
}
