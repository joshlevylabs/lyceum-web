# Centcom-Lyceum Integration Guide

This guide explains how to modify your existing Centcom desktop application to save Analytics Studio sessions to the Lyceum cloud platform, enabling seamless access across devices and team collaboration.

## 🎯 Integration Overview

The integration allows users to:
- Save Analytics Studio sessions from the desktop app to Lyceum cloud
- Access desktop-created sessions from the web interface
- Collaborate on sessions in real-time
- Sync session data across multiple devices

## 🔧 Required Modifications to Centcom

### 1. Add Lyceum API Client

Create a new file `src/lib/lyceum-client.ts` in your Centcom project:

```typescript
interface LyceumConfig {
  apiUrl: string
  userEmail: string
  userToken: string
}

interface SessionUploadData {
  name: string
  description?: string
  session_type: 'exploratory' | 'monitoring' | 'comparison' | 'collaborative'
  data_bindings: any
  analytics_state: any
  collaboration: any
  config: any
}

export class LyceumClient {
  private config: LyceumConfig

  constructor(config: LyceumConfig) {
    this.config = config
  }

  async uploadSession(sessionData: SessionUploadData): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/analytics-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.userToken}`,
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Failed to upload session' }
      }

      const result = await response.json()
      return { success: true, sessionId: result.session.id }
    } catch (error) {
      return { success: false, error: 'Network error: Unable to connect to Lyceum' }
    }
  }

  async authenticateUser(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Authentication failed' }
      }

      const result = await response.json()
      return { success: true, token: result.token }
    } catch (error) {
      return { success: false, error: 'Network error: Unable to connect to Lyceum' }
    }
  }

  async listUserSessions(): Promise<{ success: boolean; sessions?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/analytics-sessions?filterType=my-sessions`, {
        headers: {
          'Authorization': `Bearer ${this.config.userToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Failed to fetch sessions' }
      }

      const result = await response.json()
      return { success: true, sessions: result.sessions }
    } catch (error) {
      return { success: false, error: 'Network error: Unable to connect to Lyceum' }
    }
  }
}
```

### 2. Modify Analytics Studio SessionBrowser Component

Update `src/pages/analytics-studio/SessionBrowser.tsx` to include Lyceum integration:

```typescript
// Add these imports
import { LyceumClient } from '../../lib/lyceum-client'
import { CloudArrowUpIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

// Add to the SessionBrowser component state
const [lyceumClient, setLyceumClient] = useState<LyceumClient | null>(null)
const [lyceumConnected, setLyceumConnected] = useState(false)
const [showLyceumAuth, setShowLyceumAuth] = useState(false)
const [lyceumCredentials, setLyceumCredentials] = useState({ email: '', password: '' })

// Add Lyceum authentication function
const connectToLyceum = async () => {
  const client = new LyceumClient({
    apiUrl: 'https://thelyceum.io', // or your Lyceum URL
    userEmail: lyceumCredentials.email,
    userToken: '', // Will be set after authentication
  })

  const authResult = await client.authenticateUser(lyceumCredentials.email, lyceumCredentials.password)
  
  if (authResult.success && authResult.token) {
    client.config.userToken = authResult.token
    setLyceumClient(client)
    setLyceumConnected(true)
    setShowLyceumAuth(false)
    
    // Store credentials securely (consider using secure storage)
    localStorage.setItem('lyceum_token', authResult.token)
    localStorage.setItem('lyceum_email', lyceumCredentials.email)
    
    showNotification('Connected to Lyceum successfully!', 'success')
  } else {
    showNotification(`Lyceum connection failed: ${authResult.error}`, 'error')
  }
}

// Add save to Lyceum function
const saveSessionToLyceum = async (session: AnalyticsSession) => {
  if (!lyceumClient) {
    setShowLyceumAuth(true)
    return
  }

  const sessionData = {
    name: session.name,
    description: session.description,
    session_type: session.type as any,
    data_bindings: session.data_bindings,
    analytics_state: session.analytics_state,
    collaboration: session.collaboration,
    config: session.config,
  }

  const result = await lyceumClient.uploadSession(sessionData)
  
  if (result.success) {
    showNotification(`Session "${session.name}" saved to Lyceum!`, 'success')
  } else {
    showNotification(`Failed to save to Lyceum: ${result.error}`, 'error')
  }
}

// Add to the session actions in the UI
<button
  onClick={() => saveSessionToLyceum(session)}
  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
  title="Save to Lyceum Cloud"
>
  <CloudArrowUpIcon className="h-3 w-3 mr-1" />
  Save to Cloud
</button>
```

### 3. Add Lyceum Authentication Modal

Create `src/components/LyceumAuthModal.tsx`:

```typescript
import React, { useState } from 'react'
import { XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface LyceumAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuth: (credentials: { email: string; password: string }) => void
  loading?: boolean
}

export const LyceumAuthModal: React.FC<LyceumAuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuth, 
  loading = false 
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAuth({ email, password })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                <GlobeAltIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Connect to Lyceum
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sign in to your Lyceum account to save sessions to the cloud and enable collaboration.
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {loading ? 'Connecting...' : 'Connect'}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 4. Update Session Creation to Include Cloud Save Option

Modify `src/pages/analytics-studio/SessionCreator.tsx`:

```typescript
// Add cloud save option to the form
<div className="flex items-center">
  <input
    type="checkbox"
    id="saveToLyceum"
    checked={formData.saveToLyceum}
    onChange={(e) => setFormData({ ...formData, saveToLyceum: e.target.checked })}
    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
  />
  <label htmlFor="saveToLyceum" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
    Save to Lyceum Cloud (enables collaboration and cross-device access)
  </label>
</div>

// Update the session creation logic to include Lyceum save
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!validateForm()) return
  
  try {
    setLoading(true)
    
    // Create session locally first
    const request: CreateSessionRequest = {
      // ... existing session creation logic
    }
    
    await onSessionCreate(request)
    
    // If save to Lyceum is enabled, upload to cloud
    if (formData.saveToLyceum && lyceumClient) {
      const sessionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        session_type: formData.sessionType,
        data_bindings: request.initial_data_bindings,
        analytics_state: {},
        collaboration: {},
        config: request.config,
      }
      
      const result = await lyceumClient.uploadSession(sessionData)
      
      if (result.success) {
        showNotification('Session saved to Lyceum cloud!', 'success')
      } else {
        showNotification(`Cloud save failed: ${result.error}`, 'warning')
      }
    }
  } catch (error) {
    console.error('Failed to create session:', error)
  } finally {
    setLoading(false)
  }
}
```

### 5. Add Lyceum Settings Panel

Create `src/components/settings/LyceumSettings.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { LyceumClient } from '../../lib/lyceum-client'
import { GlobeAltIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export const LyceumSettings: React.FC = () => {
  const [lyceumUrl, setLyceumUrl] = useState('https://thelyceum.io')
  const [autoSync, setAutoSync] = useState(true)
  const [connected, setConnected] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    // Load saved settings
    const savedUrl = localStorage.getItem('lyceum_url')
    const savedAutoSync = localStorage.getItem('lyceum_auto_sync')
    const savedEmail = localStorage.getItem('lyceum_email')
    
    if (savedUrl) setLyceumUrl(savedUrl)
    if (savedAutoSync) setAutoSync(savedAutoSync === 'true')
    if (savedEmail) setUserEmail(savedEmail)
    
    // Check connection status
    checkConnection()
  }, [])

  const checkConnection = async () => {
    const token = localStorage.getItem('lyceum_token')
    const email = localStorage.getItem('lyceum_email')
    
    if (token && email) {
      setConnected(true)
      setUserEmail(email)
    }
  }

  const saveSettings = () => {
    localStorage.setItem('lyceum_url', lyceumUrl)
    localStorage.setItem('lyceum_auto_sync', autoSync.toString())
  }

  const disconnect = () => {
    localStorage.removeItem('lyceum_token')
    localStorage.removeItem('lyceum_email')
    setConnected(false)
    setUserEmail('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Lyceum Cloud Integration</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure connection to Lyceum cloud platform for session synchronization and collaboration.
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
              connected ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {connected ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {connected ? 'Connected to Lyceum' : 'Not Connected'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {connected ? `Logged in as ${userEmail}` : 'Sign in to enable cloud features'}
              </p>
            </div>
          </div>
          
          {connected && (
            <button
              onClick={disconnect}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Lyceum Server URL
            </label>
            <input
              type="url"
              value={lyceumUrl}
              onChange={(e) => setLyceumUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              placeholder="https://thelyceum.io"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoSync"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoSync" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Automatically sync sessions to Lyceum
            </label>
          </div>
          
          <button
            onClick={saveSettings}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
```

## 🔄 Session Synchronization Flow

1. **Desktop Session Creation**: User creates session in Centcom Analytics Studio
2. **Cloud Upload**: User clicks "Save to Cloud" or auto-sync uploads session
3. **Authentication**: If not connected, prompt for Lyceum credentials
4. **Data Transfer**: Session data is sent to Lyceum API
5. **Web Access**: Session immediately available in Lyceum web interface
6. **Collaboration**: Team members can access and collaborate on the session

## 🔐 Security Considerations

- Store Lyceum authentication tokens securely
- Use HTTPS for all API communications
- Implement token refresh mechanism
- Validate session data before upload
- Respect user privacy settings

## 🎯 Benefits of Integration

- **Cross-Platform Access**: Sessions available on desktop and web
- **Team Collaboration**: Multiple users can work on the same session
- **Data Backup**: Sessions safely stored in the cloud
- **Remote Access**: Access your work from anywhere
- **Version History**: Track session changes over time
- **Sharing**: Easy session sharing with stakeholders

## 🚀 Deployment

1. Update Centcom with the integration code
2. Deploy Lyceum to production (thelyceum.io)
3. Configure environment variables
4. Test the integration flow
5. Train users on the new cloud features

This integration transforms your desktop Analytics Studio into a hybrid application that leverages the power of cloud collaboration while maintaining the familiar desktop experience. 