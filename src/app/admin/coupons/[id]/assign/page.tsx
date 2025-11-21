'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, UserPlus, Search } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  max_uses_per_user: number
  active: boolean
}

interface User {
  id: string
  email: string
  full_name: string
  username: string
}

interface Assignment {
  id: string
  user_id: string
  user_email: string
  times_used: number
  assigned_at: string
  active: boolean
}

export default function AssignCouponPage() {
  const router = useRouter()
  const params = useParams()
  const couponId = params.id as string

  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchCouponAndAssignments()
    fetchUsers()
  }, [couponId])

  const fetchCouponAndAssignments = async () => {
    try {
      // Get session token for API authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No session token available')
        setLoading(false)
        return
      }

      const authHeaders = {
        'Authorization': `Bearer ${session.access_token}`
      }

      // Fetch coupon details
      const couponRes = await fetch(`/api/admin/coupons/${couponId}`, {
        headers: authHeaders
      })
      if (couponRes.ok) {
        const couponData = await couponRes.json()
        setCoupon(couponData.coupon)
      }

      // Fetch existing assignments
      const assignmentsRes = await fetch(`/api/admin/coupons/${couponId}/assignments`, {
        headers: authHeaders
      })
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData.assignments || [])
      }
    } catch (err) {
      console.error('Failed to fetch coupon:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      // Get session token for API authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No session token available')
        return
      }

      const response = await fetch('/api/admin/users/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      // Get session token for API authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No session token available. Please sign in again.')
      }

      const response = await fetch('/api/admin/coupons/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          coupon_id: couponId,
          user_id: selectedUserId,
          admin_notes: adminNotes || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign coupon')
      }

      // Show success message
      const assignedUser = users.find(u => u.id === selectedUserId)
      setSuccess(`Coupon successfully assigned to ${assignedUser?.email || 'user'}!`)

      // Refresh assignments list
      await fetchCouponAndAssignments()

      // Reset form
      setSelectedUserId('')
      setAdminNotes('')
      setSearchTerm('')

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign coupon')
    } finally {
      setSubmitting(false)
    }
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% off`
    }
    return `$${coupon.discount_value.toFixed(2)} off`
  }

  const filteredUsers = users.filter(user =>
    !assignments.some(a => a.user_id === user.id && a.active) && // Not already assigned
    (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.username?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!coupon) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Coupon not found</p>
        <Button onClick={() => router.push('/admin/coupons')} className="mt-4">
          Back to Coupons
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/coupons')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assign Coupon</h1>
            <p className="text-gray-600 mt-1">
              Assign coupon to users
            </p>
          </div>
        </div>

        {/* Coupon Info */}
        <Card className="!bg-white !border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <code className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-mono text-lg">
                    {coupon.code}
                  </code>
                  <Badge variant={coupon.active ? 'default' : 'secondary'}>
                    {coupon.active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2">
                  {coupon.name} - {getDiscountDisplay(coupon)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {coupon.description && (
            <CardContent>
              <p className="text-sm text-gray-600">{coupon.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Assignment Form */}
        <Card className="!bg-white !border-gray-200">
          <CardHeader>
            <CardTitle>Assign to User</CardTitle>
            <CardDescription>
              Select a user to assign this coupon to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssign} className="space-y-4">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by email, name, or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User *
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  <option value="">-- Select a user --</option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email} {user.full_name && `(${user.full_name})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  {filteredUsers.length} available users
                </p>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Reason for assignment, special conditions, etc."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Assign Coupon
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Current Assignments */}
        <Card className="!bg-white !border-gray-200">
          <CardHeader>
            <CardTitle>Current Assignments ({assignments.length})</CardTitle>
            <CardDescription>
              Users who have this coupon assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-center py-8 text-gray-600">
                No users assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {assignment.user_email}
                      </p>
                      <p className="text-sm text-gray-600">
                        Used {assignment.times_used} / {coupon.max_uses_per_user} times •
                        Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={assignment.active ? 'default' : 'secondary'}>
                      {assignment.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
