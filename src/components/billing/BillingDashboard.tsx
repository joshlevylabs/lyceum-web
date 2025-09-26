'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, 
  FileText, 
  DollarSign, 
  Calendar, 
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Users,
  HardDrive
} from 'lucide-react';

interface BillingSummary {
  currentPeriod: any;
  currentUsage: any;
  estimatedMonthlyCost: number;
  recentInvoices: any[];
  totalOutstanding: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total_cents: number;
  total_dollars: number;
  billing_periods: {
    period_label: string;
  };
}

interface UsageData {
  licenses: Array<{ type: string; quantity: number }>;
  clusters: Array<{ size: string; type: string; quantity: number }>;
  additionalUsers: number;
  storageOverageGB: number;
}

export default function BillingDashboard() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load billing summary
      const summaryResponse = await fetch('/api/billing/process-monthly');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.data);
      }

      // Load recent invoices
      const invoicesResponse = await fetch('/api/billing/invoices?limit=10&include_line_items=false');
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setInvoices(invoicesData.data.invoices || []);
      }

      // Load current usage
      const usageResponse = await fetch('/api/billing/usage?include_estimate=true');
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData.data.usage);
        setEstimatedCost(usageData.data.estimated_monthly_cost);
      }

    } catch (err) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { variant: 'default' as const, color: 'bg-green-100 text-green-800', label: 'Paid' },
      sent: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800', label: 'Sent' },
      overdue: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', label: 'Overdue' },
      draft: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      cancelled: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing & Usage</h1>
        <Button onClick={loadBillingData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimatedCost ? formatCurrency(estimatedCost.total_cents) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated for {summary?.currentPeriod?.period_label || 'this month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter(inv => ['sent', 'overdue'].includes(inv.status)).length} unpaid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.licenses.reduce((sum, license) => sum + license.quantity, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {usage?.licenses.length || 0} license types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Clusters</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.clusters.reduce((sum, cluster) => sum + cluster.quantity, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active clusters running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Current Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="billing">Billing Settings</TabsTrigger>
        </TabsList>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Current Usage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Breakdown</CardTitle>
                <CardDescription>Current billing period usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Licenses */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Licenses
                  </h4>
                  {usage?.licenses && usage.licenses.length > 0 ? (
                    <div className="space-y-2">
                      {usage.licenses.map((license, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{license.type}</span>
                          <Badge variant="outline">{license.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active licenses</p>
                  )}
                </div>

                {/* Clusters */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Database Clusters
                  </h4>
                  {usage?.clusters && usage.clusters.length > 0 ? (
                    <div className="space-y-2">
                      {usage.clusters.map((cluster, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm capitalize">
                            {cluster.size} {cluster.type}
                          </span>
                          <Badge variant="outline">{cluster.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active clusters</p>
                  )}
                </div>

                {/* Additional Users */}
                {(usage?.additionalUsers || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Additional Users
                    </h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Extra users beyond base allocation</span>
                      <Badge variant="outline">{usage?.additionalUsers}</Badge>
                    </div>
                  </div>
                )}

                {/* Storage Overage */}
                {(usage?.storageOverageGB || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                      <HardDrive className="h-4 w-4 mr-2" />
                      Storage Overage
                    </h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">GB over storage limit</span>
                      <Badge variant="outline">{usage?.storageOverageGB?.toFixed(2)} GB</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estimated Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Estimated monthly charges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {estimatedCost?.line_items && estimatedCost.line_items.length > 0 ? (
                  <div className="space-y-3">
                    {estimatedCost.line_items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatCurrency(item.total_price_cents)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unit_price_cents)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Total Estimated</p>
                        <p className="font-semibold text-lg">
                          {formatCurrency(estimatedCost.total_cents)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No usage charges this period</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Your billing history and payment status</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.billing_periods?.period_label || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(invoice.total_cents)}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {getStatusBadge(invoice.status)}
                        
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No invoices found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Manage your billing preferences and payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                  Billing settings management will be available in the next update.
                  Contact support for billing changes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


