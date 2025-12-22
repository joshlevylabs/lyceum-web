'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  ArrowLeft,
  Key,
  Envelope,
  User,
  Buildings,
  ShieldCheck
} from '@phosphor-icons/react'

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
              className="inline-flex items-center text-foreground/60 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Users
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
            Invite New User
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Create and invite a new user to the platform
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
                <User className="inline h-5 w-5 mr-2 text-cyan-400" weight="duotone" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground/60">
                    Email Address *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Envelope className="h-5 w-5 text-cyan-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 rounded-xl glass-input text-foreground placeholder-foreground/40"
                      placeholder="user@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-foreground/60">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="mt-1 block w-full px-4 py-2.5 rounded-xl glass-input text-foreground placeholder-foreground/40"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-foreground/60">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="mt-1 block w-full px-4 py-2.5 rounded-xl glass-input text-foreground placeholder-foreground/40"
                    placeholder="jdoe"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-foreground/60">
                    Company *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Buildings className="h-5 w-5 text-cyan-400" />
                    </div>
                    <input
                      type="text"
                      id="company"
                      required
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 rounded-xl glass-input text-foreground placeholder-foreground/40"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Role & Permissions */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
                <ShieldCheck className="inline h-5 w-5 mr-2 text-cyan-400" weight="duotone" />
                Role & Permissions
              </h3>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-foreground/60">
                  User Role
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 rounded-xl glass-input text-foreground"
                >
                  <option value="viewer">Viewer - View only access</option>
                  <option value="analyst">Analyst - Data analysis and reporting</option>
                  <option value="engineer">Engineer - Full measurement capabilities</option>
                  <option value="admin">Admin - Full administrative access</option>
                </select>
                <p className="mt-1 text-xs text-foreground/60">
                  Role determines the user's permissions and access level in the platform
                </p>
              </div>
            </div>

            {/* License Options */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
                <Key className="inline h-5 w-5 mr-2 text-cyan-400" weight="duotone" />
                License Options
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="create_license"
                    type="checkbox"
                    checked={formData.create_license}
                    onChange={(e) => handleInputChange('create_license', e.target.checked)}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-cyan-500/20 rounded"
                  />
                  <label htmlFor="create_license" className="ml-2 block text-sm text-foreground">
                    Create license for this user
                  </label>
                </div>

                {formData.create_license && (
                  <div className="ml-6 space-y-4 border-l-2 border-cyan-500/20 pl-4">
                    <div>
                      <label htmlFor="license_type" className="block text-sm font-medium text-foreground/60">
                        License Type
                      </label>
                      <select
                        id="license_type"
                        value={formData.license_type}
                        onChange={(e) => handleInputChange('license_type', e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 rounded-xl glass-input text-foreground"
                      >
                        <option value="trial">Trial - 30 day trial license</option>
                        <option value="standard">Standard - Basic features</option>
                        <option value="professional">Professional - Advanced features</option>
                        <option value="enterprise">Enterprise - Full feature set</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="license_plugin" className="block text-sm font-medium text-foreground/60">
                        Plugin Access
                      </label>
                      <select
                        id="license_plugin"
                        value={formData.license_plugin}
                        onChange={(e) => handleInputChange('license_plugin', e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 rounded-xl glass-input text-foreground"
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
              <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
                <Envelope className="inline h-5 w-5 mr-2 text-cyan-400" weight="duotone" />
                Email Options
              </h3>
              <div className="flex items-center">
                <input
                  id="send_email"
                  type="checkbox"
                  checked={formData.send_email}
                  onChange={(e) => handleInputChange('send_email', e.target.checked)}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-cyan-500/20 rounded"
                />
                <label htmlFor="send_email" className="ml-2 block text-sm text-foreground">
                  Send invitation email to user
                </label>
              </div>
              <p className="mt-1 text-xs text-foreground/60">
                When enabled, the user will receive an email with login instructions and temporary password
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6">
              <Link
                href="/admin/users"
                className="btn-glass px-4 py-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !formData.email || !formData.company}
                className="btn-primary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500/20 border-t-cyan-500 mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="-ml-1 mr-2 h-5 w-5" />
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







