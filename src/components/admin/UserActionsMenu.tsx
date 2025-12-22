'use client'

import { useState, useRef, useEffect } from 'react'
import {
  DotsThreeVertical,
  Prohibit,
  Trash,
  ShieldWarning,
  ShieldCheck,
  SealCheck,
  X
} from '@phosphor-icons/react'

interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  banned_until?: string
}

interface UserActionsMenuProps {
  user: User
  onActionComplete?: () => void
}

export default function UserActionsMenu({ user, onActionComplete }: UserActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get auth headers for API calls
  const getAuthHeaders = async () => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    } catch (error) {
      console.error('Failed to get auth headers:', error)
      throw new Error('Authentication required - please refresh the page')
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleCheckEmail = async () => {
    setIsLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/users/check-email?email=${encodeURIComponent(user.email)}`, {
        headers
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check email')
      }

      if (data.isDisposable) {
        alert(`⚠️ Throwaway Email Detected!\n\nEmail: ${user.email}\nDomain: ${data.domain}\nReason: ${data.reason}`)
      } else {
        alert(`✓ Email appears legitimate\n\nEmail: ${user.email}\nDomain: ${data.domain}`)
      }
    } catch (error: any) {
      alert(`Failed to check email: ${error.message}`)
      console.error(error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const handleDeactivate = async () => {
    const action = user.is_active ? 'deactivate' : 'activate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.full_name}?`)) return

    setIsLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: user.id,
          is_active: !user.is_active
        })
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user')
      }

      alert(`User ${action}d successfully`)
      onActionComplete?.()
    } catch (error: any) {
      alert(`Failed to ${action} user: ${error.message}`)
      console.error(error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const handleBan = async () => {
    if (user.banned_until) {
      // Unban
      if (!confirm(`Unban ${user.full_name}? They will be able to log in again.`)) return

      setIsLoading(true)
      try {
        const headers = await getAuthHeaders()
        const response = await fetch('/api/admin/users/unban', {
          method: 'POST',
          headers,
          body: JSON.stringify({ user_id: user.id })
        })

        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to unban user')
        }

        alert('User unbanned successfully')
        onActionComplete?.()
      } catch (error: any) {
        alert(`Failed to unban user: ${error.message}`)
        console.error(error)
      } finally {
        setIsLoading(false)
        setIsOpen(false)
      }
    } else {
      // Ban
      const reason = prompt(`Why are you banning ${user.full_name}?`)
      if (reason === null) return // User cancelled

      if (!confirm(`Ban ${user.full_name}? They will not be able to log in.`)) return

      setIsLoading(true)
      try {
        const headers = await getAuthHeaders()
        const response = await fetch('/api/admin/users/ban', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: user.id,
            reason: reason || 'No reason provided'
          })
        })

        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to ban user')
        }

        alert('User banned successfully')
        onActionComplete?.()
      } catch (error: any) {
        alert(`Failed to ban user: ${error.message}`)
        console.error(error)
      } finally {
        setIsLoading(false)
        setIsOpen(false)
      }
    }
  }

  const handleDelete = async () => {
    if (!confirm(`⚠️ PERMANENTLY DELETE ${user.full_name}?\n\nThis will remove:\n• User account\n• All licenses\n• All invoices\n• All reviews\n• All data\n\nThis action CANNOT be undone!`)) return

    if (!confirm('Are you absolutely sure? Type the user\'s email to confirm.')) return

    const emailConfirm = prompt(`Type "${user.email}" to confirm deletion:`)
    if (emailConfirm !== user.email) {
      alert('Email does not match. Deletion cancelled.')
      return
    }

    setIsLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: user.id,
          confirm: true
        })
      })

      const data = await response.json()

      console.log('Delete response:', { status: response.status, ok: response.ok, data })

      if (!response.ok || !data.success) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to delete user')
        throw new Error(errorMsg)
      }

      alert('User permanently deleted')
      onActionComplete?.()
    } catch (error: any) {
      console.error('Delete user error:', error)
      alert(`Failed to delete user: ${error.message}`)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        title="User actions"
      >
        <DotsThreeVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu">
            {/* Check Email */}
            <button
              onClick={handleCheckEmail}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50"
            >
              <SealCheck className="h-4 w-4 mr-2 text-blue-600" />
              Check if Throwaway Email
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

            {/* Deactivate/Activate */}
            <button
              onClick={handleDeactivate}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50"
            >
              {user.is_active ? (
                <>
                  <Prohibit className="h-4 w-4 mr-2 text-orange-600" />
                  Deactivate User
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                  Activate User
                </>
              )}
            </button>

            {/* Ban/Unban */}
            <button
              onClick={handleBan}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center disabled:opacity-50"
            >
              {user.banned_until ? (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                  Unban User
                </>
              ) : (
                <>
                  <ShieldWarning className="h-4 w-4 mr-2 text-red-600" />
                  Ban User (Auth-Level)
                </>
              )}
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center disabled:opacity-50"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Permanently
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
