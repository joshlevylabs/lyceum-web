// CentCom Session Sync Client Example
// This demonstrates how CentCom should implement session synchronization with Lyceum

interface CentComSessionData {
  centcom_session_id: string
  created_at: string
  last_activity: string
  source_ip: string
  user_agent: string
  mfa_verified: boolean
  risk_score: number
  session_status: string
  location: {
    country: string
    city: string
    timezone: string
  }
  device_info: {
    platform: string
    device_type: string
    browser: string
  }
  application_info: {
    app_name: string
    app_version: string
    build_number: string
    license_type: string
  }
}

interface SyncMetadata {
  sync_timestamp: string
  sync_source: string
  sync_version: string
}

export class LyceumSessionSync {
  private lyceumApiUrl: string
  private sessionToken: string
  private userId: string
  private currentSession: CentComSessionData | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private readonly SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

  constructor(lyceumApiUrl: string, sessionToken: string, userId: string) {
    this.lyceumApiUrl = lyceumApiUrl
    this.sessionToken = sessionToken
    this.userId = userId
  }

  /**
   * Start a new CentCom session and begin syncing to Lyceum
   */
  async startSession(sessionData: Partial<CentComSessionData>): Promise<void> {
    try {
      console.log('🔄 Starting CentCom session sync...')

      // Create complete session data
      this.currentSession = {
        centcom_session_id: sessionData.centcom_session_id || this.generateSessionId(),
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        source_ip: sessionData.source_ip || await this.getClientIP(),
        user_agent: sessionData.user_agent || this.getUserAgent(),
        mfa_verified: sessionData.mfa_verified || false,
        risk_score: sessionData.risk_score || this.calculateRiskScore(),
        session_status: 'active',
        location: sessionData.location || await this.getLocationInfo(),
        device_info: sessionData.device_info || this.getDeviceInfo(),
        application_info: {
          app_name: 'CentCom',
          app_version: sessionData.application_info?.app_version || '2.1.0',
          build_number: sessionData.application_info?.build_number || process.env.BUILD_NUMBER || '2024.12.001',
          license_type: sessionData.application_info?.license_type || 'professional'
        }
      }

      // Initial sync to Lyceum
      await this.syncToLyceum()

      // Start periodic syncing
      this.startPeriodicSync()

      console.log('✅ CentCom session sync started successfully')

    } catch (error) {
      console.error('❌ Failed to start session sync:', error)
      throw error
    }
  }

  /**
   * Update session activity (call this on user interactions)
   */
  async updateActivity(): Promise<void> {
    if (!this.currentSession) {
      console.warn('⚠️ No active session to update')
      return
    }

    try {
      this.currentSession.last_activity = new Date().toISOString()
      await this.syncToLyceum()
      console.log('🔄 Session activity updated')
    } catch (error) {
      console.warn('⚠️ Failed to update session activity:', error)
    }
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      console.warn('⚠️ No active session to end')
      return
    }

    try {
      console.log('🔄 Ending CentCom session...')

      // Update session status to terminated
      this.currentSession.session_status = 'terminated'
      this.currentSession.last_activity = new Date().toISOString()

      // Final sync to Lyceum
      await this.syncToLyceum()

      // Stop periodic syncing
      this.stopPeriodicSync()

      // Clear current session
      this.currentSession = null

      console.log('✅ CentCom session ended successfully')

    } catch (error) {
      console.error('❌ Failed to end session:', error)
    }
  }

  /**
   * Sync current session data to Lyceum
   */
  private async syncToLyceum(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to sync')
    }

    const requestBody = {
      session_data: this.currentSession,
      sync_metadata: {
        sync_timestamp: new Date().toISOString(),
        sync_source: 'centcom_session_manager',
        sync_version: '1.0'
      } as SyncMetadata
    }

    try {
      const response = await fetch(`${this.lyceumApiUrl}/api/admin/users/${this.userId}/centcom-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`,
          'X-Client-App': 'CentCom',
          'X-Client-Version': this.currentSession.application_info.app_version,
          'X-Session-Source': 'centcom_app'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Session sync failed: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Session synced to Lyceum:', {
        sessionId: result.session?.id,
        centcomSessionId: result.session?.centcom_session_id,
        status: result.session?.status
      })

    } catch (error) {
      console.error('❌ Session sync failed:', error)
      throw error
    }
  }

  /**
   * Start periodic session syncing
   */
  private startPeriodicSync(): void {
    this.stopPeriodicSync() // Ensure no duplicate intervals

    this.syncInterval = setInterval(async () => {
      try {
        await this.updateActivity()
      } catch (error) {
        console.warn('⚠️ Periodic sync failed:', error)
      }
    }, this.SYNC_INTERVAL)

    console.log(`🔄 Periodic sync started (every ${this.SYNC_INTERVAL / 1000}s)`)
  }

  /**
   * Stop periodic session syncing
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('🛑 Periodic sync stopped')
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    return `centcom-${timestamp}-${randomPart}`
  }

  /**
   * Get client IP address (mock implementation)
   */
  private async getClientIP(): Promise<string> {
    try {
      // In a real implementation, you might use a service to get the external IP
      // For now, return a placeholder
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip || '127.0.0.1'
    } catch (error) {
      console.warn('Failed to get client IP:', error)
      return '127.0.0.1'
    }
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent
    }
    return `CentCom/2.1.0 (${process.platform}; ${process.arch})`
  }

  /**
   * Calculate risk score based on various factors
   */
  private calculateRiskScore(): number {
    let riskScore = 0

    // Add risk factors
    const now = new Date()
    const hour = now.getHours()

    // Higher risk outside business hours (9 AM - 6 PM)
    if (hour < 9 || hour > 18) {
      riskScore += 5
    }

    // Add random variation for demo purposes
    riskScore += Math.floor(Math.random() * 10)

    return Math.min(riskScore, 100)
  }

  /**
   * Get location information (mock implementation)
   */
  private async getLocationInfo(): Promise<{ country: string; city: string; timezone: string }> {
    try {
      // In a real implementation, you might use a geolocation service
      // For now, return system timezone info
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      // Mock location data - in real implementation, get from IP geolocation
      return {
        country: 'United States',
        city: 'New York',
        timezone: timezone
      }
    } catch (error) {
      console.warn('Failed to get location info:', error)
      return {
        country: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC'
      }
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): { platform: string; device_type: string; browser: string } {
    let platform = 'Unknown'
    let deviceType = 'desktop'
    let browser = 'Tauri WebView'

    if (typeof process !== 'undefined') {
      platform = process.platform === 'win32' ? 'Windows' : 
                 process.platform === 'darwin' ? 'macOS' : 
                 process.platform === 'linux' ? 'Linux' : 
                 process.platform
    }

    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase()
      
      if (userAgent.includes('mobile')) {
        deviceType = 'mobile'
      } else if (userAgent.includes('tablet')) {
        deviceType = 'tablet'
      }

      if (userAgent.includes('tauri')) {
        browser = 'Tauri WebView'
      } else if (userAgent.includes('electron')) {
        browser = 'Electron'
      }
    }

    return { platform, device_type: deviceType, browser }
  }

  /**
   * Get current session status
   */
  public getCurrentSession(): CentComSessionData | null {
    return this.currentSession
  }

  /**
   * Check if session is active
   */
  public isSessionActive(): boolean {
    return this.currentSession?.session_status === 'active'
  }
}

// Example usage in CentCom application
export class CentComApp {
  private sessionSync: LyceumSessionSync | null = null

  /**
   * Initialize CentCom with Lyceum session sync
   */
  async initializeWithLyceum(lyceumApiUrl: string, email: string, password: string): Promise<void> {
    try {
      console.log('🔐 Authenticating with Lyceum...')

      // Step 1: Authenticate with Lyceum
      const authResponse = await fetch(`${lyceumApiUrl}/api/centcom/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          app_id: 'centcom',
          client_info: {
            app_name: 'CentCom',
            version: '2.1.0',
            platform: process.platform,
            build_number: process.env.BUILD_NUMBER || '2024.12.001',
            user_agent: `CentCom/2.1.0 (${process.platform})`
          }
        })
      })

      if (!authResponse.ok) {
        throw new Error('Lyceum authentication failed')
      }

      const authData = await authResponse.json()
      if (!authData.success) {
        throw new Error(authData.error || 'Authentication failed')
      }

      console.log('✅ Lyceum authentication successful')

      // Step 2: Initialize session sync
      this.sessionSync = new LyceumSessionSync(
        lyceumApiUrl,
        authData.session.access_token,
        authData.user.id
      )

      // Step 3: Start session tracking
      await this.sessionSync.startSession({
        application_info: {
          app_version: '2.1.0',
          license_type: authData.user.license_type || 'professional'
        }
      })

      // Step 4: Set up activity tracking
      this.setupActivityTracking()

      console.log('✅ CentCom initialized with Lyceum session sync')

    } catch (error) {
      console.error('❌ CentCom initialization failed:', error)
      throw error
    }
  }

  /**
   * Set up activity tracking for session updates
   */
  private setupActivityTracking(): void {
    if (!this.sessionSync) return

    // Update session on user interactions
    const updateActivity = () => {
      this.sessionSync?.updateActivity().catch(err => 
        console.warn('Activity update failed:', err)
      )
    }

    // Track various user interactions
    if (typeof window !== 'undefined') {
      window.addEventListener('click', updateActivity)
      window.addEventListener('keypress', updateActivity)
      window.addEventListener('scroll', updateActivity)
    }

    // Handle app shutdown
    process.on('SIGINT', this.handleShutdown.bind(this))
    process.on('SIGTERM', this.handleShutdown.bind(this))
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleShutdown.bind(this))
    }
  }

  /**
   * Handle application shutdown
   */
  private async handleShutdown(): Promise<void> {
    console.log('🔄 CentCom shutting down...')
    
    if (this.sessionSync) {
      await this.sessionSync.endSession()
    }
    
    console.log('✅ CentCom shutdown complete')
  }

  /**
   * Get current session status
   */
  public getSessionStatus(): { isActive: boolean; session?: CentComSessionData | null } {
    return {
      isActive: this.sessionSync?.isSessionActive() || false,
      session: this.sessionSync?.getCurrentSession()
    }
  }
}

// Usage example
async function main() {
  const app = new CentComApp()
  
  try {
    await app.initializeWithLyceum(
      'https://thelyceum.io',  // or local dev: 'http://localhost:3594'
      'user@example.com',
      'password'
    )
    
    console.log('CentCom is now running with Lyceum session sync!')
    
    // Your CentCom application logic here...
    
  } catch (error) {
    console.error('Failed to start CentCom:', error)
    process.exit(1)
  }
}

// Export for use in CentCom
export { LyceumSessionSync, CentComApp }


