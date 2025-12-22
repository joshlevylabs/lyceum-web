'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  PuzzlePiece,
  Plus,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash,
  X,
  FloppyDisk,
  CurrencyDollar,
  Clock,
  Tag
} from '@phosphor-icons/react'

interface Plugin {
  id: string
  name: string
  slug: string
  display_name: string
  short_description: string
  full_description: string
  category: string
  principle: string | null
  tags: string[]
  current_version: string
  base_price: number
  currency: string
  pricing_model: 'one_time' | 'subscription_monthly' | 'subscription_annual' | 'free' | 'enterprise'
  monthly_price: number | null
  annual_price: number | null
  has_free_trial: boolean
  trial_duration_days: number
  trial_requires_payment: boolean
  features: string[]
  is_published: boolean
  is_featured: boolean
  is_active: boolean
  publisher_name: string
  publisher_email: string
  total_downloads: number
  average_rating: number
  total_reviews: number
  active_license_count?: number
  created_at: string
  updated_at: string
}

type ModalMode = 'view' | 'edit' | 'create' | null

const emptyPlugin: Partial<Plugin> = {
  name: '',
  slug: '',
  display_name: '',
  short_description: '',
  full_description: '',
  category: 'other',
  principle: null,
  tags: [],
  current_version: '1.0.0',
  base_price: 49,
  currency: 'USD',
  pricing_model: 'subscription_monthly',
  monthly_price: 49,
  annual_price: null,
  has_free_trial: true,
  trial_duration_days: 30,
  trial_requires_payment: true,
  features: [],
  is_published: false,
  is_featured: false,
  is_active: true,
  publisher_name: 'Lyceum Audio Labs',
  publisher_email: 'support@lyceum.com'
}

export default function PluginManagement() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPublished, setFilterPublished] = useState<string>('all')

  // Modal states
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedPlugin, setSelectedPlugin] = useState<Partial<Plugin> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Feature input state
  const [newFeature, setNewFeature] = useState('')

  // Helper function to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    }
  }

  useEffect(() => {
    loadPlugins()
  }, [filterCategory, filterPublished])

  const loadPlugins = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      let url = '/api/admin/plugins?'

      if (filterCategory !== 'all') {
        url += `category=${filterCategory}&`
      }
      if (filterPublished !== 'all') {
        url += `is_published=${filterPublished === 'published'}&`
      }

      const response = await fetch(url, { headers })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plugins')
      }

      setPlugins(data.plugins || [])
    } catch (err: any) {
      console.error('Failed to load plugins:', err)
      setError(err.message || 'Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlugins = plugins.filter(plugin => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      plugin.name.toLowerCase().includes(search) ||
      plugin.display_name.toLowerCase().includes(search) ||
      plugin.slug.toLowerCase().includes(search) ||
      plugin.short_description?.toLowerCase().includes(search)
    )
  })

  const openModal = (mode: ModalMode, plugin?: Plugin) => {
    setModalMode(mode)
    setSelectedPlugin(mode === 'create' ? { ...emptyPlugin } : plugin ? { ...plugin } : null)
    setNewFeature('')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedPlugin(null)
    setNewFeature('')
  }

  const handleSave = async () => {
    if (!selectedPlugin) return

    try {
      setSaving(true)
      setError(null)

      const headers = await getAuthHeaders()

      if (modalMode === 'create') {
        const response = await fetch('/api/admin/plugins', {
          method: 'POST',
          headers,
          body: JSON.stringify(selectedPlugin)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create plugin')
        }

        setPlugins(prev => [data.plugin, ...prev])
      } else if (modalMode === 'edit') {
        const response = await fetch('/api/admin/plugins', {
          method: 'PUT',
          headers,
          body: JSON.stringify(selectedPlugin)
        })

        const data = await response.json()

        if (!response.ok) {
          const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
          throw new Error(errorMsg || 'Failed to update plugin')
        }

        setPlugins(prev => prev.map(p => p.id === data.plugin.id ? data.plugin : p))
      }

      closeModal()
    } catch (err: any) {
      console.error('Failed to save plugin:', err)
      setError(err.message || 'Failed to save plugin')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plugin: Plugin) => {
    if (!confirm(`Are you sure you want to delete "${plugin.display_name}"? This cannot be undone.`)) {
      return
    }

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/plugins?id=${plugin.id}`, {
        method: 'DELETE',
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete plugin')
      }

      setPlugins(prev => prev.filter(p => p.id !== plugin.id))
    } catch (err: any) {
      console.error('Failed to delete plugin:', err)
      alert(err.message || 'Failed to delete plugin')
    }
  }

  const togglePublished = async (plugin: Plugin) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/plugins', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: plugin.id,
          is_published: !plugin.is_published
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update plugin')
      }

      setPlugins(prev => prev.map(p => p.id === plugin.id ? { ...p, is_published: !p.is_published } : p))
    } catch (err: any) {
      console.error('Failed to toggle plugin status:', err)
      alert(err.message || 'Failed to update plugin')
    }
  }

  const addFeature = () => {
    if (newFeature.trim() && selectedPlugin) {
      setSelectedPlugin({
        ...selectedPlugin,
        features: [...(selectedPlugin.features || []), newFeature.trim()]
      })
      setNewFeature('')
    }
  }

  const removeFeature = (index: number) => {
    if (selectedPlugin) {
      const features = [...(selectedPlugin.features || [])]
      features.splice(index, 1)
      setSelectedPlugin({ ...selectedPlugin, features })
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'power': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'data-acquisition': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'video': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'power-delivery': 'bg-red-500/10 text-red-400 border-red-500/20',
      'networking': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'timing': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'audio': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'measurement': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    }
    return colors[category] || 'bg-foreground/10 text-foreground/60 border-foreground/20'
  }

  const formatPrice = (plugin: Plugin) => {
    if (plugin.pricing_model === 'free') return 'Free'
    if (plugin.pricing_model === 'enterprise') return 'Contact Sales'
    const price = plugin.monthly_price || plugin.base_price
    return `$${price}/mo`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get unique categories from plugins
  const categories = Array.from(new Set(plugins.map(p => p.category).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
            Plugin Management
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage plugins, pricing, and availability in the plugin store
          </p>
        </div>

        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => openModal('create')}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Plugin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="glass-card px-4 py-5">
          <dt className="text-sm font-medium text-foreground/60 truncate">Total Plugins</dt>
          <dd className="mt-1 text-3xl font-semibold text-foreground">{plugins.length}</dd>
        </div>
        <div className="glass-card px-4 py-5">
          <dt className="text-sm font-medium text-foreground/60 truncate">Published</dt>
          <dd className="mt-1 text-3xl font-semibold text-emerald-400">{plugins.filter(p => p.is_published).length}</dd>
        </div>
        <div className="glass-card px-4 py-5">
          <dt className="text-sm font-medium text-foreground/60 truncate">Draft</dt>
          <dd className="mt-1 text-3xl font-semibold text-amber-400">{plugins.filter(p => !p.is_published).length}</dd>
        </div>
        <div className="glass-card px-4 py-5">
          <dt className="text-sm font-medium text-foreground/60 truncate">Active Licenses</dt>
          <dd className="mt-1 text-3xl font-semibold text-cyan-400">{plugins.reduce((sum, p) => sum + (p.active_license_count || 0), 0)}</dd>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex flex-wrap gap-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="glass-input pl-3 pr-10 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={filterPublished}
            onChange={(e) => setFilterPublished(e.target.value)}
            className="glass-input pl-3 pr-10 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlass className="h-5 w-5 text-foreground/40" />
          </div>
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full pl-10 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Plugins Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500"></div>
          <span className="ml-2 text-foreground/60">Loading plugins...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPlugins.map((plugin) => (
            <div key={plugin.id} className="glass-card overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-foreground truncate">{plugin.display_name}</h3>
                    <p className="text-sm text-foreground/50">{plugin.slug}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {plugin.is_published ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <XCircle className="h-3 w-3 mr-1" />
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-foreground/60 mb-4 line-clamp-2">{plugin.short_description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {plugin.category && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(plugin.category)}`}>
                      {plugin.category}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-foreground/10 text-foreground/60 border border-foreground/20">
                    v{plugin.current_version}
                  </span>
                </div>

                {/* Pricing & Trial */}
                <div className="flex items-center justify-between mb-4 text-sm">
                  <div className="flex items-center text-foreground">
                    <CurrencyDollar className="h-4 w-4 mr-1 text-cyan-400" />
                    <span className="font-medium">{formatPrice(plugin)}</span>
                  </div>
                  {plugin.has_free_trial && (
                    <div className="flex items-center text-foreground/60">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{plugin.trial_duration_days}-day trial</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                  <div className="text-center p-2 bg-cyan-500/5 border border-cyan-500/10 rounded">
                    <div className="font-semibold text-foreground">{plugin.active_license_count || 0}</div>
                    <div className="text-foreground/50">Licenses</div>
                  </div>
                  <div className="text-center p-2 bg-cyan-500/5 border border-cyan-500/10 rounded">
                    <div className="font-semibold text-foreground">{plugin.total_downloads || 0}</div>
                    <div className="text-foreground/50">Downloads</div>
                  </div>
                  <div className="text-center p-2 bg-cyan-500/5 border border-cyan-500/10 rounded">
                    <div className="font-semibold text-foreground">{plugin.average_rating?.toFixed(1) || '0.0'}</div>
                    <div className="text-foreground/50">Rating</div>
                  </div>
                </div>

                {/* Features Preview */}
                {plugin.features && plugin.features.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-foreground/50 mb-1">{plugin.features.length} features</p>
                    <p className="text-xs text-foreground/60 truncate">
                      {plugin.features.slice(0, 2).join(' | ')}
                      {plugin.features.length > 2 && ' ...'}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t border-foreground/10">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal('view', plugin)}
                      className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal('edit', plugin)}
                      className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                      title="Edit plugin"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plugin)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete plugin"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => togglePublished(plugin)}
                    className={`text-sm font-medium transition-colors ${
                      plugin.is_published
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    {plugin.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredPlugins.length === 0 && (
        <div className="text-center py-12">
          <PuzzlePiece className="mx-auto h-12 w-12 text-foreground/40" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">No plugins found</h3>
          <p className="mt-1 text-sm text-foreground/60">
            {searchTerm ? 'No plugins match your search criteria.' : 'Get started by adding your first plugin.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => openModal('create')}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add First Plugin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plugin Modal */}
      {modalMode && selectedPlugin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background/95 backdrop-blur px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {modalMode === 'view' ? 'Plugin Details' : modalMode === 'create' ? 'Create Plugin' : 'Edit Plugin'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-foreground/10 rounded">
                <X className="h-5 w-5 text-foreground/60" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Basic Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                    <input
                      type="text"
                      value={selectedPlugin.name || ''}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, name: e.target.value })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="Plugin Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
                    <input
                      type="text"
                      value={selectedPlugin.slug || ''}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, slug: e.target.value })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="plugin-slug"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
                  <input
                    type="text"
                    value={selectedPlugin.display_name || ''}
                    onChange={(e) => setSelectedPlugin({ ...selectedPlugin, display_name: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                    placeholder="Display Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Short Description</label>
                  <input
                    type="text"
                    value={selectedPlugin.short_description || ''}
                    onChange={(e) => setSelectedPlugin({ ...selectedPlugin, short_description: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                    placeholder="Brief description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Description</label>
                  <textarea
                    value={selectedPlugin.full_description || ''}
                    onChange={(e) => setSelectedPlugin({ ...selectedPlugin, full_description: e.target.value })}
                    disabled={modalMode === 'view'}
                    rows={4}
                    className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                    placeholder="Detailed description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                    <input
                      type="text"
                      value={selectedPlugin.category || ''}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, category: e.target.value })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="Category"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Principle</label>
                    <input
                      type="text"
                      value={selectedPlugin.principle || ''}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, principle: e.target.value })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="Principle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Version</label>
                    <input
                      type="text"
                      value={selectedPlugin.current_version || ''}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, current_version: e.target.value })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="1.0.0"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Pricing</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Pricing Model</label>
                    <select
                      value={selectedPlugin.pricing_model || 'subscription_monthly'}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, pricing_model: e.target.value as any })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="free">Free</option>
                      <option value="one_time">One-time Purchase</option>
                      <option value="subscription_monthly">Monthly Subscription</option>
                      <option value="subscription_annual">Annual Subscription</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Base Price (USD)</label>
                    <input
                      type="number"
                      value={selectedPlugin.base_price || 0}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, base_price: parseFloat(e.target.value) })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Monthly Price (USD)</label>
                    <input
                      type="number"
                      value={selectedPlugin.monthly_price || ''}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, monthly_price: e.target.value ? parseFloat(e.target.value) : null })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Annual Price (USD)</label>
                    <input
                      type="number"
                      value={selectedPlugin.annual_price || ''}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, annual_price: e.target.value ? parseFloat(e.target.value) : null })}
                      disabled={modalMode === 'view'}
                      className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              {/* Trial Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Trial Settings</h3>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlugin.has_free_trial || false}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, has_free_trial: e.target.checked })}
                      disabled={modalMode === 'view'}
                      className="rounded border-cyan-500/30 text-cyan-500 focus:ring-cyan-500 mr-2"
                    />
                    <span className="text-sm text-foreground">Has Free Trial</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlugin.trial_requires_payment || false}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, trial_requires_payment: e.target.checked })}
                      disabled={modalMode === 'view'}
                      className="rounded border-cyan-500/30 text-cyan-500 focus:ring-cyan-500 mr-2"
                    />
                    <span className="text-sm text-foreground">Requires Payment Info</span>
                  </label>
                </div>

                <div className="w-1/3">
                  <label className="block text-sm font-medium text-foreground mb-1">Trial Duration (days)</label>
                  <input
                    type="number"
                    value={selectedPlugin.trial_duration_days || 30}
                    onChange={(e) => setSelectedPlugin({ ...selectedPlugin, trial_duration_days: parseInt(e.target.value) })}
                    disabled={modalMode === 'view'}
                    className="glass-input w-full px-3 py-2 text-sm disabled:opacity-50"
                    min="1"
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Features</h3>

                {modalMode !== 'view' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                      className="glass-input flex-1 px-3 py-2 text-sm"
                      placeholder="Add a feature..."
                    />
                    <button onClick={addFeature} className="btn-primary px-4">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {(selectedPlugin.features || []).map((feature, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {feature}
                      {modalMode !== 'view' && (
                        <button onClick={() => removeFeature(index)} className="ml-2 hover:text-red-400">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {(selectedPlugin.features || []).length === 0 && (
                    <span className="text-sm text-foreground/40">No features added</span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider">Status</h3>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlugin.is_published || false}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, is_published: e.target.checked })}
                      disabled={modalMode === 'view'}
                      className="rounded border-cyan-500/30 text-cyan-500 focus:ring-cyan-500 mr-2"
                    />
                    <span className="text-sm text-foreground">Published</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlugin.is_featured || false}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, is_featured: e.target.checked })}
                      disabled={modalMode === 'view'}
                      className="rounded border-cyan-500/30 text-cyan-500 focus:ring-cyan-500 mr-2"
                    />
                    <span className="text-sm text-foreground">Featured</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlugin.is_active !== false}
                      onChange={(e) => setSelectedPlugin({ ...selectedPlugin, is_active: e.target.checked })}
                      disabled={modalMode === 'view'}
                      className="rounded border-cyan-500/30 text-cyan-500 focus:ring-cyan-500 mr-2"
                    />
                    <span className="text-sm text-foreground">Active</span>
                  </label>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            {modalMode !== 'view' && (
              <div className="sticky bottom-0 bg-background/95 backdrop-blur px-6 py-4 border-t border-foreground/10 flex justify-end space-x-3">
                <button onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FloppyDisk className="h-4 w-4 mr-2" />
                      {modalMode === 'create' ? 'Create Plugin' : 'Save Changes'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
