"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  Server,
  Shield,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Key,
  Globe,
  DollarSign,
  TestTube,
  Eye,
  EyeOff
} from 'lucide-react';

interface DatabaseType {
  id: string;
  name: string;
  icon: React.ReactNode;
  defaultPort: number;
  description: string;
  connectionStringTemplate: string;
  features: string[];
}

interface ConnectionConfig {
  connectionName: string;
  databaseType: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  sslEnabled: boolean;
  connectionString?: string;
  useConnectionString: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    latency?: number;
    version?: string;
    tables_count?: number;
    estimated_monthly_cost?: number;
  };
}

interface BYODConnectionWizardProps {
  clusterId?: string;
  onConnectionCreated?: (connection: any) => void;
  onCancel?: () => void;
}

const DATABASE_TYPES: DatabaseType[] = [
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    icon: <Database className="h-5 w-5" />,
    defaultPort: 5432,
    description: 'Open-source relational database',
    connectionStringTemplate: 'postgresql://username:password@host:port/database',
    features: ['ACID compliance', 'JSON support', 'Advanced indexing', 'Full-text search']
  },
  {
    id: 'mysql',
    name: 'MySQL',
    icon: <Database className="h-5 w-5" />,
    defaultPort: 3306,
    description: 'Popular relational database',
    connectionStringTemplate: 'mysql://username:password@host:port/database',
    features: ['High performance', 'Replication', 'Partitioning', 'Storage engines']
  },
  {
    id: 'clickhouse',
    name: 'ClickHouse',
    icon: <Database className="h-5 w-5" />,
    defaultPort: 8123,
    description: 'Columnar OLAP database for analytics',
    connectionStringTemplate: 'clickhouse://username:password@host:port/database',
    features: ['Column storage', 'High performance', 'Real-time analytics', 'Compression']
  },
  {
    id: 'sqlserver',
    name: 'SQL Server',
    icon: <Database className="h-5 w-5" />,
    defaultPort: 1433,
    description: 'Microsoft SQL Server',
    connectionStringTemplate: 'sqlserver://username:password@host:port/database',
    features: ['Enterprise features', 'Business intelligence', 'High availability', 'Security']
  }
];

export default function BYODConnectionWizard({ 
  clusterId, 
  onConnectionCreated, 
  onCancel 
}: BYODConnectionWizardProps) {
  const [currentStep, setCurrentStep] = useState<'config' | 'test' | 'billing' | 'complete'>('config');
  const [config, setConfig] = useState<ConnectionConfig>({
    connectionName: '',
    databaseType: 'postgresql',
    host: '',
    port: 5432,
    databaseName: '',
    username: '',
    password: '',
    sslEnabled: true,
    useConnectionString: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDbType = DATABASE_TYPES.find(db => db.id === config.databaseType);

  // Update port when database type changes
  useEffect(() => {
    if (selectedDbType) {
      setConfig(prev => ({ ...prev, port: selectedDbType.defaultPort }));
    }
  }, [config.databaseType, selectedDbType]);

  const updateConfig = (field: keyof ConnectionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const generateConnectionString = (): string => {
    if (!selectedDbType) return '';
    
    return selectedDbType.connectionStringTemplate
      .replace('username', config.username)
      .replace('password', config.password)
      .replace('host', config.host)
      .replace('port', config.port.toString())
      .replace('database', config.databaseName);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch('/api/byod/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          connectionString: config.useConnectionString ? config.connectionString : generateConnectionString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test connection');
      }

      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        setCurrentStep('billing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const createConnection = async () => {
    setCreating(true);
    setError(null);

    try {
      const token = localStorage.getItem('supabase-auth-token') || 
                   (typeof window !== 'undefined' && window.localStorage.getItem('supabase.auth.token'));

      const response = await fetch('/api/byod/connections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          clusterId,
          connectionString: config.useConnectionString ? config.connectionString : generateConnectionString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create connection');
      }

      const connection = await response.json();
      setCurrentStep('complete');
      onConnectionCreated?.(connection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setCreating(false);
    }
  };

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Name */}
          <div>
            <Label htmlFor="connectionName">Connection Name *</Label>
            <Input
              id="connectionName"
              value={config.connectionName}
              onChange={(e) => updateConfig('connectionName', e.target.value)}
              placeholder="My Database Connection"
            />
          </div>

          {/* Database Type */}
          <div>
            <Label>Database Type *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {DATABASE_TYPES.map((dbType) => (
                <div
                  key={dbType.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    config.databaseType === dbType.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateConfig('databaseType', dbType.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {dbType.icon}
                    <h3 className="font-medium">{dbType.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{dbType.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {dbType.features.slice(0, 2).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Method Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useConnectionString"
              checked={config.useConnectionString}
              onCheckedChange={(checked) => updateConfig('useConnectionString', checked)}
            />
            <Label htmlFor="useConnectionString">
              Use connection string instead of individual fields
            </Label>
          </div>

          {config.useConnectionString ? (
            /* Connection String */
            <div>
              <Label htmlFor="connectionString">Connection String *</Label>
              <Textarea
                id="connectionString"
                value={config.connectionString || ''}
                onChange={(e) => updateConfig('connectionString', e.target.value)}
                placeholder={selectedDbType?.connectionStringTemplate}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: {selectedDbType?.connectionStringTemplate}
              </p>
            </div>
          ) : (
            /* Individual Connection Fields */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">Host/Server *</Label>
                <Input
                  id="host"
                  value={config.host}
                  onChange={(e) => updateConfig('host', e.target.value)}
                  placeholder="localhost or database.example.com"
                />
              </div>
              <div>
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  value={config.port}
                  onChange={(e) => updateConfig('port', parseInt(e.target.value) || 0)}
                  placeholder={selectedDbType?.defaultPort.toString()}
                />
              </div>
              <div>
                <Label htmlFor="databaseName">Database Name *</Label>
                <Input
                  id="databaseName"
                  value={config.databaseName}
                  onChange={(e) => updateConfig('databaseName', e.target.value)}
                  placeholder="my_database"
                />
              </div>
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={config.username}
                  onChange={(e) => updateConfig('username', e.target.value)}
                  placeholder="database_user"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={config.password}
                    onChange={(e) => updateConfig('password', e.target.value)}
                    placeholder="Enter password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SSL Configuration */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sslEnabled"
              checked={config.sslEnabled}
              onCheckedChange={(checked) => updateConfig('sslEnabled', checked)}
            />
            <Label htmlFor="sslEnabled" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Enable SSL/TLS encryption (recommended)
            </Label>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Security Information</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Your database credentials are encrypted and stored securely. We recommend using 
                  SSL/TLS encryption and database-specific user accounts with limited permissions.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={testConnection}
              disabled={!config.connectionName.trim() || 
                       (!config.useConnectionString && (!config.host || !config.username || !config.password)) ||
                       (config.useConnectionString && !config.connectionString?.trim()) ||
                       testing
              }
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTestStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Connection Test Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {testResult && (
          <div className={`border rounded-lg p-4 ${
            testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <X className="h-5 w-5 text-red-600" />
              )}
              <h3 className={`font-medium ${
                testResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
              </h3>
            </div>
            <p className={testResult.success ? 'text-green-800' : 'text-red-800'}>
              {testResult.message}
            </p>
            
            {testResult.success && testResult.details && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {testResult.details.latency && (
                  <div>
                    <span className="text-green-600">Latency:</span>
                    <span className="ml-1 font-medium">{testResult.details.latency}ms</span>
                  </div>
                )}
                {testResult.details.version && (
                  <div>
                    <span className="text-green-600">Version:</span>
                    <span className="ml-1 font-medium">{testResult.details.version}</span>
                  </div>
                )}
                {testResult.details.tables_count && (
                  <div>
                    <span className="text-green-600">Tables:</span>
                    <span className="ml-1 font-medium">{testResult.details.tables_count}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('config')}>
            Back
          </Button>
          {testResult?.success && (
            <Button onClick={() => setCurrentStep('billing')}>
              Continue to Billing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderBillingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Billing Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              BYOD Connection Pricing
            </h3>
            <div className="text-3xl font-bold text-blue-900 mb-1">
              $10<span className="text-lg font-normal">/month</span>
            </div>
            <p className="text-blue-800">per database connection</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">What's included:</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Secure encrypted connection to your database
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Connection health monitoring and alerts
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Query optimization and performance insights
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              24/7 connection availability
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              No data storage costs (you manage your own data)
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Connection Summary:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Connection Name:</span>
              <span className="font-medium">{config.connectionName}</span>
            </div>
            <div className="flex justify-between">
              <span>Database Type:</span>
              <span className="font-medium">{selectedDbType?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Host:</span>
              <span className="font-medium">{config.host}:{config.port}</span>
            </div>
            <div className="flex justify-between">
              <span>SSL Enabled:</span>
              <span className="font-medium">{config.sslEnabled ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {testResult?.details?.estimated_monthly_cost && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-1">Estimated Monthly Cost</h4>
            <p className="text-sm text-yellow-700">
              Based on your database size and usage patterns, we estimate this connection 
              will cost approximately <strong>${testResult.details.estimated_monthly_cost}/month</strong> 
              including the base connection fee.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('test')}>
            Back
          </Button>
          <Button 
            onClick={createConnection}
            disabled={creating}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Connection...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Create Connection
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          Connection Created Successfully!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Database className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {config.connectionName}
          </h3>
          <p className="text-gray-600">
            Your database connection has been created and is ready to use. You can now 
            query your data through our analytics platform.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">What happens next?</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Your connection will be monitored for health and performance</li>
            <li>• Billing will begin immediately at $10/month for this connection</li>
            <li>• You can start creating queries and dashboards right away</li>
            <li>• Connection settings can be modified anytime from the cluster settings</li>
          </ul>
        </div>

        <div className="flex justify-center">
          <Button onClick={() => onConnectionCreated?.({ name: config.connectionName })}>
            Go to Analytics Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['config', 'test', 'billing', 'complete'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${currentStep === step ? 'border-blue-500 bg-blue-500 text-white' :
                  ['config', 'test', 'billing', 'complete'].indexOf(currentStep) > index 
                    ? 'border-green-500 bg-green-500 text-white' 
                    : 'border-gray-300 bg-white text-gray-500'
                }
              `}>
                {['config', 'test', 'billing', 'complete'].indexOf(currentStep) > index ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep === step ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {step === 'config' ? 'Configure' : 
                 step === 'test' ? 'Test' : 
                 step === 'billing' ? 'Billing' : 'Complete'}
              </span>
              {index < 3 && (
                <div className={`mx-4 h-0.5 w-12 ${
                  ['config', 'test', 'billing', 'complete'].indexOf(currentStep) > index 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'config' && renderConfigurationStep()}
      {currentStep === 'test' && renderTestStep()}
      {currentStep === 'billing' && renderBillingStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
}
