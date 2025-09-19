'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UserPlusIcon,
  ArrowLeftIcon,
  KeyIcon,
  EnvelopeIcon,
  UserIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function InviteUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    username: '',
    company: '',
    role: 'engineer',
    send_email: true,
    create_license: false,
    license_type: 'standard',
    license_plugin: 'basic'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const json = await res.json()
      
      if (!res.ok) {
        alert(`Failed to invite user: ${json.error || 'Unknown error'}`)
        return
      }

      alert(`User invited successfully! ${json.message || ''}`)
      router.push('/admin/users')
    } catch (error) {
      console.error('Invite error:', error)
      alert('Failed to invite user')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/users"
              className="inline-flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Users
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Invite New User
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and invite a new user to the platform
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <UserIcon className="inline h-5 w-5 mr-2" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="user@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="jdoe"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="company"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Role & Permissions */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <ShieldCheckIcon className="inline h-5 w-5 mr-2" />
                Role & Permissions
              </h3>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  User Role
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Viewer - View only access</option>
                  <option value="analyst">Analyst - Data analysis and reporting</option>
                  <option value="engineer">Engineer - Full measurement capabilities</option>
                  <option value="admin">Admin - Full administrative access</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Role determines the user's permissions and access level in the platform
                </p>
              </div>
            </div>

            {/* License Options */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <KeyIcon className="inline h-5 w-5 mr-2" />
                License Options
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="create_license"
                    type="checkbox"
                    checked={formData.create_license}
                    onChange={(e) => handleInputChange('create_license', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="create_license" className="ml-2 block text-sm text-gray-900">
                    Create license for this user
                  </label>
                </div>

                {formData.create_license && (
                  <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4">
                    <div>
                      <label htmlFor="license_type" className="block text-sm font-medium text-gray-700">
                        License Type
                      </label>
                      <select
                        id="license_type"
                        value={formData.license_type}
                        onChange={(e) => handleInputChange('license_type', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="trial">Trial - 30 day trial license</option>
                        <option value="standard">Standard - Basic features</option>
                        <option value="professional">Professional - Advanced features</option>
                        <option value="enterprise">Enterprise - Full feature set</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="license_plugin" className="block text-sm font-medium text-gray-700">
                        Plugin Access
                      </label>
                      <select
                        id="license_plugin"
                        value={formData.license_plugin}
                        onChange={(e) => handleInputChange('license_plugin', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="basic">Basic - Core functionality</option>
                        <option value="klippel_qc">Klippel QC - Quality control tools</option>
                        <option value="apx500">APx500 - Audio analyzer integration</option>
                        <option value="all">All Plugins - Full access</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email Options */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <EnvelopeIcon className="inline h-5 w-5 mr-2" />
                Email Options
              </h3>
              <div className="flex items-center">
                <input
                  id="send_email"
                  type="checkbox"
                  checked={formData.send_email}
                  onChange={(e) => handleInputChange('send_email', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="send_email" className="ml-2 block text-sm text-gray-900">
                  Send invitation email to user
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                When enabled, the user will receive an email with login instructions and temporary password
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6">
              <Link
                href="/admin/users"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !formData.email}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Invite User
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}





