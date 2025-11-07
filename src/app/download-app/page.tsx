'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircleIcon,
  XMarkIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface LicenseData {
  key_code: string
  license_type: string
  status: string
  created_at: string
  expires_at: string | null
  features: string[]
  brand_type?: string
}

export default function DownloadAppPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [generatingLicense, setGeneratingLicense] = useState(false)
  const [license, setLicense] = useState<LicenseData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadingApp, setDownloadingApp] = useState(false)

  // Detect platform and brand
  const detectPlatform = (): string => {
    if (typeof window === 'undefined') return 'windows'
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (userAgent.includes('win')) return 'windows'
    if (userAgent.includes('mac')) return 'macos'
    if (userAgent.includes('linux')) return 'linux'
    return 'windows'
  }

  const getUserBrandType = (): 'centcom' | 'lyceum' => {
    if (!userProfile?.company) return 'lyceum'

    const centcomCompanies = [
      'centcom',
      'sonance',
      'blaze',
      'iport',
      'danainnovations',
      'dana innovations',
      'james',
      'trufig'
    ]

    const companyLower = userProfile.company.toLowerCase()
    const isCentcom = centcomCompanies.some(name => companyLower.includes(name))

    return isCentcom ? 'centcom' : 'lyceum'
  }

  const platform = detectPlatform()
  const brandName = getUserBrandType() === 'centcom' ? 'Centcom' : 'Lyceum Native'

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  const handleAcceptTerms = async () => {
    if (!agreedToTerms) {
      setError('You must agree to the license terms to continue')
      return
    }

    setGeneratingLicense(true)
    setError(null)

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        setGeneratingLicense(false)
        return
      }

      const response = await fetch('/api/licenses/generate-main-app', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate license')
      }

      const data = await response.json()
      setLicense(data.license)

      console.log('License generated:', {
        key_code: data.license.key_code,
        is_new: data.is_new
      })

    } catch (err) {
      console.error('License generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate license')
    } finally {
      setGeneratingLicense(false)
    }
  }

  const handleDownload = async (installerType: 'exe' | 'msi') => {
    if (!user || !license) return

    setDownloadingApp(true)
    setError(null)

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        setDownloadingApp(false)
        return
      }

      // Get latest version for user's brand
      const latestResponse = await fetch(
        `/api/centcom/versions/latest?platform=${platform}&user_id=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!latestResponse.ok) {
        throw new Error('Failed to get latest version')
      }

      const latestData = await latestResponse.json()

      // Get download URL
      const downloadResponse = await fetch(
        `/api/centcom/download/${latestData.latest_version.version}/${platform}?user_id=${user.id}&installer_type=${installerType}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!downloadResponse.ok) {
        throw new Error('Failed to get download URL')
      }

      const downloadData = await downloadResponse.json()

      // Trigger download
      const link = document.createElement('a')
      link.href = downloadData.download_url
      link.download = downloadData.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Track download completion
      await fetch('/api/centcom/download/track', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          download_id: downloadData.download_id,
          status: 'success'
        })
      })

    } catch (err) {
      console.error('Download error:', err)
      setError(err instanceof Error ? err.message : 'Failed to download application')
    } finally {
      setDownloadingApp(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Download {brandName}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Review and accept the license agreement to download the desktop application
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <XMarkIcon className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* License Agreement Section */}
        {!license && (
          <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  End User License Agreement (EULA)
                </h2>
              </div>

              {/* License Text */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto mb-6 border border-gray-200 dark:border-gray-700">
                <div className="prose dark:prose-invert max-w-none text-sm">
                  <h3>Software License Agreement</h3>

                  <p><strong>IMPORTANT:</strong> Please read this End User License Agreement ("Agreement") carefully before downloading or using the {brandName} application ("Software").</p>

                  <h4>1. License Grant</h4>
                  <p>Subject to the terms of this Agreement, Lyceum grants you a non-exclusive, non-transferable license to use the Software for your internal business purposes.</p>

                  <h4>2. Permitted Use</h4>
                  <p>You may:</p>
                  <ul>
                    <li>Install and use the Software on devices you own or control</li>
                    <li>Connect to local clusters and sync data as authorized by your license</li>
                    <li>Access plugins and features included with your license tier</li>
                  </ul>

                  <h4>3. Restrictions</h4>
                  <p>You may NOT:</p>
                  <ul>
                    <li>Reverse engineer, decompile, or disassemble the Software</li>
                    <li>Remove or alter any proprietary notices or labels on the Software</li>
                    <li>Transfer, sublicense, or redistribute the Software without written permission</li>
                    <li>Use the Software in violation of applicable laws or regulations</li>
                  </ul>

                  <h4>4. Data Collection and Privacy</h4>
                  <p>The Software may collect usage statistics, error reports, and diagnostic data to improve the service. We do not collect or transmit your project data without your explicit consent. Please refer to our Privacy Policy for detailed information.</p>

                  <h4>5. Updates and Support</h4>
                  <p>We may provide updates, patches, and new versions of the Software. You agree that updates may be automatically downloaded and installed.</p>

                  <h4>6. Termination</h4>
                  <p>This license is effective until terminated. Your rights under this license will terminate automatically if you fail to comply with any of its terms.</p>

                  <h4>7. Disclaimer of Warranties</h4>
                  <p>THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>

                  <h4>8. Limitation of Liability</h4>
                  <p>IN NO EVENT SHALL LYCEUM BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE SOFTWARE.</p>

                  <h4>9. Governing Law</h4>
                  <p>This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which Lyceum operates.</p>

                  <p className="mt-4"><strong>By clicking "I Agree" below, you acknowledge that you have read this Agreement, understand it, and agree to be bound by its terms and conditions.</strong></p>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="flex items-start mb-6">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="agree-terms" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  I have read and agree to the End User License Agreement
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAcceptTerms}
                  disabled={!agreedToTerms || generatingLicense}
                  className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingLicense ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Generating License...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      I Agree - Continue to Download
                    </>
                  )}
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* License Generated - Download Section */}
        {license && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    License Generated Successfully
                  </h3>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                    Your main-application license has been created and is ready to use.
                  </p>
                </div>
              </div>
            </div>

            {/* License Details */}
            <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Your License Key
                </h2>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">License Key</p>
                <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                  {license.key_code}
                </p>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This license key will be automatically used when you sign in to the {brandName} desktop application.
                You can also find it anytime in your Settings page.
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">Main Application</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Status</p>
                  <p className="font-medium text-green-600">Active</p>
                </div>
              </div>
            </div>

            {/* Download Options */}
            <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <ArrowDownTrayIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Download {brandName}
                </h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Platform detected: <strong className="capitalize">{platform}</strong>
              </p>

              <div className="space-y-3">
                {platform === 'windows' && (
                  <>
                    <button
                      onClick={() => handleDownload('exe')}
                      disabled={downloadingApp}
                      className="w-full flex items-center justify-between px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <div className="flex items-center">
                        <svg className="h-10 w-10 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                        </svg>
                        <div className="ml-4 text-left">
                          <p className="text-base font-medium text-gray-900 dark:text-white">
                            Setup.exe (Recommended)
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Standard Windows installer
                          </p>
                        </div>
                      </div>
                      <ArrowDownTrayIcon className="h-6 w-6 text-gray-400" />
                    </button>

                    <button
                      onClick={() => handleDownload('msi')}
                      disabled={downloadingApp}
                      className="w-full flex items-center justify-between px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <div className="flex items-center">
                        <svg className="h-10 w-10 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                        </svg>
                        <div className="ml-4 text-left">
                          <p className="text-base font-medium text-gray-900 dark:text-white">
                            Setup.msi
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            For enterprise deployment
                          </p>
                        </div>
                      </div>
                      <ArrowDownTrayIcon className="h-6 w-6 text-gray-400" />
                    </button>
                  </>
                )}

                {downloadingApp && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Preparing download...</p>
                  </div>
                )}
              </div>

              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Next steps:</strong> After downloading, install the application and sign in with your Lyceum credentials. Your license will be automatically activated.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
