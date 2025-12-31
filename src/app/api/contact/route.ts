import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * Contact form submission endpoint
 * POST /api/contact
 * Body: { name: string, email: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    console.log('Processing contact form submission from:', email)

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY!)

    // Send email to Josh
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Lyceum Contact Form <noreply@thelyceum.io>',
      to: ['josh@thelyceum.io'],
      reply_to: email,
      subject: `[Lyceum Contact] New message from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px;">
            <h1 style="color: #00d4ff; margin: 0 0 8px 0; font-size: 24px;">New Contact Form Submission</h1>
            <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 14px;">From the Lyceum website</p>
          </div>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 18px;">Contact Details</h2>
            <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #00d4ff;">${email}</a></p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
            <h2 style="color: #1a1a2e; margin: 0 0 16px 0; font-size: 18px;">Message</h2>
            <p style="margin: 0; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>

          <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Reply directly to this email to respond to ${name}
            </p>
          </div>
        </body>
        </html>
      `
    })

    if (emailError) {
      console.error('Resend email error:', emailError)
      return NextResponse.json(
        { error: `Failed to send message: ${emailError.message}` },
        { status: 500 }
      )
    }

    console.log('Contact form email sent successfully:', {
      emailId: emailData?.id,
      from: email,
      name: name
    })

    return NextResponse.json({
      success: true,
      emailId: emailData?.id
    })
  } catch (error: any) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
