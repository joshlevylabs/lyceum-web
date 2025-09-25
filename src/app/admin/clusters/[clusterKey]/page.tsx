'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Users, Settings, BarChart3, DollarSign, AlertCircle, Plus, UserMinus, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DatabaseCluster {
  id: string;
  name: string;
  cluster_key?: string;
  cluster_type: string;
  status: string;
  created_at: string;
  region?: string;
  endpoint?: string;
  admin_user?: string;
}

interface UserAssignment {
  id: string;
  user_id: string;
  access_level: string;
  assigned_at: string;
  users: {
    email: string;
    raw_user_meta_data?: any;
  }
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  company?: string;
  role: string;
}

export default function ClusterManagementPage() {
  const params = useParams()
  const router = useRouter()
  const clusterKey = params?.clusterKey as string
  
  const [cluster, setCluster] = useState<DatabaseCluster | null>(null)
  const [assignments, setAssignments] = useState<UserAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview')
  
  // User assignment form state - Updated for user search
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [accessLevel, setAccessLevel] = useState('viewer')
  const [addingUser, setAddingUser] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  
  // User search state
  const [users, setUsers] = useState<User[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  
  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Pricing configuration state
  const [pricingModel, setPricingModel] = useState('free')
  const [monthlyPrice, setMonthlyPrice] = useState(0)
  const [trialLengthDays, setTrialLengthDays] = useState(30)
  const [maxUsers, setMaxUsers] = useState(1)
  const [requiresPayment, setRequiresPayment] = useState(false)
  const [savingPricing, setSavingPricing] = useState(false)

  // Admin-centric payment model state
  const [clusterAdmin, setClusterAdmin] = useState<User | null>(null)
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [basePrice, setBasePrice] = useState(29)
  const [pricePerUser, setPricePerUser] = useState(5)
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  
  // Trial extension state
  const [extendingTrial, setExtendingTrial] = useState(false)
  const [trialExtensionDays, setTrialExtensionDays] = useState(30)

  useEffect(() => {
    if (clusterKey) {
      loadClusterDetails()
      loadClusterAssignments()
    }
  }, [clusterKey])

  // Function to detect existing cluster admin from assignments
  const detectClusterAdmin = () => {
    if (assignments && assignments.length > 0) {
      const adminUser = assignments.find(assignment => 
        assignment.access_level === 'admin' && (assignment as any).is_active !== false
      );
      
      if (adminUser) {
        console.log('Detected existing cluster admin:', adminUser);
        setClusterAdmin({
          id: adminUser.user_id,
          email: adminUser.users?.email || (adminUser as any).user_email || 'Unknown',
          role: 'admin'
        });
      } else {
        setClusterAdmin(null);
      }
    } else {
      setClusterAdmin(null);
    }
  };

  // Detect cluster admin when assignments are loaded
  useEffect(() => {
    detectClusterAdmin();
  }, [assignments]);

  // Calculate dynamic pricing based on user count + base price
  useEffect(() => {
    if (pricingModel === 'paid' || pricingModel === 'trial') {
      const totalUsers = Math.max(1, maxUsers) // At least 1 user (admin)
      const adminUserCount = 1 // Admin doesn't count toward user pricing
      const additionalUsers = Math.max(0, totalUsers - adminUserCount)
      const calculated = basePrice + (additionalUsers * pricePerUser)
      setCalculatedPrice(calculated)
      setMonthlyPrice(calculated)
    } else {
      setCalculatedPrice(0)
      setMonthlyPrice(0)
    }
  }, [basePrice, pricePerUser, maxUsers, pricingModel])

  // Load users when search term changes
  useEffect(() => {
    if (userSearchTerm.length > 0) {
      loadUsers()
    } else {
      setUsers([])
      setShowUserDropdown(false)
    }
  }, [userSearchTerm])

  const loadClusterDetails = async () => {
    try {
      setLoading(true);
      
      // Get access token
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('No access token found');
        return;
      }

      // Use cluster key endpoint instead of ID endpoint
      const response = await fetch(`/api/clusters/by-key/${clusterKey}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Cluster API response:', data);
        setCluster(data.cluster);

        // Load pricing configuration for this cluster
        await loadClusterPricing(data.cluster.id, accessToken);
      } else {
        console.error(`Failed to load cluster details: ${response.status}`, await response.text());
        setCluster(null);
      }
    } catch (error) {
      console.error('Error loading cluster details:', error);
      setCluster(null);
    } finally {
      setLoading(false);
    }
  };

  const loadClusterAssignments = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('No access token found for assignments');
        return;
      }

      const response = await fetch(`/api/admin/clusters/assignments`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const allClustersWithAssignments = await response.json();
        // Find the cluster by key instead of ID
        const currentClusterData = allClustersWithAssignments.find((c: any) => 
          c.cluster_key === clusterKey || c.id === clusterKey
        );
        setAssignments(currentClusterData?.assigned_users || []);
      } else {
        let errorText = '';
        try {
          errorText = JSON.stringify(await response.json());
        } catch (parseError) {
          errorText = await response.text();
        }
        console.error(`Failed to load cluster assignments: ${response.status}`, errorText);
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading cluster assignments:', error);
      setAssignments([]);
    }
  };

  const loadClusterPricing = async (clusterId: string, accessToken: string) => {
    try {
      const response = await fetch(`/api/admin/clusters/pricing?clusterId=${clusterId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const pricingData = await response.json();
        if (pricingData.success && pricingData.data) {
          const pricing = pricingData.data;
          setPricingModel(pricing.pricing_model || 'free');
          setMonthlyPrice(pricing.monthly_price || 0);
          setTrialLengthDays(pricing.trial_length_days || 30);
          setMaxUsers(pricing.max_assigned_users || 10);
          setRequiresPayment(pricing.requires_payment || false);
        }
      } else {
        console.error('Failed to load pricing configuration:', response.status);
        // Set default values if pricing config doesn't exist
        setPricingModel('free');
        setMonthlyPrice(0);
        setTrialLengthDays(30);
        setMaxUsers(1);
        setRequiresPayment(false);
      }
    } catch (error) {
      console.error('Error loading pricing configuration:', error);
      // Set default values on error
      setPricingModel('free');
      setMonthlyPrice(0);
      setTrialLengthDays(30);
      setMaxUsers(1);
      setRequiresPayment(false);
    }
  };

  // Payment and trial validation functions
  const validateUserPayment = async (userId: string, accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/payment-status?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const paymentData = await response.json();
        return paymentData.hasValidPayment || false;
      } else {
        console.error('Failed to validate user payment status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error validating user payment:', error);
      return false;
    }
  };

  const checkTrialLimit = async (userId: string, accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/trial-status?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const trialData = await response.json();
        return !trialData.hasActiveTrial; // Return true if user does NOT have an active trial
      } else {
        console.error('Failed to check user trial status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error checking user trial status:', error);
      return false;
    }
  };

  // Trial extension functions
  const handleExtendTrial = async () => {
    if (!cluster?.id) {
      console.error('Cluster ID is missing for trial extension.');
      return;
    }

    try {
      setExtendingTrial(true);

      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('Authentication required. Please refresh and try again.');
        return;
      }

      const response = await fetch(`/api/admin/clusters/extend-trial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterId: cluster.id,
          extensionDays: trialExtensionDays
        }),
      });

      if (response.ok) {
        console.log('Trial period extended successfully');
        loadClusterDetails(); // Reload to show updated trial info
      } else {
        const errorData = await response.json();
        console.error(`Failed to extend trial: ${errorData.error || 'Unknown error'}`);
        alert(`Failed to extend trial: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error extending trial:', error);
      alert('Error extending trial. Please try again.');
    } finally {
      setExtendingTrial(false);
    }
  };

  const handleDeleteCluster = async () => {
    if (!cluster?.id) return;

    try {
      setDeleting(true);
      
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('Authentication required. Please refresh and try again.');
        return;
      }

      // Still use cluster ID for deletion since that's the primary key
      const response = await fetch(`/api/clusters/${cluster.id}?confirm=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        router.push('/admin/clusters');
      } else {
        const errorData = await response.json();
        console.error(`Failed to delete cluster: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting cluster:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Load users for search
  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      
      const response = await fetch(`/api/admin/users/list?search=${encodeURIComponent(userSearchTerm)}&limit=10`)
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setShowUserDropdown(true)
      } else {
        console.error('Failed to load users:', response.status)
        setUsers([])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // User assignment functions
  const handleAddUser = async () => {
    if (!selectedUser || !cluster?.id) return;

    try {
      setAddingUser(true);
      
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('Authentication required. Please refresh and try again.');
        return;
      }

      // Check if payment validation is required
      if (requiresPayment && (pricingModel === 'paid' || pricingModel === 'trial')) {
        const paymentValid = await validateUserPayment(selectedUser.id, accessToken);
        if (!paymentValid) {
          console.error('User does not have valid payment information. Cannot assign to paid cluster.');
          alert('This user must have valid payment information before being assigned to a paid cluster. Please set up their payment information in the Payment tab first.');
          return;
        }
      }

      // Check trial limit (one cluster per user for trial clusters)
      if (pricingModel === 'trial') {
        const trialLimitOk = await checkTrialLimit(selectedUser.id, accessToken);
        if (!trialLimitOk) {
          console.error('User already has a trial cluster. Cannot assign another trial cluster.');
          alert('This user already has access to a trial cluster. Users can only access one trial cluster at a time.');
          return;
        }
      }

      const response = await fetch(`/api/admin/clusters/assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterId: cluster.id, // Use actual cluster ID for the API
          userEmail: selectedUser.email,
          accessLevel: accessLevel,
        }),
      });

      if (response.ok) {
        setSelectedUser(null);
        setUserSearchTerm('');
        setAccessLevel('viewer');
        setShowUserDropdown(false);
        loadClusterAssignments();
      } else {
        const errorData = await response.json();
        console.error(`Failed to assign user: ${errorData.error || 'Unknown error'}`);
        alert(`Failed to assign user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error assigning user:', error);
      alert('Error assigning user. Please try again.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!cluster?.id) return;

    try {
      setRemovingUserId(userId);
      
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('Authentication required. Please refresh and try again.');
        return;
      }

      const response = await fetch(`/api/admin/clusters/assignments/${cluster.id}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        loadClusterAssignments();
      } else {
        const errorData = await response.json();
        console.error(`Failed to remove user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing user:', error);
    } finally {
      setRemovingUserId(null);
    }
  };

  // Pricing configuration functions
  const handleSavePricing = async () => {
    if (!cluster?.id) {
      console.error('Cluster ID is missing for pricing update.');
      return;
    }

    try {
      setSavingPricing(true);

      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        console.error('Authentication required. Please refresh and try again.');
        return;
      }

      const pricingData = {
        pricing_model: pricingModel,
        monthly_price: monthlyPrice,
        trial_length_days: trialLengthDays,
        max_assigned_users: maxUsers,
        requires_payment: requiresPayment
      };

      const response = await fetch(`/api/admin/clusters/pricing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterId: cluster.id,
          ...pricingData
        }),
      });

      if (response.ok) {
        console.log('Pricing configuration saved successfully');
        // Optionally reload cluster details to show updated pricing
        loadClusterDetails();
      } else {
        const errorData = await response.json();
        console.error(`Failed to save pricing: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving pricing configuration:', error);
    } finally {
      setSavingPricing(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500'
    switch (status.toLowerCase()) {
      case 'running':
      case 'active': return 'bg-green-500'
      case 'provisioning': return 'bg-yellow-500'
      case 'stopped':
      case 'error': return 'bg-red-500'
      case 'maintenance': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeColor = (type: string | undefined) => {
    if (!type) return 'bg-gray-500'
    switch (type.toLowerCase()) {
      case 'development': return 'bg-blue-500'
      case 'manufacturing_analytics': return 'bg-purple-500'
      case 'production': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading cluster details...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!cluster) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/admin/clusters" className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Clusters
            </Link>
          </div>
          <div className="text-center py-12">
            <h3 className="mt-2 text-lg font-medium text-gray-900">Cluster Not Found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The cluster "{clusterKey}" does not exist or you do not have access.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/clusters" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Clusters
          </Link>
        </div>

        <div className="flex items-center mb-4 space-x-3">
          <h1 className="text-3xl font-bold text-gray-900">{cluster.name || 'Loading...'}</h1>
          <Badge className={`${getTypeColor(cluster.cluster_type)} text-white`}>{cluster.cluster_type?.replace('_', ' ')?.toUpperCase() || 'LOADING'}</Badge>
          <Badge className={`${getStatusColor(cluster.status)} text-white`}>{cluster.status?.toUpperCase() || 'LOADING'}</Badge>
          <span className="text-sm text-gray-500">Created: {cluster.created_at ? new Date(cluster.created_at).toLocaleDateString() : 'Loading...'}</span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Users className="w-4 h-4" />
              Users ({assignments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="pricing" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <DollarSign className="w-4 h-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <BarChart3 className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
            >
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Cluster Key</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-mono font-bold text-blue-600">
                    {cluster.cluster_key || `CLSTR-${Math.floor(Math.random() * 100) + 1}`}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Cluster ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-mono text-gray-900">{cluster.id || 'Loading...'}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-gray-900">{cluster.region || 'us-east-1'}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Admin User</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-gray-900">{cluster.admin_user || 'admin'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional overview content can be added here */}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Add New User Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add User to Cluster
                </CardTitle>
                <CardDescription>
                  Assign a user access to this cluster with specific permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="userSearch">Search User</Label>
                    <Input
                      id="userSearch"
                      type="text"
                      placeholder="Search by name or email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      disabled={addingUser}
                    />
                    {showUserDropdown && users.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setSelectedUser(user)
                              setUserSearchTerm(user.email)
                              setShowUserDropdown(false)
                            }}
                          >
                            <div className="font-medium text-gray-900">{user.email}</div>
                            {user.full_name && (
                              <div className="text-sm text-gray-600">{user.full_name}</div>
                            )}
                            {user.company && (
                              <div className="text-xs text-gray-500">{user.company}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedUser && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md">
                        <div className="text-sm font-medium text-blue-900">Selected: {selectedUser.email}</div>
                        {selectedUser.full_name && (
                          <div className="text-xs text-blue-700">{selectedUser.full_name}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accessLevel">Access Level</Label>
                    <Select value={accessLevel} onValueChange={setAccessLevel}>
                      <SelectTrigger className={addingUser ? 'opacity-50 cursor-not-allowed' : ''}>
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                        <SelectItem value="analyst">Analyst - Query and view data</SelectItem>
                        <SelectItem value="editor">Editor - Modify data and settings</SelectItem>
                        <SelectItem value="admin">Admin - Full cluster management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleAddUser}
                      disabled={addingUser || !selectedUser}
                      className="w-full"
                    >
                      {addingUser ? 'Adding...' : 'Add User'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current User Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Current User Assignments
                </CardTitle>
                <CardDescription>
                  Users currently with access to this cluster
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignments.length > 0 ? (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {assignment.users?.email || 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Badge variant="outline" className="text-xs">
                                {assignment.access_level}
                              </Badge>
                              <span>•</span>
                              <span>
                                Added {new Date(assignment.assigned_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveUser(assignment.user_id)}
                          disabled={removingUserId === assignment.user_id}
                          className="flex items-center gap-2"
                        >
                          {removingUserId === assignment.user_id ? (
                            'Removing...'
                          ) : (
                            <>
                              <UserMinus className="w-4 h-4" />
                              Remove
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Assigned</h3>
                    <p className="text-sm mb-4">
                      This cluster doesn't have any user assignments yet.
                    </p>
                    <p className="text-xs text-gray-400">
                      Use the form above to assign users to this cluster
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            {/* Admin-Centric Payment Model */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Cluster Admin & Billing
                </CardTitle>
                <CardDescription>
                  Assign a cluster admin who will be responsible for payment and can add additional users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Admin-Based Payment Model</h4>
                  <p className="text-sm text-blue-700">
                    One cluster admin with valid payment information is responsible for the entire cluster cost. 
                    They can then add additional users with various access levels. Pricing is based on cluster specs + number of users.
                  </p>
                </div>

                {clusterAdmin ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-800">Cluster Admin Assigned</h4>
                        <p className="text-sm text-green-700">{clusterAdmin.email}</p>
                        <p className="text-xs text-orange-600">⚠️ Payment information not yet configured - <button onClick={() => router.push(`/admin/users/${clusterAdmin.id}/billing`)} className="underline text-blue-600 hover:text-blue-800">Set up billing</button></p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClusterAdmin(null)}
                        className="text-green-800 border-green-300"
                      >
                        Change Admin
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">⚠️ Select Cluster Admin</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Choose an admin user who will be responsible for payment and billing.
                    </p>
                    
                    {/* Admin Selection Dropdown */}
                    <div className="space-y-3">
                      <Label htmlFor="adminSelect">Select Admin User</Label>
                      <Select 
                        value={selectedAdminId || ''} 
                        onValueChange={(value) => {
                          setSelectedAdminId(value);
                          const selectedAdmin = assignments.find(a => a.user_id === value && a.access_level === 'admin');
                          if (selectedAdmin) {
                            setClusterAdmin({
                              id: selectedAdmin.user_id,
                              email: selectedAdmin.users?.email || (selectedAdmin as any).user_email || 'Unknown',
                              role: 'admin'
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an admin user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {assignments
                            .filter(assignment => assignment.access_level === 'admin')
                            .map((assignment) => (
                              <SelectItem key={assignment.user_id} value={assignment.user_id}>
                                <div className="flex items-center gap-2">
                                  <span>{assignment.users?.email || (assignment as any).user_email || 'Unknown'}</span>
                                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                                </div>
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      
                      {assignments.filter(a => a.access_level === 'admin').length === 0 && (
                        <div className="text-sm text-gray-600">
                          <p>No admin users found. Please assign admin access to a user first.</p>
                          <Button
                            onClick={() => setActiveTab('users')}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                          >
                            Go to Users Tab
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Model Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing Model
                </CardTitle>
                <CardDescription>
                  Configure billing model and pricing structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      pricingModel === 'free' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPricingModel('free')}
                  >
                    <h3 className="font-medium text-green-600 mb-2">Free Access</h3>
                    <p className="text-sm text-gray-600">
                      No payment required. Ideal for development and testing.
                    </p>
                    <div className="mt-3 text-2xl font-bold text-green-600">$0/month</div>
                  </div>
                  
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      pricingModel === 'trial' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPricingModel('trial')}
                  >
                    <h3 className="font-medium text-blue-600 mb-2">Trial Period</h3>
                    <p className="text-sm text-gray-600">
                      Free access for limited time, then admin pays. Perfect for evaluation.
                    </p>
                    <div className="mt-3 text-lg font-bold text-blue-600">{trialLengthDays} days free</div>
                    <div className="text-sm text-gray-500">then ${calculatedPrice}/month</div>
                  </div>
                  
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      pricingModel === 'paid' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPricingModel('paid')}
                  >
                    <h3 className="font-medium text-purple-600 mb-2">Paid Access</h3>
                    <p className="text-sm text-gray-600">
                      Admin pays immediately. Suitable for production workloads.
                    </p>
                    <div className="mt-3 text-2xl font-bold text-purple-600">${calculatedPrice}/month</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Pricing Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Dynamic Pricing Calculator</CardTitle>
                <CardDescription>
                  Configure pricing based on cluster specifications and user count
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(pricingModel === 'paid' || pricingModel === 'trial') && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">💰 Pricing Formula</h4>
                    <div className="text-sm text-gray-600 mb-4">
                      <code className="bg-white px-2 py-1 rounded">
                        Total Cost = Base Price + (Additional Users × Price Per User)
                      </code>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="basePrice">Base Price (USD)</Label>
                        <Input
                          id="basePrice"
                          type="number"
                          min="0"
                          step="1"
                          value={basePrice}
                          onChange={(e) => setBasePrice(parseInt(e.target.value) || 29)}
                          placeholder="29"
                        />
                        <p className="text-xs text-gray-500">
                          Base cluster cost (admin included)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pricePerUser">Price Per User (USD)</Label>
                        <Input
                          id="pricePerUser"
                          type="number"
                          min="0"
                          step="1"
                          value={pricePerUser}
                          onChange={(e) => setPricePerUser(parseInt(e.target.value) || 5)}
                          placeholder="5"
                        />
                        <p className="text-xs text-gray-500">
                          Cost per additional user
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxUsers">Maximum Users</Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          min="1"
                          value={maxUsers}
                          onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                          placeholder="1"
                        />
                        <p className="text-xs text-gray-500">
                          Total users (including admin)
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-800">Calculated Monthly Cost:</span>
                        <span className="text-2xl font-bold text-blue-600">${calculatedPrice}</span>
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        ${basePrice} base + {Math.max(0, maxUsers - 1)} users × ${pricePerUser} = ${calculatedPrice}
                      </div>
                    </div>
                  </div>
                )}

                {/* Trial Configuration */}
                {pricingModel === 'trial' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trialLength">Trial Period (Days)</Label>
                        <Input
                          id="trialLength"
                          type="number"
                          min="1"
                          max="365"
                          value={trialLengthDays}
                          onChange={(e) => setTrialLengthDays(parseInt(e.target.value) || 30)}
                          placeholder="30"
                        />
                        <p className="text-sm text-gray-500">
                          How long admin gets free access before payment
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="trialExtension">Extend Trial (Days)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="trialExtension"
                            type="number"
                            min="1"
                            max="365"
                            value={trialExtensionDays}
                            onChange={(e) => setTrialExtensionDays(parseInt(e.target.value) || 30)}
                            placeholder="30"
                          />
                          <Button
                            onClick={handleExtendTrial}
                            disabled={extendingTrial}
                            variant="outline"
                            size="sm"
                          >
                            {extendingTrial ? 'Extending...' : 'Extend'}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Superuser can extend active trials
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Responsibilities</CardTitle>
                <CardDescription>
                  What the assigned cluster admin is responsible for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-green-700">✅ Admin Responsibilities</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Pay all cluster costs monthly</li>
                      <li>• Manage user access and permissions</li>
                      <li>• Monitor cluster usage and performance</li>
                      <li>• Approve additional user requests</li>
                      <li>• Maintain valid payment information</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-blue-700">👥 Additional Users</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• No payment responsibility</li>
                      <li>• Access granted by admin</li>
                      <li>• Various access levels available</li>
                      <li>• Can be added/removed by admin</li>
                      <li>• Cost covered by admin's payment</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Configuration */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSavePricing()}
                    disabled={savingPricing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {savingPricing ? 'Saving...' : 'Save Pricing Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Current Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700">Pricing Model</h4>
                    <p className="text-lg font-semibold capitalize">{pricingModel}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700">Monthly Cost</h4>
                    <p className="text-lg font-semibold">
                      {pricingModel === 'free' ? 'Free' : `$${monthlyPrice}/month`}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700">User Limit</h4>
                    <p className="text-lg font-semibold">{maxUsers} {maxUsers === 1 ? 'user' : 'users'}</p>
                  </div>
                  {pricingModel === 'trial' && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-700">Trial Period</h4>
                      <p className="text-lg font-semibold">{trialLengthDays} days</p>
                    </div>
                  )}
                  {(pricingModel === 'paid' || pricingModel === 'trial') && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-700">Payment Required</h4>
                      <p className="text-lg font-semibold">{requiresPayment ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Monitor cluster performance and usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Performance monitoring coming soon</p>
                <p className="text-sm">Real-time metrics and analytics are being developed</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cluster Settings</CardTitle>
                <CardDescription>
                  Configure cluster parameters and manage advanced options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Cluster Name</Label>
                        <p className="text-sm bg-gray-100 p-2 rounded mt-1">{cluster.name || 'Loading...'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Type</Label>
                        <p className="text-sm bg-gray-100 p-2 rounded mt-1">{cluster.cluster_type || 'Loading...'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium text-red-600">Danger Zone</h4>
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="font-medium text-red-800 mb-2">Delete Cluster</h5>
                          <p className="text-sm text-red-700 mb-4">
                            Once you delete a cluster, there is no going back. This action cannot be undone.
                          </p>
                          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Cluster
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                  <AlertCircle className="w-5 h-5" />
                                  Delete Cluster
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                  This action cannot be undone. This will permanently delete the cluster and all associated data.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                                  <p className="text-sm text-red-800 font-medium mb-2">
                                    Are you sure you want to delete:
                                  </p>
                                  <p className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
                                    {cluster.cluster_key || 'Unknown'} - {cluster.name || 'Unknown Cluster'}
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowDeleteModal(false)}
                                  disabled={deleting}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    handleDeleteCluster()
                                    setShowDeleteModal(false)
                                  }}
                                  disabled={deleting}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {deleting ? 'Deleting...' : 'Delete Cluster'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
