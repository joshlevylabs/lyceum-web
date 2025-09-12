'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  PuzzlePieceIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
  EyeIcon,
  PencilIcon,
  TagIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

interface Plugin {
  id: string
  plugin_id: string
  name: string
  description: string
  category: string
  version: string
  vendor: string
  price_tier: string
  requires_plugins: string[]
  is_active: boolean
  configuration_schema: Record<string, any>
  created_at: string
  updated_at: string
  usage_count?: number
  license_count?: number
}

export default function PluginManagement() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'measurement' | 'analysis' | 'integration' | 'visualization' | 'other'>('all')
  const [filterTier, setFilterTier] = useState<'all' | 'free' | 'standard' | 'premium' | 'enterprise'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadPlugins()
  }, [filterCategory, filterTier, filterStatus])

  const loadPlugins = async () => {
    try {
      setLoading(true)
      
      // TODO: Replace with actual API call when plugins table is ready
      const mockPlugins: Plugin[] = [
        {
          id: '1',
          plugin_id: 'klippel_qc',
          name: 'Klippel QC',
          description: 'Quality Control measurements and analysis for loudspeakers',
          category: 'measurement',
          version: '2.1.0',
          vendor: 'Klippel',
          price_tier: 'premium',
          requires_plugins: [],
          is_active: true,
          configuration_schema: {
            max_measurements: { type: 'number', default: 1000, description: 'Maximum measurements per license' },
            export_formats: { type: 'array', default: ['pdf', 'csv'], description: 'Available export formats' },
            measurement_types: { type: 'array', default: ['frequency_response', 'thd', 'distortion'], description: 'Supported measurement types' }
          },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-09-01T00:00:00Z',
          usage_count: 25,
          license_count: 8
        },
        {
          id: '2',
          plugin_id: 'apx500',
          name: 'APx500 Integration',
          description: 'Audio Precision APx500 measurement system integration',
          category: 'measurement',
          version: '1.8.5',
          vendor: 'Audio Precision',
          price_tier: 'enterprise',
          requires_plugins: [],
          is_active: true,
          configuration_schema: {
            max_channels: { type: 'number', default: 8, description: 'Maximum input channels' },
            sample_rates: { type: 'array', default: [48000, 96000, 192000], description: 'Supported sample rates' },
            generator_types: { type: 'array', default: ['sine', 'multitone', 'swept_sine'], description: 'Signal generator types' }
          },
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-08-15T00:00:00Z',
          usage_count: 12,
          license_count: 3
        },
        {
          id: '3',
          plugin_id: 'advanced_analytics',
          name: 'Advanced Analytics',
          description: 'Machine learning and predictive analytics tools',
          category: 'analysis',
          version: '3.0.2',
          vendor: 'Lyceum',
          price_tier: 'premium',
          requires_plugins: ['data_export'],
          is_active: true,
          configuration_schema: {
            ml_models: { type: 'number', default: 5, description: 'Number of ML models available' },
            batch_processing: { type: 'boolean', default: true, description: 'Enable batch processing' },
            model_types: { type: 'array', default: ['regression', 'classification', 'clustering'], description: 'Available model types' }
          },
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-09-05T00:00:00Z',
          usage_count: 45,
          license_count: 15
        },
        {
          id: '4',
          plugin_id: 'data_export',
          name: 'Data Export Plus',
          description: 'Enhanced data export with custom formats',
          category: 'integration',
          version: '2.3.1',
          vendor: 'Lyceum',
          price_tier: 'standard',
          requires_plugins: [],
          is_active: true,
          configuration_schema: {
            export_formats: { type: 'array', default: ['xlsx', 'csv', 'json', 'xml'], description: 'Available export formats' },
            auto_backup: { type: 'boolean', default: false, description: 'Automatic backup of exports' },
            max_file_size_mb: { type: 'number', default: 100, description: 'Maximum export file size' }
          },
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-08-20T00:00:00Z',
          usage_count: 67,
          license_count: 22
        },
        {
          id: '5',
          plugin_id: 'real_time_collaboration',
          name: 'Real-time Collaboration',
          description: 'Enhanced team collaboration features',
          category: 'other',
          version: '1.5.3',
          vendor: 'Lyceum',
          price_tier: 'standard',
          requires_plugins: [],
          is_active: true,
          configuration_schema: {
            max_collaborators: { type: 'number', default: 10, description: 'Maximum simultaneous collaborators' },
            live_chat: { type: 'boolean', default: true, description: 'Enable live chat' },
            screen_sharing: { type: 'boolean', default: false, description: 'Enable screen sharing' }
          },
          created_at: '2024-01-20T00:00:00Z',
          updated_at: '2024-08-30T00:00:00Z',
          usage_count: 34,
          license_count: 19
        },
        {
          id: '6',
          plugin_id: 'custom_dashboards',
          name: 'Custom Dashboards',
          description: 'Create custom visualization dashboards',
          category: 'visualization',
          version: '2.0.0',
          vendor: 'Lyceum',
          price_tier: 'premium',
          requires_plugins: ['data_export'],
          is_active: false,
          configuration_schema: {
            max_dashboards: { type: 'number', default: 20, description: 'Maximum number of custom dashboards' },
            custom_widgets: { type: 'boolean', default: true, description: 'Enable custom widget creation' },
            widget_types: { type: 'array', default: ['chart', 'table', 'gauge', 'map'], description: 'Available widget types' }
          },
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-07-15T00:00:00Z',
          usage_count: 8,
          license_count: 4
        }
      ]
      
      let filtered = mockPlugins
      
      if (filterCategory !== 'all') {
        filtered = filtered.filter(plugin => plugin.category === filterCategory)
      }
      
      if (filterTier !== 'all') {
        filtered = filtered.filter(plugin => plugin.price_tier === filterTier)
      }
      
      if (filterStatus !== 'all') {
        filtered = filtered.filter(plugin => 
          filterStatus === 'active' ? plugin.is_active : !plugin.is_active
        )
      }
      
      if (searchTerm) {
        filtered = filtered.filter(plugin =>
          plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plugin.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          plugin.plugin_id.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      setPlugins(filtered)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load plugins:', error)
      setLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'measurement': return '📏'
      case 'analysis': return '📊'
      case 'integration': return '🔗'
      case 'visualization': return '📈'
      default: return '🔧'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'measurement': return 'bg-blue-100 text-blue-800'
      case 'analysis': return 'bg-green-100 text-green-800'
      case 'integration': return 'bg-purple-100 text-purple-800'
      case 'visualization': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'premium': return 'bg-blue-100 text-blue-800'
      case 'standard': return 'bg-green-100 text-green-800'
      case 'free': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const togglePluginStatus = async (pluginId: string, currentStatus: boolean) => {
    // TODO: Implement plugin status toggle
    console.log('Toggle plugin status:', pluginId, !currentStatus)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Plugin Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage plugins available for license assignment and configuration
          </p>
        </div>
        
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/admin/plugins/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Plugin
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex flex-wrap gap-4">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Categories</option>
            <option value="measurement">Measurement</option>
            <option value="analysis">Analysis</option>
            <option value="integration">Integration</option>
            <option value="visualization">Visualization</option>
            <option value="other">Other</option>
          </select>
          
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Tiers</option>
            <option value="free">Free</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Plugins Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading plugins...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      <div className="text-2xl">{getCategoryIcon(plugin.category)}</div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{plugin.name}</h3>
                      <p className="text-sm text-gray-500">{plugin.plugin_id}</p>
                    </div>
                  </div>
                  {plugin.is_active ? 
                    <CheckCircleIcon className="h-5 w-5 text-green-500" /> :
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  }
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">{plugin.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(plugin.category)}`}>
                    {plugin.category}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(plugin.price_tier)}`}>
                    {plugin.price_tier}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    v{plugin.version}
                  </span>
                </div>

                {/* Vendor and Dependencies */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    <span>{plugin.vendor}</span>
                  </div>
                  
                  {plugin.requires_plugins.length > 0 && (
                    <div className="flex items-start">
                      <TagIcon className="h-4 w-4 mr-2 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">Requires:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {plugin.requires_plugins.map((dep) => (
                            <span key={dep} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-900">{plugin.usage_count}</div>
                    <div className="text-gray-500">Active Users</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-gray-900">{plugin.license_count}</div>
                    <div className="text-gray-500">Licenses</div>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-xs text-gray-500 mb-4">
                  <div>Created: {formatDate(plugin.created_at)}</div>
                  <div>Updated: {formatDate(plugin.updated_at)}</div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <div className="flex space-x-1">
                    <button className="p-1 text-blue-600 hover:text-blue-900" title="View details">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-blue-600 hover:text-blue-900" title="Edit plugin">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-blue-600 hover:text-blue-900" title="Configure">
                      <CogIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => togglePluginStatus(plugin.id, plugin.is_active)}
                    className={`text-sm font-medium ${
                      plugin.is_active 
                        ? 'text-red-600 hover:text-red-800' 
                        : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    {plugin.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && plugins.length === 0 && (
        <div className="text-center py-12">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No plugins found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No plugins match your search criteria.' : 'Get started by adding your first plugin.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <Link
                href="/admin/plugins/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add First Plugin
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

