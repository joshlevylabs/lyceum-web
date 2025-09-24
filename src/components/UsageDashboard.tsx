"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  HardDrive, 
  Users, 
  FolderOpen, 
  TrendingUp, 
  AlertTriangle,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface UsageMetrics {
  clusters_used: number;
  storage_used_gb: number;
  projects_used: number;
  team_members_used: number;
  byod_connections_used: number;
  api_requests_used: number;
}

interface SubscriptionLimits {
  clusters_limit: number;
  storage_limit_gb: number;
  projects_limit: number;
  team_members_limit: number;
  data_retention_days: number;
  api_requests_limit: number;
}

interface UserSubscription {
  id: string;
  tier_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id: string;
}

interface UsageDashboardProps {
  userId?: string;
}

interface UsageStatus {
  withinLimits: boolean;
  violations: string[];
  usage: UsageMetrics;
  limits: SubscriptionLimits;
  subscription?: UserSubscription;
}

export default function UsageDashboard({ userId }: UsageDashboardProps) {
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));
      
      const response = await fetch('/api/billing/usage', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setUsageStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [userId]);

  const getUsagePercentage = (used: number, limit: number): number => {
    if (limit === 0) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTierName = (tierName: string): string => {
    return tierName.charAt(0).toUpperCase() + tierName.slice(1);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTierPrice = (tierName: string): string => {
    const prices = {
      starter: '$29',
      professional: '$99',
      enterprise: '$299'
    };
    return prices[tierName as keyof typeof prices] || '$29';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-md w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Usage Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchUsageData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageStatus) {
    return null;
  }

  const { withinLimits, violations, usage, limits, subscription } = usageStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Dashboard</h2>
          <p className="text-gray-600">Monitor your subscription usage and limits</p>
        </div>
        {!withinLimits && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Over Limits
          </Badge>
        )}
      </div>

      <Tabs defaultValue="usage" className="w-full">
        <TabsList>
          <TabsTrigger value="usage">Usage Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription Details</TabsTrigger>
          <TabsTrigger value="billing">Billing & Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          {/* Usage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Clusters */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Clusters</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usage.clusters_used} / {limits.clusters_limit}
                </div>
                <Progress 
                  value={getUsagePercentage(usage.clusters_used, limits.clusters_limit)} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {getUsagePercentage(usage.clusters_used, limits.clusters_limit)}% used
                </p>
              </CardContent>
            </Card>

            {/* Storage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usage.storage_used_gb}GB / {limits.storage_limit_gb}GB
                </div>
                <Progress 
                  value={getUsagePercentage(usage.storage_used_gb, limits.storage_limit_gb)} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {getUsagePercentage(usage.storage_used_gb, limits.storage_limit_gb)}% used
                </p>
              </CardContent>
            </Card>

            {/* Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usage.projects_used} / {limits.projects_limit}
                </div>
                <Progress 
                  value={getUsagePercentage(usage.projects_used, limits.projects_limit)} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {getUsagePercentage(usage.projects_used, limits.projects_limit)}% used
                </p>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usage.team_members_used} / {limits.team_members_limit}
                </div>
                <Progress 
                  value={getUsagePercentage(usage.team_members_used, limits.team_members_limit)} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {getUsagePercentage(usage.team_members_used, limits.team_members_limit)}% used
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Violations Alert */}
          {violations.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Usage Limit Violations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-red-700">
                  {violations.map((violation, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {violation}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Button variant="destructive" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>API Requests</span>
                    <span>{usage.api_requests_used.toLocaleString()} / {limits.api_requests_limit.toLocaleString()}</span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(usage.api_requests_used, limits.api_requests_limit)} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BYOD Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Connections</span>
                    <span>{usage.byod_connections_used}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    $10/month per connection
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="text-lg font-semibold">
                      {formatTierName(subscription.tier_name)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getTierPrice(subscription.tier_name)}/month
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Billing</p>
                    <p className="text-sm">
                      {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                  <Button variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Features & Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Database Clusters</span>
                    <span className="font-medium">
                      {limits.clusters_limit === 999 ? 'Unlimited' : limits.clusters_limit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Limit</span>
                    <span className="font-medium">{limits.storage_limit_gb}GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Projects</span>
                    <span className="font-medium">
                      {limits.projects_limit === 999 ? 'Unlimited' : limits.projects_limit}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Team Members</span>
                    <span className="font-medium">
                      {limits.team_members_limit === 999 ? 'Unlimited' : limits.team_members_limit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Retention</span>
                    <span className="font-medium">{limits.data_retention_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Requests</span>
                    <span className="font-medium">{limits.api_requests_limit.toLocaleString()}/month</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Manage your subscription, view invoices, and update payment methods.
              </p>
              
              <div className="flex gap-2">
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Invoices
                </Button>
                <Button variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Update Payment Method
                </Button>
              </div>

              {/* BYOD Billing */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-medium mb-3">BYOD Connections</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Additional charges apply for bring-your-own-database connections at $10/month per connection.
                </p>
                
                {usage.byod_connections_used > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>Current BYOD charges:</strong> ${(usage.byod_connections_used * 10).toFixed(2)}/month 
                      ({usage.byod_connections_used} connection{usage.byod_connections_used !== 1 ? 's' : ''})
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
