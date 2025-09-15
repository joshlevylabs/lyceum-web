import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force explicit values to avoid environment variable loading issues
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/admin/onboarding/reminders - Get all reminders with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const reminderType = searchParams.get('reminder_type')
    const pending = searchParams.get('pending') === 'true'

    let query = supabase
      .from('onboarding_reminders')
      .select(`
        *,
        user_profiles!user_id (
          id,
          email,
          full_name,
          company
        ),
        onboarding_sessions!session_id (
          id,
          title,
          scheduled_at,
          plugin_id
        ),
        onboarding_progress!progress_id (
          id,
          overall_status,
          onboarding_deadline,
          sessions_completed,
          total_sessions_required
        )
      `)

    if (status) {
      query = query.eq('status', status)
    }

    if (reminderType) {
      query = query.eq('reminder_type', reminderType)
    }

    if (pending) {
      query = query
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
    }

    const { data, error } = await query.order('scheduled_for', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reminders: data })

  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/onboarding/reminders - Create new reminder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      session_id,
      progress_id,
      reminder_type,
      reminder_method = 'email',
      scheduled_for,
      subject,
      message
    } = body

    if (!user_id || !reminder_type || !scheduled_for) {
      return NextResponse.json(
        { error: 'user_id, reminder_type, and scheduled_for are required' },
        { status: 400 }
      )
    }

    const reminderData = {
      user_id,
      session_id: session_id || null,
      progress_id: progress_id || null,
      reminder_type,
      reminder_method,
      scheduled_for: new Date(scheduled_for).toISOString(),
      subject: subject || generateSubject(reminder_type),
      message: message || generateMessage(reminder_type),
      status: 'pending'
    }

    const { data, error } = await supabase
      .from('onboarding_reminders')
      .insert([reminderData])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reminder: data })

  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/onboarding/reminders - Send pending reminders
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reminderId = searchParams.get('id')
    const sendAll = searchParams.get('send_all') === 'true'

    if (reminderId) {
      // Send single reminder
      const result = await sendReminder(reminderId)
      return NextResponse.json({ result })
    } else if (sendAll) {
      // Send all pending reminders
      const results = await sendPendingReminders()
      return NextResponse.json({ results })
    } else {
      return NextResponse.json(
        { error: 'Either id or send_all parameter is required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate default subjects
function generateSubject(reminderType: string): string {
  switch (reminderType) {
    case 'session_scheduled':
      return 'Upcoming Onboarding Session Reminder'
    case 'session_due':
      return 'Onboarding Session Due Soon'
    case 'session_overdue':
      return 'Overdue Onboarding Session - Action Required'
    case 'license_at_risk':
      return 'Trial License - Onboarding Required'
    case 'license_suspended':
      return 'Trial License Suspended - Immediate Action Required'
    default:
      return 'Onboarding Reminder'
  }
}

// Helper function to generate default messages
function generateMessage(reminderType: string): string {
  switch (reminderType) {
    case 'session_scheduled':
      return 'You have an onboarding session scheduled. Please make sure to attend to maintain your trial license active status.'
    case 'session_due':
      return 'Your onboarding session is due soon. Please contact your administrator to schedule if not already done.'
    case 'session_overdue':
      return 'Your onboarding session is overdue. Please contact your administrator immediately to reschedule and maintain your trial license.'
    case 'license_at_risk':
      return 'Your trial license requires completed onboarding sessions to remain active. Please contact your administrator to schedule your sessions.'
    case 'license_suspended':
      return 'Your trial license has been suspended due to incomplete onboarding. Please contact your administrator immediately to reactivate your license.'
    default:
      return 'Please contact your administrator regarding your onboarding requirements.'
  }
}

// Send single reminder
async function sendReminder(reminderId: string) {
  try {
    // Get reminder details
    const { data: reminder, error: fetchError } = await supabase
      .from('onboarding_reminders')
      .select(`
        *,
        user_profiles!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('id', reminderId)
      .single()

    if (fetchError || !reminder) {
      return { success: false, error: 'Reminder not found' }
    }

    if (reminder.status !== 'pending') {
      return { success: false, error: 'Reminder already sent' }
    }

    // Send email (mock implementation - integrate with your email service)
    const emailSent = await sendEmailReminder(reminder)

    if (emailSent) {
      // Update reminder status
      await supabase
        .from('onboarding_reminders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', reminderId)

      return { success: true, message: 'Reminder sent successfully' }
    } else {
      // Mark as failed
      await supabase
        .from('onboarding_reminders')
        .update({ status: 'failed' })
        .eq('id', reminderId)

      return { success: false, error: 'Failed to send reminder' }
    }

  } catch (error) {
    console.error('Error sending reminder:', error)
    return { success: false, error: 'Internal error' }
  }
}

// Send all pending reminders
async function sendPendingReminders() {
  try {
    // Get all pending reminders that are due
    const { data: pendingReminders, error } = await supabase
      .from('onboarding_reminders')
      .select(`
        *,
        user_profiles!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())

    if (error) {
      return { success: false, error: error.message }
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return { success: true, message: 'No pending reminders to send', count: 0 }
    }

    const results = []

    for (const reminder of pendingReminders) {
      const result = await sendReminder(reminder.id)
      results.push({
        reminder_id: reminder.id,
        user_email: reminder.user_profiles?.email,
        ...result
      })
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return {
      success: true,
      message: `Processed ${results.length} reminders: ${successCount} sent, ${failureCount} failed`,
      total: results.length,
      sent: successCount,
      failed: failureCount,
      results
    }

  } catch (error) {
    console.error('Error sending pending reminders:', error)
    return { success: false, error: 'Internal error' }
  }
}

// Mock email sending function - replace with actual email service integration
async function sendEmailReminder(reminder: any): Promise<boolean> {
  try {
    console.log('Sending email reminder:', {
      to: reminder.user_profiles?.email,
      subject: reminder.subject,
      message: reminder.message,
      type: reminder.reminder_type
    })

    // Simulate email sending with random success/failure for demo
    // In production, integrate with your email service (SendGrid, AWS SES, etc.)
    const success = Math.random() > 0.1 // 90% success rate for demo
    
    if (success) {
      console.log(`✅ Email sent successfully to ${reminder.user_profiles?.email}`)
    } else {
      console.log(`❌ Failed to send email to ${reminder.user_profiles?.email}`)
    }

    return success

  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

// POST /api/admin/onboarding/reminders/schedule - Schedule reminders for users
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_ids, reminder_types } = body

    if (!user_ids || !Array.isArray(user_ids) || !reminder_types || !Array.isArray(reminder_types)) {
      return NextResponse.json(
        { error: 'user_ids and reminder_types arrays are required' },
        { status: 400 }
      )
    }

    const results = []

    for (const userId of user_ids) {
      // Get user's onboarding progress
      const { data: progress } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!progress) continue

      for (const reminderType of reminder_types) {
        const scheduledFor = calculateReminderTime(reminderType, progress)
        
        const reminderData = {
          user_id: userId,
          progress_id: progress.id,
          reminder_type: reminderType,
          reminder_method: 'email',
          scheduled_for: scheduledFor,
          subject: generateSubject(reminderType),
          message: generateMessage(reminderType),
          status: 'pending'
        }

        const { data, error } = await supabase
          .from('onboarding_reminders')
          .insert([reminderData])
          .select()

        if (data) {
          results.push({ user_id: userId, reminder_type: reminderType, success: true, reminder: data[0] })
        } else {
          results.push({ user_id: userId, reminder_type: reminderType, success: false, error: error?.message })
        }
      }
    }

    return NextResponse.json({
      message: `Scheduled ${results.filter(r => r.success).length} reminders`,
      results
    })

  } catch (error) {
    console.error('Error scheduling reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Calculate when to send reminder based on type and progress
function calculateReminderTime(reminderType: string, progress: any): string {
  const now = new Date()
  
  switch (reminderType) {
    case 'session_due':
      // 3 days before deadline if no sessions completed
      if (progress.sessions_completed === 0) {
        const deadline = new Date(progress.onboarding_deadline)
        deadline.setDate(deadline.getDate() - 3)
        return deadline.toISOString()
      }
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      
    case 'license_at_risk':
      // 7 days before deadline
      const deadline = new Date(progress.onboarding_deadline)
      deadline.setDate(deadline.getDate() - 7)
      return deadline.toISOString()
      
    case 'session_overdue':
      // If already overdue, send immediately
      if (new Date() > new Date(progress.onboarding_deadline)) {
        return now.toISOString()
      }
      return new Date(progress.onboarding_deadline).toISOString()
      
    default:
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour from now
  }
}
