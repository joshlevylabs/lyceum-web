'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

interface Version {
  id: string
  version_number: string
  platform: string
  brand_type: string
  installer_type: string
  is_stable: boolean
  is_supported: boolean
  auto_update_enabled: boolean
  release_stage: 'unreleased' | 'testing' | 'production'
  release_date: string
  download_url: string
  storage_path: string | null
}

export default function AdminVersionsPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  const [versions, setVersions] = useState<Version[]>([])
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newVersion, setNewVersion] = useState({
    version_number: '',
    brand_type: 'lyceum',
    installer_type: 'exe',
    platform: 'windows',
    download_url: '',
    release_stage: 'testing',
    file_size_bytes: '',
    sha256_hash: '',
    changelog_url: '',
    release_notes: ''
  })

  // Check if user is admin
  useEffect(() => {
    if (!loading && (!user || (userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin'))) {
      router.push('/dashboard')
    }
  }, [user, userProfile, loading, router])

  // Load versions
  useEffect(() => {
    if (!user || (userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin')) return

    loadVersions()
  }, [user, userProfile])

  const loadVersions = async () => {
    try {
      setLoadingVersions(true)
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const response = await fetch('/api/admin/versions', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to load versions')

      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      console.error('Error loading versions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleSetStage = async (versionId: string, newStage: 'unreleased' | 'testing' | 'production') => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const response = await fetch(`/api/admin/versions/${versionId}/set-stage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ release_stage: newStage })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to change release stage')
      }

      await loadVersions()
    } catch (err) {
      console.error('Error changing release stage:', err)
      alert(err instanceof Error ? err.message : 'Failed to change release stage')
    }
  }

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const payload: any = {
        version_number: newVersion.version_number,
        brand_type: newVersion.brand_type,
        installer_type: newVersion.installer_type,
        platform: newVersion.platform,
        download_url: newVersion.download_url,
        release_stage: newVersion.release_stage
      }

      // Add optional fields if provided
      if (newVersion.file_size_bytes) payload.file_size_bytes = parseInt(newVersion.file_size_bytes)
      if (newVersion.sha256_hash) payload.sha256_hash = newVersion.sha256_hash
      if (newVersion.changelog_url) payload.changelog_url = newVersion.changelog_url
      if (newVersion.release_notes) payload.release_notes = newVersion.release_notes

      const response = await fetch('/api/admin/versions/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create version')
      }

      // Reset form and close modal
      setNewVersion({
        version_number: '',
        brand_type: 'lyceum',
        installer_type: 'exe',
        platform: 'windows',
        download_url: '',
        release_stage: 'testing',
        file_size_bytes: '',
        sha256_hash: '',
        changelog_url: '',
        release_notes: ''
      })
      setShowAddModal(false)
      await loadVersions()
      alert('Version created successfully!')
    } catch (err) {
      console.error('Error creating version:', err)
      alert(err instanceof Error ? err.message : 'Failed to create version')
    }
  }

  // Helper to get versions by criteria
  const getVersion = (stage: string, installerType: string, brandType: string) => {
    return versions.find(v =>
      v.release_stage === stage &&
      v.installer_type === installerType &&
      v.brand_type === brandType
    )
  }

  // Get available versions for assignment (unreleased + current selection)
  const getAvailableVersions = (installerType: string, brandType: string, currentVersion?: Version) => {
    return versions.filter(v =>
      v.installer_type === installerType &&
      v.brand_type === brandType &&
      (v.release_stage === 'unreleased' || v.id === currentVersion?.id)
    )
  }

  // Render version slot component
  const VersionSlot = ({
    stage,
    installerType,
    brandType,
    stageName
  }: {
    stage: string
    installerType: string
    brandType: string
    stageName: string
  }) => {
    const currentVersion = getVersion(stage, installerType, brandType)
    const availableVersions = getAvailableVersions(installerType, brandType, currentVersion)

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 capitalize">
            {brandType}
          </h4>
          {currentVersion && (
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
              {currentVersion.auto_update_enabled ? 'Latest' : 'Active'}
            </span>
          )}
        </div>

        {currentVersion ? (
          <div>
            <div className="mb-2">
              <span className="text-lg font-bold text-gray-900">
                {currentVersion.version_number}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-3 truncate" title={currentVersion.download_url}>
              {currentVersion.download_url}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleSetStage(currentVersion.id, 'unreleased')}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Remove
              </button>
              {stage === 'testing' && (
                <button
                  onClick={() => handleSetStage(currentVersion.id, 'production')}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                >
                  → Production
                </button>
              )}
              {stage === 'production' && (
                <button
                  onClick={() => handleSetStage(currentVersion.id, 'testing')}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded"
                >
                  → Testing
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">No version assigned</p>
            {availableVersions.length > 0 ? (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleSetStage(e.target.value, stage as any)
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                defaultValue=""
              >
                <option value="">Select version...</option>
                {availableVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.version_number}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-gray-400 italic">
                No unreleased versions available
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading || loadingVersions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Group unreleased versions
  const unreleasedVersions = versions.filter(v => v.release_stage === 'unreleased')

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Application Versions
          </h1>
          <p className="mt-2 text-gray-600">
            Manage release stages for Lyceum and Centcom desktop applications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadVersions()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Version
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Production Section */}
      <div className="mb-8">
        <div className="bg-green-50 border border-green-200 rounded-t-lg px-6 py-4">
          <h2 className="text-xl font-bold text-green-900 flex items-center">
            <CheckCircleIcon className="h-6 w-6 mr-2" />
            Production
          </h2>
          <p className="text-sm text-green-700 mt-1">
            Live versions available to all users with auto-update enabled
          </p>
        </div>
        <div className="bg-white border border-green-200 border-t-0 rounded-b-lg p-6">
          {/* MSI Installers */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">MSI Installers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VersionSlot stage="production" installerType="msi" brandType="lyceum" stageName="Production" />
              <VersionSlot stage="production" installerType="msi" brandType="centcom" stageName="Production" />
            </div>
          </div>

          {/* EXE Installers */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">EXE Installers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VersionSlot stage="production" installerType="exe" brandType="lyceum" stageName="Production" />
              <VersionSlot stage="production" installerType="exe" brandType="centcom" stageName="Production" />
            </div>
          </div>
        </div>
      </div>

      {/* Testing Section */}
      <div className="mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-t-lg px-6 py-4">
          <h2 className="text-xl font-bold text-yellow-900 flex items-center">
            <XCircleIcon className="h-6 w-6 mr-2" />
            Testing
          </h2>
          <p className="text-sm text-yellow-700 mt-1">
            Versions in QA testing - can be distributed to testers
          </p>
        </div>
        <div className="bg-white border border-yellow-200 border-t-0 rounded-b-lg p-6">
          {/* MSI Installers */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">MSI Installers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VersionSlot stage="testing" installerType="msi" brandType="lyceum" stageName="Testing" />
              <VersionSlot stage="testing" installerType="msi" brandType="centcom" stageName="Testing" />
            </div>
          </div>

          {/* EXE Installers */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">EXE Installers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VersionSlot stage="testing" installerType="exe" brandType="lyceum" stageName="Testing" />
              <VersionSlot stage="testing" installerType="exe" brandType="centcom" stageName="Testing" />
            </div>
          </div>
        </div>
      </div>

      {/* Unreleased Versions Section */}
      <div className="mb-8">
        <div className="bg-gray-50 border border-gray-200 rounded-t-lg px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            Unreleased Versions ({unreleasedVersions.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            New versions registered via GitHub Actions - not visible to users
          </p>
        </div>
        {unreleasedVersions.length > 0 ? (
          <div className="bg-white border border-gray-200 border-t-0 rounded-b-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Download URL
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {unreleasedVersions.map((version) => (
                  <tr key={version.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {version.version_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {version.brand_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 uppercase">
                        {version.installer_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 truncate block max-w-md" title={version.download_url}>
                        {version.download_url}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleSetStage(version.id, 'testing')}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        → Testing
                      </button>
                      <button
                        onClick={() => handleSetStage(version.id, 'production')}
                        className="text-green-600 hover:text-green-900"
                      >
                        → Production
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 border-t-0 rounded-b-lg p-8 text-center">
            <p className="text-gray-500">No unreleased versions</p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          How to Manage Versions
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• New versions are automatically registered as "Unreleased" via GitHub Actions</li>
          <li>• Assign unreleased versions to "Testing" or "Production" slots using the dropdowns or action buttons</li>
          <li>• Only one version per brand/installer type can be in Testing or Production</li>
          <li>• Assigning a new version automatically demotes the previous version to unreleased</li>
          <li>• Use "Remove" to move a version back to unreleased status</li>
          <li>• Production versions have auto-update enabled for desktop applications</li>
        </ul>
      </div>

      {/* Create Version Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Version</h2>
            <p className="text-sm text-gray-600 mb-6">
              Manually create a test/mock version for testing auto-update functionality
            </p>

            <form onSubmit={handleCreateVersion}>
              <div className="space-y-4">
                {/* Version Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1.0.0"
                    value={newVersion.version_number}
                    onChange={(e) => setNewVersion({ ...newVersion, version_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Brand Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newVersion.brand_type}
                    onChange={(e) => setNewVersion({ ...newVersion, brand_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="lyceum">Lyceum</option>
                    <option value="centcom">Centcom</option>
                  </select>
                </div>

                {/* Installer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Installer Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newVersion.installer_type}
                    onChange={(e) => setNewVersion({ ...newVersion, installer_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="exe">EXE</option>
                    <option value="msi">MSI</option>
                  </select>
                </div>

                {/* Release Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Release Stage <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newVersion.release_stage}
                    onChange={(e) => setNewVersion({ ...newVersion, release_stage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="unreleased">Unreleased</option>
                    <option value="testing">Testing (recommended for mock versions)</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                {/* Download URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Download URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/installer.exe"
                    value={newVersion.download_url}
                    onChange={(e) => setNewVersion({ ...newVersion, download_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Optional Fields */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Optional Fields</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        File Size (bytes)
                      </label>
                      <input
                        type="number"
                        placeholder="125829120"
                        value={newVersion.file_size_bytes}
                        onChange={(e) => setNewVersion({ ...newVersion, file_size_bytes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SHA256 Hash
                      </label>
                      <input
                        type="text"
                        placeholder="abc123..."
                        value={newVersion.sha256_hash}
                        onChange={(e) => setNewVersion({ ...newVersion, sha256_hash: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Changelog URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/changelog"
                        value={newVersion.changelog_url}
                        onChange={(e) => setNewVersion({ ...newVersion, changelog_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Release Notes
                      </label>
                      <textarea
                        rows={3}
                        placeholder="What's new in this version..."
                        value={newVersion.release_notes}
                        onChange={(e) => setNewVersion({ ...newVersion, release_notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewVersion({
                      version_number: '',
                      brand_type: 'lyceum',
                      installer_type: 'exe',
                      platform: 'windows',
                      download_url: '',
                      release_stage: 'testing',
                      file_size_bytes: '',
                      sha256_hash: '',
                      changelog_url: '',
                      release_notes: ''
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
