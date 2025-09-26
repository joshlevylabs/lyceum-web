'use client'

import { useState, useEffect } from 'react'

interface License {
  id: string
  key_id?: string
  key_code?: string
  license_type: string
  status: string
  responsible_user_id?: string
  source_table: 'licenses' | 'license_keys'
  expires_at?: string
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  full_name?: string
}

interface ResponsibleUserManagerProps {
  userId: string
  onClose?: () => void
}

export default function ResponsibleUserManager({ userId, onClose }: ResponsibleUserManagerProps) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState<string | null>(null)
  const [newResponsibleUser, setNewResponsibleUser] = useState('')
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  useEffect(() => {
    loadResponsibleLicenses()
  }, [userId])

  const loadResponsibleLicenses = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/licenses/get-responsible-licenses?user_id=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setLicenses(data.licenses || [])
        setUserProfile(data.user_profile)
      } else {
        console.error('Failed to load responsible licenses:', data.error)
      }
    } catch (error) {
      console.error('Error loading responsible licenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTransferResponsibility = async () => {
    if (!selectedLicense || !newResponsibleUser) return

    try {
      setTransferring(selectedLicense.id)
      
      const response = await fetch('/api/admin/licenses/set-responsible-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_id: selectedLicense.id,
          responsible_user_id: newResponsibleUser,
          table_name: selectedLicense.source_table
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`License responsibility transferred to ${result.responsible_user.full_name || result.responsible_user.email}`)
        await loadResponsibleLicenses() // Refresh the list
        setShowTransferModal(false)
        setSelectedLicense(null)
        setNewResponsibleUser('')
      } else {
        alert(`Failed to transfer responsibility: ${result.error}`)
      }
    } catch (error) {
      console.error('Error transferring responsibility:', error)
      alert('Error transferring responsibility')
    } finally {
      setTransferring(null)
    }
  }

  const openTransferModal = (license: License) => {
    setSelectedLicense(license)
    setShowTransferModal(true)
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Loading responsible licenses...</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">License Payment Responsibility</h3>
          <p className="text-gray-600 text-sm">
            {userProfile?.full_name || userProfile?.email} is responsible for {licenses.filter(l => l.status === 'active').length} active licenses
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {licenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>This user is not responsible for any license payments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {licenses.map(license => (
            <div key={license.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium">{license.key_id || license.key_code}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      license.status === 'active' ? 'bg-green-100 text-green-800' : 
                      license.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {license.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      license.license_type === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                      license.license_type === 'professional' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {license.license_type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Source: {license.source_table}</p>
                    <p>Created: {new Date(license.created_at).toLocaleDateString()}</p>
                    {license.expires_at && (
                      <p>Expires: {new Date(license.expires_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => openTransferModal(license)}
                  disabled={transferring === license.id}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  {transferring === license.id ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Transfer License Responsibility</h4>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Transfer payment responsibility for:
              </p>
              <p className="font-medium">{selectedLicense.key_id || selectedLicense.key_code}</p>
              <p className="text-sm text-gray-500">{selectedLicense.license_type} license</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Responsible User ID
              </label>
              <input
                type="text"
                value={newResponsibleUser}
                onChange={(e) => setNewResponsibleUser(e.target.value)}
                placeholder="Enter user ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the UUID of the user who should take payment responsibility
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTransferModal(false)
                  setSelectedLicense(null)
                  setNewResponsibleUser('')
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferResponsibility}
                disabled={!newResponsibleUser || transferring === selectedLicense.id}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Transfer Responsibility
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
