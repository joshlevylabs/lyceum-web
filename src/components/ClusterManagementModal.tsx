"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Database,
  Users,
  DollarSign,
  Clock,
  Settings,
  Plus,
  Trash2,
  Edit,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Crown,
  Eye,
  UserPlus,
  TrendingUp,
  Server,
  HardDrive,
  Cpu,
  Activity,
  AlertCircle
} from 'lucide-react';

interface DatabaseCluster {
  id: string;
  name: string;
  description?: string;
  cluster_type: 'production' | 'development' | 'analytics';
  status: 'provisioning' | 'active' | 'maintenance' | 'error' | 'terminated';
  region: string;
  node_count: number;
  cpu_per_node: number;
  memory_per_node: string;
  storage_per_node: string;
  hot_tier_size?: string;
  warm_tier_size?: string;
  cold_tier_size?: string;
  archive_enabled: boolean;
  created_at: string;
  updated_at: string;
  health_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  estimated_monthly_cost?: number;
  actual_monthly_cost?: number;
  user_role: 'admin' | 'editor' | 'analyst' | 'viewer';
}

interface ClusterAssignment {
  id: string;
  user_email?: string;
  access_level: 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer';
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}

interface ClusterManagementModalProps {
  cluster: DatabaseCluster;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (cluster: DatabaseCluster) => void;
}

export default function ClusterManagementModal({ 
  cluster, 
  isOpen, 
  onClose, 
  onUpdate 
}: ClusterManagementModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState<ClusterAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    userEmail: '',
    accessLevel: 'viewer' as ClusterAssignment['access_level'],
    expiresAt: '',
    accessNotes: ''
  });

  const [pricingForm, setPricingForm] = useState({
    pricingModel: 'subscription' as 'free' | 'trial' | 'paid' | 'subscription',
    price: '',
    reason: ''
  });

  useEffect(() => {
    if (isOpen && cluster) {
      // Load additional cluster data when modal opens
      loadClusterAssignments();
    }
  }, [isOpen, cluster.id]);

  const loadClusterAssignments = async () => {
    try {
      setLoading(true);
      
      // Use the same token retrieval method as the main page
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('No access token found');
        return;
      }

      const response = await fetch(`/api/admin/clusters/assignments`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const clusterData = data.find((c: any) => c.id === cluster.id);
        setAssignments(clusterData?.assigned_users || []);
      } else {
        // Enhanced error handling - check if it's a 401 or other error
        let errorText = '';
        let errorData = null;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorText = JSON.stringify(errorData);
          } else {
            errorText = await response.text();
          }
        } catch (parseError) {
          errorText = 'Unable to parse error response';
        }
        
        console.error(`Failed to load cluster assignments: ${response.status}`, errorText);
        console.error('Error data:', errorData);
        
        // For now, gracefully handle this by setting empty assignments
        // This allows the modal to still open and show other cluster information
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading cluster assignments:', error);
      // Gracefully handle by setting empty assignments
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'provisioning': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'production': return 'bg-red-100 text-red-800';
      case 'development': return 'bg-blue-100 text-blue-800';
      case 'analytics': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteCluster = async () => {
    if (!cluster.id) return;

    try {
      setDeleting(true);
      
      // Use the same token retrieval method as the main page
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        alert('Authentication required. Please refresh and try again.');
        return;
      }

      const response = await fetch(`/api/clusters/${cluster.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Cluster deleted successfully!');
        setShowDeleteConfirm(false);
        onClose();
        // Trigger a page refresh or callback to update the main list
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete cluster: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting cluster:', error);
      alert('Failed to delete cluster. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin': return <Settings className="h-4 w-4 text-red-600" />;
      case 'editor': return <Edit className="h-4 w-4 text-blue-600" />;
      case 'analyst': return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'viewer': return <Eye className="h-4 w-4 text-gray-600" />;
      default: return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-6xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="h-7 w-7 text-blue-600" />
                {cluster.name}
              </h3>
              <p className="text-gray-600 mt-1">{cluster.description}</p>
              <div className="flex gap-2 mt-2">
                <Badge className={getStatusBadgeColor(cluster.status)}>
                  {cluster.status}
                </Badge>
                <Badge className={getTypeBadgeColor(cluster.cluster_type)}>
                  {cluster.cluster_type}
                </Badge>
                <Badge className={getHealthBadgeColor(cluster.health_status)}>
                  {cluster.health_status}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users ({assignments.length})</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Infrastructure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Region</span>
                      <span className="font-medium">{cluster.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nodes</span>
                      <span className="font-medium">{cluster.node_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CPU/Node</span>
                      <span className="font-medium">{cluster.cpu_per_node}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Memory/Node</span>
                      <span className="font-medium">{cluster.memory_per_node}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage/Node</span>
                      <span className="font-medium">{cluster.storage_per_node}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Storage Tiers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Storage Tiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hot Tier</span>
                      <span className="font-medium">{cluster.hot_tier_size || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Warm Tier</span>
                      <span className="font-medium">{cluster.warm_tier_size || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cold Tier</span>
                      <span className="font-medium">{cluster.cold_tier_size || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Archive</span>
                      <span className={`font-medium ${cluster.archive_enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {cluster.archive_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Cost Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated</span>
                      <span className="font-medium">
                        ${cluster.estimated_monthly_cost || 'N/A'}/month
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual</span>
                      <span className="font-medium">
                        ${cluster.actual_monthly_cost || 'N/A'}/month
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Your Role</span>
                      <Badge variant="outline">{cluster.user_role}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Created</Label>
                      <p className="font-medium">
                        {new Date(cluster.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Last Updated</Label>
                      <p className="font-medium">
                        {new Date(cluster.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Access Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading user assignments...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">User Assignments</h3>
                          <p className="text-gray-600 mb-2">
                            Enhanced user assignment features are being loaded.
                          </p>
                          <p className="text-sm text-blue-600">
                            Visit <span className="font-mono">/admin/cluster-management</span> for advanced user management.
                          </p>
                        </div>
                      ) : (
                        assignments.map((assignment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {getAccessLevelIcon(assignment.access_level)}
                              <div>
                                <p className="font-medium text-sm">{assignment.user_email}</p>
                                <p className="text-xs text-gray-600">
                                  {assignment.access_level} • Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                                </p>
                                {assignment.expires_at && (
                                  <p className="text-xs text-orange-600">
                                    Expires {new Date(assignment.expires_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                              {assignment.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Pricing Management</h3>
                    <p className="text-gray-600">Configure cluster pricing and billing options.</p>
                    <Button className="mt-4" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Dashboard</h3>
                    <p className="text-gray-600">View cluster performance metrics and analytics.</p>
                    <Button className="mt-4" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Cluster Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cluster Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Cluster Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">Cluster ID</Label>
                        <p className="font-mono text-sm bg-gray-50 p-2 rounded">{cluster.id}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Status</Label>
                        <p className="font-medium">{cluster.status}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Danger Zone */}
                  <div>
                    <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900">Delete Cluster</h4>
                          <p className="text-sm text-red-800 mt-1">
                            Once you delete a cluster, there is no going back. This will permanently delete 
                            the cluster and all associated data, projects, and configurations.
                          </p>
                          <div className="mt-3">
                            {!showDeleteConfirm ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={cluster.status === 'provisioning'}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Cluster
                              </Button>
                            ) : (
                              <div className="space-y-3">
                                <div className="bg-white border border-red-300 rounded-lg p-3">
                                  <p className="text-sm text-red-900 font-medium mb-2">
                                    Are you sure you want to delete "{cluster.name}"?
                                  </p>
                                  <p className="text-xs text-red-700">
                                    This action cannot be undone. All data will be permanently lost.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDeleteCluster}
                                    disabled={deleting}
                                  >
                                    {deleting ? (
                                      <>
                                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Yes, Delete Forever
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
