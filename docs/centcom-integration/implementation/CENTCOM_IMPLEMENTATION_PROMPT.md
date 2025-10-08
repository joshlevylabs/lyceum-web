# CentCom Local Cluster & Lyceum Integration - Implementation Instructions

## 🎯 Overview

You are implementing the **CentCom side** of a comprehensive cluster management system that integrates:
1. **Local ClickHouse cluster management** (runs on user's machine)
2. **License-based usage limits** and verification
3. **Automatic Lyceum cluster discovery** and connection
4. **Seamless integration** with CentCom's Settings → Storage & Databases

The **Lyceum backend is already implemented** with all necessary API endpoints and database schema ready.

---

## 📋 Your Implementation Tasks

### Phase 1: Core Services & Types

#### Task 1.1: Create TypeScript Types
**File**: `src/types/cluster.ts`

Create comprehensive TypeScript interfaces for:
- `LicenseInfo` - License details with local cluster permissions
- `LocalClusterLimits` - Usage limits (storage, queries, users, etc.)
- `ClusterConnection` - Unified cluster connection interface
- `UsageMetrics` - Real-time usage tracking
- `MachineInfo` - Machine fingerprint and system specs

**Reference**: See section 2.2 in the implementation guide for complete type definitions.

---

#### Task 1.2: Lyceum Integration Service
**File**: `src/services/LyceumIntegration.ts`

Create a client service to communicate with Lyceum's API endpoints:

**Key Methods**:
```typescript
- verifyLicense(licenseKey: string, machineFingerprint: string)
- discoverClusters(authToken: string)
- syncUsage(authToken: string, usageData: UsageMetrics)
- trackConnection(authToken: string, clusterId: string)
```

**Lyceum API Base URL**: `http://localhost:3594/api/centcom`

**Available Endpoints**:
1. `POST /license/verify` - Verify license and get local cluster permissions
2. `GET /clusters/discover` - Get all clusters assigned to authenticated user
3. `POST /usage/sync` - Sync local cluster usage metrics
4. `POST /connection/track` - Track cluster connection events

**Authentication**: Use Bearer token from CentCom's authentication system

---

#### Task 1.3: Machine Fingerprint Generator
**File**: `src/lib/machine-fingerprint.ts`

Create a stable, unique machine identifier:
- Use OS type, hostname, CPU info, MAC address
- Generate consistent hash for the same machine
- Store fingerprint locally for reuse

**Reference**: Section 2.2 of implementation guide has example code.

---

#### Task 1.4: Local Cluster Manager
**File**: `src/services/LocalClusterManager.ts`

Implement local ClickHouse cluster management:

**Key Methods**:
```typescript
- checkClickHouseInstalled(): Promise<boolean>
- installClickHouse(): Promise<void>
- startCluster(): Promise<void>
- stopCluster(): Promise<void>
- getClusterStatus(): Promise<ClusterStatus>
- configureCluster(limits: LocalClusterLimits): Promise<void>
- getUsageMetrics(): Promise<UsageMetrics>
```

**Features**:
- Auto-detect ClickHouse installation
- Download and install ClickHouse if missing
- Generate configuration files based on license limits
- Monitor storage and query usage
- Enforce license limits (graceful degradation)

---

### Phase 2: Cluster Discovery Service

#### Task 2.1: Cluster Discovery Service
**File**: `src/services/ClusterDiscoveryService.ts`

Implement automatic cluster discovery:

**Key Features**:
- Poll Lyceum API every 30 seconds for new clusters
- Detect when new clusters are assigned to user
- Update local cluster list automatically
- Handle cluster status changes (active, paused, deleted)
- Emit events for UI updates

**Polling Strategy**:
```typescript
class ClusterDiscoveryService {
  private pollInterval = 30000 // 30 seconds
  private isPolling = false
  
  async startPolling(authToken: string): Promise<void>
  async stopPolling(): Promise<void>
  private async pollClusters(): Promise<void>
  onClusterDiscovered(callback: (cluster: ClusterConnection) => void)
  onClusterUpdated(callback: (cluster: ClusterConnection) => void)
  onClusterRemoved(callback: (clusterId: string) => void)
}
```

---

### Phase 3: UI Components

#### Task 3.1: Database Connections UI
**File**: `src/ui/settings/DatabaseConnections.tsx`

Create the **Settings → Storage & Databases** interface:

**UI Sections**:

1. **Local Cluster Section**:
   - Status indicator (active/inactive/offline)
   - Usage metrics (storage, queries)
   - Start/Stop controls
   - License limits display
   - Configuration options

2. **Cloud Clusters Section**:
   - List of discovered Lyceum clusters
   - Connection status for each cluster
   - Quick connect/disconnect buttons
   - Default cluster selector
   - Filter by type/classification

3. **Connection Management**:
   - Test connection button
   - Connection history
   - Performance metrics (latency, uptime)

**Design Pattern**:
```typescript
const DatabaseConnections = () => {
  const [localCluster, setLocalCluster] = useState<LocalClusterStatus | null>(null)
  const [cloudClusters, setCloudClusters] = useState<ClusterConnection[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  
  useEffect(() => {
    // Initialize cluster discovery
    // Poll for updates
  }, [])
  
  return (
    <div className="database-connections">
      <LocalClusterCard cluster={localCluster} />
      <CloudClustersList clusters={cloudClusters} />
    </div>
  )
}
```

---

### Phase 4: Integration & Testing

#### Task 4.1: Settings Integration
Integrate the `DatabaseConnections` component into CentCom's settings:
- Add "Storage & Databases" menu item
- Route to the new component
- Ensure proper authentication

#### Task 4.2: License Flow Integration
When user enters license key in CentCom:
1. Call Lyceum's `/license/verify` endpoint
2. Store license info locally
3. If `allows_local_cluster` is true, initialize `LocalClusterManager`
4. Start cluster discovery service
5. Show database connections in settings

#### Task 4.3: Background Services
Set up background workers:
- **Usage Sync**: Every 5 minutes, sync local cluster usage to Lyceum
- **Cluster Discovery**: Every 30 seconds, check for new/updated clusters
- **Heartbeat**: Every minute, send heartbeat to keep license active

---

## 🔧 Configuration Files

### ClickHouse Config Template
**File**: `config/clickhouse-templates/config.xml.template`

Template for ClickHouse configuration with license-based limits:
- Max memory usage
- Max concurrent queries
- Storage paths
- Log configuration

### ClickHouse Users Template
**File**: `config/clickhouse-templates/users.xml.template`

Template for user permissions:
- Default user credentials
- Query quotas based on license
- Access restrictions

---

## 📚 Key Concepts

### License Tiers & Local Cluster Limits

| License Type | Storage | Monthly Queries | Users | Offline Grace |
|--------------|---------|-----------------|-------|---------------|
| Gratis       | 2 GB    | 10,000         | 1     | 1 day         |
| Trial        | 5 GB    | 50,000         | 1     | 3 days        |
| Basic        | 10 GB   | 100,000        | 1     | 7 days        |
| Professional | 50 GB   | 1,000,000      | 5     | 14 days       |
| Enterprise   | 500 GB  | 10,000,000     | ∞     | 30 days       |

### Connection Types

1. **Local Cluster** (`connection_type: 'local'`):
   - Runs on user's machine
   - ClickHouse installed locally
   - Limited by license tier
   - Works offline (with grace period)

2. **Cloud Cluster** (`connection_type: 'cloud'`):
   - Managed by Lyceum
   - Assigned via admin panel
   - Auto-discovered by CentCom
   - Two architectures: `traditional` (full ClickHouse) or `optimized` (serverless)

### Cluster Architectures

1. **Traditional** (`architecture: 'traditional'`):
   - Full ClickHouse instance
   - Direct SQL access via connection string
   - Used for: persistent workloads, complex queries

2. **Optimized** (`architecture: 'optimized'`):
   - Serverless processing via REST API
   - Endpoint-based access with customer_id
   - Used for: curve processing, cost optimization

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ User can verify license and see local cluster permissions
- ✅ Local ClickHouse cluster auto-installs and configures
- ✅ Usage metrics tracked and synced to Lyceum
- ✅ Cloud clusters discovered automatically
- ✅ User can switch between local and cloud clusters
- ✅ License limits enforced gracefully
- ✅ Works offline with grace period

### UI/UX Requirements
- ✅ Clear status indicators for all clusters
- ✅ Real-time usage metrics display
- ✅ Easy cluster switching
- ✅ Helpful error messages
- ✅ Automatic reconnection on network restore

### Performance Requirements
- ✅ Cluster discovery < 2 seconds
- ✅ Connection switching < 1 second
- ✅ Usage sync < 500ms
- ✅ Background polling minimal CPU/network impact

---

## 🚀 Implementation Order

**Week 1**: Foundation
1. Create types (`cluster.ts`)
2. Implement Lyceum integration service
3. Create machine fingerprint generator
4. Test API connectivity with Lyceum

**Week 2**: Local Cluster
1. Implement Local Cluster Manager
2. ClickHouse auto-install
3. Configuration generation
4. Usage tracking

**Week 3**: Discovery & UI
1. Cluster Discovery Service
2. Database Connections UI component
3. Settings integration
4. Background services

**Week 4**: Testing & Polish
1. End-to-end testing
2. Error handling improvements
3. Performance optimization
4. Documentation

---

## 📞 Testing Against Lyceum

### Lyceum API Endpoints Available

Base URL: `http://localhost:3594/api/centcom`

**Verify License**:
```bash
curl -X POST http://localhost:3594/api/centcom/license/verify \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "YOUR_LICENSE_KEY",
    "machine_fingerprint": "test-machine-123"
  }'
```

**Discover Clusters** (requires auth):
```bash
curl http://localhost:3594/api/centcom/clusters/discover \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Sync Usage** (requires auth):
```bash
curl -X POST http://localhost:3594/api/centcom/usage/sync \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_fingerprint": "test-machine-123",
    "storage_used_gb": 2.5,
    "queries_this_month": 15000,
    "clickhouse_version": "23.8.2.7",
    "machine_info": {
      "os": "macOS",
      "memory_gb": 16,
      "cpu_cores": 8
    }
  }'
```

**Track Connection** (requires auth):
```bash
curl -X POST http://localhost:3594/api/centcom/connection/track \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster_id": "CLUSTER_UUID",
    "connection_type": "cloud",
    "connection_name": "Production Cluster"
  }'
```

---

## 📖 Additional Resources

Refer to the full implementation guide (`CENTCOM_LOCAL_CLUSTER_IMPLEMENTATION_GUIDE.md`) for:
- Complete code examples
- Architecture diagrams
- Troubleshooting guides
- Advanced features (shared hosting, on-premise deployment)

---

## ✅ Checklist

Before marking complete, ensure:
- [ ] All TypeScript types defined
- [ ] Lyceum integration service working
- [ ] Machine fingerprint generation stable
- [ ] Local cluster manager functional
- [ ] Cluster discovery polling active
- [ ] UI component integrated in settings
- [ ] Background services running
- [ ] Error handling comprehensive
- [ ] Tests passing
- [ ] Documentation updated

---

## 🎊 Next Steps After Implementation

Once CentCom implementation is complete:
1. Test full end-to-end flow with Lyceum
2. Deploy to staging environment
3. Conduct user acceptance testing
4. Plan production rollout
5. Implement advanced features (Part 8 & 9 of guide)

Good luck with the implementation! 🚀

