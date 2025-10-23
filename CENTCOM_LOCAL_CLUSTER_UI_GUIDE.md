# Centcom Local Cluster UI & Registration Guide

**Date:** 2025-10-22
**For:** Centcom Frontend Team
**Purpose:** Display local cluster configuration and enable registration with Lyceum

---

## Overview

This guide shows how to:
1. ✅ Fetch local cluster configuration from Lyceum during login
2. ✅ Display local cluster limits and features in Centcom UI
3. ✅ Implement "Register with Lyceum" button
4. ✅ Register the cluster and receive a proper CLSTR-# key
5. ✅ Verify cluster appears in Lyceum admin panel

---

## Part 1: Fetching Local Cluster Configuration

### Step 1.1: During User Login

After successful authentication, fetch the local cluster configuration:

```typescript
// File: src/services/LicenseService.ts

interface LocalClusterConfig {
  enabled: boolean;
  limits?: {
    max_storage_gb: number;
    max_monthly_queries: number;  // -1 = unlimited
    max_users: number;             // -1 = unlimited
    lifecycle_tiers_enabled: boolean;
    offline_grace_days: number;
  };
}

interface LicenseValidationResponse {
  valid: boolean;
  license_id: string;
  license_type: string;
  local_cluster: LocalClusterConfig;
  permissions: any;
  restrictions: any;
}

export class LicenseService {
  /**
   * Fetch local cluster configuration for the user's main license
   */
  async getLocalClusterConfig(
    licenseKey: string,
    userId: string
  ): Promise<LocalClusterConfig | null> {
    try {
      const response = await fetch('https://lyceum-sable.vercel.app/api/licenses/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey,
          user_id: userId,
          user_type: 'engineer',
          requested_plugin: 'centcom'
        })
      });

      if (!response.ok) {
        console.error('License validation failed:', response.status);
        return null;
      }

      const validation: LicenseValidationResponse = await response.json();

      if (!validation.valid) {
        console.error('License is not valid');
        return null;
      }

      return validation.local_cluster;

    } catch (error) {
      console.error('Error fetching local cluster config:', error);
      return null;
    }
  }

  /**
   * Find the main application license from user's licenses
   */
  findMainLicense(licenses: any[]): any | null {
    // Filter to active main application licenses only
    const mainLicenses = licenses.filter(license =>
      license.license_category === 'main_application' &&
      license.status === 'active'
    );

    if (mainLicenses.length === 0) {
      console.warn('No main application license found');
      return null;
    }

    if (mainLicenses.length > 1) {
      console.warn('Multiple main licenses found, using most recent');
      mainLicenses.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return mainLicenses[0];
  }
}
```

### Step 1.2: In Your Login Flow

```typescript
// File: src/stores/AuthStore.ts or similar

import { LicenseService } from '@/services/LicenseService';

export class AuthStore {
  private licenseService = new LicenseService();
  public localClusterConfig: LocalClusterConfig | null = null;

  async login(email: string, password: string) {
    // 1. Authenticate with Lyceum
    const authResponse = await fetch('https://lyceum-sable.vercel.app/api/centcom/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const authResult = await authResponse.json();

    if (!authResult.success) {
      throw new Error('Login failed');
    }

    // 2. Store user info and session token
    this.user = authResult.user;
    this.sessionToken = authResult.session_token;
    this.licenses = authResult.licenses || [];

    // 3. Find main application license
    const mainLicense = this.licenseService.findMainLicense(this.licenses);

    if (!mainLicense) {
      console.warn('No main license found - local cluster unavailable');
      this.localClusterConfig = null;
      return authResult;
    }

    // 4. Fetch local cluster configuration
    this.localClusterConfig = await this.licenseService.getLocalClusterConfig(
      mainLicense.key_code,
      this.user.id
    );

    if (this.localClusterConfig?.enabled) {
      console.log('✅ Local cluster enabled with limits:', this.localClusterConfig.limits);
    } else {
      console.log('❌ Local cluster not available for this license');
    }

    return authResult;
  }
}
```

---

## Part 2: Displaying Local Cluster Configuration in UI

### Step 2.1: Create a Local Cluster Settings Component

```typescript
// File: src/components/LocalClusterSettings.tsx

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ClusterService } from '@/services/ClusterService';

interface LocalClusterSettingsProps {
  config: LocalClusterConfig;
  isRegistered: boolean;
  onRegister: () => void;
}

export const LocalClusterSettings: React.FC<LocalClusterSettingsProps> = ({
  config,
  isRegistered,
  onRegister
}) => {
  if (!config.enabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-yellow-900">
              Local Cluster Not Available
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Your current license does not include local cluster deployment.
              Contact your administrator to upgrade your license.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const limits = config.limits!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Local Cluster Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Your license includes local ClickHouse cluster deployment
          </p>
        </div>
        {!isRegistered && (
          <button
            onClick={onRegister}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Register with Lyceum
          </button>
        )}
        {isRegistered && (
          <div className="flex items-center space-x-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Registered</span>
          </div>
        )}
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Storage Limit */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Storage Limit</h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {limits.max_storage_gb} GB
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Maximum storage per cluster
          </div>
        </div>

        {/* Query Limit */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Monthly Queries</h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {limits.max_monthly_queries === -1
              ? 'Unlimited'
              : limits.max_monthly_queries.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {limits.max_monthly_queries === -1
              ? 'No query limit'
              : 'Queries per month across all clusters'}
          </div>
        </div>

        {/* User Limit */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Max Users</h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {limits.max_users === -1 ? 'Unlimited' : limits.max_users}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Concurrent users per cluster
          </div>
        </div>

        {/* Offline Grace Period */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Offline Grace</h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {limits.offline_grace_days} days
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Operation without Lyceum connection
          </div>
        </div>

        {/* Lifecycle Tiers */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Lifecycle Tiers</h3>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className={`text-3xl font-bold ${limits.lifecycle_tiers_enabled ? 'text-green-600' : 'text-gray-400'}`}>
            {limits.lifecycle_tiers_enabled ? 'Enabled' : 'Disabled'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Hot/Warm/Cold storage tiers
          </div>
        </div>
      </div>

      {/* Feature Description */}
      {limits.lifecycle_tiers_enabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900">
                Lifecycle Tiers Enabled
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Your local cluster can use hot, warm, and cold storage tiers to optimize performance and cost.
                Recent data stays in fast storage (hot tier), older data moves to cheaper storage (cold tier).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Step 2.2: Add to Your Settings Page

```typescript
// File: src/pages/Settings.tsx or src/pages/Clusters.tsx

import { LocalClusterSettings } from '@/components/LocalClusterSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useCluster } from '@/contexts/ClusterContext';

export const SettingsPage = () => {
  const { localClusterConfig } = useAuth();
  const { isLocalClusterRegistered, registerLocalCluster } = useCluster();

  const handleRegister = async () => {
    // Will implement in Part 3
    await registerLocalCluster();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Other settings sections */}

      {/* Local Cluster Section */}
      {localClusterConfig && (
        <section className="mb-8">
          <LocalClusterSettings
            config={localClusterConfig}
            isRegistered={isLocalClusterRegistered}
            onRegister={handleRegister}
          />
        </section>
      )}
    </div>
  );
};
```

---

## Part 3: Implementing "Register with Lyceum" Button

### Step 3.1: Create Cluster Service

```typescript
// File: src/services/ClusterService.ts

import crypto from 'crypto';
import os from 'os';

interface ClusterRegistrationRequest {
  license_key: string;
  cluster_name: string;
  machine_fingerprint: string;
  cluster_config: {
    version: string;
    port: number;
    http_port: number;
    storage_path: string;
  };
}

interface ClusterRegistrationResponse {
  success: boolean;
  cluster?: {
    id: string;           // UUID
    cluster_key: string;  // e.g., "LOCAL-0011"
    cluster_name: string;
    status: string;
  };
  error?: string;
}

export class ClusterService {
  private readonly LYCEUM_API_BASE = 'https://lyceum-sable.vercel.app/api';

  /**
   * Generate a unique machine fingerprint for this device
   */
  generateMachineFingerprint(): string {
    // Get or create a persistent device ID
    let deviceId = localStorage.getItem('centcom_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('centcom_device_id', deviceId);
    }

    const machineInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      deviceId: deviceId,
      // Note: Don't use MAC address for privacy reasons
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(machineInfo))
      .digest('hex');

    return hash;
  }

  /**
   * Generate a default cluster name based on machine info
   */
  getDefaultClusterName(): string {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    return `Local Cluster (${username}@${hostname})`;
  }

  /**
   * Register local cluster with Lyceum
   */
  async registerCluster(
    licenseKey: string,
    clusterName?: string,
    clickhouseVersion: string = '25.9.2.1',
    storagePath: string = ''
  ): Promise<ClusterRegistrationResponse> {
    try {
      const machineFP = this.generateMachineFingerprint();
      const name = clusterName || this.getDefaultClusterName();

      const requestBody: ClusterRegistrationRequest = {
        license_key: licenseKey,
        cluster_name: name,
        machine_fingerprint: machineFP,
        cluster_config: {
          version: clickhouseVersion,
          port: 9000,
          http_port: 8123,
          storage_path: storagePath
        }
      };

      console.log('🔄 Registering local cluster with Lyceum...', {
        cluster_name: name,
        machine_fingerprint: machineFP.substring(0, 16) + '...'
      });

      const response = await fetch(`${this.LYCEUM_API_BASE}/centcom/clusters/local/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Cluster registration failed:', errorData);
        return {
          success: false,
          error: errorData.error || 'Registration failed'
        };
      }

      const result: ClusterRegistrationResponse = await response.json();

      if (result.success && result.cluster) {
        console.log('✅ Cluster registered successfully:', {
          cluster_id: result.cluster.id,
          cluster_key: result.cluster.cluster_key,
          cluster_name: result.cluster.cluster_name
        });

        // Store cluster info locally
        localStorage.setItem('local_cluster_id', result.cluster.id);
        localStorage.setItem('local_cluster_key', result.cluster.cluster_key);
        localStorage.setItem('local_cluster_name', result.cluster.cluster_name);
        localStorage.setItem('local_cluster_registered_at', new Date().toISOString());

        return result;
      }

      return {
        success: false,
        error: 'Invalid response from server'
      };

    } catch (error) {
      console.error('❌ Cluster registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if local cluster is already registered
   */
  isRegistered(): boolean {
    const clusterId = localStorage.getItem('local_cluster_id');
    const clusterKey = localStorage.getItem('local_cluster_key');
    return !!(clusterId && clusterKey);
  }

  /**
   * Get stored cluster info
   */
  getStoredClusterInfo(): {
    id: string;
    key: string;
    name: string;
    registeredAt: string;
  } | null {
    const id = localStorage.getItem('local_cluster_id');
    const key = localStorage.getItem('local_cluster_key');
    const name = localStorage.getItem('local_cluster_name');
    const registeredAt = localStorage.getItem('local_cluster_registered_at');

    if (!id || !key) {
      return null;
    }

    return {
      id,
      key,
      name: name || 'Local Cluster',
      registeredAt: registeredAt || new Date().toISOString()
    };
  }

  /**
   * Clear stored cluster info (for re-registration)
   */
  clearStoredClusterInfo(): void {
    localStorage.removeItem('local_cluster_id');
    localStorage.removeItem('local_cluster_key');
    localStorage.removeItem('local_cluster_name');
    localStorage.removeItem('local_cluster_registered_at');
  }
}
```

### Step 3.2: Create Cluster Context

```typescript
// File: src/contexts/ClusterContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClusterService } from '@/services/ClusterService';
import { useAuth } from './AuthContext';
import { LicenseService } from '@/services/LicenseService';

interface ClusterContextValue {
  isLocalClusterRegistered: boolean;
  clusterInfo: any | null;
  isRegistering: boolean;
  registerLocalCluster: (customName?: string) => Promise<void>;
  unregisterLocalCluster: () => void;
}

const ClusterContext = createContext<ClusterContextValue | undefined>(undefined);

export const ClusterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, licenses } = useAuth();
  const clusterService = new ClusterService();
  const licenseService = new LicenseService();

  const [isLocalClusterRegistered, setIsLocalClusterRegistered] = useState(false);
  const [clusterInfo, setClusterInfo] = useState<any | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Check if cluster is registered on mount
  useEffect(() => {
    const info = clusterService.getStoredClusterInfo();
    if (info) {
      setIsLocalClusterRegistered(true);
      setClusterInfo(info);
    }
  }, []);

  const registerLocalCluster = async (customName?: string) => {
    if (isRegistering) {
      console.warn('Registration already in progress');
      return;
    }

    try {
      setIsRegistering(true);

      // Find main license
      const mainLicense = licenseService.findMainLicense(licenses);
      if (!mainLicense) {
        throw new Error('No main application license found');
      }

      // Get ClickHouse version and storage path from your local installation
      const clickhouseVersion = await getLocalClickHouseVersion(); // Implement this
      const storagePath = getClickHouseStoragePath(); // Implement this

      // Register with Lyceum
      const result = await clusterService.registerCluster(
        mainLicense.key_code,
        customName,
        clickhouseVersion,
        storagePath
      );

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      // Update state
      setIsLocalClusterRegistered(true);
      setClusterInfo(result.cluster);

      // Show success notification
      showNotification({
        type: 'success',
        title: 'Cluster Registered',
        message: `Your local cluster has been registered with Lyceum as ${result.cluster?.cluster_key}`
      });

      // Start heartbeat service
      startHeartbeatService(result.cluster!.id);

    } catch (error) {
      console.error('Failed to register cluster:', error);
      showNotification({
        type: 'error',
        title: 'Registration Failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  const unregisterLocalCluster = () => {
    clusterService.clearStoredClusterInfo();
    setIsLocalClusterRegistered(false);
    setClusterInfo(null);
    // Stop heartbeat service
    stopHeartbeatService();
  };

  return (
    <ClusterContext.Provider
      value={{
        isLocalClusterRegistered,
        clusterInfo,
        isRegistering,
        registerLocalCluster,
        unregisterLocalCluster
      }}
    >
      {children}
    </ClusterContext.Provider>
  );
};

export const useCluster = () => {
  const context = useContext(ClusterContext);
  if (!context) {
    throw new Error('useCluster must be used within ClusterProvider');
  }
  return context;
};
```

### Step 3.3: Add Registration Dialog (Optional but Recommended)

```typescript
// File: src/components/ClusterRegistrationDialog.tsx

import React, { useState } from 'react';
import { useCluster } from '@/contexts/ClusterContext';

interface ClusterRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
}

export const ClusterRegistrationDialog: React.FC<ClusterRegistrationDialogProps> = ({
  isOpen,
  onClose,
  defaultName
}) => {
  const { registerLocalCluster, isRegistering } = useCluster();
  const [clusterName, setClusterName] = useState(defaultName);

  if (!isOpen) return null;

  const handleRegister = async () => {
    try {
      await registerLocalCluster(clusterName);
      onClose();
    } catch (error) {
      // Error handled in context
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Register Local Cluster with Lyceum
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Choose a name for your local cluster. This will help you identify it in the Lyceum admin panel.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cluster Name
          </label>
          <input
            type="text"
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., John's Desktop, Office Laptop"
            maxLength={100}
            disabled={isRegistering}
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum 100 characters
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isRegistering}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRegister}
            disabled={isRegistering || !clusterName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering ? 'Registering...' : 'Register Cluster'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Part 4: What Happens During Registration

### Backend Registration Process

When you call `POST /api/centcom/clusters/local/register`, here's what happens:

```
1. ✅ Lyceum receives registration request
   ↓
2. ✅ Validates license_key exists and is active
   ↓
3. ✅ Checks if license allows local clusters (allows_local_cluster = true)
   ↓
4. ✅ Checks for existing cluster with same machine_fingerprint
   ↓
   If exists → Updates existing cluster
   If not exists → Creates new cluster
   ↓
5. ✅ Generates cluster_key (e.g., "LOCAL-0011")
   ↓
6. ✅ Inserts/Updates record in `local_cluster_usage` table:
   - cluster_id (UUID)
   - user_id (from license)
   - license_key_id (from license)
   - cluster_key (e.g., LOCAL-0011)
   - cluster_name (from your request)
   - machine_fingerprint (from your request)
   - cluster_status = 'pending'
   - is_running = false
   ↓
7. ✅ Returns response with cluster_id and cluster_key
```

### Database Schema

Your cluster will be stored in the `local_cluster_usage` table:

```sql
local_cluster_usage
├── cluster_id (UUID) ← Primary identifier
├── user_id (UUID) ← Your user ID
├── license_key_id (UUID) ← Your license ID
├── cluster_key (TEXT) ← Human-readable key like "LOCAL-0011"
├── cluster_name (TEXT) ← Your custom name
├── cluster_type (TEXT) ← "local"
├── cluster_status (TEXT) ← "pending", "healthy", "offline"
├── machine_fingerprint (TEXT) ← Unique device identifier
├── installation_id (TEXT) ← Optional
├── is_running (BOOLEAN) ← false until first heartbeat
├── clickhouse_version (TEXT)
├── centcom_version (TEXT)
├── machine_os (TEXT)
├── hostname (TEXT)
├── last_heartbeat_at (TIMESTAMP) ← Updated by heartbeat service
└── created_at (TIMESTAMP)
```

---

## Part 5: Verifying Registration in Lyceum Admin Panel

### Step 5.1: Where to Find Your Cluster

After registration, the cluster appears in Lyceum Admin Panel:

**URL:** `https://lyceum-sable.vercel.app/admin/clusters`

**What You'll See:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Clusters Dashboard                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🏢 Cloud Clusters (2)                                          │
│   ├── CLOUD-001 - Production Cloud                             │
│   └── CLOUD-002 - Staging Cloud                                │
│                                                                 │
│ 💻 Local Clusters (1)                                          │
│   └── LOCAL-0011 - Local Cluster (john@DESKTOP-ABC123)        │
│       ├── Status: Pending / Healthy / Offline                  │
│       ├── User: john@example.com                                │
│       ├── Last Heartbeat: 2 minutes ago                         │
│       ├── Version: ClickHouse 25.9.2.1                          │
│       └── Machine: Windows 11, 16 GB RAM                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 5.2: Cluster Details View

Clicking on your cluster shows:

```
LOCAL-0011 - Local Cluster (john@DESKTOP-ABC123)
═══════════════════════════════════════════════════════

📊 Status
   Current Status: Healthy
   Last Heartbeat: 2 minutes ago
   Uptime: 5 hours 32 minutes

👤 Owner
   User: john@example.com
   License: CENTCOM-ENT-2025-9X00UFMU
   License Type: Enterprise

💾 Usage
   Storage Used: 45.2 GB / 500 GB (9%)
   Queries (This Month): 1,234 / Unlimited
   Active Users: 2 / Unlimited

🖥️ Machine Info
   OS: Windows 11 Pro
   Hostname: DESKTOP-ABC123
   CPU: Intel i7-12700K (12 cores)
   RAM: 16 GB
   Machine ID: a1b2c3d4... (fingerprint)

⚙️ ClickHouse Info
   Version: 25.9.2.1
   HTTP Port: 8123
   Native Port: 9000
   Storage Path: C:\Users\john\.centcom\clickhouse

📅 Timeline
   Registered: 2025-10-22 10:30 AM
   First Heartbeat: 2025-10-22 10:35 AM
   Last Updated: 2025-10-22 3:45 PM
```

### Step 5.3: Testing Registration Success

To verify registration worked:

```typescript
// In your Centcom app, after registration:

async function verifyRegistration(clusterId: string) {
  try {
    // Check if cluster appears in discovery endpoint
    const response = await fetch('https://lyceum-sable.vercel.app/api/centcom/clusters/discover', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    const data = await response.json();

    const myCluster = data.clusters.find((c: any) =>
      c.id === clusterId && c.type === 'local'
    );

    if (myCluster) {
      console.log('✅ Cluster successfully registered and visible:', myCluster);
      return true;
    } else {
      console.error('❌ Cluster not found in discovery endpoint');
      return false;
    }

  } catch (error) {
    console.error('❌ Failed to verify registration:', error);
    return false;
  }
}
```

---

## Part 6: Starting Heartbeat Service

After successful registration, start sending periodic heartbeats:

```typescript
// File: src/services/HeartbeatService.ts

interface HeartbeatPayload {
  cluster_id: string;
  status: 'healthy' | 'warning' | 'error';
  metrics: {
    queries_count: number;
    storage_used_gb: number;
    active_users: number;
  };
  system_info?: {
    uptime_seconds: number;
    cpu_usage_percent: number;
    memory_usage_percent: number;
  };
}

export class HeartbeatService {
  private timerId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly LYCEUM_API_BASE = 'https://lyceum-sable.vercel.app/api';
  private failureCount = 0;

  async sendHeartbeat(clusterId: string): Promise<boolean> {
    try {
      const payload: HeartbeatPayload = {
        cluster_id: clusterId,
        status: 'healthy',
        metrics: {
          queries_count: await this.getQueryCount(),
          storage_used_gb: await this.getStorageUsed(),
          active_users: await this.getActiveUsers()
        },
        system_info: {
          uptime_seconds: process.uptime(),
          cpu_usage_percent: await this.getCpuUsage(),
          memory_usage_percent: await this.getMemoryUsage()
        }
      };

      console.log('📡 Sending heartbeat to Lyceum...', { cluster_id: clusterId });

      const response = await fetch(`${this.LYCEUM_API_BASE}/centcom/clusters/local/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Heartbeat failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Heartbeat successful');
        this.failureCount = 0;
        localStorage.setItem('last_successful_heartbeat', new Date().toISOString());
        return true;
      }

      return false;

    } catch (error) {
      this.failureCount++;
      console.error(`❌ Heartbeat failed (${this.failureCount}/3):`, error);

      if (this.failureCount >= 3) {
        console.warn('⚠️ Multiple heartbeat failures - cluster may appear offline in Lyceum');
      }

      return false;
    }
  }

  start(clusterId: string): void {
    // Send immediate heartbeat
    this.sendHeartbeat(clusterId);

    // Schedule periodic heartbeats
    this.timerId = setInterval(() => {
      this.sendHeartbeat(clusterId);
    }, this.INTERVAL_MS);

    console.log(`🔄 Heartbeat service started (interval: ${this.INTERVAL_MS / 1000 / 60} minutes)`);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('⏹️ Heartbeat service stopped');
    }
  }

  // Implement these based on your local ClickHouse instance
  private async getQueryCount(): Promise<number> {
    // Query your local ClickHouse for query count this month
    return 0;
  }

  private async getStorageUsed(): Promise<number> {
    // Check ClickHouse data directory size
    return 0;
  }

  private async getActiveUsers(): Promise<number> {
    // Count active user sessions
    return 0;
  }

  private async getCpuUsage(): Promise<number> {
    // Get current CPU usage percentage
    return 0;
  }

  private async getMemoryUsage(): Promise<number> {
    // Get current memory usage percentage
    return 0;
  }
}
```

---

## Complete Integration Checklist

### ✅ Phase 1: Display Configuration

- [ ] Implement `LicenseService.getLocalClusterConfig()`
- [ ] Call during login flow
- [ ] Store config in auth context/store
- [ ] Create `LocalClusterSettings` component
- [ ] Display storage, query, user limits
- [ ] Show lifecycle tiers status
- [ ] Handle "not available" state gracefully

### ✅ Phase 2: Registration

- [ ] Implement `ClusterService.generateMachineFingerprint()`
- [ ] Implement `ClusterService.registerCluster()`
- [ ] Create "Register with Lyceum" button
- [ ] Optional: Add registration dialog for custom name
- [ ] Store cluster_id and cluster_key in localStorage
- [ ] Update UI to show "Registered" status

### ✅ Phase 3: Heartbeat

- [ ] Implement `HeartbeatService`
- [ ] Start heartbeat service after registration
- [ ] Send metrics: queries, storage, users
- [ ] Handle heartbeat failures gracefully
- [ ] Store last successful heartbeat timestamp

### ✅ Phase 4: Verification

- [ ] Test registration in production
- [ ] Verify cluster appears in Lyceum admin panel
- [ ] Check cluster has correct CLSTR-# key
- [ ] Verify status updates with heartbeats
- [ ] Test with different license types

---

## Testing in Production

### Test 1: Registration Flow

```typescript
// 1. Login with test user
await login('testuser@example.com', 'password');

// 2. Check if local cluster config loaded
console.log('Local cluster config:', authStore.localClusterConfig);

// Expected output:
// {
//   enabled: true,
//   limits: {
//     max_storage_gb: 500,
//     max_monthly_queries: -1,
//     max_users: -1,
//     lifecycle_tiers_enabled: true,
//     offline_grace_days: 30
//   }
// }

// 3. Register cluster
await clusterService.registerCluster(
  'CENTCOM-ENT-2025-9X00UFMU',
  'Test Desktop'
);

// Expected output:
// {
//   success: true,
//   cluster: {
//     id: "uuid-here",
//     cluster_key: "LOCAL-0011",
//     cluster_name: "Test Desktop",
//     status: "pending"
//   }
// }

// 4. Verify in admin panel
// Go to: https://lyceum-sable.vercel.app/admin/clusters
// Should see: LOCAL-0011 - Test Desktop
```

### Test 2: Heartbeat

```typescript
// After registration, start heartbeat
heartbeatService.start(clusterId);

// Wait 1 minute, then check admin panel
// Status should change from "pending" to "healthy"

// Check last heartbeat timestamp updates every 10 minutes
```

---

## Troubleshooting

### Problem: "Local cluster not available"

**Solution:** Check if license has `allows_local_cluster = true`

### Problem: Registration fails with 403

**Solution:** License doesn't allow local clusters - contact admin to upgrade

### Problem: Cluster doesn't appear in admin panel

**Solution:** Wait 30 seconds for database sync, then refresh page

### Problem: Multiple clusters showing for same machine

**Solution:** machine_fingerprint should be stable - check deviceId is persisted

### Problem: Heartbeat fails with 404

**Solution:** Cluster was deleted from Lyceum - need to re-register

---

## Summary

✅ **Fetch Configuration**: Call `/api/licenses/validate` during login
✅ **Display Limits**: Show storage, queries, users, grace period, lifecycle tiers
✅ **Register Button**: Call `/api/centcom/clusters/local/register` with license key
✅ **Get CLSTR Key**: Backend auto-generates `LOCAL-####` key
✅ **Start Heartbeat**: Send status every 10 minutes to `/heartbeat`
✅ **Verify**: Check admin panel at `/admin/clusters`

**Your cluster will appear in Lyceum with proper CLSTR-# key and all details visible to admins! 🎉**
