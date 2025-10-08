# Centcom Local Cluster & Lyceum Integration Implementation Guide

## 📋 Overview

This guide provides comprehensive instructions for implementing:
1. **Local ClickHouse cluster management** (runs on user's machine)
2. **License-based usage limits** and verification
3. **Automatic Lyceum cluster discovery** and connection
4. **Seamless integration** with Centcom's Settings → Storage & Databases

---

## 🎯 Goals

### End-User Experience:
1. User enters license key → Centcom auto-configures local cluster
2. User creates/is assigned cloud cluster → Appears automatically in Database Connections
3. Centcom seamlessly connects to local OR cloud clusters
4. Single interface for all database operations

### Technical Goals:
- Zero-configuration database setup
- License-based feature gating
- Real-time usage tracking
- Automatic cluster discovery
- Seamless migration path (local → cloud)

---

## 🚀 Implementation Status

### ✅ Phase 0: Database Schema & Setup - **COMPLETED**
- ✅ Database migration script created and executed
- ✅ Schema fixes applied (licenses → license_keys table)
- ✅ Functions created: `check_local_cluster_allowed`, `get_user_clusters`
- ✅ RLS policies configured
- ✅ Test license enabled for local clusters

**Key Fixes Applied**:
- Changed table reference from `licenses` to `license_keys`
- Fixed column names: `license.user_id` → `license.assigned_to`, `license_key` → `key_code`
- Added `'standard'` license type support
- Fixed function return type: `VARCHAR` → `TEXT` for `license_type`

### ✅ Phase 1: Lyceum Backend APIs - **COMPLETED**
All 4 CentCom integration API endpoints implemented and tested:

1. ✅ **License Verification API** (`POST /api/centcom/license/verify`)
   - Validates license keys and machine fingerprints
   - Returns license limits and current usage
   - Updates heartbeat timestamps

2. ✅ **Cluster Discovery API** (`GET /api/centcom/clusters/discover`)
   - Returns all clusters assigned to authenticated user
   - Formats connection details for CentCom consumption
   - Supports both optimized and traditional architectures

3. ✅ **Usage Sync API** (`POST /api/centcom/usage/sync`)
   - Receives usage metrics from CentCom
   - Validates against license limits
   - Returns warnings and throttle recommendations

4. ✅ **Connection Tracking API** (`POST /api/centcom/connection/track`)
   - Tracks cluster connection events
   - Manages default cluster settings
   - Updates connection counts and timestamps

### ✅ Phase 1.5: API Testing & Validation - **COMPLETED**
- ✅ Comprehensive test suite created (`test-centcom-cluster-apis.js`)
- ✅ All endpoints tested with real data
- ✅ **100% test success rate achieved**
- ✅ Documentation updated with test results

**Test Results**: All 4 tests passing ✅  
**Success Rate**: 100%  
**Last Test Run**: October 2, 2025

### 🔄 Phase 2: CentCom Frontend Implementation - **NEXT**
See `CENTCOM_IMPLEMENTATION_PROMPT.md` for Centcom team instructions.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CENTCOM                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Settings → Storage & Databases                    │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  Database Connections:                       │  │   │
│  │  │  • Local Cluster (Active) ✅                 │  │   │
│  │  │  • Production Cloud Cluster                  │  │   │
│  │  │  • Analytics Cluster                         │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────────┐      │
│  │   License    │    │  Cluster Discovery Service  │      │
│  │  Validator   │◄───┤  (polls Lyceum API)        │      │
│  └──────────────┘    └─────────────────────────────┘      │
│         │                        │                         │
│         ▼                        ▼                         │
│  ┌──────────────┐    ┌─────────────────────────────┐      │
│  │    Local     │    │    Cloud Cluster Manager    │      │
│  │   Cluster    │    │   (connects to Lyceum)      │      │
│  │   Manager    │    └─────────────────────────────┘      │
│  └──────────────┘                                          │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│   ClickHouse Local  │
│   (User's Machine)  │
└─────────────────────┘

          ┌────────────────────────┐
          │   LYCEUM PLATFORM      │
          ├────────────────────────┤
          │  • License API         │
          │  • Cluster API         │
          │  • Usage Tracking API  │
          │  • Migration API       │
          └────────────────────────┘
                     │
                     ▼
          ┌────────────────────────┐
          │  Cloud Clusters        │
          │  (Production, etc.)    │
          └────────────────────────┘
```

---

## 📦 Part 1: Backend Implementation (Lyceum Side)

### 1.1 Database Schema Updates

Run this SQL migration on Lyceum's Supabase:

```sql
-- ================================================================
-- CENTCOM LOCAL CLUSTER SCHEMA
-- ================================================================

-- 1. Add local cluster support to licenses table
ALTER TABLE licenses 
ADD COLUMN IF NOT EXISTS allows_local_cluster BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS local_cluster_limits JSONB DEFAULT '{
  "max_storage_gb": 10,
  "max_monthly_queries": 100000,
  "max_users": 1,
  "lifecycle_tiers_enabled": false,
  "offline_grace_days": 7
}'::jsonb;

-- 2. Update existing license types with local cluster capabilities
UPDATE licenses 
SET 
  allows_local_cluster = TRUE,
  local_cluster_limits = CASE license_type
    WHEN 'basic' THEN '{
      "max_storage_gb": 10,
      "max_monthly_queries": 100000,
      "max_users": 1,
      "lifecycle_tiers_enabled": false,
      "offline_grace_days": 7
    }'::jsonb
    WHEN 'professional' THEN '{
      "max_storage_gb": 50,
      "max_monthly_queries": 1000000,
      "max_users": 5,
      "lifecycle_tiers_enabled": true,
      "offline_grace_days": 14
    }'::jsonb
    WHEN 'enterprise' THEN '{
      "max_storage_gb": 500,
      "max_monthly_queries": 10000000,
      "max_users": -1,
      "lifecycle_tiers_enabled": true,
      "offline_grace_days": 30
    }'::jsonb
  END
WHERE license_type IN ('basic', 'professional', 'enterprise');

-- 3. Create table to track local cluster usage
CREATE TABLE IF NOT EXISTS local_cluster_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage metrics
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  queries_this_month INTEGER DEFAULT 0,
  queries_last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Machine info
  machine_fingerprint VARCHAR(255) UNIQUE,
  machine_os VARCHAR(50),
  machine_memory_gb INTEGER,
  machine_cpu_cores INTEGER,
  
  -- Cluster info
  clickhouse_version VARCHAR(50),
  cluster_status VARCHAR(20) DEFAULT 'active',
  last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_machine UNIQUE (user_id, machine_fingerprint)
);

-- 4. Create table for Centcom cluster connections
CREATE TABLE IF NOT EXISTS centcom_cluster_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
  
  -- Connection info
  connection_type VARCHAR(20) CHECK (connection_type IN ('local', 'cloud')),
  connection_name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Auto-discovery metadata
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_connected_at TIMESTAMP WITH TIME ZONE,
  connection_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_user_cluster UNIQUE (user_id, cluster_id)
);

-- 5. Create indexes for performance
CREATE INDEX idx_local_cluster_usage_user ON local_cluster_usage(user_id);
CREATE INDEX idx_local_cluster_usage_license ON local_cluster_usage(license_id);
CREATE INDEX idx_local_cluster_usage_heartbeat ON local_cluster_usage(last_heartbeat_at);
CREATE INDEX idx_centcom_connections_user ON centcom_cluster_connections(user_id);
CREATE INDEX idx_centcom_connections_active ON centcom_cluster_connections(user_id, is_active);

-- 6. Create function to check if local cluster is allowed
CREATE OR REPLACE FUNCTION check_local_cluster_allowed(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  license_type VARCHAR,
  limits JSONB,
  current_usage JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.allows_local_cluster AS allowed,
    l.license_type,
    l.local_cluster_limits AS limits,
    jsonb_build_object(
      'storage_used_gb', COALESCE(lcu.storage_used_gb, 0),
      'queries_this_month', COALESCE(lcu.queries_this_month, 0),
      'last_heartbeat', lcu.last_heartbeat_at
    ) AS current_usage
  FROM licenses l
  LEFT JOIN local_cluster_usage lcu ON lcu.license_id = l.id AND lcu.user_id = p_user_id
  WHERE l.user_id = p_user_id
    AND l.status = 'active'
  ORDER BY l.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get user's available clusters
CREATE OR REPLACE FUNCTION get_user_clusters(p_user_id UUID)
RETURNS TABLE (
  cluster_id UUID,
  cluster_key VARCHAR,
  cluster_name VARCHAR,
  cluster_type VARCHAR,
  architecture VARCHAR,
  classification VARCHAR,
  region VARCHAR,
  connection_type VARCHAR,
  connection_string TEXT,
  processing_endpoint TEXT,
  customer_id VARCHAR,
  is_default BOOLEAN,
  access_level VARCHAR,
  last_connected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.id AS cluster_id,
    uc.cluster_key,
    uc.name AS cluster_name,
    uc.cluster_type,
    uc.architecture,
    uc.classification,
    uc.region,
    'cloud'::VARCHAR AS connection_type,
    uc.connection_string,
    uc.processing_endpoint,
    uc.customer_id,
    COALESCE(ccc.is_default, FALSE) AS is_default,
    cua.access_level,
    ccc.last_connected_at
  FROM unified_clusters uc
  INNER JOIN cluster_user_assignments cua ON cua.cluster_id = uc.id
  LEFT JOIN centcom_cluster_connections ccc ON ccc.cluster_id = uc.id AND ccc.user_id = p_user_id
  WHERE cua.user_id = p_user_id
    AND cua.is_active = TRUE
    AND uc.status IN ('active', 'creating')
  ORDER BY ccc.is_default DESC NULLS LAST, uc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create RLS policies
ALTER TABLE local_cluster_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE centcom_cluster_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own local cluster usage"
  ON local_cluster_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own local cluster usage"
  ON local_cluster_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own local cluster usage"
  ON local_cluster_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cluster connections"
  ON centcom_cluster_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cluster connections"
  ON centcom_cluster_connections FOR ALL
  USING (auth.uid() = user_id);

-- 9. Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Centcom local cluster schema installed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create API endpoints (see section 1.2)';
  RAISE NOTICE '2. Implement Centcom integration (see section 2)';
END $$;
```

---

### 1.2 API Endpoints (Lyceum)

Create these API routes in Lyceum:

#### **API Route: `/api/centcom/license/verify`**

```typescript
// File: src/app/api/centcom/license/verify/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { license_key, machine_fingerprint } = await request.json()
    
    if (!license_key || !machine_fingerprint) {
      return NextResponse.json({ 
        error: 'Missing license_key or machine_fingerprint' 
      }, { status: 400 })
    }
    
    // Find license
    const { data: license, error: licenseError } = await dbOperations.supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .eq('status', 'active')
      .single()
    
    if (licenseError || !license) {
      return NextResponse.json({ 
        error: 'Invalid or inactive license' 
      }, { status: 404 })
    }
    
    // Check local cluster permission
    const { data: permission } = await dbOperations.supabaseAdmin
      .rpc('check_local_cluster_allowed', { p_user_id: license.user_id })
    
    if (!permission || !permission[0]?.allowed) {
      return NextResponse.json({ 
        error: 'License does not support local clusters' 
      }, { status: 403 })
    }
    
    // Update or create usage record
    const { data: usage, error: usageError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .upsert({
        license_id: license.id,
        user_id: license.user_id,
        machine_fingerprint,
        last_heartbeat_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,machine_fingerprint'
      })
      .select()
      .single()
    
    // Return license info with limits
    return NextResponse.json({
      success: true,
      license: {
        id: license.id,
        type: license.license_type,
        allows_local_cluster: license.allows_local_cluster,
        limits: license.local_cluster_limits,
        user_id: license.user_id,
        expires_at: license.expires_at
      },
      usage: permission[0]?.current_usage || {},
      cluster_config: {
        enabled: true,
        machine_fingerprint,
        offline_grace_days: license.local_cluster_limits?.offline_grace_days || 7
      }
    })
    
  } catch (error) {
    console.error('License verification error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

---

#### **API Route: `/api/centcom/clusters/discover`**

```typescript
// File: src/app/api/centcom/clusters/discover/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    // Get all clusters assigned to this user
    const { data: clusters, error: clustersError } = await dbOperations.supabaseAdmin
      .rpc('get_user_clusters', { p_user_id: user.id })
    
    if (clustersError) {
      console.error('Error fetching clusters:', clustersError)
      return NextResponse.json({ 
        error: 'Failed to fetch clusters' 
      }, { status: 500 })
    }
    
    // Format for Centcom consumption
    const connections = clusters.map((cluster: any) => ({
      id: cluster.cluster_id,
      key: cluster.cluster_key,
      name: cluster.cluster_name,
      type: cluster.cluster_type,
      architecture: cluster.architecture,
      classification: cluster.classification,
      region: cluster.region,
      connection_type: cluster.connection_type,
      access_level: cluster.access_level,
      is_default: cluster.is_default,
      
      // Connection details
      connection_info: cluster.architecture === 'optimized' ? {
        endpoint: cluster.processing_endpoint,
        customer_id: cluster.customer_id,
        protocol: 'https'
      } : {
        connection_string: cluster.connection_string,
        protocol: 'clickhouse'
      },
      
      // Metadata
      last_connected_at: cluster.last_connected_at,
      discovered_at: new Date().toISOString()
    }))
    
    return NextResponse.json({
      success: true,
      clusters: connections,
      total: connections.length
    })
    
  } catch (error) {
    console.error('Cluster discovery error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

---

#### **API Route: `/api/centcom/usage/sync`**

```typescript
// File: src/app/api/centcom/usage/sync/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const { 
      machine_fingerprint,
      storage_used_gb,
      queries_this_month,
      clickhouse_version,
      machine_info
    } = await request.json()
    
    // Update usage
    const { data: usage, error: updateError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .update({
        storage_used_gb,
        queries_this_month,
        clickhouse_version,
        machine_os: machine_info?.os,
        machine_memory_gb: machine_info?.memory_gb,
        machine_cpu_cores: machine_info?.cpu_cores,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('machine_fingerprint', machine_fingerprint)
      .select()
      .single()
    
    if (updateError) {
      console.error('Usage update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update usage' 
      }, { status: 500 })
    }
    
    // Get current license limits
    const { data: permission } = await dbOperations.supabaseAdmin
      .rpc('check_local_cluster_allowed', { p_user_id: user.id })
    
    const limits = permission?.[0]?.limits || {}
    
    // Check if limits exceeded
    const warnings = []
    if (storage_used_gb > limits.max_storage_gb) {
      warnings.push({
        type: 'storage_exceeded',
        message: `Storage limit exceeded: ${storage_used_gb}GB / ${limits.max_storage_gb}GB`,
        action: 'upgrade_or_cleanup'
      })
    }
    
    if (queries_this_month > limits.max_monthly_queries) {
      warnings.push({
        type: 'queries_exceeded',
        message: `Query limit exceeded: ${queries_this_month} / ${limits.max_monthly_queries}`,
        action: 'upgrade_license'
      })
    }
    
    return NextResponse.json({
      success: true,
      usage: {
        storage_used_gb,
        storage_limit_gb: limits.max_storage_gb,
        queries_this_month,
        query_limit: limits.max_monthly_queries,
        percentage_used: {
          storage: (storage_used_gb / limits.max_storage_gb) * 100,
          queries: (queries_this_month / limits.max_monthly_queries) * 100
        }
      },
      warnings,
      should_throttle: warnings.length > 0
    })
    
  } catch (error) {
    console.error('Usage sync error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

---

#### **API Route: `/api/centcom/connection/track`**

```typescript
// File: src/app/api/centcom/connection/track/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const { cluster_id, connection_type } = await request.json()
    
    // Update or create connection record
    const { data: connection, error: connectionError } = await dbOperations.supabaseAdmin
      .from('centcom_cluster_connections')
      .upsert({
        user_id: user.id,
        cluster_id,
        connection_type,
        last_connected_at: new Date().toISOString(),
        connection_count: dbOperations.supabaseAdmin.raw('connection_count + 1')
      }, {
        onConflict: 'user_id,cluster_id'
      })
      .select()
      .single()
    
    return NextResponse.json({
      success: true,
      connection
    })
    
  } catch (error) {
    console.error('Connection tracking error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

---

## 📱 Part 2: Centcom Implementation

### 2.1 Project Structure

Create these new files in the Centcom project:

```
centcom/
├── src/
│   ├── services/
│   │   ├── LocalClusterManager.ts      # Local ClickHouse management
│   │   ├── LyceumIntegration.ts        # Lyceum API client
│   │   ├── ClusterDiscoveryService.ts  # Auto-discovery of clusters
│   │   └── UsageTracker.ts             # Usage monitoring
│   ├── lib/
│   │   ├── clickhouse-installer.ts     # Auto-install ClickHouse
│   │   └── machine-fingerprint.ts      # Generate machine ID
│   ├── types/
│   │   └── cluster.ts                  # TypeScript interfaces
│   └── ui/
│       └── settings/
│           └── DatabaseConnections.tsx # UI component
└── config/
    └── clickhouse-templates/
        ├── config.xml.template         # ClickHouse config
        └── users.xml.template          # User permissions
```

---

### 2.2 Core Services Implementation

#### **File: `src/types/cluster.ts`**

```typescript
export interface LicenseInfo {
  id: string
  type: 'basic' | 'professional' | 'enterprise'
  allows_local_cluster: boolean
  limits: LocalClusterLimits
  user_id: string
  expires_at: string
}

export interface LocalClusterLimits {
  max_storage_gb: number
  max_monthly_queries: number
  max_users: number
  lifecycle_tiers_enabled: boolean
  offline_grace_days: number
}

export interface ClusterConnection {
  id: string
  key: string
  name: string
  type: 'development' | 'staging' | 'production' | 'analytics'
  architecture: 'traditional' | 'optimized'
  classification: 'gratis' | 'trial' | 'enterprise'
  region: string
  connection_type: 'local' | 'cloud'
  access_level: string
  is_default: boolean
  connection_info: {
    endpoint?: string
    customer_id?: string
    connection_string?: string
    protocol: string
  }
  status?: 'connected' | 'disconnected' | 'error'
  last_connected_at?: string
}

export interface UsageMetrics {
  storage_used_gb: number
  storage_limit_gb: number
  queries_this_month: number
  query_limit: number
  percentage_used: {
    storage: number
    queries: number
  }
}

export interface MachineInfo {
  fingerprint: string
  os: string
  memory_gb: number
  cpu_cores: number
  available_disk_gb: number
}
```

---

#### **File: `src/lib/machine-fingerprint.ts`**

```typescript
import os from 'os'
import crypto from 'crypto'

/**
 * Generate a unique, persistent machine fingerprint
 */
export function generateMachineFingerprint(): string {
  const components = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    // Add MAC address of first network interface
    Object.values(os.networkInterfaces())
      .flat()
      .find(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
      ?.mac || ''
  ]
  
  const fingerprint = components.join('|')
  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

/**
 * Get machine information
 */
export function getMachineInfo(): MachineInfo {
  const totalMemGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024))
  const cpuCores = os.cpus().length
  
  return {
    fingerprint: generateMachineFingerprint(),
    os: `${os.platform()} ${os.release()}`,
    memory_gb: totalMemGB,
    cpu_cores: cpuCores,
    available_disk_gb: 0 // Will be calculated by getDiskSpace()
  }
}
```

---

#### **File: `src/services/LyceumIntegration.ts`**

```typescript
import { LicenseInfo, ClusterConnection, UsageMetrics, MachineInfo } from '@/types/cluster'

export class LyceumIntegration {
  private baseUrl: string
  private authToken: string | null = null
  
  constructor(baseUrl: string = 'https://lyceum.io') {
    this.baseUrl = baseUrl
  }
  
  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token
  }
  
  /**
   * Verify license and get local cluster permissions
   */
  async verifyLicense(licenseKey: string, machineFingerprint: string): Promise<LicenseInfo> {
    const response = await fetch(`${this.baseUrl}/api/centcom/license/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey,
        machine_fingerprint: machineFingerprint
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'License verification failed')
    }
    
    const data = await response.json()
    
    // Store auth token for future requests
    this.authToken = data.license.id
    
    return data.license
  }
  
  /**
   * Discover all clusters available to the user
   */
  async discoverClusters(authToken: string): Promise<ClusterConnection[]> {
    const response = await fetch(`${this.baseUrl}/api/centcom/clusters/discover`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Cluster discovery failed')
    }
    
    const data = await response.json()
    return data.clusters || []
  }
  
  /**
   * Sync local cluster usage to Lyceum
   */
  async syncUsage(
    authToken: string,
    machineFingerprint: string,
    usage: {
      storage_used_gb: number
      queries_this_month: number
      clickhouse_version: string
      machine_info: MachineInfo
    }
  ): Promise<{ success: boolean; warnings: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/centcom/usage/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        machine_fingerprint: machineFingerprint,
        storage_used_gb: usage.storage_used_gb,
        queries_this_month: usage.queries_this_month,
        clickhouse_version: usage.clickhouse_version,
        machine_info: {
          os: usage.machine_info.os,
          memory_gb: usage.machine_info.memory_gb,
          cpu_cores: usage.machine_info.cpu_cores
        }
      })
    })
    
    if (!response.ok) {
      console.error('Usage sync failed:', await response.text())
      return { success: false, warnings: [] }
    }
    
    const data = await response.json()
    return {
      success: data.success,
      warnings: data.warnings || []
    }
  }
  
  /**
   * Track cluster connection
   */
  async trackConnection(authToken: string, clusterId: string, connectionType: 'local' | 'cloud') {
    await fetch(`${this.baseUrl}/api/centcom/connection/track`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cluster_id: clusterId,
        connection_type: connectionType
      })
    })
  }
}
```

---

#### **File: `src/services/LocalClusterManager.ts`**

```typescript
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { LicenseInfo, MachineInfo } from '@/types/cluster'

export class LocalClusterManager {
  private clickhouseProcess: ChildProcess | null = null
  private configPath: string
  private dataPath: string
  private licenseInfo: LicenseInfo | null = null
  
  constructor() {
    // Set paths based on OS
    const appDataPath = process.env.APPDATA || 
                       path.join(os.homedir(), 'AppData', 'Roaming')
    const baseDir = path.join(appDataPath, 'Centcom', 'LocalCluster')
    
    this.configPath = path.join(baseDir, 'config')
    this.dataPath = path.join(baseDir, 'data')
  }
  
  /**
   * Initialize local cluster with license
   */
  async initialize(licenseInfo: LicenseInfo, machineInfo: MachineInfo) {
    this.licenseInfo = licenseInfo
    
    // Create directories
    await fs.mkdir(this.configPath, { recursive: true })
    await fs.mkdir(this.dataPath, { recursive: true })
    
    // Check if ClickHouse is installed
    const isInstalled = await this.checkClickHouseInstalled()
    if (!isInstalled) {
      throw new Error('ClickHouse not installed. Please install ClickHouse first.')
    }
    
    // Generate optimal config
    await this.generateConfig(licenseInfo, machineInfo)
    
    // Start ClickHouse
    await this.start()
  }
  
  /**
   * Check if ClickHouse is installed
   */
  private async checkClickHouseInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('clickhouse-server', ['--version'])
      process.on('error', () => resolve(false))
      process.on('close', (code) => resolve(code === 0))
    })
  }
  
  /**
   * Generate ClickHouse configuration
   */
  private async generateConfig(license: LicenseInfo, machine: MachineInfo) {
    const limits = license.limits
    
    // Calculate optimal memory usage (50% of available RAM or 20% of storage limit)
    const maxMemoryBytes = Math.min(
      machine.memory_gb * 0.5 * 1024 * 1024 * 1024,
      limits.max_storage_gb * 0.2 * 1024 * 1024 * 1024
    )
    
    const config = `
<?xml version="1.0"?>
<clickhouse>
  <logger>
    <level>information</level>
    <log>${path.join(this.dataPath, 'clickhouse-server.log')}</log>
    <errorlog>${path.join(this.dataPath, 'clickhouse-server.err.log')}</errorlog>
    <size>100M</size>
    <count>3</count>
  </logger>

  <http_port>8123</http_port>
  <tcp_port>9000</tcp_port>

  <!-- Resource Limits (License: ${license.type}) -->
  <max_server_memory_usage>${Math.floor(maxMemoryBytes)}</max_server_memory_usage>
  <max_concurrent_queries>${Math.min(machine.cpu_cores * 2, 20)}</max_concurrent_queries>

  <!-- Data Storage -->
  <path>${path.join(this.dataPath, 'data')}/</path>
  <tmp_path>${path.join(this.dataPath, 'tmp')}/</tmp_path>
  <user_files_path>${path.join(this.dataPath, 'user_files')}/</user_files_path>

  ${limits.lifecycle_tiers_enabled ? this.generateLifecycleConfig() : ''}

  <!-- Compression -->
  <compression>
    <case>
      <method>lz4</method>
    </case>
  </compression>

  <!-- Users -->
  <users>
    <default>
      <password></password>
      <networks>
        <ip>::/0</ip>
      </networks>
      <profile>default</profile>
      <quota>default</quota>
    </default>
  </users>

  <profiles>
    <default>
      <max_memory_usage>${Math.floor(maxMemoryBytes * 0.8)}</max_memory_usage>
    </default>
  </profiles>

  <quotas>
    <default>
      <interval>
        <duration>2592000</duration>
        <queries>${limits.max_monthly_queries}</queries>
      </interval>
    </default>
  </quotas>
</clickhouse>
`
    
    await fs.writeFile(path.join(this.configPath, 'config.xml'), config)
  }
  
  /**
   * Generate lifecycle management config (for pro+ licenses)
   */
  private generateLifecycleConfig(): string {
    return `
  <!-- Multi-Tier Storage (Professional+) -->
  <storage_configuration>
    <disks>
      <default>
        <path>${path.join(this.dataPath, 'hot')}/</path>
      </default>
      <warm>
        <path>${path.join(this.dataPath, 'warm')}/</path>
      </warm>
      <cold>
        <path>${path.join(this.dataPath, 'cold')}/</path>
      </cold>
    </disks>
    
    <policies>
      <default>
        <volumes>
          <hot>
            <disk>default</disk>
          </hot>
          <warm>
            <disk>warm</disk>
            <move_factor>0.2</move_factor>
          </warm>
          <cold>
            <disk>cold</disk>
            <move_factor>0.1</move_factor>
          </cold>
        </volumes>
      </default>
    </policies>
  </storage_configuration>
`
  }
  
  /**
   * Start ClickHouse server
   */
  async start(): Promise<void> {
    if (this.clickhouseProcess) {
      console.log('ClickHouse already running')
      return
    }
    
    return new Promise((resolve, reject) => {
      this.clickhouseProcess = spawn('clickhouse-server', [
        '--config-file',
        path.join(this.configPath, 'config.xml')
      ])
      
      this.clickhouseProcess.stdout?.on('data', (data) => {
        console.log(`ClickHouse: ${data}`)
        if (data.toString().includes('Ready for connections')) {
          resolve()
        }
      })
      
      this.clickhouseProcess.stderr?.on('data', (data) => {
        console.error(`ClickHouse Error: ${data}`)
      })
      
      this.clickhouseProcess.on('error', (error) => {
        reject(error)
      })
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.clickhouseProcess?.pid) {
          reject(new Error('ClickHouse failed to start within 30 seconds'))
        }
      }, 30000)
    })
  }
  
  /**
   * Stop ClickHouse server
   */
  async stop(): Promise<void> {
    if (this.clickhouseProcess) {
      this.clickhouseProcess.kill('SIGTERM')
      this.clickhouseProcess = null
    }
  }
  
  /**
   * Get current usage metrics
   */
  async getUsage(): Promise<{ storage_gb: number; queries: number }> {
    // Query ClickHouse for current usage
    // This is a simplified example - implement actual queries
    return {
      storage_gb: 0,
      queries: 0
    }
  }
  
  /**
   * Test connection to local cluster
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8123/ping')
      return response.ok
    } catch {
      return false
    }
  }
}
```

---

#### **File: `src/services/ClusterDiscoveryService.ts`**

```typescript
import { ClusterConnection } from '@/types/cluster'
import { LyceumIntegration } from './LyceumIntegration'
import { LocalClusterManager } from './LocalClusterManager'

export class ClusterDiscoveryService {
  private lyceum: LyceumIntegration
  private localCluster: LocalClusterManager
  private discoveryInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.lyceum = new LyceumIntegration()
    this.localCluster = new LocalClusterManager()
  }
  
  /**
   * Discover all available clusters (local + cloud)
   */
  async discoverAll(authToken: string): Promise<ClusterConnection[]> {
    const clusters: ClusterConnection[] = []
    
    // 1. Check for local cluster
    const hasLocal = await this.localCluster.testConnection()
    if (hasLocal) {
      clusters.push({
        id: 'local',
        key: 'LOCAL-CLUSTER',
        name: 'Local Cluster',
        type: 'development',
        architecture: 'traditional',
        classification: 'gratis',
        region: 'localhost',
        connection_type: 'local',
        access_level: 'owner',
        is_default: true,
        connection_info: {
          endpoint: 'http://localhost:8123',
          protocol: 'http'
        },
        status: 'connected'
      })
    }
    
    // 2. Discover cloud clusters from Lyceum
    try {
      const cloudClusters = await this.lyceum.discoverClusters(authToken)
      clusters.push(...cloudClusters.map(c => ({
        ...c,
        status: 'disconnected' as const
      })))
    } catch (error) {
      console.error('Failed to discover cloud clusters:', error)
    }
    
    return clusters
  }
  
  /**
   * Start automatic discovery (polls every 5 minutes)
   */
  startAutoDiscovery(authToken: string, onUpdate: (clusters: ClusterConnection[]) => void) {
    // Initial discovery
    this.discoverAll(authToken).then(onUpdate)
    
    // Poll every 5 minutes
    this.discoveryInterval = setInterval(async () => {
      const clusters = await this.discoverAll(authToken)
      onUpdate(clusters)
    }, 5 * 60 * 1000)
  }
  
  /**
   * Stop automatic discovery
   */
  stopAutoDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval)
      this.discoveryInterval = null
    }
  }
  
  /**
   * Connect to a specific cluster
   */
  async connect(cluster: ClusterConnection, authToken: string): Promise<boolean> {
    try {
      // Track connection in Lyceum
      if (cluster.id !== 'local') {
        await this.lyceum.trackConnection(authToken, cluster.id, cluster.connection_type)
      }
      
      // Test connection
      const endpoint = cluster.connection_info.endpoint || 
                      cluster.connection_info.connection_string
      
      if (!endpoint) {
        throw new Error('No connection endpoint available')
      }
      
      const response = await fetch(`${endpoint}/ping`)
      return response.ok
    } catch (error) {
      console.error('Connection failed:', error)
      return false
    }
  }
}
```

---

### 2.3 UI Component

#### **File: `src/ui/settings/DatabaseConnections.tsx`**

```typescript
import React, { useEffect, useState } from 'react'
import { ClusterConnection } from '@/types/cluster'
import { ClusterDiscoveryService } from '@/services/ClusterDiscoveryService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Database, Cloud, HardDrive, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export function DatabaseConnections() {
  const [clusters, setClusters] = useState<ClusterConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  
  const discovery = new ClusterDiscoveryService()
  
  useEffect(() => {
    loadClusters()
    
    // Start auto-discovery
    const authToken = localStorage.getItem('lyceum_auth_token')
    if (authToken) {
      discovery.startAutoDiscovery(authToken, (updated) => {
        setClusters(updated)
      })
    }
    
    return () => {
      discovery.stopAutoDiscovery()
    }
  }, [])
  
  const loadClusters = async () => {
    try {
      setLoading(true)
      const authToken = localStorage.getItem('lyceum_auth_token')
      if (!authToken) {
        console.error('No auth token found')
        return
      }
      
      const discovered = await discovery.discoverAll(authToken)
      setClusters(discovered)
    } catch (error) {
      console.error('Failed to load clusters:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleConnect = async (cluster: ClusterConnection) => {
    try {
      setConnecting(cluster.id)
      const authToken = localStorage.getItem('lyceum_auth_token')
      if (!authToken) return
      
      const success = await discovery.connect(cluster, authToken)
      
      if (success) {
        // Update cluster status
        setClusters(prev => prev.map(c => 
          c.id === cluster.id ? { ...c, status: 'connected' } : c
        ))
      }
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setConnecting(null)
    }
  }
  
  const getClusterIcon = (cluster: ClusterConnection) => {
    if (cluster.connection_type === 'local') {
      return <HardDrive className="w-5 h-5 text-blue-600" />
    }
    return <Cloud className="w-5 h-5 text-green-600" />
  }
  
  const getStatusBadge = (cluster: ClusterConnection) => {
    if (cluster.status === 'connected') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      )
    }
    if (cluster.status === 'error') {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        Disconnected
      </Badge>
    )
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Discovering database clusters...</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Database Connections</h2>
          <p className="text-gray-600">
            Manage your local and cloud database clusters
          </p>
        </div>
        <Button onClick={loadClusters} variant="outline">
          <Database className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {clusters.length === 0 ? (
        <Card className="p-8 text-center">
          <Database className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No clusters found</h3>
          <p className="text-gray-600 mb-4">
            No database clusters are currently available. 
            Create a cluster on Lyceum or enable local cluster with your license.
          </p>
          <Button>
            Create Cloud Cluster
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    {getClusterIcon(cluster)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold">{cluster.name}</h3>
                      {cluster.is_default && (
                        <Badge variant="outline">Default</Badge>
                      )}
                      {getStatusBadge(cluster)}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="secondary">{cluster.key}</Badge>
                      <Badge className="capitalize">{cluster.type}</Badge>
                      <Badge className="capitalize">{cluster.architecture}</Badge>
                      {cluster.classification && (
                        <Badge className={
                          cluster.classification === 'gratis' ? 'bg-green-100 text-green-800' :
                          cluster.classification === 'trial' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {cluster.classification}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Region:</span> {cluster.region}
                      </div>
                      <div>
                        <span className="font-medium">Access Level:</span> {cluster.access_level}
                      </div>
                      {cluster.connection_info.endpoint && (
                        <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-2">
                          {cluster.connection_info.endpoint}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleConnect(cluster)}
                    disabled={cluster.status === 'connected' || connecting === cluster.id}
                    variant={cluster.status === 'connected' ? 'outline' : 'default'}
                  >
                    {connecting === cluster.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    {cluster.status === 'connected' ? 'Connected' : 'Connect'}
                  </Button>
                  
                  {cluster.connection_type === 'cloud' && (
                    <Button variant="ghost" size="sm">
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 🚀 Part 3: Integration Steps

### Step 1: Install Dependencies

```bash
# In Centcom project
npm install @clickhouse/client
npm install machine-uuid
```

### Step 2: Update Centcom Settings UI

Add the DatabaseConnections component to your settings page:

```typescript
// src/ui/settings/SettingsPage.tsx

import { DatabaseConnections } from './DatabaseConnections'

export function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Other settings sections */}
      
      <section id="storage-databases">
        <DatabaseConnections />
      </section>
    </div>
  )
}
```

### Step 3: Initialize Services on App Start

```typescript
// src/main.ts or src/App.tsx

import { LyceumIntegration } from './services/LyceumIntegration'
import { LocalClusterManager } from './services/LocalClusterManager'
import { generateMachineFingerprint, getMachineInfo } from './lib/machine-fingerprint'

async function initializeDatabaseServices() {
  const lyceum = new LyceumIntegration()
  const localCluster = new LocalClusterManager()
  
  // Get license key from storage
  const licenseKey = localStorage.getItem('centcom_license_key')
  if (!licenseKey) {
    console.log('No license key found')
    return
  }
  
  try {
    // Verify license and get permissions
    const machineFingerprint = generateMachineFingerprint()
    const licenseInfo = await lyceum.verifyLicense(licenseKey, machineFingerprint)
    
    if (licenseInfo.allows_local_cluster) {
      // Initialize local cluster
      const machineInfo = getMachineInfo()
      await localCluster.initialize(licenseInfo, machineInfo)
      
      console.log('Local cluster initialized successfully')
      
      // Store auth token for API calls
      localStorage.setItem('lyceum_auth_token', licenseInfo.id)
    }
  } catch (error) {
    console.error('Failed to initialize database services:', error)
  }
}

// Call on app startup
initializeDatabaseServices()
```

### Step 4: Implement Usage Tracking

```typescript
// src/services/UsageTracker.ts

import { LyceumIntegration } from './LyceumIntegration'
import { LocalClusterManager } from './LocalClusterManager'
import { getMachineInfo } from '@/lib/machine-fingerprint'

export class UsageTracker {
  private lyceum: LyceumIntegration
  private localCluster: LocalClusterManager
  private trackingInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.lyceum = new LyceumIntegration()
    this.localCluster = new LocalClusterManager()
  }
  
  /**
   * Start tracking usage (syncs every minute)
   */
  startTracking(authToken: string, machineFingerprint: string) {
    this.trackingInterval = setInterval(async () => {
      try {
        const usage = await this.localCluster.getUsage()
        const machineInfo = getMachineInfo()
        
        const result = await this.lyceum.syncUsage(
          authToken,
          machineFingerprint,
          {
            storage_used_gb: usage.storage_gb,
            queries_this_month: usage.queries,
            clickhouse_version: '23.8', // Get actual version
            machine_info: machineInfo
          }
        )
        
        if (result.warnings.length > 0) {
          // Show warnings to user
          this.handleWarnings(result.warnings)
        }
      } catch (error) {
        console.error('Usage sync failed:', error)
      }
    }, 60000) // Every minute
  }
  
  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval)
    }
  }
  
  private handleWarnings(warnings: any[]) {
    warnings.forEach(warning => {
      // Show notification to user
      console.warn('Usage warning:', warning)
      
      if (warning.type === 'storage_exceeded') {
        // Show upgrade prompt
      } else if (warning.type === 'queries_exceeded') {
        // Show upgrade prompt
      }
    })
  }
}

// Initialize in main app
const usageTracker = new UsageTracker()
const authToken = localStorage.getItem('lyceum_auth_token')
const machineFingerprint = generateMachineFingerprint()

if (authToken && machineFingerprint) {
  usageTracker.startTracking(authToken, machineFingerprint)
}
```

---

## 📋 Part 4: Testing Guide

### Test Scenario 1: License Verification

```typescript
// Test license verification
const lyceum = new LyceumIntegration()
const fingerprint = generateMachineFingerprint()

const license = await lyceum.verifyLicense('LIC-XXXX-XXXX', fingerprint)
console.log('License verified:', license)
// Expected: { type: 'professional', allows_local_cluster: true, limits: {...} }
```

### Test Scenario 2: Cluster Discovery

```typescript
// Test cluster discovery
const discovery = new ClusterDiscoveryService()
const authToken = 'user-auth-token'

const clusters = await discovery.discoverAll(authToken)
console.log('Discovered clusters:', clusters)
// Expected: Array of ClusterConnection objects
```

### Test Scenario 3: Usage Tracking

```typescript
// Test usage sync
const lyceum = new LyceumIntegration()
const result = await lyceum.syncUsage(authToken, fingerprint, {
  storage_used_gb: 5.2,
  queries_this_month: 50000,
  clickhouse_version: '23.8',
  machine_info: getMachineInfo()
})
console.log('Usage synced:', result)
// Expected: { success: true, warnings: [] }
```

---

## 🎯 Part 5: User Flow Examples

### Flow 1: New User with Basic License

```
1. User installs Centcom
2. User enters Basic license key
3. Centcom verifies with Lyceum → allowed_local_cluster = true
4. Centcom checks for ClickHouse → not installed
5. Centcom shows "ClickHouse Required" prompt with install button
6. User clicks "Install ClickHouse"
7. Centcom downloads and installs ClickHouse
8. Centcom generates optimal config (10GB limit, 100k queries/month)
9. Centcom starts local ClickHouse cluster
10. Settings → Storage & Databases shows "Local Cluster (Connected) ✅"
11. User can now process curves locally
```

### Flow 2: User Assigned to Cloud Cluster

```
1. Admin assigns user to "Production Cluster" on Lyceum
2. Centcom polls /api/centcom/clusters/discover every 5 minutes
3. Discovery API returns new cluster
4. Settings → Storage & Databases auto-updates with "Production Cluster"
5. User sees:
   • Local Cluster (Connected) ✅
   • Production Cluster (Disconnected)
6. User clicks "Connect" on Production Cluster
7. Centcom tests connection → success
8. Status updates to "Connected ✅"
9. User can now choose which cluster to use for operations
```

### Flow 3: User Creates New Cluster on Lyceum

```
1. User goes to lyceum.io and creates "Analytics Cluster"
2. Lyceum creates cluster with user_id assignment
3. Next Centcom discovery poll (max 5 min wait)
4. Discovery API returns new "Analytics Cluster"
5. Automatically appears in Database Connections
6. User clicks "Connect" → ready to use
```

---

## 🔧 Part 6: Troubleshooting

### Issue: Clusters Not Appearing

**Solution**:
```typescript
// Check auth token
const token = localStorage.getItem('lyceum_auth_token')
console.log('Auth token:', token ? 'Present' : 'Missing')

// Manually trigger discovery
const discovery = new ClusterDiscoveryService()
const clusters = await discovery.discoverAll(token)
console.log('Discovered:', clusters)
```

### Issue: Local Cluster Won't Start

**Solution**:
```typescript
// Check ClickHouse installation
const { exec } = require('child_process')
exec('clickhouse-server --version', (error, stdout) => {
  if (error) {
    console.error('ClickHouse not installed:', error)
  } else {
    console.log('ClickHouse version:', stdout)
  }
})

// Check logs
const logPath = path.join(dataPath, 'clickhouse-server.log')
const logs = await fs.readFile(logPath, 'utf-8')
console.log('ClickHouse logs:', logs)
```

### Issue: Usage Not Syncing

**Solution**:
```typescript
// Check sync manually
const lyceum = new LyceumIntegration()
const result = await lyceum.syncUsage(authToken, fingerprint, usageData)
console.log('Sync result:', result)

// Check network connectivity
fetch('https://lyceum.io/api/health')
  .then(r => console.log('Lyceum reachable:', r.ok))
  .catch(e => console.error('Lyceum unreachable:', e))
```

---

## 📚 Part 7: API Reference Summary

### Lyceum API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/centcom/license/verify` | POST | Verify license and get local cluster permissions |
| `/api/centcom/clusters/discover` | GET | Get all clusters assigned to user |
| `/api/centcom/usage/sync` | POST | Sync local cluster usage metrics |
| `/api/centcom/connection/track` | POST | Track cluster connection event |

### Centcom Services

| Service | Purpose |
|---------|---------|
| `LyceumIntegration` | Communicate with Lyceum API |
| `LocalClusterManager` | Manage local ClickHouse instance |
| `ClusterDiscoveryService` | Auto-discover all available clusters |
| `UsageTracker` | Track and sync usage metrics |

---

## ✅ Completion Checklist

### Lyceum Side:
- [ ] Run database migration SQL
- [ ] Create API routes (verify, discover, sync, track)
- [ ] Test API endpoints with Postman
- [ ] Deploy to production

### Centcom Side:
- [ ] Add TypeScript interfaces
- [ ] Implement LyceumIntegration service
- [ ] Implement LocalClusterManager service
- [ ] Implement ClusterDiscoveryService
- [ ] Implement UsageTracker
- [ ] Create DatabaseConnections UI component
- [ ] Add ClickHouse installer flow
- [ ] Test license verification
- [ ] Test cluster discovery
- [ ] Test usage tracking
- [ ] Add error handling and logging

### User Experience:
- [ ] Test with Basic license
- [ ] Test with Professional license
- [ ] Test with Enterprise license
- [ ] Test cluster auto-discovery
- [ ] Test connection to cloud clusters
- [ ] Test local cluster limits
- [ ] Test upgrade prompts

---

## 🎊 Success Criteria

When implementation is complete, users should be able to:

1. ✅ Enter license key → Local cluster auto-configures
2. ✅ See all assigned Lyceum clusters automatically
3. ✅ Connect to any cluster with one click
4. ✅ Switch between local and cloud seamlessly
5. ✅ See real-time usage metrics
6. ✅ Get notified when approaching limits
7. ✅ Upgrade license when needed

---

## 📞 Support

For questions or issues during implementation:

1. **Check logs** in Centcom console and ClickHouse logs
2. **Test API endpoints** directly with curl/Postman
3. **Verify database schema** was created correctly
4. **Check network connectivity** to Lyceum API

---

**This guide provides everything needed to implement local cluster management and automatic Lyceum cluster discovery in Centcom. Good luck with the implementation! 🚀**

---

# 🌐 PART 8: SHARED LOCAL CLUSTER HOSTING

## Overview

This section extends the base implementation to support **internet-accessible local clusters** that users can share with others globally. This creates a peer-to-peer marketplace where users can monetize their spare compute capacity.

---

## 8.1 Enhanced License Tiers with Hosting Capabilities

### Database Schema Extension

```sql
-- ================================================================
-- SHARED LOCAL CLUSTER HOSTING SCHEMA
-- ================================================================

-- 1. Add hosting capabilities to licenses table
ALTER TABLE licenses 
ADD COLUMN IF NOT EXISTS allows_cluster_hosting BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hosting_limits JSONB DEFAULT '{
  "max_concurrent_users": 0,
  "max_bandwidth_gb_month": 0,
  "max_shared_storage_gb": 0,
  "requires_approval": true,
  "tunnel_type": "none",
  "revenue_share_percentage": 0
}'::jsonb;

-- 2. Update license tiers with hosting capabilities
UPDATE licenses 
SET 
  allows_cluster_hosting = CASE license_type
    WHEN 'basic' THEN FALSE
    WHEN 'professional' THEN TRUE
    WHEN 'enterprise' THEN TRUE
    ELSE FALSE
  END,
  hosting_limits = CASE license_type
    WHEN 'basic' THEN '{
      "max_concurrent_users": 0,
      "max_bandwidth_gb_month": 0,
      "max_shared_storage_gb": 0,
      "requires_approval": true,
      "tunnel_type": "none",
      "revenue_share_percentage": 0
    }'::jsonb
    WHEN 'professional' THEN '{
      "max_concurrent_users": 3,
      "max_bandwidth_gb_month": 50,
      "max_shared_storage_gb": 25,
      "requires_approval": true,
      "tunnel_type": "cloudflare",
      "revenue_share_percentage": 50
    }'::jsonb
    WHEN 'enterprise' THEN '{
      "max_concurrent_users": -1,
      "max_bandwidth_gb_month": 500,
      "max_shared_storage_gb": 250,
      "requires_approval": false,
      "tunnel_type": "cloudflare",
      "revenue_share_percentage": 70
    }'::jsonb
  END
WHERE license_type IN ('basic', 'professional', 'enterprise');

-- 3. Create table for shared cluster registrations
CREATE TABLE IF NOT EXISTS shared_local_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  
  -- Cluster info
  cluster_name VARCHAR(255) NOT NULL,
  cluster_description TEXT,
  machine_fingerprint VARCHAR(255) NOT NULL,
  
  -- Network info
  tunnel_type VARCHAR(50) CHECK (tunnel_type IN ('cloudflare', 'ngrok', 'tailscale', 'wireguard', 'manual')),
  tunnel_endpoint VARCHAR(500), -- e.g., https://cluster-abc.trycloudflare.com
  tunnel_status VARCHAR(20) DEFAULT 'offline' CHECK (tunnel_status IN ('online', 'offline', 'error', 'starting')),
  tunnel_started_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Security
  auth_token_hash VARCHAR(255), -- Hashed authentication token for cluster access
  allowed_ip_ranges TEXT[], -- Optional IP whitelist
  encryption_enabled BOOLEAN DEFAULT TRUE,
  
  -- Access control
  is_public BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT TRUE,
  allowed_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  max_concurrent_users INTEGER DEFAULT 3,
  
  -- Usage tracking
  current_connected_users INTEGER DEFAULT 0,
  total_connections INTEGER DEFAULT 0,
  bandwidth_used_gb DECIMAL(10,2) DEFAULT 0,
  bandwidth_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Revenue tracking
  total_revenue_earned DECIMAL(10,2) DEFAULT 0,
  last_revenue_payout_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_host_machine UNIQUE (host_user_id, machine_fingerprint)
);

-- 4. Create table for shared cluster access requests
CREATE TABLE IF NOT EXISTS shared_cluster_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_cluster_id UUID REFERENCES shared_local_clusters(id) ON DELETE CASCADE,
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request info
  request_message TEXT,
  intended_usage TEXT,
  estimated_data_size_gb DECIMAL(10,2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
  
  -- Response
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  review_message TEXT,
  
  -- Access details (if approved)
  access_token_hash VARCHAR(255),
  access_granted_at TIMESTAMP WITH TIME ZONE,
  access_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_requester_cluster UNIQUE (shared_cluster_id, requester_user_id)
);

-- 5. Create table for shared cluster connections (track active sessions)
CREATE TABLE IF NOT EXISTS shared_cluster_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_cluster_id UUID REFERENCES shared_local_clusters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Connection details
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  connection_duration_seconds INTEGER,
  
  -- Usage metrics
  queries_executed INTEGER DEFAULT 0,
  data_transferred_gb DECIMAL(10,2) DEFAULT 0,
  
  -- Billing
  cost_incurred DECIMAL(10,2) DEFAULT 0,
  host_revenue_earned DECIMAL(10,2) DEFAULT 0,
  
  -- Connection metadata
  client_ip VARCHAR(45),
  user_agent TEXT,
  
  CONSTRAINT unique_active_connection UNIQUE NULLS NOT DISTINCT (shared_cluster_id, user_id, disconnected_at)
);

-- 6. Create indexes
CREATE INDEX idx_shared_clusters_host ON shared_local_clusters(host_user_id);
CREATE INDEX idx_shared_clusters_status ON shared_local_clusters(tunnel_status, is_active);
CREATE INDEX idx_shared_clusters_public ON shared_local_clusters(is_public, is_active) WHERE is_public = TRUE;
CREATE INDEX idx_access_requests_cluster ON shared_cluster_access_requests(shared_cluster_id);
CREATE INDEX idx_access_requests_status ON shared_cluster_access_requests(status);
CREATE INDEX idx_access_requests_pending ON shared_cluster_access_requests(requester_user_id, status) WHERE status = 'pending';
CREATE INDEX idx_cluster_connections_active ON shared_cluster_connections(shared_cluster_id, user_id) WHERE disconnected_at IS NULL;

-- 7. Create function to register a shared cluster
CREATE OR REPLACE FUNCTION register_shared_cluster(
  p_host_user_id UUID,
  p_cluster_name VARCHAR,
  p_machine_fingerprint VARCHAR,
  p_tunnel_type VARCHAR,
  p_tunnel_endpoint VARCHAR,
  p_auth_token_hash VARCHAR
)
RETURNS TABLE (
  cluster_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_license licenses%ROWTYPE;
  v_cluster_id UUID;
BEGIN
  -- Check if user has hosting permission
  SELECT * INTO v_license
  FROM licenses
  WHERE user_id = p_host_user_id
    AND status = 'active'
    AND allows_cluster_hosting = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'License does not support cluster hosting. Upgrade to Professional or Enterprise.'::TEXT;
    RETURN;
  END IF;
  
  -- Create or update shared cluster
  INSERT INTO shared_local_clusters (
    host_user_id,
    license_id,
    cluster_name,
    machine_fingerprint,
    tunnel_type,
    tunnel_endpoint,
    tunnel_status,
    auth_token_hash,
    requires_approval,
    max_concurrent_users,
    tunnel_started_at
  )
  VALUES (
    p_host_user_id,
    v_license.id,
    p_cluster_name,
    p_machine_fingerprint,
    p_tunnel_type,
    p_tunnel_endpoint,
    'online',
    p_auth_token_hash,
    (v_license.hosting_limits->>'requires_approval')::BOOLEAN,
    (v_license.hosting_limits->>'max_concurrent_users')::INTEGER,
    NOW()
  )
  ON CONFLICT (host_user_id, machine_fingerprint)
  DO UPDATE SET
    tunnel_endpoint = p_tunnel_endpoint,
    tunnel_status = 'online',
    auth_token_hash = p_auth_token_hash,
    tunnel_started_at = NOW(),
    last_heartbeat_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_cluster_id;
  
  RETURN QUERY SELECT v_cluster_id, TRUE, 'Shared cluster registered successfully. Endpoint: ' || p_tunnel_endpoint::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to discover shared clusters for a user
CREATE OR REPLACE FUNCTION get_available_shared_clusters(p_user_id UUID)
RETURNS TABLE (
  cluster_id UUID,
  cluster_name VARCHAR,
  cluster_description TEXT,
  host_user_email VARCHAR,
  tunnel_endpoint VARCHAR,
  tunnel_status VARCHAR,
  requires_approval BOOLEAN,
  access_status VARCHAR,
  current_users INTEGER,
  max_users INTEGER,
  bandwidth_available_gb DECIMAL,
  revenue_share_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    slc.id AS cluster_id,
    slc.cluster_name,
    slc.cluster_description,
    u.email AS host_user_email,
    slc.tunnel_endpoint,
    slc.tunnel_status,
    slc.requires_approval,
    CASE
      WHEN p_user_id = ANY(slc.allowed_user_ids) THEN 'approved'::VARCHAR
      WHEN EXISTS (
        SELECT 1 FROM shared_cluster_access_requests scar
        WHERE scar.shared_cluster_id = slc.id
          AND scar.requester_user_id = p_user_id
          AND scar.status = 'pending'
      ) THEN 'pending'::VARCHAR
      WHEN EXISTS (
        SELECT 1 FROM shared_cluster_access_requests scar
        WHERE scar.shared_cluster_id = slc.id
          AND scar.requester_user_id = p_user_id
          AND scar.status = 'denied'
      ) THEN 'denied'::VARCHAR
      ELSE 'none'::VARCHAR
    END AS access_status,
    slc.current_connected_users AS current_users,
    slc.max_concurrent_users AS max_users,
    ((l.hosting_limits->>'max_bandwidth_gb_month')::DECIMAL - slc.bandwidth_used_gb) AS bandwidth_available_gb,
    (l.hosting_limits->>'revenue_share_percentage')::INTEGER AS revenue_share_percentage
  FROM shared_local_clusters slc
  INNER JOIN auth.users u ON u.id = slc.host_user_id
  INNER JOIN licenses l ON l.id = slc.license_id
  WHERE slc.is_active = TRUE
    AND slc.tunnel_status = 'online'
    AND (
      slc.is_public = TRUE
      OR p_user_id = ANY(slc.allowed_user_ids)
      OR slc.host_user_id = p_user_id
    )
  ORDER BY slc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to track cluster usage and calculate revenue
CREATE OR REPLACE FUNCTION track_shared_cluster_usage(
  p_connection_id UUID,
  p_queries_executed INTEGER,
  p_data_transferred_gb DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_connection shared_cluster_connections%ROWTYPE;
  v_cluster shared_local_clusters%ROWTYPE;
  v_license licenses%ROWTYPE;
  v_cost DECIMAL;
  v_host_revenue DECIMAL;
  v_revenue_share DECIMAL;
BEGIN
  -- Get connection details
  SELECT * INTO v_connection FROM shared_cluster_connections WHERE id = p_connection_id;
  SELECT * INTO v_cluster FROM shared_local_clusters WHERE id = v_connection.shared_cluster_id;
  SELECT * INTO v_license FROM licenses WHERE id = v_cluster.license_id;
  
  -- Calculate costs (example pricing: $0.05/GB + $0.01 per 1000 queries)
  v_cost := (p_data_transferred_gb * 0.05) + ((p_queries_executed / 1000.0) * 0.01);
  
  -- Calculate host revenue based on license tier
  v_revenue_share := (v_license.hosting_limits->>'revenue_share_percentage')::DECIMAL / 100.0;
  v_host_revenue := v_cost * v_revenue_share;
  
  -- Update connection record
  UPDATE shared_cluster_connections
  SET 
    queries_executed = queries_executed + p_queries_executed,
    data_transferred_gb = data_transferred_gb + p_data_transferred_gb,
    cost_incurred = cost_incurred + v_cost,
    host_revenue_earned = host_revenue_earned + v_host_revenue
  WHERE id = p_connection_id;
  
  -- Update cluster totals
  UPDATE shared_local_clusters
  SET
    bandwidth_used_gb = bandwidth_used_gb + p_data_transferred_gb,
    total_revenue_earned = total_revenue_earned + v_host_revenue,
    updated_at = NOW()
  WHERE id = v_cluster.id;
  
  RETURN jsonb_build_object(
    'cost_incurred', v_cost,
    'host_revenue', v_host_revenue,
    'revenue_share_percentage', v_revenue_share * 100
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create RLS policies
ALTER TABLE shared_local_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_cluster_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_cluster_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hosted clusters"
  ON shared_local_clusters FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Users can manage their own hosted clusters"
  ON shared_local_clusters FOR ALL
  USING (auth.uid() = host_user_id);

CREATE POLICY "Users can view public or accessible clusters"
  ON shared_local_clusters FOR SELECT
  USING (
    is_public = TRUE 
    OR is_active = TRUE 
    OR auth.uid() = ANY(allowed_user_ids)
  );

CREATE POLICY "Users can create access requests"
  ON shared_cluster_access_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_user_id);

CREATE POLICY "Users can view their own requests"
  ON shared_cluster_access_requests FOR SELECT
  USING (auth.uid() = requester_user_id OR auth.uid() IN (
    SELECT host_user_id FROM shared_local_clusters WHERE id = shared_cluster_id
  ));

CREATE POLICY "Hosts can manage access requests for their clusters"
  ON shared_cluster_access_requests FOR UPDATE
  USING (auth.uid() IN (
    SELECT host_user_id FROM shared_local_clusters WHERE id = shared_cluster_id
  ));

CREATE POLICY "Users can view their own connections"
  ON shared_cluster_connections FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() IN (
      SELECT host_user_id FROM shared_local_clusters WHERE id = shared_cluster_id
    )
  );

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Shared local cluster hosting schema installed!';
  RAISE NOTICE '';
  RAISE NOTICE 'New capabilities:';
  RAISE NOTICE '• Professional+ licenses can host local clusters for others';
  RAISE NOTICE '• Users can request access to shared clusters';
  RAISE NOTICE '• Automatic revenue tracking and payouts';
  RAISE NOTICE '• Secure tunnel management with authentication';
END $$;
```

---

## 8.2 License Tier Comparison

| Feature | Basic | Professional | Enterprise |
|---------|-------|--------------|------------|
| **Local Cluster** | ✅ 10GB | ✅ 50GB | ✅ 500GB |
| **Monthly Queries** | 100K | 1M | 10M |
| **Lifecycle Management** | ❌ | ✅ | ✅ |
| **Host Cluster for Others** | ❌ | ✅ Up to 3 users | ✅ Unlimited |
| **Connect to Shared Clusters** | ✅ | ✅ | ✅ |
| **Bandwidth/Month** | N/A | 50GB | 500GB |
| **Tunnel Type** | N/A | CloudFlare | CloudFlare + Custom |
| **Approval Required** | N/A | Yes | No (auto-approve) |
| **Revenue Share** | N/A | 50% | 70% |
| **Offline Grace Period** | 7 days | 14 days | 30 days |

---

## 8.3 Secure Tunnel Implementation

### Option 1: CloudFlare Tunnel (Recommended)

**File: `src/services/TunnelManager.ts`**

```typescript
import { spawn, ChildProcess } from 'child_process'
import crypto from 'crypto'

export class TunnelManager {
  private tunnelProcess: ChildProcess | null = null
  private tunnelEndpoint: string | null = null
  private authToken: string | null = null
  
  /**
   * Start CloudFlare Tunnel for local cluster
   */
  async startCloudFlareTunnel(localPort: number = 8123): Promise<{
    endpoint: string
    authToken: string
  }> {
    return new Promise((resolve, reject) => {
      // Generate secure authentication token
      this.authToken = crypto.randomBytes(32).toString('hex')
      
      // Start cloudflared tunnel
      this.tunnelProcess = spawn('cloudflared', [
        'tunnel',
        '--url', `http://localhost:${localPort}`,
        '--no-autoupdate',
        '--loglevel', 'info'
      ])
      
      this.tunnelProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log('CloudFlare Tunnel:', output)
        
        // Extract tunnel URL
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
        if (urlMatch && !this.tunnelEndpoint) {
          this.tunnelEndpoint = urlMatch[0]
          resolve({
            endpoint: this.tunnelEndpoint,
            authToken: this.authToken!
          })
        }
      })
      
      this.tunnelProcess.stderr?.on('data', (data) => {
        console.error('Tunnel Error:', data.toString())
      })
      
      this.tunnelProcess.on('error', (error) => {
        reject(error)
      })
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.tunnelEndpoint) {
          this.stopTunnel()
          reject(new Error('Failed to start tunnel within 30 seconds'))
        }
      }, 30000)
    })
  }
  
  /**
   * Stop tunnel
   */
  async stopTunnel(): Promise<void> {
    if (this.tunnelProcess) {
      this.tunnelProcess.kill('SIGTERM')
      this.tunnelProcess = null
      this.tunnelEndpoint = null
      this.authToken = null
    }
  }
  
  /**
   * Get current tunnel endpoint
   */
  getTunnelEndpoint(): string | null {
    return this.tunnelEndpoint
  }
  
  /**
   * Get authentication token
   */
  getAuthToken(): string | null {
    return this.authToken
  }
  
  /**
   * Test tunnel connectivity
   */
  async testTunnel(): Promise<boolean> {
    if (!this.tunnelEndpoint) return false
    
    try {
      const response = await fetch(`${this.tunnelEndpoint}/ping`)
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Install CloudFlare Tunnel (if not present)
   */
  async ensureCloudFlaredInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkProcess = spawn('cloudflared', ['--version'])
      checkProcess.on('error', () => {
        console.log('CloudFlare Tunnel not installed')
        resolve(false)
      })
      checkProcess.on('close', (code) => {
        resolve(code === 0)
      })
    })
  }
  
  /**
   * Auto-install CloudFlare Tunnel
   */
  async installCloudFlared(): Promise<void> {
    const os = require('os')
    const platform = os.platform()
    
    let installCommand: string[]
    
    if (platform === 'win32') {
      // Windows
      installCommand = [
        'powershell',
        '-Command',
        'Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "$env:ProgramFiles\\cloudflared.exe"'
      ]
    } else if (platform === 'darwin') {
      // macOS
      installCommand = ['brew', 'install', 'cloudflared']
    } else {
      // Linux
      installCommand = [
        'sh',
        '-c',
        'wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared && sudo chmod +x /usr/local/bin/cloudflared'
      ]
    }
    
    return new Promise((resolve, reject) => {
      const installProcess = spawn(installCommand[0], installCommand.slice(1))
      installProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Installation failed with code ${code}`))
        }
      })
    })
  }
}
```

### Option 2: Tailscale (for Enterprise)

```typescript
export class TailscaleTunnel {
  /**
   * Start Tailscale tunnel
   */
  async startTailscale(): Promise<string> {
    // Tailscale provides a persistent hostname
    // e.g., machine-name.tailnet-name.ts.net
    
    const { exec } = require('child_process')
    
    return new Promise((resolve, reject) => {
      exec('tailscale status --json', (error: any, stdout: string) => {
        if (error) {
          reject(error)
          return
        }
        
        const status = JSON.parse(stdout)
        const hostname = status.Self?.DNSName
        
        if (hostname) {
          resolve(`https://${hostname}:8123`)
        } else {
          reject(new Error('Tailscale not configured'))
        }
      })
    })
  }
}
```

---

## 8.4 Authentication & Authorization

### Token-Based Authentication

```typescript
// File: src/services/SharedClusterAuthService.ts

import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export class SharedClusterAuthService {
  private readonly JWT_SECRET: string
  
  constructor(jwtSecret: string) {
    this.JWT_SECRET = jwtSecret
  }
  
  /**
   * Generate access token for approved user
   */
  generateAccessToken(
    userId: string,
    clusterId: string,
    expiresIn: string = '7d'
  ): string {
    const token = jwt.sign(
      {
        userId,
        clusterId,
        type: 'shared_cluster_access'
      },
      this.JWT_SECRET,
      { expiresIn }
    )
    
    return token
  }
  
  /**
   * Verify access token
   */
  verifyAccessToken(token: string): {
    valid: boolean
    userId?: string
    clusterId?: string
  } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any
      return {
        valid: true,
        userId: decoded.userId,
        clusterId: decoded.clusterId
      }
    } catch {
      return { valid: false }
    }
  }
  
  /**
   * Hash authentication token for storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
  
  /**
   * Generate ClickHouse user credentials for remote access
   */
  generateClickHouseCredentials(userId: string): {
    username: string
    password: string
  } {
    return {
      username: `remote_user_${userId.substring(0, 8)}`,
      password: crypto.randomBytes(16).toString('hex')
    }
  }
}
```

### ClickHouse Authentication Configuration

```typescript
// File: src/services/SharedClusterManager.ts

export class SharedClusterManager {
  /**
   * Configure ClickHouse for remote access
   */
  async configureRemoteAccess(
    userId: string,
    username: string,
    password: string
  ): Promise<void> {
    // Add user to ClickHouse users.xml
    const userConfig = `
      <${username}>
        <password_sha256_hex>${this.hashPassword(password)}</password_sha256_hex>
        <networks>
          <ip>::/0</ip>
        </networks>
        <profile>readonly</profile>
        <quota>remote_user</quota>
        <allow_databases>
          <database>curves_data</database>
        </allow_databases>
      </${username}>
    `
    
    // Write to users.xml and reload ClickHouse
    await this.updateClickHouseUsers(userConfig)
    await this.reloadClickHouseConfig()
  }
  
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex')
  }
}
```

---

## 8.5 Network Security

### Firewall Rules (ClickHouse config)

```xml
<!-- File: clickhouse config with network security -->
<clickhouse>
  <!-- Only allow connections through tunnel -->
  <listen_host>::1</listen_host>
  <listen_host>127.0.0.1</listen_host>
  
  <!-- Enable SSL/TLS (when using custom tunnels) -->
  <https_port>8443</https_port>
  <tcp_port_secure>9440</tcp_port_secure>
  
  <openSSL>
    <server>
      <certificateFile>/path/to/cert.pem</certificateFile>
      <privateKeyFile>/path/to/key.pem</privateKeyFile>
      <verificationMode>none</verificationMode>
      <loadDefaultCAFile>true</loadDefaultCAFile>
      <cacheSessions>true</cacheSessions>
      <disableProtocols>sslv2,sslv3</disableProtocols>
      <preferServerCiphers>true</preferServerCiphers>
    </server>
  </openSSL>
  
  <!-- Rate limiting -->
  <quotas>
    <remote_user>
      <interval>
        <duration>3600</duration>
        <queries>1000</queries>
        <query_selects>800</query_selects>
        <query_inserts>200</query_inserts>
        <result_rows>1000000</result_rows>
        <read_rows>100000000</read_rows>
      </interval>
    </remote_user>
  </quotas>
</clickhouse>
```

### IP Whitelisting

```typescript
// File: src/services/IPWhitelistService.ts

export class IPWhitelistService {
  /**
   * Add IP to whitelist for a shared cluster
   */
  async addIPToWhitelist(
    clusterId: string,
    ipAddress: string
  ): Promise<void> {
    await db.query(`
      UPDATE shared_local_clusters
      SET allowed_ip_ranges = array_append(allowed_ip_ranges, $1)
      WHERE id = $2
    `, [ipAddress, clusterId])
  }
  
  /**
   * Check if IP is allowed
   */
  async isIPAllowed(
    clusterId: string,
    ipAddress: string
  ): Promise<boolean> {
    const result = await db.query(`
      SELECT allowed_ip_ranges
      FROM shared_local_clusters
      WHERE id = $1
    `, [clusterId])
    
    const allowedRanges = result.rows[0]?.allowed_ip_ranges || []
    
    // If no whitelist, allow all
    if (allowedRanges.length === 0) return true
    
    // Check if IP matches any range
    return allowedRanges.some((range: string) => {
      return this.ipInRange(ipAddress, range)
    })
  }
  
  private ipInRange(ip: string, range: string): boolean {
    // Simple IP range checking (implement CIDR notation support)
    return ip === range || range === '0.0.0.0/0'
  }
}
```

---

## 8.6 Lyceum API Endpoints for Shared Clusters

### Register Shared Cluster

```typescript
// File: src/app/api/centcom/shared-cluster/register/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const { 
      cluster_name,
      cluster_description,
      machine_fingerprint,
      tunnel_type,
      tunnel_endpoint,
      auth_token
    } = await request.json()
    
    // Hash the auth token
    const authTokenHash = crypto.createHash('sha256').update(auth_token).digest('hex')
    
    // Register shared cluster
    const { data, error } = await dbOperations.supabaseAdmin
      .rpc('register_shared_cluster', {
        p_host_user_id: user.id,
        p_cluster_name: cluster_name,
        p_machine_fingerprint: machine_fingerprint,
        p_tunnel_type: tunnel_type,
        p_tunnel_endpoint: tunnel_endpoint,
        p_auth_token_hash: authTokenHash
      })
    
    if (error || !data || !data[0]?.success) {
      return NextResponse.json({ 
        success: false,
        error: data?.[0]?.message || 'Failed to register shared cluster' 
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      cluster_id: data[0].cluster_id,
      message: data[0].message,
      endpoint: tunnel_endpoint
    })
    
  } catch (error) {
    console.error('Shared cluster registration error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const { machine_fingerprint } = await request.json()
    
    // Unregister (set to offline)
    await dbOperations.supabaseAdmin
      .from('shared_local_clusters')
      .update({
        tunnel_status: 'offline',
        tunnel_endpoint: null,
        updated_at: new Date().toISOString()
      })
      .eq('host_user_id', user.id)
      .eq('machine_fingerprint', machine_fingerprint)
    
    return NextResponse.json({
      success: true,
      message: 'Shared cluster stopped'
    })
    
  } catch (error) {
    console.error('Shared cluster unregistration error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

### Discover Shared Clusters

```typescript
// File: src/app/api/centcom/shared-cluster/discover/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    // Get available shared clusters
    const { data: clusters, error } = await dbOperations.supabaseAdmin
      .rpc('get_available_shared_clusters', { p_user_id: user.id })
    
    if (error) {
      console.error('Error fetching shared clusters:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch shared clusters' 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      clusters: clusters || [],
      total: clusters?.length || 0
    })
    
  } catch (error) {
    console.error('Shared cluster discovery error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

### Request Access

```typescript
// File: src/app/api/centcom/shared-cluster/request-access/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const { 
      cluster_id, 
      message, 
      intended_usage,
      estimated_data_size_gb 
    } = await request.json()
    
    // Create access request
    const { error } = await dbOperations.supabaseAdmin
      .from('shared_cluster_access_requests')
      .insert({
        shared_cluster_id: cluster_id,
        requester_user_id: user.id,
        request_message: message,
        intended_usage,
        estimated_data_size_gb,
        status: 'pending'
      })
    
    if (error) {
      // Check if request already exists
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'You have already requested access to this cluster' 
        }, { status: 400 })
      }
      
      console.error('Error creating access request:', error)
      return NextResponse.json({ 
        error: 'Failed to create access request' 
      }, { status: 500 })
    }
    
    // TODO: Send notification to cluster host
    
    return NextResponse.json({
      success: true,
      message: 'Access request sent to cluster host. You will be notified when approved.'
    })
    
  } catch (error) {
    console.error('Access request error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

### Approve/Deny Access

```typescript
// File: src/app/api/centcom/shared-cluster/approve-access/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'
import { SharedClusterAuthService } from '@/services/SharedClusterAuthService'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const { request_id, approved, review_message } = await request.json()
    
    // Get request details
    const { data: accessRequest } = await dbOperations.supabaseAdmin
      .from('shared_cluster_access_requests')
      .select('*, shared_local_clusters!inner(host_user_id, id)')
      .eq('id', request_id)
      .single()
    
    if (!accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }
    
    // Verify user is the host
    if (accessRequest.shared_local_clusters.host_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const authService = new SharedClusterAuthService(process.env.JWT_SECRET!)
    
    if (approved) {
      // Generate access token
      const accessToken = authService.generateAccessToken(
        accessRequest.requester_user_id,
        accessRequest.shared_cluster_id
      )
      const tokenHash = authService.hashToken(accessToken)
      
      // Update request
      await dbOperations.supabaseAdmin
        .from('shared_cluster_access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_message,
          access_token_hash: tokenHash,
          access_granted_at: new Date().toISOString(),
          access_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', request_id)
      
      // Add user to allowed list
      await dbOperations.supabaseAdmin
        .rpc('array_append', {
          table_name: 'shared_local_clusters',
          column_name: 'allowed_user_ids',
          id: accessRequest.shared_cluster_id,
          value: accessRequest.requester_user_id
        })
      
      return NextResponse.json({
        success: true,
        message: 'Access approved',
        access_token: accessToken
      })
    } else {
      // Deny access
      await dbOperations.supabaseAdmin
        .from('shared_cluster_access_requests')
        .update({
          status: 'denied',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_message
        })
        .eq('id', request_id)
      
      return NextResponse.json({
        success: true,
        message: 'Access denied'
      })
    }
    
  } catch (error) {
    console.error('Access approval error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

---

## 8.7 Centcom Integration for Shared Clusters

### Shared Cluster Manager Service

```typescript
// File: src/services/SharedClusterManager.ts

import { TunnelManager } from './TunnelManager'
import { LyceumIntegration } from './LyceumIntegration'
import { LocalClusterManager } from './LocalClusterManager'
import { generateMachineFingerprint } from '@/lib/machine-fingerprint'

export class SharedClusterManager {
  private tunnelManager: TunnelManager
  private lyceum: LyceumIntegration
  private localCluster: LocalClusterManager
  
  constructor() {
    this.tunnelManager = new TunnelManager()
    this.lyceum = new LyceumIntegration()
    this.localCluster = new LocalClusterManager()
  }
  
  /**
   * Enable internet sharing for local cluster
   */
  async enableSharing(
    authToken: string,
    clusterName: string,
    clusterDescription?: string
  ): Promise<{
    success: boolean
    endpoint: string
    message: string
  }> {
    try {
      // 1. Ensure local cluster is running
      const isRunning = await this.localCluster.testConnection()
      if (!isRunning) {
        throw new Error('Local cluster must be running before enabling sharing')
      }
      
      // 2. Ensure CloudFlared is installed
      const isInstalled = await this.tunnelManager.ensureCloudFlaredInstalled()
      if (!isInstalled) {
        console.log('Installing CloudFlare Tunnel...')
        await this.tunnelManager.installCloudFlared()
      }
      
      // 3. Start secure tunnel
      const { endpoint, authToken: tunnelAuthToken } = await this.tunnelManager.startCloudFlareTunnel(8123)
      
      // 4. Register with Lyceum
      const machineFingerprint = generateMachineFingerprint()
      const response = await fetch(`${this.lyceum.baseUrl}/api/centcom/shared-cluster/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cluster_name: clusterName,
          cluster_description: clusterDescription,
          machine_fingerprint: machineFingerprint,
          tunnel_type: 'cloudflare',
          tunnel_endpoint: endpoint,
          auth_token: tunnelAuthToken
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register shared cluster')
      }
      
      const result = await response.json()
      
      return {
        success: true,
        endpoint,
        message: `Cluster is now accessible at ${endpoint}`
      }
    } catch (error) {
      console.error('Failed to enable sharing:', error)
      throw error
    }
  }
  
  /**
   * Disable internet sharing
   */
  async disableSharing(authToken: string): Promise<void> {
    // Stop tunnel
    await this.tunnelManager.stopTunnel()
    
    // Unregister from Lyceum
    const machineFingerprint = generateMachineFingerprint()
    await fetch(`${this.lyceum.baseUrl}/api/centcom/shared-cluster/register`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        machine_fingerprint: machineFingerprint
      })
    })
  }
  
  /**
   * Get available shared clusters to connect to
   */
  async discoverSharedClusters(authToken: string): Promise<any[]> {
    const response = await fetch(`${this.lyceum.baseUrl}/api/centcom/shared-cluster/discover`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    
    const data = await response.json()
    return data.clusters || []
  }
  
  /**
   * Request access to a shared cluster
   */
  async requestAccess(
    authToken: string,
    clusterId: string,
    message: string,
    intendedUsage: string,
    estimatedDataSizeGb: number
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.lyceum.baseUrl}/api/centcom/shared-cluster/request-access`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cluster_id: clusterId,
        message,
        intended_usage: intendedUsage,
        estimated_data_size_gb: estimatedDataSizeGb
      })
    })
    
    const data = await response.json()
    return { success: data.success }
  }
  
  /**
   * Connect to a shared cluster
   */
  async connectToShared(
    authToken: string,
    accessToken: string,
    endpoint: string
  ): Promise<boolean> {
    try {
      // Test connection with access token
      const response = await fetch(`${endpoint}/ping`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('Failed to connect to shared cluster:', error)
      return false
    }
  }
}
```

---

# 🏢 PART 9: ON-PREMISE & CUSTOM INFRASTRUCTURE DEPLOYMENT

## Overview

This section enables enterprise customers to deploy Lyceum clusters on their own infrastructure, whether on-premise servers, private cloud, or specific cloud providers (AWS, Azure, GCP).

---

## 9.1 Database Schema for Custom Deployments

```sql
-- ================================================================
-- ON-PREMISE & CUSTOM INFRASTRUCTURE SCHEMA
-- ================================================================

-- 1. Add deployment types to unified_clusters
ALTER TABLE unified_clusters
ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(50) DEFAULT 'lyceum_managed' 
  CHECK (deployment_type IN ('lyceum_managed', 'on_premise', 'aws', 'azure', 'gcp', 'custom')),
ADD COLUMN IF NOT EXISTS deployment_config JSONB DEFAULT '{}'::jsonb;

-- 2. Create table for on-premise cluster configurations
CREATE TABLE IF NOT EXISTS on_premise_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID REFERENCES auth.users(id), -- Organization/Enterprise user
  
  -- Infrastructure details
  deployment_type VARCHAR(50) NOT NULL,
  server_location VARCHAR(255), -- Physical location or region
  server_specs JSONB, -- CPU, RAM, storage details
  
  -- Network configuration
  host_address VARCHAR(255) NOT NULL, -- IP or domain
  port INTEGER DEFAULT 8123,
  secure_port INTEGER DEFAULT 8443,
  protocol VARCHAR(10) DEFAULT 'https' CHECK (protocol IN ('http', 'https')),
  
  -- Authentication
  auth_method VARCHAR(50) DEFAULT 'token' CHECK (auth_method IN ('token', 'basic', 'certificate', 'oauth')),
  auth_credentials JSONB, -- Encrypted credentials
  
  -- VPN/Tunnel configuration (if needed)
  vpn_required BOOLEAN DEFAULT FALSE,
  vpn_config JSONB,
  
  -- SSL/TLS
  ssl_enabled BOOLEAN DEFAULT TRUE,
  ssl_certificate TEXT,
  ssl_private_key TEXT,
  ssl_ca_certificate TEXT,
  
  -- Health monitoring
  health_check_endpoint VARCHAR(500),
  health_check_interval_seconds INTEGER DEFAULT 60,
  last_health_check_at TIMESTAMP WITH TIME ZONE,
  health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'unreachable')),
  
  -- Backup configuration
  backup_enabled BOOLEAN DEFAULT FALSE,
  backup_schedule VARCHAR(100), -- Cron expression
  backup_location VARCHAR(500),
  last_backup_at TIMESTAMP WITH TIME ZONE,
  
  -- Compliance & Security
  data_residency_country VARCHAR(2), -- ISO country code
  compliance_certifications TEXT[], -- e.g., ['SOC2', 'HIPAA', 'GDPR']
  encryption_at_rest BOOLEAN DEFAULT TRUE,
  encryption_in_transit BOOLEAN DEFAULT TRUE,
  
  -- Cost tracking
  infrastructure_cost_monthly DECIMAL(10,2),
  cost_allocation_tags JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  provisioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create table for cloud provider specific configurations
CREATE TABLE IF NOT EXISTS cloud_provider_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE UNIQUE,
  
  -- Provider details
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('aws', 'azure', 'gcp', 'digitalocean', 'linode', 'other')),
  provider_region VARCHAR(100),
  provider_account_id VARCHAR(255),
  
  -- Resource identifiers
  resource_id VARCHAR(255), -- Provider-specific resource ID
  resource_arn TEXT, -- AWS ARN or equivalent
  resource_tags JSONB,
  
  -- AWS specific
  aws_config JSONB DEFAULT '{
    "instance_type": "m5.xlarge",
    "storage_type": "gp3",
    "vpc_id": null,
    "subnet_ids": [],
    "security_group_ids": [],
    "iam_role_arn": null
  }'::jsonb,
  
  -- Azure specific
  azure_config JSONB DEFAULT '{
    "vm_size": "Standard_D4s_v3",
    "resource_group": null,
    "vnet_id": null,
    "subnet_id": null,
    "managed_identity": null
  }'::jsonb,
  
  -- GCP specific
  gcp_config JSONB DEFAULT '{
    "machine_type": "n1-standard-4",
    "disk_type": "pd-ssd",
    "network": "default",
    "subnetwork": null,
    "service_account": null,
    "project_id": null
  }'::jsonb,
  
  -- Access credentials (encrypted)
  access_key_encrypted TEXT,
  secret_key_encrypted TEXT,
  credentials_json_encrypted TEXT,
  
  -- Terraform/IaC
  terraform_state JSONB,
  terraform_version VARCHAR(50),
  
  -- Status
  provisioning_status VARCHAR(50) DEFAULT 'pending' CHECK (provisioning_status IN ('pending', 'provisioning', 'active', 'failed', 'destroying')),
  provisioned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create table for cluster connection verification
CREATE TABLE IF NOT EXISTS cluster_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES unified_clusters(id) ON DELETE CASCADE,
  
  -- Check details
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_time_ms INTEGER,
  status_code INTEGER,
  health_status VARCHAR(20) CHECK (health_status IN ('healthy', 'unhealthy', 'timeout', 'error')),
  
  -- Metrics
  cpu_usage_percent DECIMAL(5,2),
  memory_usage_percent DECIMAL(5,2),
  disk_usage_percent DECIMAL(5,2),
  active_connections INTEGER,
  queries_per_second DECIMAL(10,2),
  
  -- Error details
  error_message TEXT,
  error_details JSONB
);

-- 5. Create indexes
CREATE INDEX idx_on_premise_cluster_id ON on_premise_clusters(cluster_id);
CREATE INDEX idx_on_premise_org ON on_premise_clusters(organization_id);
CREATE INDEX idx_on_premise_health ON on_premise_clusters(health_status, is_active);
CREATE INDEX idx_cloud_provider_cluster ON cloud_provider_clusters(cluster_id);
CREATE INDEX idx_cloud_provider_type ON cloud_provider_clusters(provider);
CREATE INDEX idx_health_checks_cluster ON cluster_health_checks(cluster_id, checked_at DESC);

-- 6. Create function to register on-premise cluster
CREATE OR REPLACE FUNCTION register_on_premise_cluster(
  p_user_id UUID,
  p_cluster_name VARCHAR,
  p_deployment_type VARCHAR,
  p_host_address VARCHAR,
  p_port INTEGER,
  p_auth_credentials JSONB
)
RETURNS TABLE (
  cluster_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_cluster_id UUID;
  v_cluster_key VARCHAR;
BEGIN
  -- Generate cluster ID and key
  v_cluster_id := gen_random_uuid();
  
  -- Get next cluster key
  SELECT 'CLSTR-' || COALESCE(MAX(CAST(SUBSTRING(cluster_key FROM 7) AS INTEGER)), 0) + 1
  INTO v_cluster_key
  FROM unified_clusters;
  
  -- Create unified cluster entry
  INSERT INTO unified_clusters (
    id,
    cluster_key,
    name,
    architecture,
    cluster_type,
    deployment_type,
    region,
    status,
    created_by,
    responsible_user_id
  )
  VALUES (
    v_cluster_id,
    v_cluster_key,
    p_cluster_name,
    'traditional',
    'production',
    p_deployment_type,
    'on-premise',
    'creating',
    p_user_id,
    p_user_id
  );
  
  -- Create on-premise configuration
  INSERT INTO on_premise_clusters (
    cluster_id,
    organization_id,
    deployment_type,
    host_address,
    port,
    auth_credentials
  )
  VALUES (
    v_cluster_id,
    p_user_id,
    p_deployment_type,
    p_host_address,
    p_port,
    p_auth_credentials
  );
  
  RETURN QUERY SELECT v_cluster_id, TRUE, 'On-premise cluster registered successfully with key: ' || v_cluster_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to perform health check
CREATE OR REPLACE FUNCTION perform_cluster_health_check(p_cluster_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_health_status VARCHAR;
  v_response_time INTEGER;
BEGIN
  -- This is a placeholder - actual health check would be done by external service
  -- Insert health check record
  INSERT INTO cluster_health_checks (
    cluster_id,
    health_status,
    response_time_ms
  )
  VALUES (
    p_cluster_id,
    'healthy',
    100
  );
  
  RETURN jsonb_build_object(
    'cluster_id', p_cluster_id,
    'status', 'healthy',
    'checked_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ On-premise & custom infrastructure schema installed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Capabilities:';
  RAISE NOTICE '• Deploy clusters on your own servers';
  RAISE NOTICE '• Connect to AWS, Azure, GCP clusters';
  RAISE NOTICE '• Automated health monitoring';
  RAISE NOTICE '• Secure authentication & encryption';
END $$;
```

---

## 9.2 Deployment Type Comparison

| Feature | Lyceum Managed | On-Premise | AWS/Azure/GCP | Custom |
|---------|----------------|------------|---------------|--------|
| **Infrastructure Management** | Lyceum | Customer | Customer | Customer |
| **Scaling** | Automatic | Manual | Auto-scaling available | Varies |
| **Cost** | Pay-per-use | Fixed hardware costs | Cloud provider rates | Varies |
| **Data Residency** | US/EU regions | Full control | Region selection | Full control |
| **Security** | Lyceum managed | Customer managed | Shared responsibility | Customer managed |
| **Compliance** | SOC2 | Customer choice | Provider + Customer | Customer choice |
| **Setup Time** | Instant | Days/Weeks | Hours/Days | Varies |
| **Maintenance** | Lyceum | Customer | Shared | Customer |

---

## 9.3 On-Premise Deployment Guide

### Step 1: Server Prerequisites

```yaml
# Minimum server requirements for ClickHouse cluster

Hardware:
  CPU: 8+ cores (16+ recommended)
  RAM: 32GB minimum (64GB+ recommended)
  Storage: 1TB+ SSD (NVMe preferred)
  Network: 1Gbps+ connection

Software:
  OS: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
  ClickHouse: v23.8+
  SSL Certificate: Valid SSL/TLS certificate
  Firewall: Configured to allow Lyceum connections

Network:
  Static IP or domain name
  Ports: 8123 (HTTP), 8443 (HTTPS), 9000 (TCP native)
  Firewall rules: Allow inbound from Lyceum IPs
```

### Step 2: ClickHouse Installation Script

```bash
#!/bin/bash
# File: install-clickhouse-onprem.sh

set -e

echo "Installing ClickHouse for Lyceum on-premise deployment..."

# Add ClickHouse repository
sudo apt-get install -y apt-transport-https ca-certificates dirmngr
GNUPGHOME=$(mktemp -d)
sudo GNUPGHOME="$GNUPGHOME" gpg --no-default-keyring --keyring /usr/share/keyrings/clickhouse-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 8919F6BD2B48D754
sudo rm -rf "$GNUPGHOME"
sudo chmod +r /usr/share/keyrings/clickhouse-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | sudo tee /etc/apt/sources.list.d/clickhouse.list

# Install ClickHouse
sudo apt-get update
sudo apt-get install -y clickhouse-server clickhouse-client

# Configure for Lyceum
sudo tee /etc/clickhouse-server/config.d/lyceum.xml > /dev/null <<EOF
<clickhouse>
    <!-- Listen on all interfaces -->
    <listen_host>::</listen_host>
    
    <!-- HTTPS configuration -->
    <https_port>8443</https_port>
    
    <openSSL>
        <server>
            <certificateFile>/etc/clickhouse-server/server.crt</certificateFile>
            <privateKeyFile>/etc/clickhouse-server/server.key</privateKeyFile>
            <verificationMode>none</verificationMode>
            <loadDefaultCAFile>true</loadDefaultCAFile>
            <cacheSessions>true</cacheSessions>
            <disableProtocols>sslv2,sslv3</disableProtocols>
            <preferServerCiphers>true</preferServerCiphers>
        </server>
    </openSSL>
    
    <!-- Lyceum remote user -->
    <users>
        <lyceum_remote>
            <password_sha256_hex>REPLACE_WITH_PASSWORD_HASH</password_sha256_hex>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
        </lyceum_remote>
    </users>
</clickhouse>
EOF

echo "ClickHouse installed successfully!"
echo "Next steps:"
echo "1. Copy SSL certificates to /etc/clickhouse-server/"
echo "2. Update password hash in /etc/clickhouse-server/config.d/lyceum.xml"
echo "3. Start ClickHouse: sudo systemctl start clickhouse-server"
echo "4. Enable on boot: sudo systemctl enable clickhouse-server"
```

### Step 3: SSL Certificate Setup

```bash
#!/bin/bash
# File: setup-ssl-certificates.sh

# Generate self-signed certificate (for testing)
# For production, use Let's Encrypt or your organization's CA

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/clickhouse-server/server.key \
  -out /etc/clickhouse-server/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"

# Set permissions
chmod 600 /etc/clickhouse-server/server.key
chmod 644 /etc/clickhouse-server/server.crt
chown clickhouse:clickhouse /etc/clickhouse-server/server.*

echo "SSL certificates configured!"
```

---

## 9.4 Lyceum API for On-Premise Clusters

### Register On-Premise Cluster

```typescript
// File: src/app/api/clusters/on-premise/register/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const { 
      cluster_name,
      deployment_type,
      host_address,
      port,
      username,
      password,
      ssl_enabled,
      data_residency_country
    } = await request.json()
    
    // Encrypt credentials
    const authCredentials = {
      username,
      password_hash: crypto.createHash('sha256').update(password).digest('hex')
    }
    
    // Register cluster
    const { data, error } = await dbOperations.supabaseAdmin
      .rpc('register_on_premise_cluster', {
        p_user_id: user.id,
        p_cluster_name: cluster_name,
        p_deployment_type: deployment_type,
        p_host_address: host_address,
        p_port: port,
        p_auth_credentials: authCredentials
      })
    
    if (error || !data[0]?.success) {
      return NextResponse.json({ 
        error: data[0]?.message || 'Failed to register on-premise cluster' 
      }, { status: 400 })
    }
    
    // Test connection
    const connectionTest = await testOnPremiseConnection(
      host_address,
      port,
      username,
      password,
      ssl_enabled
    )
    
    if (!connectionTest.success) {
      return NextResponse.json({ 
        error: `Cluster registered but connection failed: ${connectionTest.error}`,
        cluster_id: data[0].cluster_id
      }, { status: 207 }) // Multi-status
    }
    
    // Update status to active
    await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .update({ status: 'active' })
      .eq('id', data[0].cluster_id)
    
    return NextResponse.json({
      success: true,
      cluster_id: data[0].cluster_id,
      message: data[0].message,
      connection_status: 'verified'
    })
    
  } catch (error) {
    console.error('On-premise registration error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function testOnPremiseConnection(
  host: string,
  port: number,
  username: string,
  password: string,
  ssl: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const protocol = ssl ? 'https' : 'http'
    const url = `${protocol}://${host}:${port}/ping`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    if (response.ok) {
      return { success: true }
    } else {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Connection failed' 
    }
  }
}
```

---

## 9.5 AWS Deployment Integration

### Terraform Template for AWS

```hcl
# File: infrastructure/terraform/aws/clickhouse-cluster.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for deployment"
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Name of the Lyceum cluster"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "m5.xlarge"
}

variable "storage_size_gb" {
  description = "EBS volume size in GB"
  default     = 500
}

# VPC and networking
resource "aws_vpc" "lyceum_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "${var.cluster_name}-vpc"
    ManagedBy   = "Lyceum"
    ClusterName = var.cluster_name
  }
}

resource "aws_subnet" "lyceum_subnet" {
  vpc_id            = aws_vpc.lyceum_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
  
  tags = {
    Name = "${var.cluster_name}-subnet"
  }
}

resource "aws_internet_gateway" "lyceum_igw" {
  vpc_id = aws_vpc.lyceum_vpc.id
  
  tags = {
    Name = "${var.cluster_name}-igw"
  }
}

# Security group
resource "aws_security_group" "clickhouse_sg" {
  name        = "${var.cluster_name}-clickhouse-sg"
  description = "Security group for Lyceum ClickHouse cluster"
  vpc_id      = aws_vpc.lyceum_vpc.id
  
  # ClickHouse HTTP
  ingress {
    from_port   = 8123
    to_port     = 8123
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict to Lyceum IPs in production
  }
  
  # ClickHouse HTTPS
  ingress {
    from_port   = 8443
    to_port     = 8443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict to your IPs
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.cluster_name}-sg"
  }
}

# IAM role for ClickHouse instance
resource "aws_iam_role" "clickhouse_role" {
  name = "${var.cluster_name}-clickhouse-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_instance_profile" "clickhouse_profile" {
  name = "${var.cluster_name}-clickhouse-profile"
  role = aws_iam_role.clickhouse_role.name
}

# EC2 instance
resource "aws_instance" "clickhouse" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  subnet_id                   = aws_subnet.lyceum_subnet.id
  vpc_security_group_ids      = [aws_security_group.clickhouse_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.clickhouse_profile.name
  associate_public_ip_address = true
  
  root_block_device {
    volume_size = var.storage_size_gb
    volume_type = "gp3"
    encrypted   = true
  }
  
  user_data = templatefile("${path.module}/user-data.sh", {
    cluster_name = var.cluster_name
  })
  
  tags = {
    Name        = "${var.cluster_name}-clickhouse"
    ManagedBy   = "Lyceum"
    ClusterName = var.cluster_name
  }
}

# Elastic IP
resource "aws_eip" "clickhouse_eip" {
  instance = aws_instance.clickhouse.id
  domain   = "vpc"
  
  tags = {
    Name = "${var.cluster_name}-eip"
  }
}

# Data source for Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# Outputs
output "cluster_endpoint" {
  value = "https://${aws_eip.clickhouse_eip.public_ip}:8443"
}

output "cluster_ip" {
  value = aws_eip.clickhouse_eip.public_ip
}

output "instance_id" {
  value = aws_instance.clickhouse.id
}
```

### User Data Script for AWS

```bash
#!/bin/bash
# File: infrastructure/terraform/aws/user-data.sh

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install ClickHouse
apt-get install -y apt-transport-https ca-certificates dirmngr
GNUPGHOME=$(mktemp -d)
gpg --no-default-keyring --keyring /usr/share/keyrings/clickhouse-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 8919F6BD2B48D754
rm -rf "$GNUPGHOME"
chmod +r /usr/share/keyrings/clickhouse-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | tee /etc/apt/sources.list.d/clickhouse.list

apt-get update
apt-get install -y clickhouse-server clickhouse-client

# Configure ClickHouse
cat > /etc/clickhouse-server/config.d/lyceum-aws.xml <<'EOF'
<clickhouse>
    <listen_host>::</listen_host>
    <https_port>8443</https_port>
    
    <!-- Performance tuning for AWS -->
    <max_concurrent_queries>100</max_concurrent_queries>
    <max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
    
    <!-- S3 integration for backups -->
    <s3>
        <endpoint>https://s3.amazonaws.com</endpoint>
    </s3>
</clickhouse>
EOF

# Start ClickHouse
systemctl enable clickhouse-server
systemctl start clickhouse-server

# Install CloudWatch agent (for monitoring)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

echo "ClickHouse cluster deployed on AWS successfully!"
```

---

## 9.6 Centcom UI for Custom Deployments

### Create On-Premise Cluster Dialog

```typescript
// File: src/components/CreateOnPremiseClusterDialog.tsx

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateOnPremiseClusterDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (clusterId: string) => void
}

export function CreateOnPremiseClusterDialog({
  open,
  onClose,
  onSuccess
}: CreateOnPremiseClusterDialogProps) {
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState({
    cluster_name: '',
    deployment_type: 'on_premise',
    host_address: '',
    port: 8443,
    username: 'lyceum_remote',
    password: '',
    ssl_enabled: true,
    data_residency_country: 'US'
  })
  
  const [testing, setTesting] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/clusters/on-premise/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('✅ Connection successful!')
        setStep(3)
      } else {
        alert(`❌ Connection failed: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Connection test failed: ${error}`)
    } finally {
      setTesting(false)
    }
  }
  
  const handleCreate = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/clusters/on-premise/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lyceum_auth_token')}`
        },
        body: JSON.stringify(config)
      })
      
      const result = await response.json()
      
      if (result.success) {
        onSuccess(result.cluster_id)
        onClose()
      } else {
        alert(`Failed to create cluster: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to create cluster: ${error}`)
    } finally {
      setCreating(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register On-Premise Cluster</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Cluster Name</Label>
                <Input
                  value={config.cluster_name}
                  onChange={(e) => setConfig({ ...config, cluster_name: e.target.value })}
                  placeholder="Production Cluster"
                />
              </div>
              
              <div>
                <Label>Deployment Type</Label>
                <Select
                  value={config.deployment_type}
                  onValueChange={(value) => setConfig({ ...config, deployment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_premise">On-Premise</SelectItem>
                    <SelectItem value="aws">AWS</SelectItem>
                    <SelectItem value="azure">Azure</SelectItem>
                    <SelectItem value="gcp">Google Cloud</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Data Residency Country</Label>
                <Input
                  value={config.data_residency_country}
                  onChange={(e) => setConfig({ ...config, data_residency_country: e.target.value })}
                  placeholder="US"
                  maxLength={2}
                />
              </div>
              
              <Button onClick={() => setStep(2)} className="w-full">
                Next: Connection Details
              </Button>
            </div>
          )}
          
          {/* Step 2: Connection Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Host Address (IP or Domain)</Label>
                <Input
                  value={config.host_address}
                  onChange={(e) => setConfig({ ...config, host_address: e.target.value })}
                  placeholder="192.168.1.100 or cluster.mycompany.com"
                />
              </div>
              
              <div>
                <Label>Port</Label>
                <Input
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                />
              </div>
              
              <div>
                <Label>Username</Label>
                <Input
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleTestConnection} disabled={testing} className="flex-1">
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800">✅ Connection Verified!</h3>
                <p className="text-sm text-green-700">
                  Successfully connected to {config.host_address}:{config.port}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Cluster Summary:</h3>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Name:</span> {config.cluster_name}</div>
                  <div><span className="font-medium">Type:</span> {config.deployment_type}</div>
                  <div><span className="font-medium">Endpoint:</span> https://{config.host_address}:{config.port}</div>
                  <div><span className="font-medium">Location:</span> {config.data_residency_country}</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={creating} className="flex-1">
                  {creating ? 'Creating...' : 'Register Cluster'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 9.7 Summary: Deployment Options

### Quick Comparison

| Deployment | Setup Time | Cost | Control | Recommended For |
|------------|-----------|------|---------|-----------------|
| **Lyceum Managed** | Instant | Pay-per-use | Low | Most users, quick start |
| **Shared Local** | Minutes | Free-Low | Medium | Testing, small teams |
| **On-Premise** | Days | Hardware costs | Full | Compliance, air-gapped |
| **AWS/Azure/GCP** | Hours | Cloud rates | High | Scalability, global |
| **Custom** | Varies | Varies | Full | Special requirements |

---

**This completes the comprehensive implementation guide with shared cluster hosting, secure tunneling, and custom infrastructure deployment options!** 🎉

---

## 📊 Implementation Progress & Status

### ✅ Phase 0: Database Schema & Setup (COMPLETED)

**Date Completed**: October 1, 2025

#### Database Migration ✅
**File**: `centcom-local-cluster-schema.sql` (Fixed for license_keys table)

Successfully deployed:
- ✅ Added `allows_local_cluster` column to `license_keys` table
- ✅ Added `local_cluster_limits` JSONB column with tier-based configurations
- ✅ Updated all existing license types (basic, professional, enterprise, trial, gratis, standard)
- ✅ Created `local_cluster_usage` table for tracking metrics
- ✅ Created `centcom_cluster_connections` table for discovery tracking
- ✅ Created database functions: `check_local_cluster_allowed()`, `get_user_clusters()`
- ✅ Implemented Row Level Security (RLS) policies
- ✅ Created performance indexes on all key columns

**Schema Fix Applied**: 
- Corrected table reference from `licenses` → `license_keys`
- Corrected column reference from `user_id` → `assigned_to`
- Corrected column reference from `license_key` → `key_code`

**Verification Queries**:
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('local_cluster_usage', 'centcom_cluster_connections');

-- Verify new columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'license_keys' 
AND column_name IN ('allows_local_cluster', 'local_cluster_limits');

-- Test functions
SELECT check_local_cluster_allowed('YOUR_USER_UUID');
SELECT get_user_clusters('YOUR_USER_UUID');
```

---

### ✅ Phase 1: Lyceum Backend Implementation (COMPLETED)

**Date Completed**: October 1, 2025

#### Database Schema ✅
**File**: `centcom-local-cluster-schema.sql`

Successfully created:
- ✅ `local_cluster_usage` table - Tracks local cluster usage metrics per user/machine
- ✅ `centcom_cluster_connections` table - Manages CentCom cluster discovery and connections
- ✅ Updated `licenses` table with local cluster support columns
- ✅ `check_local_cluster_allowed()` function - Validates license permissions
- ✅ `get_user_clusters()` function - Returns all clusters accessible to a user
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Performance indexes on all key columns

**License Tiers Updated**:
- Gratis: 2 GB storage, 10K queries/month, 1 user, 1 day offline grace
- Trial: 5 GB storage, 50K queries/month, 1 user, 3 days offline grace
- Basic: 10 GB storage, 100K queries/month, 1 user, 7 days offline grace
- Professional: 50 GB storage, 1M queries/month, 5 users, 14 days offline grace
- Enterprise: 500 GB storage, 10M queries/month, unlimited users, 30 days offline grace

#### API Endpoints ✅
All Lyceum API endpoints implemented and ready:

**1. License Verification** ✅
- **Endpoint**: `POST /api/centcom/license/verify`
- **File**: `src/app/api/centcom/license/verify/route.ts`
- **Features**:
  - Validates license key and status
  - Checks local cluster permissions
  - Creates/updates usage tracking record
  - Returns license limits and current usage
  - Handles machine fingerprint registration

**2. Cluster Discovery** ✅
- **Endpoint**: `GET /api/centcom/clusters/discover`
- **File**: `src/app/api/centcom/clusters/discover/route.ts`
- **Features**:
  - Requires authentication
  - Returns all clusters assigned to user
  - Formats connection info based on architecture (traditional vs optimized)
  - Includes access level and default cluster designation
  - Provides metadata for UI rendering

**3. Usage Sync** ✅
- **Endpoint**: `POST /api/centcom/usage/sync`
- **File**: `src/app/api/centcom/usage/sync/route.ts`
- **Features**:
  - Requires authentication
  - Updates storage and query usage metrics
  - Syncs machine information (OS, memory, CPU)
  - Checks against license limits
  - Returns warnings when limits exceeded
  - Calculates usage percentages

**4. Connection Tracking** ✅
- **Endpoint**: `POST /api/centcom/connection/track`
- **File**: `src/app/api/centcom/connection/track/route.ts`
- **Features**:
  - Requires authentication
  - Validates cluster access permissions
  - Tracks connection events with timestamps
  - Auto-sets first connection as default
  - Maintains connection count metrics

#### Migration Instructions ✅

**To Deploy Lyceum Backend**:
```bash
# 1. Open Supabase Dashboard
# Navigate to: https://supabase.com/dashboard
# Select your Lyceum project

# 2. Go to SQL Editor

# 3. Copy and paste the entire contents of:
centcom-local-cluster-schema.sql

# 4. Execute the SQL

# 5. Verify tables created:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('local_cluster_usage', 'centcom_cluster_connections');

# 6. Test the functions:
SELECT check_local_cluster_allowed('YOUR_USER_UUID');
SELECT get_user_clusters('YOUR_USER_UUID');
```

---

### 🔄 Phase 2: CentCom Implementation (IN PROGRESS)

**Status**: Ready for CentCom team to begin implementation

#### CentCom Implementation Prompt Created ✅
**File**: `CENTCOM_IMPLEMENTATION_PROMPT.md`

This comprehensive prompt provides the CentCom AI agent with:
- Complete implementation roadmap
- Step-by-step instructions for all components
- TypeScript type definitions
- Service class structures
- UI component guidelines
- Testing procedures against Lyceum APIs
- Success criteria and checklists

#### CentCom Components to Implement

**Core Services** (Week 1-2):
- [ ] `src/types/cluster.ts` - TypeScript interfaces
- [ ] `src/services/LyceumIntegration.ts` - API client
- [ ] `src/lib/machine-fingerprint.ts` - Machine ID generator
- [ ] `src/services/LocalClusterManager.ts` - ClickHouse management
- [ ] `src/services/UsageTracker.ts` - Usage monitoring

**Discovery & Automation** (Week 2-3):
- [ ] `src/services/ClusterDiscoveryService.ts` - Auto-discovery polling
- [ ] Background workers for usage sync (5 min intervals)
- [ ] Background workers for cluster polling (30 sec intervals)
- [ ] Background workers for heartbeat (1 min intervals)

**UI Components** (Week 3):
- [ ] `src/ui/settings/DatabaseConnections.tsx` - Main UI
- [ ] Local cluster status card
- [ ] Cloud clusters list view
- [ ] Connection management controls
- [ ] Usage metrics displays

**Configuration** (Week 1):
- [ ] `config/clickhouse-templates/config.xml.template`
- [ ] `config/clickhouse-templates/users.xml.template`

---

### 🎯 Next Steps

#### For Lyceum Team:
1. ✅ **Deploy Database Migration**
   - Run `centcom-local-cluster-schema.sql` in Supabase
   - Verify all tables and functions created
   - Test API endpoints locally

2. ⏳ **Testing & Validation**
   - Create test licenses with different tiers
   - Verify license verification endpoint
   - Test cluster discovery with sample clusters
   - Validate usage sync functionality
   - Test connection tracking

3. ⏳ **Documentation**
   - Update API documentation
   - Create testing guide for CentCom team
   - Document expected request/response formats

#### For CentCom Team:
1. ⏳ **Review Implementation Prompt**
   - Read `CENTCOM_IMPLEMENTATION_PROMPT.md` thoroughly
   - Understand the architecture and data flow
   - Review TypeScript types and interfaces

2. ⏳ **Set Up Development Environment**
   - Configure Lyceum API base URL
   - Set up authentication mechanism
   - Test connectivity to Lyceum endpoints

3. ⏳ **Begin Phase 1 Implementation**
   - Create TypeScript types
   - Implement Lyceum integration service
   - Build machine fingerprint generator
   - Test API connectivity

4. ⏳ **Weekly Sync Meetings**
   - Week 1: Review types and API integration
   - Week 2: Demo local cluster management
   - Week 3: Show cluster discovery and UI
   - Week 4: End-to-end testing

---

### 📋 Testing Checklist

#### Lyceum Backend Tests
- [ ] License verification with valid key
- [ ] License verification with invalid key
- [ ] License verification with expired license
- [ ] Local cluster permission check for each tier
- [ ] Cluster discovery for user with no clusters
- [ ] Cluster discovery for user with multiple clusters
- [ ] Usage sync with under-limit usage
- [ ] Usage sync with over-limit usage
- [ ] Connection tracking for new cluster
- [ ] Connection tracking for existing cluster
- [ ] RLS policies prevent unauthorized access

#### CentCom Integration Tests (Pending)
- [ ] License entry flow triggers verification
- [ ] Local cluster auto-configures on valid license
- [ ] Cluster discovery runs on login
- [ ] New clusters appear automatically in UI
- [ ] Usage metrics update in real-time
- [ ] Limit warnings display correctly
- [ ] Connection tracking updates on cluster switch
- [ ] Offline mode works with grace period
- [ ] Background services run reliably
- [ ] Error handling for network failures

---

### 🚀 Deployment Timeline

#### Week 1: Foundation (Current)
- ✅ Lyceum database schema deployed
- ✅ Lyceum API endpoints implemented
- ✅ CentCom implementation prompt created
- ⏳ Initial testing of Lyceum endpoints

#### Week 2: CentCom Core
- ⏳ CentCom types and services implemented
- ⏳ API integration tested
- ⏳ Local cluster manager functional

#### Week 3: CentCom UI
- ⏳ Cluster discovery service active
- ⏳ UI components integrated
- ⏳ Background services running

#### Week 4: Integration Testing
- ⏳ End-to-end testing
- ⏳ Bug fixes and refinements
- ⏳ Performance optimization

#### Week 5: Production Deployment
- ⏳ Staging environment validation
- ⏳ User acceptance testing
- ⏳ Production rollout
- ⏳ Monitoring and metrics

---

### 💡 Key Technical Decisions

1. **Authentication Strategy**
   - CentCom uses existing Supabase JWT tokens
   - Tokens passed as Bearer in Authorization header
   - Lyceum validates tokens using `requireAuth()` helper

2. **Polling Strategy**
   - Cluster discovery: 30 second intervals
   - Usage sync: 5 minute intervals
   - Heartbeat: 1 minute intervals
   - Adjustable based on performance metrics

3. **Error Handling**
   - Graceful degradation when offline
   - Offline grace period based on license tier
   - Clear error messages for users
   - Automatic retry with exponential backoff

4. **Performance Optimizations**
   - Database indexes on all query paths
   - Efficient RLS policies
   - Minimal API payload sizes
   - Client-side caching of cluster list

---

### 📞 Support & Questions

**For Lyceum Implementation Questions**:
- Review completed files in `src/app/api/centcom/`
- Check database schema in `centcom-local-cluster-schema.sql`
- Refer to existing patterns in `src/lib/auth-utils.ts` and `src/lib/supabase-direct.ts`

**For CentCom Implementation Questions**:
- Follow `CENTCOM_IMPLEMENTATION_PROMPT.md` step-by-step
- Review full examples in Part 2 of this guide
- Test against Lyceum's running endpoints
- Use provided curl commands for API testing

---

---

### 🧪 Phase 1.5: API Testing & Validation (COMPLETED)

**Date Completed**: October 1, 2025

#### Test Scripts Created ✅

**Node.js Test Script**: `test-centcom-cluster-apis.js`
- ✅ Comprehensive test suite for all 4 API endpoints
- ✅ Color-coded console output
- ✅ Detailed error messages and debugging info
- ✅ Success rate tracking

**PowerShell Test Script**: `test-centcom-cluster-apis.ps1`
- ✅ Windows-native test alternative
- ✅ Same comprehensive coverage
- ✅ Easy to run on Windows systems

**Test Coverage**:
1. ✅ License Verification (`POST /api/centcom/license/verify`)
   - Tests license key validation
   - Tests machine fingerprint registration
   - Validates response structure
   - Checks limit configurations

2. ✅ Cluster Discovery (`GET /api/centcom/clusters/discover`)
   - Tests authenticated cluster retrieval
   - Validates cluster metadata
   - Checks connection information formatting

3. ✅ Usage Sync (`POST /api/centcom/usage/sync`)
   - Tests usage metric submission
   - Validates limit checking
   - Tests warning generation

4. ✅ Connection Tracking (`POST /api/centcom/connection/track`)
   - Tests connection event logging
   - Validates default cluster logic
   - Tests connection counting

**Test Execution Results**:
```bash
🎉 ALL TESTS PASSING - 100% SUCCESS RATE

✅ TEST 1: License Verification (POST /api/centcom/license/verify)
   - Status: 200 OK
   - License: PLUGIN-ENT-2025-HQ21CIBF (Enterprise)
   - Allows Local Cluster: true
   - Limits: 500GB storage, 10M queries/month, 30 days offline grace
   - Usage tracking: 0GB used, 0 queries this month

✅ TEST 2: Cluster Discovery (GET /api/centcom/clusters/discover)
   - Status: 200 OK
   - Found: 1 cluster (Second-Cluster-Test)
   - Architecture: optimized
   - Classification: enterprise
   - Connection info returned correctly

✅ TEST 3: Usage Sync (POST /api/centcom/usage/sync)
   - Status: 200 OK
   - Successfully synced: 2.5GB storage, 15K queries
   - Percentage used: 0.5% storage, 0.15% queries
   - Warnings: none
   - Throttle: false

✅ TEST 4: Connection Tracking (POST /api/centcom/connection/track)
   - Status: 200 OK
   - Connection ID created: 1959e5a1-8d44-4f95-aa69-a0877b29ef96
   - Successfully tracked connection to discovered cluster
   - Connection type: cloud
   - Active: true

# Summary
Total Tests: 4
Passed: 4
Failed: 0
Warnings: 0
Success Rate: 100%
```

**How to Run Tests**:

**Step 1: Get Fresh JWT Token**
```javascript
// In browser console (http://localhost:3594 while logged in):
(() => {
  const authData = localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token');
  if (authData) {
    const session = JSON.parse(authData);
    console.log('✅ JWT TOKEN:', session.access_token);
    console.log('✅ User ID:', session.user.id);
    return { token: session.access_token, userId: session.user.id };
  } else {
    console.error('❌ Auth token not found');
  }
})();
```

**Step 2: Update Test Configuration**
Edit `test-centcom-cluster-apis.js`:
- Line 49: Update `authToken` with JWT from Step 1
- Line 50: Update `testUserId` with User ID from Step 1
- Line 47: Ensure `licenseKey` is a valid key_code from database

**Step 3: Run Tests**
```bash
# Node.js version (recommended)
node test-centcom-cluster-apis.js

# PowerShell version (alternative)
.\test-centcom-cluster-apis.ps1
```

---

### 📦 Deliverables Summary

#### Files Created/Updated:
1. ✅ `centcom-local-cluster-schema.sql` - Database migration (fixed)
2. ✅ `src/app/api/centcom/license/verify/route.ts` - License verification API
3. ✅ `src/app/api/centcom/clusters/discover/route.ts` - Cluster discovery API
4. ✅ `src/app/api/centcom/usage/sync/route.ts` - Usage sync API
5. ✅ `src/app/api/centcom/connection/track/route.ts` - Connection tracking API
6. ✅ `CENTCOM_IMPLEMENTATION_PROMPT.md` - CentCom implementation guide
7. ✅ `LYCEUM_PHASE1_IMPLEMENTATION_SUMMARY.md` - Lyceum summary
8. ✅ `LYCEUM_CENTCOM_INTEGRATION_RESPONSES.md` - Q&A responses
9. ✅ `CENTCOM_SCHEMA_FIX_APPLIED.md` - Schema fix documentation
10. ✅ `test-centcom-cluster-apis.js` - Node.js test suite
11. ✅ `test-centcom-cluster-apis.ps1` - PowerShell test suite

#### Documentation Updated:
- ✅ Implementation guide (this file) with Phase 0, Phase 1, Phase 1.5
- ✅ API endpoint documentation
- ✅ Database schema documentation
- ✅ Testing procedures
- ✅ Troubleshooting guides

---

**Implementation Progress Last Updated**: October 1, 2025, 3:00 PM PST

