'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Copy,
  Search,
  Filter
} from 'lucide-react'

interface Coupon {
  id: string
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  max_uses: number | null
  times_used: number
  max_uses_per_user: number
  valid_from: string
  valid_until: string | null
  active: boolean
  created_at: string
}

export default function AdminCouponsPage() {
  const { userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')

  useEffect(() => {
    if (!authLoading && (!userProfile || !['admin', 'superadmin'].includes(userProfile.role))) {
      router.push('/dashboard')
    }
  }, [userProfile, authLoading, router])

  useEffect(() => {
    if (userProfile && ['admin', 'superadmin'].includes(userProfile.role)) {
      fetchCoupons()
    }
  }, [userProfile])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/coupons')
      if (response.ok) {
        const data = await response.json()
        setCoupons(data.coupons || [])
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.active) {
      return <Badge variant="secondary">Inactive</Badge>
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>
    }

    if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
      return <Badge variant="destructive">Limit Reached</Badge>
    }

    return <Badge variant="default" className="bg-green-500">Active</Badge>
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% off`
    }
    return `$${coupon.discount_value.toFixed(2)} off`
  }

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coupon.name.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (filterStatus === 'active') {
      return coupon.active && (!coupon.valid_until || new Date(coupon.valid_until) >= new Date())
    }
    if (filterStatus === 'inactive') {
      return !coupon.active
    }
    if (filterStatus === 'expired') {
      return coupon.valid_until && new Date(coupon.valid_until) < new Date()
    }
    return true
  })

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Coupon Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage discount coupons for users
            </p>
          </div>
          <Button onClick={() => router.push('/admin/coupons/create')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Coupon
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {coupons.length}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Coupons</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {coupons.filter(c => c.active && (!c.valid_until || new Date(c.valid_until) >= new Date())).length}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {coupons.filter(c => !c.active).length}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {coupons.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Expired</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('active')}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('inactive')}
                >
                  Inactive
                </Button>
                <Button
                  variant={filterStatus === 'expired' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('expired')}
                >
                  Expired
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coupons List */}
        <Card>
          <CardHeader>
            <CardTitle>Coupons ({filteredCoupons.length})</CardTitle>
            <CardDescription>
              Manage discount coupons and assign them to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCoupons.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchTerm || filterStatus !== 'all'
                    ? 'No coupons match your search criteria'
                    : 'No coupons created yet'}
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <Button onClick={() => router.push('/admin/coupons/create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Coupon
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCoupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded font-mono text-sm font-bold">
                            {coupon.code}
                          </code>
                          {getStatusBadge(coupon)}
                          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {getDiscountDisplay(coupon)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {coupon.name}
                        </h3>
                        {coupon.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {coupon.description}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Usage:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {coupon.times_used}
                              {coupon.max_uses && ` / ${coupon.max_uses}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Per User:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {coupon.max_uses_per_user || 'Unlimited'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Valid Until:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {coupon.valid_until
                                ? new Date(coupon.valid_until).toLocaleDateString()
                                : 'No expiration'
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Created:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {new Date(coupon.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/coupons/${coupon.id}/assign`)}
                        >
                          Assign to User
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/coupons/${coupon.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(coupon.code)
                            alert('Coupon code copied!')
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
