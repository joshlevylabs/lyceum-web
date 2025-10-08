import { NextResponse } from 'next/server'
import { alertSystem } from '@/lib/centcom-alerts'

/**
 * Get all active CentCom alerts (admin only)
 * GET /api/admin/centcom-alerts
 */
export async function GET() {
  try {
    console.log('🚨 Checking for CentCom alerts...')
    
    const alerts = await alertSystem.getAllAlerts()
    
    console.log(`✅ Found ${alerts.length} active alerts`)
    
    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      counts: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error fetching alerts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}




