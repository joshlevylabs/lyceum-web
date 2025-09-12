// Example Centcom Integration Client
// This file demonstrates how to integrate Lyceum license validation into Centcom

import axios, { AxiosInstance } from 'axios'

interface LyceumSession {
  user: {
    id: string
    email: string
    username: string
    full_name: string
    role: string
  }
  licenses: Array<{
    id: string
    plugin_id: string
    license_type: string
    status: string
    features: string[]
    expires_at?: string
  }>
  permissions: {
    can_access_centcom: boolean
    plugins: string[]
    role_permissions: string[]
  }
  session_token: string
  expires_at: string
}

interface VersionValidation {
  success: boolean
  has_access: boolean
  version_access: boolean
  version_compatibility: {
    is_compatible: boolean
    requires_upgrade: boolean
    notes: string
  }
  available_versions: Array<{
    version: string
    is_stable: boolean
    compatibility_status: string
  }>
}

export class LyceumClient {
  private client: AxiosInstance
  private currentSession: LyceumSession | null = null

  constructor(baseUrl = 'http://localhost:3594/api/centcom') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Centcom/${process.env.CENTCOM_VERSION || '2.1.0'}`
      }
    })

    // Add request interceptor for session tokens
    this.client.interceptors.request.use((config) => {
      if (this.currentSession?.session_token) {
        config.headers['X-Session-Token'] = this.currentSession.session_token
        config.headers['X-User-ID'] = this.currentSession.user.id
      }
      return config
    })

    // Load saved session
    this.loadSession()
  }

  /**
   * Authenticate user with Lyceum
   */
  async login(email: string, password: string): Promise<LyceumSession> {
    try {
      const response = await this.client.post('/auth/login', { email, password })
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Authentication failed')
      }

      this.currentSession = response.data.session
      this.saveSession()

      // Validate Centcom access
      if (!this.currentSession.permissions.can_access_centcom) {
        throw new Error('User does not have Centcom access')
      }

      return this.currentSession
    } catch (error: any) {
      console.error('Login failed:', error.message)
      throw error
    }
  }

  /**
   * Validate access to a specific plugin version
   */
  async validatePluginAccess(
    pluginId: string, 
    version?: string, 
    feature?: string
  ): Promise<VersionValidation> {
    if (!this.currentSession) {
      throw new Error('Not authenticated')
    }

    const response = await this.client.post('/licenses/validate-plugin', {
      user_id: this.currentSession.user.id,
      plugin_id: pluginId,
      version_requested: version,
      feature_required: feature
    })

    return response.data
  }

  /**
   * Get available versions for a plugin
   */
  async getAvailableVersions(pluginId: string): Promise<any> {
    const params = new URLSearchParams()
    params.append('plugin_id', pluginId)
    if (this.currentSession?.user.id) {
      params.append('user_id', this.currentSession.user.id)
    }

    const response = await this.client.get(`/versions/available?${params.toString()}`)
    return response.data
  }

  /**
   * Track resource usage
   */
  async trackResourceUsage(resourceType: string, amount: number, operation = 'add'): Promise<void> {
    if (!this.currentSession) return

    try {
      await this.client.post('/user/resources', {
        user_id: this.currentSession.user.id,
        resource_type: resourceType,
        amount_used: amount,
        operation
      })
    } catch (error) {
      console.warn('Resource tracking failed:', error)
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    if (!this.currentSession) return false

    try {
      const response = await this.client.post('/auth/validate', {
        session_token: this.currentSession.session_token,
        user_id: this.currentSession.user.id
      })

      return response.data.valid
    } catch (error) {
      console.error('Session validation failed:', error)
      this.logout()
      return false
    }
  }

  /**
   * Get current user session
   */
  getCurrentSession(): LyceumSession | null {
    return this.currentSession
  }

  /**
   * Logout and clear session
   */
  logout(): void {
    this.currentSession = null
    localStorage.removeItem('lyceum_session')
  }

  private saveSession(): void {
    if (this.currentSession) {
      localStorage.setItem('lyceum_session', JSON.stringify(this.currentSession))
    }
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem('lyceum_session')
      if (stored) {
        this.currentSession = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load stored session:', error)
    }
  }
}

// Example usage in Centcom application
export class CentcomApp {
  private lyceum: LyceumClient
  private loadedPlugins = new Map<string, any>()

  constructor() {
    this.lyceum = new LyceumClient()
  }

  /**
   * Initialize Centcom with authentication and version validation
   */
  async initialize(email?: string, password?: string): Promise<void> {
    try {
      // Authenticate or validate existing session
      if (email && password) {
        await this.lyceum.login(email, password)
      } else {
        const sessionValid = await this.lyceum.validateSession()
        if (!sessionValid) {
          throw new Error('No valid session found. Please login.')
        }
      }

      // Validate Centcom version access
      const centcomVersion = process.env.CENTCOM_VERSION || '2.1.0'
      const versionAccess = await this.lyceum.validatePluginAccess('centcom', centcomVersion)
      
      if (!versionAccess.has_access) {
        if (versionAccess.version_compatibility?.requires_upgrade) {
          throw new Error(`License upgrade required for Centcom ${centcomVersion}: ${versionAccess.version_compatibility.notes}`)
        } else {
          throw new Error(`Centcom ${centcomVersion} not supported by current license`)
        }
      }

      console.log(`Centcom ${centcomVersion} access validated`)

      // Load available plugins
      await this.loadUserPlugins()

      console.log('Centcom initialization complete')
    } catch (error: any) {
      console.error('Centcom initialization failed:', error.message)
      throw error
    }
  }

  /**
   * Load a specific plugin with version validation
   */
  async loadPlugin(pluginId: string, version?: string): Promise<any> {
    try {
      // Get available versions if none specified
      if (!version) {
        const versions = await this.lyceum.getAvailableVersions(pluginId)
        version = versions.latest_stable_versions[pluginId]
        
        if (!version) {
          throw new Error(`No compatible version found for plugin ${pluginId}`)
        }
      }

      // Validate plugin access
      const validation = await this.lyceum.validatePluginAccess(pluginId, version)
      
      if (!validation.has_access) {
        if (validation.version_compatibility?.requires_upgrade) {
          throw new Error(`License upgrade required for ${pluginId} ${version}: ${validation.version_compatibility.notes}`)
        } else {
          throw new Error(`${pluginId} ${version} not supported by current license`)
        }
      }

      // Load the plugin implementation
      const plugin = await this.loadPluginImplementation(pluginId, version)
      
      this.loadedPlugins.set(pluginId, {
        plugin,
        version,
        validation
      })

      console.log(`Loaded plugin: ${pluginId}@${version}`)
      return plugin

    } catch (error: any) {
      console.error(`Failed to load plugin ${pluginId}:`, error.message)
      throw error
    }
  }

  /**
   * Validate feature access before using it
   */
  async validateFeature(pluginId: string, featureName: string): Promise<boolean> {
    const pluginInfo = this.loadedPlugins.get(pluginId)
    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginId} not loaded`)
    }

    // Real-time feature validation
    const validation = await this.lyceum.validatePluginAccess(
      pluginId,
      pluginInfo.version,
      featureName
    )

    if (!validation.has_access) {
      console.warn(`Feature ${featureName} not available: ${validation.version_compatibility?.notes || 'Access denied'}`)
      return false
    }

    return true
  }

  /**
   * Example: Run Klippel QC test with validation
   */
  async runKlippelQCTest(testConfig: any): Promise<void> {
    // Validate feature access
    const hasAccess = await this.validateFeature('klippel_qc', 'qc_testing')
    if (!hasAccess) {
      throw new Error('QC testing not available with current license')
    }

    // Track resource usage
    await this.lyceum.trackResourceUsage('compute_hours', 0.1)

    // Get plugin and run test
    const klippelPlugin = this.loadedPlugins.get('klippel_qc')?.plugin
    if (!klippelPlugin) {
      throw new Error('Klippel QC plugin not loaded')
    }

    console.log('Starting QC test...')
    // await klippelPlugin.runTest(testConfig)
  }

  /**
   * Example: Run automated testing sequence
   */
  async runAutomatedSequence(sequence: any): Promise<void> {
    // Validate automated testing feature
    const hasAccess = await this.validateFeature('klippel_qc', 'automated_testing')
    if (!hasAccess) {
      throw new Error('Automated testing requires Professional license or higher')
    }

    console.log('Running automated test sequence...')
    // Implementation here
  }

  private async loadUserPlugins(): Promise<void> {
    const session = this.lyceum.getCurrentSession()
    if (!session) return

    const availablePlugins = session.permissions.plugins
    
    for (const pluginId of availablePlugins) {
      if (pluginId === 'general') continue // Skip general/core
      
      try {
        await this.loadPlugin(pluginId)
      } catch (error: any) {
        console.warn(`Could not load plugin ${pluginId}: ${error.message}`)
      }
    }
  }

  private async loadPluginImplementation(pluginId: string, version: string): Promise<any> {
    // This would load your actual plugin implementations
    // For demonstration purposes, returning mock objects
    
    switch (pluginId) {
      case 'klippel_qc':
        return {
          name: 'Klippel QC',
          version,
          runTest: async (config: any) => {
            console.log('Running Klippel QC test:', config)
          },
          runAutomatedSequence: async (sequence: any) => {
            console.log('Running automated sequence:', sequence)
          }
        }
        
      case 'apx500':
        return {
          name: 'APx500 Integration',
          version,
          runMeasurement: async (config: any) => {
            console.log('Running APx500 measurement:', config)
          }
        }
        
      case 'analytics_pro':
        return {
          name: 'Analytics Pro',
          version,
          generateReport: async (data: any) => {
            console.log('Generating analytics report:', data)
          }
        }
        
      default:
        throw new Error(`Unknown plugin: ${pluginId}`)
    }
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.lyceum.getCurrentSession()?.user || null
  }

  /**
   * Get loaded plugins
   */
  getLoadedPlugins() {
    return Array.from(this.loadedPlugins.keys())
  }
}

// Usage example
async function main() {
  const app = new CentcomApp()
  
  try {
    // Initialize with login
    await app.initialize('user@example.com', 'password')
    
    // Or initialize with existing session
    // await app.initialize()
    
    console.log('User:', app.getCurrentUser()?.email)
    console.log('Loaded plugins:', app.getLoadedPlugins())
    
    // Run a QC test
    await app.runKlippelQCTest({
      frequency_range: [20, 20000],
      test_type: 'frequency_response'
    })
    
  } catch (error: any) {
    console.error('Application error:', error.message)
    
    if (error.message.includes('License upgrade required')) {
      // Show upgrade dialog to user
      console.log('Please upgrade your license to access this feature')
    } else if (error.message.includes('Please login')) {
      // Redirect to login screen
      console.log('Please login to continue')
    }
  }
}

// Export for use in Centcom
export { LyceumClient, CentcomApp }

