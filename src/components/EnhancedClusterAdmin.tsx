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
  TrendingUp
} from 'lucide-react';

interface ClusterAssignment {
  id: string;
  cluster_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  assigned_by: string;
  access_level: 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer';
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  access_notes?: string;
}

interface ClusterWithAssignments {
  id: string;
  cluster_name: string;
  cluster_type: string;
  pricing_model: 'free' | 'trial' | 'paid' | 'subscription';
  cluster_price_monthly?: number;
  trial_start_date?: string;
  trial_end_date?: string;
  cluster_status: 'active' | 'trial' | 'expired' | 'suspended' | 'archived';
  max_assigned_users: number;
  owner_id: string;
  owner_email?: string;
  assigned_users: ClusterAssignment[];
}

interface AdminStats {
  totalClusters: number;
  activeClusters: number;
  trialClusters: number;
  expiredClusters: number;
  freeClusters: number;
  paidClusters: number;
  totalAssignedUsers: number;
}

export default function EnhancedClusterAdmin() {
  const [clusters, setClusters] = useState<ClusterWithAssignments[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterWithAssignments | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    userEmail: '',
    accessLevel: 'viewer' as ClusterAssignment['access_level'],
    expiresAt: '',
    accessNotes: ''
  });

  // Pricing form state
  const [pricingForm, setPricingForm] = useState({
    pricingModel: 'subscription' as 'free' | 'trial' | 'paid' | 'subscription',
    price: '',
    reason: ''
  });

  // Trial extension form state
  const [trialForm, setTrialForm] = useState({
    extensionDays: '',
    reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      // Fetch clusters with assignments
      const clustersResponse = await fetch('/api/admin/clusters/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!clustersResponse.ok) {
        throw new Error('Failed to fetch clusters');
      }

      const clustersData = await clustersResponse.json();
      setClusters(clustersData);

      // Calculate stats
      const calculatedStats: AdminStats = {
        totalClusters: clustersData.length,
        activeClusters: clustersData.filter((c: ClusterWithAssignments) => c.cluster_status === 'active').length,
        trialClusters: clustersData.filter((c: ClusterWithAssignments) => c.cluster_status === 'trial').length,
        expiredClusters: clustersData.filter((c: ClusterWithAssignments) => c.cluster_status === 'expired').length,
        freeClusters: clustersData.filter((c: ClusterWithAssignments) => c.pricing_model === 'free').length,
        paidClusters: clustersData.filter((c: ClusterWithAssignments) => c.pricing_model === 'paid').length,
        totalAssignedUsers: clustersData.reduce((sum: number, c: ClusterWithAssignments) => sum + c.assigned_users.length, 0)
      };
      setStats(calculatedStats);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignUser = async () => {
    if (!selectedCluster || !assignmentForm.userEmail.trim()) return;

    try {
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch('/api/admin/clusters/assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterId: selectedCluster.id,
          userEmail: assignmentForm.userEmail.trim(),
          accessLevel: assignmentForm.accessLevel,
          expiresAt: assignmentForm.expiresAt || null,
          accessNotes: assignmentForm.accessNotes.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign user');
      }

      // Reset form
      setAssignmentForm({
        userEmail: '',
        accessLevel: 'viewer',
        expiresAt: '',
        accessNotes: ''
      });

      // Refresh data
      await fetchData();
      alert('User assigned successfully!');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign user');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedCluster || !confirm('Are you sure you want to remove this user?')) return;

    try {
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch(`/api/admin/clusters/assignments/${selectedCluster.id}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      await fetchData();
      alert('User removed successfully!');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const handleUpdatePricing = async () => {
    if (!selectedCluster) return;

    try {
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch('/api/admin/clusters/pricing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterId: selectedCluster.id,
          pricingModel: pricingForm.pricingModel,
          price: pricingForm.pricingModel === 'paid' ? parseFloat(pricingForm.price) : null,
          reason: pricingForm.reason.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update pricing');
      }

      // Reset form
      setPricingForm({
        pricingModel: 'subscription',
        price: '',
        reason: ''
      });

      await fetchData();
      alert('Pricing updated successfully!');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update pricing');
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedCluster || !trialForm.extensionDays) return;

    try {
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch('/api/admin/clusters/trial/extend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterId: selectedCluster.id,
          extensionDays: parseInt(trialForm.extensionDays),
          reason: trialForm.reason.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extend trial');
      }

      // Reset form
      setTrialForm({
        extensionDays: '',
        reason: ''
      });

      await fetchData();
      alert('Trial extended successfully!');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to extend trial');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'expired': return 'destructive';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPricingBadgeColor = (pricing: string) => {
    switch (pricing) {
      case 'free': return 'secondary';
      case 'trial': return 'default';
      case 'paid': return 'default';
      case 'subscription': return 'default';
      default: return 'secondary';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Admin Panel</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Enhanced Cluster Administration</h1>
        <p className="text-gray-600">Manage cluster assignments, pricing, and trials</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalClusters}</div>
              <div className="text-xs text-muted-foreground">Total Clusters</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.activeClusters}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.trialClusters}</div>
              <div className="text-xs text-muted-foreground">Trial</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.expiredClusters}</div>
              <div className="text-xs text-muted-foreground">Expired</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{stats.freeClusters}</div>
              <div className="text-xs text-muted-foreground">Free</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.paidClusters}</div>
              <div className="text-xs text-muted-foreground">Paid</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.totalAssignedUsers}</div>
              <div className="text-xs text-muted-foreground">Assigned Users</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clusters List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Clusters ({clusters.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCluster?.id === cluster.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCluster(cluster)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm">{cluster.cluster_name}</h3>
                      <Badge variant={getStatusBadgeColor(cluster.cluster_status)}>
                        {cluster.cluster_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{cluster.cluster_type}</span>
                      <Badge variant={getPricingBadgeColor(cluster.pricing_model)}>
                        {cluster.pricing_model}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{cluster.assigned_users.length} users</span>
                      {cluster.cluster_price_monthly && (
                        <span>${cluster.cluster_price_monthly}/mo</span>
                      )}
                    </div>
                    {cluster.trial_end_date && (
                      <div className="text-xs text-orange-600 mt-1">
                        Trial ends: {new Date(cluster.trial_end_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cluster Details */}
        <div className="lg:col-span-2">
          {selectedCluster ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {selectedCluster.cluster_name}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant={getStatusBadgeColor(selectedCluster.cluster_status)}>
                    {selectedCluster.cluster_status}
                  </Badge>
                  <Badge variant={getPricingBadgeColor(selectedCluster.pricing_model)}>
                    {selectedCluster.pricing_model}
                  </Badge>
                  {selectedCluster.cluster_price_monthly && (
                    <Badge variant="outline">
                      ${selectedCluster.cluster_price_monthly}/month
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="users">Users ({selectedCluster.assigned_users.length})</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    {selectedCluster.pricing_model === 'trial' && (
                      <TabsTrigger value="trial">Trial</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Cluster Type</Label>
                        <p className="text-sm text-gray-600">{selectedCluster.cluster_type}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Owner</Label>
                        <p className="text-sm text-gray-600">{selectedCluster.owner_email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Max Users</Label>
                        <p className="text-sm text-gray-600">{selectedCluster.max_assigned_users}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Current Users</Label>
                        <p className="text-sm text-gray-600">{selectedCluster.assigned_users.length}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="users" className="space-y-4">
                    {/* Add User Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Assign New User
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="userEmail">User Email *</Label>
                            <Input
                              id="userEmail"
                              type="email"
                              value={assignmentForm.userEmail}
                              onChange={(e) => setAssignmentForm(prev => ({ ...prev, userEmail: e.target.value }))}
                              placeholder="user@example.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="accessLevel">Access Level</Label>
                            <Select
                              value={assignmentForm.accessLevel}
                              onValueChange={(value: any) => setAssignmentForm(prev => ({ ...prev, accessLevel: value }))}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="analyst">Analyst</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                            <Input
                              id="expiresAt"
                              type="datetime-local"
                              value={assignmentForm.expiresAt}
                              onChange={(e) => setAssignmentForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button onClick={handleAssignUser} className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Assign User
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="accessNotes">Notes (Optional)</Label>
                          <Textarea
                            id="accessNotes"
                            value={assignmentForm.accessNotes}
                            onChange={(e) => setAssignmentForm(prev => ({ ...prev, accessNotes: e.target.value }))}
                            placeholder="Additional notes about this assignment"
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Current Users */}
                    <div className="space-y-2">
                      {selectedCluster.assigned_users.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveUser(assignment.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="pricing" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Update Pricing Model
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="pricingModel">Pricing Model</Label>
                            <Select
                              value={pricingForm.pricingModel}
                              onValueChange={(value: any) => setPricingForm(prev => ({ ...prev, pricingModel: value }))}
                            >
                              <option value="free">Free</option>
                              <option value="trial">30-Day Trial</option>
                              <option value="paid">Paid</option>
                              <option value="subscription">Subscription-Based</option>
                            </Select>
                          </div>
                          {pricingForm.pricingModel === 'paid' && (
                            <div>
                              <Label htmlFor="price">Monthly Price ($)</Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={pricingForm.price}
                                onChange={(e) => setPricingForm(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="29.99"
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="reason">Change Reason</Label>
                          <Textarea
                            id="reason"
                            value={pricingForm.reason}
                            onChange={(e) => setPricingForm(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Reason for pricing change"
                            rows={2}
                          />
                        </div>
                        <Button onClick={handleUpdatePricing}>
                          Update Pricing
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {selectedCluster.pricing_model === 'trial' && (
                    <TabsContent value="trial" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Trial Management
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Trial Start Date</Label>
                              <p className="text-sm text-gray-600">
                                {selectedCluster.trial_start_date 
                                  ? new Date(selectedCluster.trial_start_date).toLocaleDateString()
                                  : 'Not set'
                                }
                              </p>
                            </div>
                            <div>
                              <Label>Trial End Date</Label>
                              <p className="text-sm text-gray-600">
                                {selectedCluster.trial_end_date 
                                  ? new Date(selectedCluster.trial_end_date).toLocaleDateString()
                                  : 'Not set'
                                }
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="text-lg font-medium mb-3">Extend Trial Period</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="extensionDays">Extension Days</Label>
                                <Input
                                  id="extensionDays"
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={trialForm.extensionDays}
                                  onChange={(e) => setTrialForm(prev => ({ ...prev, extensionDays: e.target.value }))}
                                  placeholder="30"
                                />
                              </div>
                              <div className="flex items-end">
                                <Button onClick={handleExtendTrial} className="w-full">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Extend Trial
                                </Button>
                              </div>
                            </div>
                            <div className="mt-4">
                              <Label htmlFor="trialReason">Extension Reason</Label>
                              <Textarea
                                id="trialReason"
                                value={trialForm.reason}
                                onChange={(e) => setTrialForm(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Reason for extending trial period"
                                rows={2}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Database className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Cluster Selected</h3>
                  <p>Select a cluster from the list to manage its users and settings.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
