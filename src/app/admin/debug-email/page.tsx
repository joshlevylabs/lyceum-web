'use client'

import { useState } from 'react'
import { 
  EnvelopeIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  InformationCircleIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export default function EmailDebugPage() {
  const [loading, setLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [testEmail, setTestEmail] = useState('')
  const [showResetLinkModal, setShowResetLinkModal] = useState(false)
  const [resetLinkData, setResetLinkData] = useState<any>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback: select the text
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    }
  }

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/debug/email-config')
      const data = await response.json()
      setDiagnostics(data)
    } catch (error) {
      console.error('Diagnostics failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const testEmailSending = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/debug/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_email: testEmail })
      })
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Email test failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const testPasswordReset = async () => {
    if (!testEmail) {
      alert('Please enter a test email address')
      return
    }

    setLoading(true)
    try {
      // Find a user with this email first
      const userResponse = await fetch('/api/admin/users/list')
      const userData = await userResponse.json()
      const user = userData.users?.find((u: any) => u.email === testEmail)

      if (!user) {
        alert('User not found with this email address')
        return
      }

      // Try to generate a direct link first (bypasses rate limiting)
      const linkResponse = await fetch('/api/admin/debug/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_email: testEmail })
      })
      const linkData = await linkResponse.json()
      
      if (linkData.test_results?.methods?.generateLink?.success) {
        const generatedLink = linkData.test_results.methods.generateLink.action_link
        setResetLinkData({
          email: testEmail,
          link: generatedLink,
          method: 'Direct Link Generation',
          success: true
        })
        setShowResetLinkModal(true)
        return
      }

      // Fall back to standard password reset if link generation fails
      const response = await fetch('/api/admin/users/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          email: testEmail 
        })
      })
      const data = await response.json()
      
      alert(data.success 
        ? `Password reset ${data.debug_info?.reset_method_used}: ${data.message}` 
        : `Failed: ${data.error}\n\nTip: Use "Test Methods" to get a working link directly!`
      )
      
      console.log('Password reset result:', data)
    } catch (error) {
      console.error('Password reset test failed:', error)
      alert('Password reset test failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Debug Tool</h1>
        <p className="text-gray-600">Diagnose and test email functionality in the Lyceum platform</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CogIcon className="h-5 w-5 mr-2" />
            System Diagnostics
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Check overall email configuration and user status
          </p>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            Test Email Functions
          </h2>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testEmailSending}
                disabled={loading || !testEmail}
                className="bg-green-600 text-white px-3 py-2 text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Test Methods
              </button>
              <button
                onClick={testPasswordReset}
                disabled={loading || !testEmail}
                className="bg-yellow-600 text-white px-3 py-2 text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                Test Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics Results */}
      {diagnostics && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Diagnostics</h3>
          
          {/* Users Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {diagnostics.diagnostics?.users_summary?.total_users || 0}
              </div>
              <div className="text-sm text-blue-800">Total Users</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {diagnostics.diagnostics?.users_summary?.confirmed_users || 0}
              </div>
              <div className="text-sm text-green-800">Confirmed Emails</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {diagnostics.diagnostics?.users_summary?.unconfirmed_users || 0}
              </div>
              <div className="text-sm text-red-800">Unconfirmed Emails</div>
            </div>
          </div>

          {/* Common Issues */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Common Email Issues</h4>
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  {Object.entries(diagnostics.diagnostics?.common_issues || {}).map(([key, value]) => (
                    <li key={key}>• {value as string}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Solutions */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Suggested Solutions</h4>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  {diagnostics.diagnostics?.suggested_solutions?.map((solution: string, index: number) => (
                    <li key={index}>• {solution}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Users Detail */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              View User Details ({diagnostics.diagnostics?.users_detail?.length || 0} users)
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confirmed</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {diagnostics.diagnostics?.users_detail?.map((user: any) => (
                    <tr key={`email-user-${user.id}`}>
                      <td className="px-3 py-2 text-sm text-gray-900">{user.email}</td>
                      <td className="px-3 py-2 text-sm">
                        {user.confirmed_at ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Test Results</h3>
          
          <div className="space-y-4">
            {Object.entries(testResults.test_results?.methods || {}).map(([method, result]: [string, any]) => (
              <div key={method} className={`border rounded-lg p-4 ${
                result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center mb-2">
                  {result.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  )}
                  <h4 className="font-medium capitalize">{method.replace(/([A-Z])/g, ' $1')}</h4>
                </div>
                
                {result.error && (
                  <p className="text-sm text-red-600 mb-2">Error: {result.error}</p>
                )}
                
                {result.action_link && (
                  <div className="bg-white border rounded p-2 mt-2">
                    <p className="text-xs text-gray-600 mb-1">Generated Link:</p>
                    <code className="text-xs break-all">{result.action_link}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password Reset Link Modal */}
      {showResetLinkModal && resetLinkData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Password Reset Link Generated
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowResetLinkModal(false)
                    setLinkCopied(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">Success!</h4>
                      <p className="mt-1 text-sm text-green-700">
                        Password reset link generated successfully for <strong>{resetLinkData.email}</strong>
                      </p>
                      <p className="mt-1 text-xs text-green-600">
                        Method: {resetLinkData.method} • No rate limiting • Works immediately
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h4>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Copy the link below using the "Copy Link" button</li>
                    <li>2. Send it to the user via email, Slack, Teams, or any messaging platform</li>
                    <li>3. The link works immediately and bypasses email delivery issues</li>
                    <li>4. Link expires in 1 hour for security</li>
                  </ol>
                </div>

                {/* Link Display */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Password Reset Link:
                  </label>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={resetLinkData.link}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50 resize-none"
                      rows={3}
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => copyToClipboard(resetLinkData.link)}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          linkCopied
                            ? 'text-green-800 bg-green-100 hover:bg-green-200'
                            : 'text-blue-800 bg-blue-100 hover:bg-blue-200'
                        }`}
                      >
                        {linkCopied ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent('Password Reset - Lyceum')
                        const body = encodeURIComponent(
                          `Hi,\n\nYou can reset your password using this secure link:\n\n${resetLinkData.link}\n\nThis link will expire in 1 hour for security reasons.\n\nBest regards,\nLyceum Admin Team`
                        )
                        window.open(`mailto:${resetLinkData.email}?subject=${subject}&body=${body}`)
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Send via Email
                    </button>
                    <button
                      onClick={() => copyToClipboard(resetLinkData.link)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {linkCopied ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Copied to Clipboard
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowResetLinkModal(false)
                      setLinkCopied(false)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
