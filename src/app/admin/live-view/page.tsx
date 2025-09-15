'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  EyeIcon,
  CommandLineIcon,
  CursorArrowRaysIcon,
  XMarkIcon,
  ShareIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline'

interface ConnectionSession {
  session_token: string
  target_user_id: string
  connection_type: 'centcom' | 'lyceum'
  onboarding_session_id?: string
  expires_at: string
  user: {
    id: string
    email: string
    full_name?: string
  }
  portal_access?: {
    dashboard_url: string
    settings_url: string
    analytics_url: string
  }
}

export default function AdminLiveView() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [connection, setConnection] = useState<ConnectionSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('dashboard')
  const [isControlling, setIsControlling] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')

  const token = searchParams?.get('token')
  const userId = searchParams?.get('user')
  const type = searchParams?.get('type')

  useEffect(() => {
    if (!token || !userId || !type) {
      setError('Invalid connection parameters')
      setLoading(false)
      return
    }

    validateConnection()
  }, [token, userId, type])

  const validateConnection = async () => {
    try {
      setLoading(true)
      
      // In a real implementation, this would validate the connection token
      // and establish the live connection to the user's session
      
      // Mock connection session data
      const mockConnection: ConnectionSession = {
        session_token: token!,
        target_user_id: userId!,
        connection_type: type as 'lyceum',
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        user: {
          id: userId!,
          email: 'user@example.com',
          full_name: 'Test User'
        },
        portal_access: {
          dashboard_url: '/dashboard',
          settings_url: '/settings',
          analytics_url: '/analytics-studio'
        }
      }

      setConnection(mockConnection)
    } catch (err) {
      console.error('Connection validation failed:', err)
      setError('Failed to establish live connection')
    } finally {
      setLoading(false)
    }
  }

  const endConnection = async () => {
    if (!connection) return

    try {
      await fetch(`/api/admin/live-connection/${connection.connection_type}/${connection.target_user_id}?token=${connection.session_token}`, {
        method: 'DELETE'
      })
      
      window.close()
    } catch (err) {
      console.error('Failed to end connection:', err)
    }
  }

  const toggleControl = () => {
    setIsControlling(!isControlling)
    // In a real implementation, this would enable/disable remote control
  }

  const saveSessionNotes = async () => {
    if (!connection?.onboarding_session_id) return

    try {
      await fetch('/api/admin/onboarding/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: connection.onboarding_session_id,
          notes: sessionNotes
        })
      })
    } catch (error) {
      console.error('Failed to save session notes:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Establishing live connection...</p>
        </div>
      </div>
    )
  }

  if (error || !connection) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex items-center text-red-600 mb-4">
            <XMarkIcon className="h-6 w-6 mr-2" />
            <h2 className="text-lg font-medium">Connection Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-green-400">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm font-medium">Live Session Active</span>
          </div>
          <div className="text-gray-300">
            <span className="text-sm">Viewing: </span>
            <span className="font-medium text-white">{connection.user.email}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Control Toggle */}
          <button
            onClick={toggleControl}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isControlling
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isControlling ? (
              <>
                <CursorArrowRaysIcon className="h-4 w-4 inline mr-1" />
                End Control
              </>
            ) : (
              <>
                <CommandLineIcon className="h-4 w-4 inline mr-1" />
                Take Control
              </>
            )}
          </button>

          {/* Communication Tools */}
          <button className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded">
            <VideoCameraIcon className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded">
            <MicrophoneIcon className="h-5 w-5" />
          </button>

          {/* End Session */}
          <button
            onClick={endConnection}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
          >
            <XMarkIcon className="h-4 w-4 inline mr-1" />
            End Session
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* User View Iframe */}
        <div className="flex-1 bg-white">
          <div className="h-full">
            {/* Navigation Tabs */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
              <nav className="flex space-x-4">
                {[
                  { id: 'dashboard', name: 'Dashboard', url: connection.portal_access?.dashboard_url },
                  { id: 'settings', name: 'Settings', url: connection.portal_access?.settings_url },
                  { id: 'analytics', name: 'Analytics', url: connection.portal_access?.analytics_url }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      activeView === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Simulated User Interface */}
            <div className="h-full bg-white p-6">
              <div className="max-w-6xl mx-auto">
                {activeView === 'dashboard' && (
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                      User Dashboard - {connection.user.full_name || connection.user.email}
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900">License Status</h3>
                        <p className="text-sm text-blue-700 mt-1">Trial Active</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="font-medium text-green-900">Onboarding Progress</h3>
                        <p className="text-sm text-green-700 mt-1">2/3 Sessions Complete</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h3 className="font-medium text-yellow-900">Next Session</h3>
                        <p className="text-sm text-yellow-700 mt-1">Scheduled for today</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'settings' && (
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
                    <div className="space-y-6">
                      <div className="bg-white border rounded-lg p-4">
                        <h3 className="font-medium text-gray-900">Profile Information</h3>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                              type="email"
                              value={connection.user.email}
                              disabled
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                              type="text"
                              value={connection.user.full_name || ''}
                              disabled
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'analytics' && (
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Studio</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Usage Statistics</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Sessions This Week</span>
                            <span className="font-medium">12</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Usage Time</span>
                            <span className="font-medium">4h 32m</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Feature Usage</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Dashboard Views</span>
                            <span className="font-medium">45</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Settings Modified</span>
                            <span className="font-medium">8</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Admin Notes and Tools */}
        <div className="w-80 bg-gray-800 text-white border-l border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium">Session Tools</h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Session Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session Notes
              </label>
              <textarea
                rows={6}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                onBlur={saveSessionNotes}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Document session progress, user questions, issues encountered..."
              />
            </div>

            {/* Connection Info */}
            <div className="bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Connection Info</h4>
              <div className="space-y-1 text-xs text-gray-400">
                <div>User: {connection.user.email}</div>
                <div>Session: {connection.session_token.substring(0, 12)}...</div>
                <div>Expires: {new Date(connection.expires_at).toLocaleTimeString()}</div>
                <div>Type: {connection.connection_type}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Mark Session Complete
                </button>
                <button className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                  Schedule Follow-up
                </button>
                <button className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
