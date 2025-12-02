/**
 * Web Session Sync Service
 *
 * Tracks web browser sessions and sends heartbeats to Lyceum backend
 * Similar to desktop session tracking, but for web browsers
 */

interface SessionData {
  session_id: string
  user_id: string
  session_type: 'web'
  device_name: string
  location: string
  license_type: string
  mfa_verified: boolean
  browser: string
  os: string
  platform: string
  version: string
  build: string
  user_agent: string
  timestamp: string
  instance_id: string
  ip_address?: string
  session_metadata: {
    status: 'active' | 'idle'
    created_at: string
    last_activity: string
    sync_source: string
    sync_version: string
  }
}

export class WebSessionSync {
  private sessionId: string
  private userId: string
  private apiUrl: string
  private sessionToken?: string
  private licenseType: string
  private mfaVerified: boolean

  private isRunning = false
  private activeInterval?: NodeJS.Timeout
  private idleInterval?: NodeJS.Timeout
  private lastActivityTime: number = Date.now()
  private instanceId: string

  // Timing constants
  private readonly IDLE_THRESHOLD = 5 * 60 * 1000 // 5 minutes
  private readonly ACTIVE_UPDATE_INTERVAL = 60 * 1000 // 60 seconds
  private readonly IDLE_UPDATE_INTERVAL = 10 * 60 * 1000 // 10 minutes

  constructor(
    sessionId: string,
    userId: string,
    apiUrl: string = 'http://localhost:3594/api',
    sessionToken?: string,
    licenseType: string = 'enterprise',
    mfaVerified: boolean = false
  ) {
    this.sessionId = sessionId
    this.userId = userId
    this.apiUrl = apiUrl
    this.sessionToken = sessionToken
    this.licenseType = licenseType
    this.mfaVerified = mfaVerified

    // Get or create instance ID
    this.instanceId = this.getOrCreateInstanceId()

    console.log('WebSessionSync initialized', {
      userId,
      sessionId: sessionId.substring(0, 20) + '...',
      licenseType
    })
  }

  /**
   * Start session tracking
   */
  public async startSync(): Promise<void> {
    if (this.isRunning) {
      console.warn('WebSessionSync already running')
      return
    }

    this.isRunning = true
    console.log('Starting web session sync...')

    // Send initial heartbeat
    await this.sendHeartbeat('active')

    // Set up activity listeners
    this.setupActivityListeners()

    // Start active interval
    this.startActiveInterval()
  }

  /**
   * Stop session tracking
   */
  public async stopSync(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('Stopping web session sync...')
    this.isRunning = false

    // Clear intervals
    if (this.activeInterval) {
      clearInterval(this.activeInterval)
      this.activeInterval = undefined
    }
    if (this.idleInterval) {
      clearInterval(this.idleInterval)
      this.idleInterval = undefined
    }

    // Remove activity listeners
    this.removeActivityListeners()

    // Send final terminated heartbeat
    await this.sendHeartbeat('active')
  }

  /**
   * Set up activity detection listeners
   */
  private setupActivityListeners(): void {
    // Listen for user activity events
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']

    activityEvents.forEach(event => {
      window.addEventListener(event, this.handleActivity, { passive: true })
    })
  }

  /**
   * Remove activity listeners
   */
  private removeActivityListeners(): void {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']

    activityEvents.forEach(event => {
      window.removeEventListener(event, this.handleActivity)
    })
  }

  /**
   * Handle user activity
   */
  private handleActivity = (): void => {
    const now = Date.now()
    const timeSinceLastActivity = now - this.lastActivityTime

    // If was idle, switch to active
    if (timeSinceLastActivity > this.IDLE_THRESHOLD && this.idleInterval) {
      console.log('User became active, switching to active heartbeat')
      this.switchToActive()
    }

    this.lastActivityTime = now
  }

  /**
   * Check if user is idle
   */
  private isIdle(): boolean {
    return Date.now() - this.lastActivityTime > this.IDLE_THRESHOLD
  }

  /**
   * Start active interval
   */
  private startActiveInterval(): void {
    // Clear any existing intervals
    if (this.idleInterval) {
      clearInterval(this.idleInterval)
      this.idleInterval = undefined
    }

    // Set up active interval
    this.activeInterval = setInterval(async () => {
      if (this.isIdle()) {
        console.log('User idle, switching to idle heartbeat')
        this.switchToIdle()
      } else {
        await this.sendHeartbeat('active')
      }
    }, this.ACTIVE_UPDATE_INTERVAL)
  }

  /**
   * Start idle interval
   */
  private startIdleInterval(): void {
    // Clear any existing intervals
    if (this.activeInterval) {
      clearInterval(this.activeInterval)
      this.activeInterval = undefined
    }

    // Set up idle interval
    this.idleInterval = setInterval(async () => {
      await this.sendHeartbeat('idle')
    }, this.IDLE_UPDATE_INTERVAL)
  }

  /**
   * Switch to active mode
   */
  private switchToActive(): void {
    this.startActiveInterval()
    this.sendHeartbeat('active')
  }

  /**
   * Switch to idle mode
   */
  private switchToIdle(): void {
    this.startIdleInterval()
    this.sendHeartbeat('idle')
  }

  /**
   * Send heartbeat to backend
   */
  private async sendHeartbeat(status: 'active' | 'idle'): Promise<void> {
    try {
      const payload = await this.buildPayload(status)
      const token = this.sessionToken || this.sessionId

      console.log('🔄 Sending web session heartbeat:', {
        url: `${this.apiUrl}/centcom/auth/session-update`,
        status,
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPreview: token?.substring(0, 20) + '...'
      })

      const response = await fetch(`${this.apiUrl}/centcom/auth/session-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      console.log('📡 Web session heartbeat response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Web session heartbeat sent successfully', data)
      } else if (response.status === 403) {
        const errorData = await response.json()
        if (errorData.error === 'session_revoked') {
          console.warn('🚨 Web session revoked by backend')
          // Session revoked, stop sync and trigger logout
          await this.stopSync()
          // Trigger logout (handled by parent)
          window.dispatchEvent(new CustomEvent('session-revoked'))
        }
      } else if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Web session heartbeat unauthorized:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
      } else if (response.status === 404) {
        // Silently handle 404 - endpoint might not be available in development
        console.warn('⚠️ Web session heartbeat endpoint not found (this is non-critical)')
      } else {
        console.error('Web session heartbeat failed:', response.statusText)
      }
    } catch (error) {
      console.error('Error sending web session heartbeat:', error)
    }
  }

  /**
   * Build heartbeat payload
   */
  private async buildPayload(status: 'active' | 'idle'): Promise<SessionData> {
    const now = new Date().toISOString()

    return {
      session_id: this.sessionId,
      user_id: this.userId,
      session_type: 'web',
      device_name: this.getDeviceName(),
      location: this.getLocation(),
      license_type: this.licenseType,
      mfa_verified: this.mfaVerified,
      browser: this.getBrowser(),
      os: this.getOS(),
      platform: this.getPlatform(),
      version: this.getAppVersion(),
      build: this.getBuildNumber(),
      user_agent: navigator.userAgent,
      timestamp: now,
      instance_id: this.instanceId,
      session_metadata: {
        status,
        created_at: this.getSessionStartTime(),
        last_activity: now,
        sync_source: `web_${status}_heartbeat`,
        sync_version: '1.0_web'
      }
    }
  }

  /**
   * Get or create instance ID
   */
  private getOrCreateInstanceId(): string {
    const key = 'lyceum_web_instance_id'
    let instanceId = localStorage.getItem(key)

    if (!instanceId) {
      instanceId = crypto.randomUUID()
      localStorage.setItem(key, instanceId)
    }

    return instanceId
  }

  /**
   * Get device name
   */
  private getDeviceName(): string {
    const browser = this.getBrowser()
    const os = this.getOS()
    return `${browser} on ${os}`
  }

  /**
   * Get location (dev vs production)
   */
  private getLocation(): string {
    const hostname = window.location.hostname

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'Local, Development'
    } else if (hostname.includes('staging')) {
      return 'Staging'
    } else {
      return 'Production'
    }
  }

  /**
   * Get browser name
   */
  private getBrowser(): string {
    const ua = navigator.userAgent

    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Edg')) return 'Edge'
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'

    return 'Unknown Browser'
  }

  /**
   * Get operating system
   */
  private getOS(): string {
    const ua = navigator.userAgent
    const platform = navigator.platform

    if (ua.includes('Win')) return 'Windows'
    if (ua.includes('Mac')) return 'macOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS') || platform.includes('iPhone') || platform.includes('iPad')) return 'iOS'

    return 'Unknown OS'
  }

  /**
   * Get platform
   */
  private getPlatform(): string {
    const os = this.getOS().toLowerCase()
    if (os.includes('windows')) return 'windows'
    if (os.includes('mac')) return 'macos'
    if (os.includes('linux')) return 'linux'
    if (os.includes('android')) return 'android'
    if (os.includes('ios')) return 'ios'
    return 'web'
  }

  /**
   * Get app version (Lyceum version)
   */
  private getAppVersion(): string {
    return '1.0.0' // TODO: Get from package.json or env var
  }

  /**
   * Get build number
   */
  private getBuildNumber(): string {
    return new Date().toISOString().split('T')[0] // YYYY-MM-DD
  }

  /**
   * Get session start time
   */
  private getSessionStartTime(): string {
    const key = 'lyceum_web_session_start'
    let startTime = localStorage.getItem(key)

    if (!startTime) {
      startTime = new Date().toISOString()
      localStorage.setItem(key, startTime)
    }

    return startTime
  }
}
