'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  PlusIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'

interface Project {
  id: string
  name: string
  description?: string
  project_type: string
  status: 'active' | 'paused' | 'completed' | 'error'
  created_at: string
  updated_at: string
  created_by: string
  configuration: Record<string, any>
  assets_count?: number
}

interface ProjectAsset {
  id: string
  project_id: string
  name: string
  asset_type: 'dashboard' | 'chart' | 'alert' | 'report'
  description?: string
  configuration: Record<string, any>
  created_at: string
}

interface ProjectTemplate {
  type: string
  name: string
  description: string
  icon: string
  default_config: Record<string, any>
  recommended: boolean
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    type: 'manufacturing_analytics',
    name: 'Manufacturing Analytics',
    description: 'Comprehensive production line monitoring and analysis',
    icon: '🏭',
    recommended: true,
    default_config: {
      max_curves: 100,
      refresh_interval: 30,
      auto_alerts: true,
      data_retention_days: 90
    }
  },
  {
    type: 'quality_control',
    name: 'Quality Control',
    description: 'Real-time quality monitoring and defect detection',
    icon: '✅',
    recommended: true,
    default_config: {
      quality_thresholds: { min: 95, target: 98 },
      defect_tracking: true,
      statistical_analysis: true
    }
  },
  {
    type: 'predictive_maintenance',
    name: 'Predictive Maintenance',
    description: 'Equipment health monitoring and failure prediction',
    icon: '🔧',
    recommended: false,
    default_config: {
      health_scoring: true,
      anomaly_detection: true,
      maintenance_scheduling: true
    }
  },
  {
    type: 'production_optimization',
    name: 'Production Optimization',
    description: 'Throughput analysis and bottleneck identification',
    icon: '📈',
    recommended: false,
    default_config: {
      oee_calculation: true,
      bottleneck_analysis: true,
      efficiency_tracking: true
    }
  },
  {
    type: 'custom',
    name: 'Custom Project',
    description: 'Build your own analytics solution',
    icon: '🛠️',
    recommended: false,
    default_config: {}
  }
]

interface ProjectManagementProps {
  clusterId: string
  onProjectSelect?: (project: Project) => void
}

export default function ProjectManagement({ clusterId, onProjectSelect }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_type: 'manufacturing_analytics'
  })

  const { user } = useAuth()

  useEffect(() => {
    loadProjects()
  }, [clusterId])

  const loadProjects = async () => {
    try {
      setLoading(true)
      
      // Get the access token from localStorage
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        throw new Error('No access token found')
      }
      
      const response = await fetch(`/api/clusters/${clusterId}/projects`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setProjects(data.projects || [])
      } else {
        throw new Error(data.error || 'Failed to load projects')
      }
      
    } catch (error) {
      console.error('Failed to load projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!formData.name.trim()) return
    
    try {
      setCreateLoading(true)
      
      // Get the access token from localStorage
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        throw new Error('No access token found')
      }
      
      const template = PROJECT_TEMPLATES.find(t => t.type === formData.project_type)
      
      const projectData = {
        name: formData.name,
        description: formData.description,
        project_type: formData.project_type,
        configuration: template?.default_config || {}
      }
      
      const response = await fetch(`/api/clusters/${clusterId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(projectData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setProjects(prev => [result.project, ...prev])
        setShowCreateForm(false)
        setFormData({ name: '', description: '', project_type: 'manufacturing_analytics' })
        
        // Auto-select the new project
        if (onProjectSelect) {
          onProjectSelect(result.project)
        }
      } else {
        throw new Error(result.error || 'Failed to create project')
      }
      
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleProjectAction = (project: Project, action: 'view' | 'edit' | 'delete' | 'pause' | 'resume') => {
    switch (action) {
      case 'view':
        setSelectedProject(project)
        if (onProjectSelect) {
          onProjectSelect(project)
        }
        break
      case 'edit':
        // TODO: Implement edit functionality
        console.log('Edit project:', project.id)
        break
      case 'delete':
        if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
          // TODO: Implement delete functionality
          console.log('Delete project:', project.id)
        }
        break
      case 'pause':
      case 'resume':
        // TODO: Implement pause/resume functionality
        console.log(`${action} project:`, project.id)
        break
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProjectIcon = (type: string) => {
    const template = PROJECT_TEMPLATES.find(t => t.type === type)
    return template?.icon || '📊'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading projects...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
          <p className="text-gray-600">Organize your manufacturing analytics projects</p>
        </div>
        
        <Button onClick={() => setShowCreateForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Set up a new manufacturing analytics project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Production Line Alpha Analytics"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Describe the purpose and scope of this project..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <Label>Project Template</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {PROJECT_TEMPLATES.map((template) => (
                  <Card 
                    key={template.type}
                    className={`cursor-pointer transition-all ${
                      formData.project_type === template.type 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, project_type: template.type }))}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{template.icon}</div>
                      <div className="font-semibold">{template.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                      {template.recommended && (
                        <Badge className="mt-2" variant="default">Recommended</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={!formData.name.trim() || createLoading}
              >
                {createLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-6">
              Create your first manufacturing analytics project to get started.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">{getProjectIcon(project.project_type)}</div>
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {PROJECT_TEMPLATES.find(t => t.type === project.project_type)?.name || project.project_type}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-gray-600">{project.description}</p>
                  )}
                  
                  <div className="text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                    {project.assets_count !== undefined && (
                      <div className="flex justify-between">
                        <span>Assets:</span>
                        <span>{project.assets_count}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProjectAction(project, 'view')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProjectAction(project, 'edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProjectAction(project, project.status === 'active' ? 'pause' : 'resume')}
                      >
                        {project.status === 'active' ? 
                          <PauseIcon className="h-4 w-4" /> : 
                          <PlayIcon className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleProjectAction(project, 'view')}
                    >
                      Open →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Project Details */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getProjectIcon(selectedProject.project_type)}</span>
              {selectedProject.name}
            </CardTitle>
            <CardDescription>
              Project details and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span>{PROJECT_TEMPLATES.find(t => t.type === selectedProject.project_type)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className={getStatusColor(selectedProject.status)}>
                      {selectedProject.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(selectedProject.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span>{formatDate(selectedProject.updated_at)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Configuration</h4>
                <div className="bg-gray-50 rounded p-3">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(selectedProject.configuration, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
