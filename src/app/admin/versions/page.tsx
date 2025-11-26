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
  ArrowPathIcon
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
  const [editingVersion, setEditingVersion] = useState<Version | null>(null)
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

  const handleSetLatest = async (version: Version) => {
    if (!confirm(`Set ${version.version_number} (${version.brand_type} ${version.installer_type}) as the latest version?`)) {
      return
    }

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const response = await fetch(`/api/admin/versions/${version.id}/set-latest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to set latest version')

      await loadVersions()
    } catch (err) {
      console.error('Error setting latest version:', err)
      alert(err instanceof Error ? err.message : 'Failed to set latest version')
    }
  }

  const handleUpdateURL = async (version: Version, newUrl: string) => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const response = await fetch(`/api/admin/versions/${version.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ download_url: newUrl })
      })

      if (!response.ok) throw new Error('Failed to update version')

      setEditingVersion(null)
      await loadVersions()
    } catch (err) {
      console.error('Error updating version:', err)
      alert(err instanceof Error ? err.message : 'Failed to update version')
    }
  }

  const handleSetStage = async (version: Version, newStage: 'unreleased' | 'testing' | 'production') => {
    const stageNames = {
      'unreleased': 'Unreleased',
      'testing': 'Testing',
      'production': 'Production'
    }

    if (!confirm(`Change ${version.version_number} (${version.brand_type} ${version.installer_type}) to ${stageNames[newStage]}?`)) {
      return
    }

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      const response = await fetch(`/api/admin/versions/${version.id}/set-stage`, {
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

  if (loading || loadingVersions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Application Versions
            </h1>
            <p className="mt-2 text-gray-600">
              Manage available versions for Lyceum Native and Centcom applications
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

        {/* Versions Table */}
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-lg overflow-hidden">
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
                  Release Stage
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
              {versions.map((version) => (
                <tr key={version.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {version.version_number}
                      </span>
                      {version.auto_update_enabled && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Latest
                        </span>
                      )}
                    </div>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {version.release_stage === 'unreleased' && (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unreleased
                          </span>
                          <button
                            onClick={() => handleSetStage(version, 'testing')}
                            className="text-xs text-blue-600 hover:text-blue-900"
                            title="Promote to Testing"
                          >
                            → Testing
                          </button>
                        </>
                      )}
                      {version.release_stage === 'testing' && (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Testing
                          </span>
                          <button
                            onClick={() => handleSetStage(version, 'production')}
                            className="text-xs text-green-600 hover:text-green-900"
                            title="Promote to Production"
                          >
                            → Production
                          </button>
                          <button
                            onClick={() => handleSetStage(version, 'unreleased')}
                            className="text-xs text-gray-600 hover:text-gray-900"
                            title="Demote to Unreleased"
                          >
                            ← Unreleased
                          </button>
                        </>
                      )}
                      {version.release_stage === 'production' && (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Production
                          </span>
                          <button
                            onClick={() => handleSetStage(version, 'testing')}
                            className="text-xs text-gray-600 hover:text-gray-900"
                            title="Demote to Testing"
                          >
                            ← Testing
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingVersion?.id === version.id ? (
                      <input
                        type="text"
                        defaultValue={version.download_url}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateURL(version, e.currentTarget.value)
                          } else if (e.key === 'Escape') {
                            setEditingVersion(null)
                          }
                        }}
                        onBlur={(e) => handleUpdateURL(version, e.value)}
                        autoFocus
                        className="w-full text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <span className="text-sm text-gray-500 truncate block max-w-md">
                        {version.download_url}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingVersion(version)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit URL"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {versions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No versions found</p>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Release Stage Management
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li><strong>Unreleased:</strong> New versions registered via GitHub Actions - not visible to users</li>
            <li><strong>Testing:</strong> Promoted for QA testing - can be distributed to testers</li>
            <li><strong>Production:</strong> Live for all users - automatically downloaded by desktop app</li>
            <li>• Only one version per brand/installer type can be in Testing or Production</li>
            <li>• Promoting a version automatically demotes the previous version in that stage</li>
            <li>• Click the edit icon to update download URLs</li>
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
