/**
 * CentCom Alert System
 * Monitors usage, offline status, and connection health
 */

import { createClient } from '@supabase/supabase-js'

export interface Alert {
  id: string
  type: 'usage_warning' | 'offline' | 'grace_period' | 'connection_error' | 'system_health'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  user_id?: string
  user_email?: string
  metadata?: any
  created_at: string
}

export class CentComAlertSystem {
  private supabase: any

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    this.supabase = createClient(supabaseUrl, serviceKey)
  }

  /**
   * Check for users approaching usage limits
   */
  async checkUsageLimits(): Promise<Alert[]> {
    const alerts: Alert[] = []

    try {
      const { data: usage } = await this.supabase
        .from('local_cluster_usage')
        .select(`
          *,
          user:user_id (email),
          license:license_id (license_type, local_cluster_limits)
        `)

      usage?.forEach((u: any) => {
        const limits = u.license?.local_cluster_limits || {}
        const storagePercent = limits.max_storage_gb ? (u.storage_used_gb / limits.max_storage_gb) * 100 : 0
        const queryPercent = limits.max_monthly_queries ? (u.queries_this_month / limits.max_monthly_queries) * 100 : 0

        // Critical: > 95%
        if (storagePercent >= 95 || queryPercent >= 95) {
          alerts.push({
            id: `usage-critical-${u.user_id}`,
            type: 'usage_warning',
            severity: 'critical',
            title: 'Critical: Usage Limit Exceeded',
            message: `User ${u.user?.email} has exceeded 95% of their ${storagePercent >= 95 ? 'storage' : 'query'} limit`,
            user_id: u.user_id,
            user_email: u.user?.email,
            metadata: { storagePercent, queryPercent },
            created_at: new Date().toISOString()
          })
        }
        // Warning: 80-95%
        else if (storagePercent >= 80 || queryPercent >= 80) {
          alerts.push({
            id: `usage-warning-${u.user_id}`,
            type: 'usage_warning',
            severity: 'warning',
            title: 'Warning: Approaching Usage Limit',
            message: `User ${u.user?.email} is at ${Math.max(storagePercent, queryPercent).toFixed(1)}% of their limits`,
            user_id: u.user_id,
            user_email: u.user?.email,
            metadata: { storagePercent, queryPercent },
            created_at: new Date().toISOString()
          })
        }
      })
    } catch (error) {
      console.error('Error checking usage limits:', error)
    }

    return alerts
  }

  /**
   * Check for offline clusters
   */
  async checkOfflineClusters(): Promise<Alert[]> {
    const alerts: Alert[] = []

    try {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const { data: offline } = await this.supabase
        .from('local_cluster_usage')
        .select(`
          *,
          user:user_id (email),
          license:license_id (local_cluster_limits)
        `)
        .lt('last_heartbeat_at', oneDayAgo.toISOString())

      offline?.forEach((cluster: any) => {
        const hoursOffline = (now.getTime() - new Date(cluster.last_heartbeat_at).getTime()) / (1000 * 60 * 60)
        const graceDays = cluster.license?.local_cluster_limits?.offline_grace_days || 30
        const graceDaysRemaining = graceDays - (hoursOffline / 24)

        // Grace period expired
        if (graceDaysRemaining <= 0) {
          alerts.push({
            id: `offline-expired-${cluster.user_id}`,
            type: 'grace_period',
            severity: 'critical',
            title: 'Grace Period Expired',
            message: `User ${cluster.user?.email}'s local cluster grace period has expired`,
            user_id: cluster.user_id,
            user_email: cluster.user?.email,
            metadata: { hoursOffline, graceDays },
            created_at: new Date().toISOString()
          })
        }
        // Grace period ending soon (< 7 days)
        else if (graceDaysRemaining <= 7) {
          alerts.push({
            id: `offline-grace-${cluster.user_id}`,
            type: 'grace_period',
            severity: 'warning',
            title: 'Grace Period Ending Soon',
            message: `User ${cluster.user?.email}'s cluster has ${graceDaysRemaining.toFixed(1)} days remaining in grace period`,
            user_id: cluster.user_id,
            user_email: cluster.user?.email,
            metadata: { hoursOffline, graceDaysRemaining },
            created_at: new Date().toISOString()
          })
        }
        // Recently offline (> 24 hours)
        else if (hoursOffline >= 24) {
          alerts.push({
            id: `offline-${cluster.user_id}`,
            type: 'offline',
            severity: 'info',
            title: 'Cluster Offline',
            message: `User ${cluster.user?.email}'s cluster has been offline for ${(hoursOffline / 24).toFixed(1)} days`,
            user_id: cluster.user_id,
            user_email: cluster.user?.email,
            metadata: { hoursOffline },
            created_at: new Date().toISOString()
          })
        }
      })
    } catch (error) {
      console.error('Error checking offline clusters:', error)
    }

    return alerts
  }

  /**
   * Get all active alerts
   */
  async getAllAlerts(): Promise<Alert[]> {
    const [usageAlerts, offlineAlerts] = await Promise.all([
      this.checkUsageLimits(),
      this.checkOfflineClusters()
    ])

    return [...usageAlerts, ...offlineAlerts].sort((a, b) => {
      // Sort by severity: critical > warning > info
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }

  /**
   * Format alert for email/notification
   */
  formatAlert(alert: Alert): string {
    const emoji = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    }

    return `
${emoji[alert.severity]} ${alert.title}

${alert.message}

User: ${alert.user_email || 'Unknown'}
Time: ${new Date(alert.created_at).toLocaleString()}
Severity: ${alert.severity.toUpperCase()}
    `.trim()
  }
}

// Singleton instance
export const alertSystem = new CentComAlertSystem()




