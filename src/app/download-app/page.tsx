'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
  CheckCircle,
  X,
  ShieldCheck,
  FileText,
  DownloadSimple,
  Desktop,
  Cpu,
  Warning,
  Info,
  CaretDown,
  CaretUp,
  Terminal,
  Question,
  Wrench
} from '@phosphor-icons/react'

interface LicenseData {
  key_code: string
  license_type: string
  status: string
  created_at: string
  expires_at: string | null
  features: string[]
  brand_type?: string
}

interface SystemCompatibility {
  os: 'windows' | 'macos' | 'linux' | 'unknown'
  osVersion: string | null
  windowsBuild: number | null
  isCompatible: boolean
  is64Bit: boolean
  compatibilityMessage: string
}

interface Subscription {
  id: string
  subscription_type: 'trial' | 'paid'
  status: 'active' | 'expired' | 'cancelled'
  expires_at: string | null
  trial_end_date?: string | null
}

interface License {
  id: string
  key_code: string
  status: string
  expires_at: string | null
}

export default function DownloadAppPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [generatingLicense, setGeneratingLicense] = useState(false)
  const [license, setLicense] = useState<LicenseData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadingApp, setDownloadingApp] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [hasValidLicense, setHasValidLicense] = useState(false)
  const [subscriptionLicense, setSubscriptionLicense] = useState<License | null>(null)

  // System compatibility state
  const [systemCheck, setSystemCheck] = useState<SystemCompatibility | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    requirements: true,
    prerequisites: false,
    installation: false,
    postInstall: false,
    faq: false,
    itAdmin: false
  })

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  // System compatibility check
  const checkSystemCompatibility = useCallback((): SystemCompatibility => {
    if (typeof window === 'undefined') {
      return {
        os: 'unknown',
        osVersion: null,
        windowsBuild: null,
        isCompatible: false,
        is64Bit: false,
        compatibilityMessage: 'Unable to detect system'
      }
    }

    const userAgent = window.navigator.userAgent
    const platform = window.navigator.platform

    // Detect OS
    let os: 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown'
    if (userAgent.includes('Win')) os = 'windows'
    else if (userAgent.includes('Mac')) os = 'macos'
    else if (userAgent.includes('Linux')) os = 'linux'

    // Detect 64-bit
    const is64Bit = platform.includes('64') || userAgent.includes('x64') || userAgent.includes('Win64') || userAgent.includes('WOW64')

    // Parse Windows version from User Agent
    let osVersion: string | null = null
    let windowsBuild: number | null = null
    let isCompatible = false
    let compatibilityMessage = ''

    if (os === 'windows') {
      // Windows 10/11 UA: "Windows NT 10.0"
      const ntMatch = userAgent.match(/Windows NT (\d+\.\d+)/)
      if (ntMatch) {
        const ntVersion = parseFloat(ntMatch[1])
        if (ntVersion >= 10.0) {
          // Try to get build number - this is limited in browsers
          // Chrome/Edge may include build in platform data
          const buildMatch = userAgent.match(/Windows NT 10\.0.*Build[\/\s](\d+)/i)
          if (buildMatch) {
            windowsBuild = parseInt(buildMatch[1], 10)
          }

          // Check Windows 11 (Build 22000+) or Windows 10
          if (windowsBuild && windowsBuild >= 22000) {
            osVersion = 'Windows 11'
            isCompatible = true
            compatibilityMessage = 'Windows 11 detected - Compatible'
          } else if (windowsBuild && windowsBuild >= 19041) {
            osVersion = `Windows 10 (Build ${windowsBuild})`
            isCompatible = true
            compatibilityMessage = 'Windows 10 version 2004 or newer - Compatible'
          } else if (windowsBuild && windowsBuild < 19041) {
            osVersion = `Windows 10 (Build ${windowsBuild})`
            isCompatible = false
            compatibilityMessage = 'Windows 10 version is too old. Please update to version 2004 (Build 19041) or newer.'
          } else {
            // Can't determine build, assume Windows 10+ is likely compatible
            osVersion = 'Windows 10/11'
            isCompatible = true
            compatibilityMessage = 'Windows 10/11 detected - Likely compatible (build version could not be verified)'
          }
        } else {
          osVersion = `Windows NT ${ntVersion}`
          isCompatible = false
          compatibilityMessage = 'Windows version is not supported. Windows 10 version 2004 or newer is required.'
        }
      }

      if (!is64Bit) {
        isCompatible = false
        compatibilityMessage = '64-bit Windows is required. Your system appears to be 32-bit.'
      }
    } else if (os === 'macos') {
      osVersion = 'macOS'
      isCompatible = false
      compatibilityMessage = 'macOS is not currently supported. Windows version coming soon for Mac users.'
    } else if (os === 'linux') {
      osVersion = 'Linux'
      isCompatible = false
      compatibilityMessage = 'Linux is not currently supported. Windows version only.'
    } else {
      compatibilityMessage = 'Unable to detect your operating system.'
    }

    return { os, osVersion, windowsBuild, isCompatible, is64Bit, compatibilityMessage }
  }, [])

  // Run system check on mount
  useEffect(() => {
    setSystemCheck(checkSystemCompatibility())
  }, [checkSystemCompatibility])

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

  // Check subscription and license status before allowing download
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return

      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        if (!session?.access_token) {
          setCheckingSubscription(false)
          return
        }

        const response = await fetch('/api/subscriptions/native-app', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setHasSubscription(data.hasSubscription)
          setSubscription(data.subscription)
          setHasValidLicense(data.hasValidLicense)
          setSubscriptionLicense(data.license)

          // If license has expired, redirect to subscribe page (no trial offered)
          if (data.licenseExpired) {
            router.push('/native-app/subscribe?expired=true')
            return
          }

          // If no valid license at all (no subscription or subscription but no license), redirect to subscribe
          if (!data.hasValidLicense && !data.subscription) {
            router.push('/native-app/subscribe')
            return
          }

          // If user has cancelled subscription but license is still valid, allow download
          // (This prevents the infinite loop - we check license validity, not just subscription status)
        }
      } catch (err) {
        console.error('Error checking subscription:', err)
        setError('Failed to verify subscription status')
      } finally {
        setCheckingSubscription(false)
      }
    }

    if (!loading && user) {
      checkSubscription()
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
      // Check if user already has a license from their subscription
      if (subscriptionLicense) {
        console.log('✅ Using existing license from subscription:', subscriptionLicense.key_code)
        setLicense({
          key_code: subscriptionLicense.key_code,
          license_type: 'main-application',
          status: subscriptionLicense.status,
          created_at: new Date().toISOString(),
          expires_at: subscriptionLicense.expires_at,
          features: [],
          brand_type: getUserBrandType()
        })
        setGeneratingLicense(false)
        return
      }

      // No existing license, generate a new one
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

  if (loading || checkingSubscription) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Don't render if no valid license (user will be redirected)
  if (!hasValidLicense && !hasSubscription) {
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
            Review system requirements and accept the license agreement to download the desktop application
          </p>
          {subscription && hasValidLicense && (
            <div className={`mt-4 inline-flex items-center px-4 py-2 rounded-lg border ${
              subscription.subscription_type === 'trial'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : subscription.status === 'cancelled'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <CheckCircle className={`h-5 w-5 mr-2 ${
                subscription.subscription_type === 'trial'
                  ? 'text-blue-600 dark:text-blue-400'
                  : subscription.status === 'cancelled'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
              }`} />
              <span className={`text-sm ${
                subscription.subscription_type === 'trial'
                  ? 'text-blue-800 dark:text-blue-200'
                  : subscription.status === 'cancelled'
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-green-800 dark:text-green-200'
              }`}>
                {subscription.subscription_type === 'trial' && subscription.status === 'active'
                  ? `Trial Active${subscription.trial_end_date ? ` • Expires ${new Date(subscription.trial_end_date).toLocaleDateString()}` : ''}`
                  : subscription.subscription_type === 'trial' && subscription.status === 'cancelled'
                  ? `Trial (Cancelled)${subscription.trial_end_date ? ` • Valid until ${new Date(subscription.trial_end_date).toLocaleDateString()}` : ''}`
                  : subscription.status === 'cancelled'
                  ? 'Subscription Cancelled • License still valid'
                  : 'Paid Subscription Active'}
              </span>
            </div>
          )}
        </div>

        {/* System Compatibility Check */}
        {systemCheck && (
          <div className={`mb-6 rounded-lg border p-4 ${
            systemCheck.isCompatible
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : systemCheck.os === 'windows'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start">
              <Desktop className={`h-6 w-6 mr-3 mt-0.5 ${
                systemCheck.isCompatible
                  ? 'text-green-600 dark:text-green-400'
                  : systemCheck.os === 'windows'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  systemCheck.isCompatible
                    ? 'text-green-800 dark:text-green-200'
                    : systemCheck.os === 'windows'
                    ? 'text-yellow-800 dark:text-yellow-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  System Compatibility Check
                </h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={systemCheck.isCompatible ? 'text-green-700 dark:text-green-300' : systemCheck.os === 'windows' ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}>
                    {systemCheck.isCompatible ? (
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Operating System: {systemCheck.osVersion} (Compatible)
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Warning className="h-4 w-4 mr-1" />
                        {systemCheck.compatibilityMessage}
                      </span>
                    )}
                  </p>
                  {systemCheck.os === 'windows' && (
                    <p className={systemCheck.is64Bit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                      {systemCheck.is64Bit ? (
                        <span className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Architecture: 64-bit (Compatible)
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <X className="h-4 w-4 mr-1" />
                          Architecture: 32-bit (Not supported)
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    WSL Status: Cannot detect from browser - see prerequisites below
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Requirements Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('requirements')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center">
              <Cpu className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                System Requirements
              </h2>
            </div>
            {expandedSections.requirements ? (
              <CaretUp className="h-5 w-5 text-gray-500" />
            ) : (
              <CaretDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {expandedSections.requirements && (
            <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-white">Requirement</th>
                      <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-white">Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Operating System</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">Windows 10 version 2004 (Build 19041) or higher, or Windows 11</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Architecture</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">64-bit (x64) only</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">RAM</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">8 GB minimum (16 GB recommended for analytics features)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Disk Space</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">2 GB for application + 1 GB for WSL (if using analytics)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Internet</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">Required for initial setup and authentication</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">Display</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">1280x720 minimum resolution</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Prerequisites Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('prerequisites')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center">
              <Wrench className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Prerequisites
              </h2>
            </div>
            {expandedSections.prerequisites ? (
              <CaretUp className="h-5 w-5 text-gray-500" />
            ) : (
              <CaretDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {expandedSections.prerequisites && (
            <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-4 space-y-6">
                {/* WSL Prerequisite */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Windows Subsystem for Linux (WSL) - Required for Analytics Studio
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 ml-4 list-disc">
                    <li>The installer will detect if WSL is installed</li>
                    <li>If not installed, the installer offers to install it automatically</li>
                    <li>A system restart is required after WSL installation</li>
                  </ul>
                  <div className="mt-3 bg-gray-900 dark:bg-gray-950 rounded p-3">
                    <p className="text-xs text-gray-400 mb-1">Alternatively, install manually via PowerShell (Admin):</p>
                    <code className="text-sm text-green-400 font-mono">wsl --install</code>
                  </div>
                  <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">
                    <strong>How to check if WSL is installed:</strong> Open PowerShell and run <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">wsl --status</code>
                  </p>
                </div>

                {/* Admin Privileges Prerequisite */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Administrator Privileges - Required during installation
                  </h3>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 ml-4 list-disc">
                    <li>WSL installation (if needed)</li>
                    <li>Klippel COM component registration (if using Klippel QC features)</li>
                  </ul>
                </div>

                {/* Klippel dB-Lab Prerequisite */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Klippel dB-Lab - Required for Klippel QC features
                  </h3>
                  <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                    If you plan to use the Klippel QC plugin to import .kdbx files, you must have <strong>Klippel dB-Lab</strong> installed on your machine before using these features.
                  </p>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-4 list-disc">
                    <li>dB-Lab provides the COM components needed to read Klippel database files</li>
                    <li>Contact Klippel or your Klippel distributor to obtain dB-Lab</li>
                    <li>Not required if you are not using Klippel QC features</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Installation Instructions Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('installation')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center">
              <DownloadSimple className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Installation Instructions
              </h2>
            </div>
            {expandedSections.installation ? (
              <CaretUp className="h-5 w-5 text-gray-500" />
            ) : (
              <CaretDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {expandedSections.installation && (
            <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-4 space-y-6">
                {/* Before You Install */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Before You Install:</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 ml-4 list-disc">
                    <li>Ensure your system meets the minimum requirements above</li>
                    <li>Have administrator credentials ready</li>
                    <li>Close any Audio Precision or Klippel software</li>
                  </ul>
                </div>

                {/* Installation Steps */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Installation Steps:</h3>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-3 ml-4 list-decimal">
                    <li>
                      <strong>Download</strong> the {brandName}-Setup.exe installer (button below)
                    </li>
                    <li>
                      <strong>Right-click</strong> the installer and select &quot;Run as administrator&quot;
                    </li>
                    <li>
                      <strong>Follow the installation wizard:</strong>
                      <ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600 dark:text-gray-400">
                        <li><strong>WSL Setup Page:</strong> If WSL is not detected, a checkbox will appear to install it (recommended). Leave checked and continue.</li>
                        <li><strong>Klippel COM Registration:</strong> If using Klippel QC features, registration will be prompted during first use</li>
                      </ul>
                    </li>
                    <li>
                      <strong>If WSL was installed,</strong> restart your computer when prompted
                    </li>
                    <li>
                      <strong>Launch {brandName}</strong> from the Start menu or desktop shortcut
                    </li>
                    <li>
                      <strong>ClickHouse analytics</strong> will automatically configure on first launch
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Post-Installation Notes Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('postInstall')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center">
              <Info className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Post-Installation Notes
              </h2>
            </div>
            {expandedSections.postInstall ? (
              <CaretUp className="h-5 w-5 text-gray-500" />
            ) : (
              <CaretDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {expandedSections.postInstall && (
            <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-4 space-y-6">
                {/* First Launch */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">First Launch:</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 ml-4 list-disc">
                    <li>Initial startup may take 1-2 minutes while analytics components initialize</li>
                    <li>Sign in with your Lyceum account credentials</li>
                    <li>If you skipped WSL during installation, a prompt will appear to install it</li>
                  </ul>
                </div>

                {/* For Klippel QC Users */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">For Klippel QC Users:</h3>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-2 ml-4 list-disc">
                    <li><strong>Klippel dB-Lab must be installed</strong> on your machine to use Klippel QC features</li>
                    <li>Klippel COM registration occurs automatically when first importing a .kdbx file</li>
                    <li>A UAC prompt will appear - click &quot;Yes&quot; to complete registration</li>
                    <li>This is a one-time setup</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('faq')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center">
              <Question className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>
            {expandedSections.faq ? (
              <CaretUp className="h-5 w-5 text-gray-500" />
            ) : (
              <CaretDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {expandedSections.faq && (
            <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-4 space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Why does the desktop application need WSL?</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    WSL (Windows Subsystem for Linux) is required to run the database, cluster storage, and analytics engines that power the application. These components rely on Linux-based services that run within WSL.
                  </p>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I use the desktop application without WSL?</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    No, WSL is required to run the application. The database and analytics engines depend on WSL to function, so the application cannot operate without it installed.
                  </p>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Why does the installer ask for administrator privileges?</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Administrator rights are needed to install WSL (a Windows feature) and register Klippel COM components for database import functionality.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">My Windows version is older than 2004. Can I still use the desktop application?</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Unfortunately, no. WSL 2 requires Windows 10 version 2004 or newer. Please update Windows via Settings → Windows Update.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* IT Administrator Section */}
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('itAdmin')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center">
              <Terminal className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                IT Administrator Guide
              </h2>
            </div>
            {expandedSections.itAdmin ? (
              <CaretUp className="h-5 w-5 text-gray-500" />
            ) : (
              <CaretDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {expandedSections.itAdmin && (
            <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-4 space-y-6">
                {/* Silent Installation */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Silent Installation:</h3>
                  <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                      <code>{`# Install ${brandName} silently with WSL
Start-Process "${brandName}-Setup.exe" -ArgumentList "/S" -Wait

# Register Klippel COM components (optional)
$dllPath = "C:\\Program Files\\${brandName}\\plugins\\klippel-qc\\libs\\KlAutomation.dll"
Start-Process "regsvr32.exe" -ArgumentList "/s \`"$dllPath\`"" -Wait`}</code>
                    </pre>
                  </div>
                </div>

                {/* Group Policy Deployment */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Group Policy Deployment:</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 ml-4 list-disc">
                    <li>Deploy installer via GPO</li>
                    <li>Use startup script to run <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">C:\Program Files\{brandName}\scripts\register-klippel-com.ps1</code></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <X className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* License Agreement Section */}
        {!license && (
          <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ShieldCheck className="h-6 w-6 text-blue-600 mr-3" />
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
                      <CheckCircle className="h-5 w-5 mr-2" />
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
                <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
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
                <FileText className="h-6 w-6 text-blue-600 mr-3" />
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <DownloadSimple className="h-6 w-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Download {brandName}
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                {platform === 'windows' && (
                  <button
                    onClick={() => handleDownload('exe')}
                    disabled={downloadingApp}
                    className="w-full flex items-center justify-between px-6 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                      </svg>
                      <div className="ml-4 text-left">
                        <p className="text-lg font-semibold">
                          Download for Windows (64-bit)
                        </p>
                        <p className="text-sm text-blue-100">
                          Windows installer (.exe) • ~335 MB
                        </p>
                      </div>
                    </div>
                    <DownloadSimple className="h-7 w-7 text-white" />
                  </button>
                )}

                {downloadingApp && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Preparing download...</p>
                  </div>
                )}

                {/* System requirements reminder */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <p>
                    <strong>Requires:</strong> Windows 10 (2004+) or Windows 11 • Includes auto-setup for WSL
                  </p>
                </div>

                {/* macOS/Linux coming soon */}
                {platform !== 'windows' && (
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {brandName} is currently available for Windows only.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      macOS and Linux versions coming soon
                    </p>
                  </div>
                )}

                {/* Platform note for all users */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <Info className="h-4 w-4 inline mr-1" />
                    macOS and Linux versions are in development
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Next steps:</strong> After downloading, right-click the installer and select &quot;Run as administrator&quot;. Sign in with your Lyceum credentials and your license will be automatically activated.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
