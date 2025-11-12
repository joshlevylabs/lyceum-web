# ✅ Lyceum Backend Ready for Enhanced Heartbeats

**Status:** READY TO RECEIVE
**Date:** January 7, 2025
**Purpose:** Confirm Lyceum is ready to receive enhanced heartbeat data from CentCom

---

## 📋 Summary

The Lyceum backend has been fully updated to support:
1. ✅ **Health Status** - `healthy`, `degraded`, `offline`
2. ✅ **Error Tracking** - `last_error` field for debugging
3. ✅ **Projects Metadata** - Project list with measurements and tables
4. ✅ **Real-time Connection Status** - 15-minute detection window
5. ✅ **Authorization via JWT** - `sync_token` verification

**All required infrastructure is in place and ready to receive data from CentCom.**

---

## ✅ What's Ready on Lyceum Side

### 1. Database Schema ✅

**Migration:** [supabase/migrations/20250107_add_cluster_health_and_projects.sql](supabase/migrations/20250107_add_cluster_health_and_projects.sql)

```sql
-- Three new columns added to local_cluster_usage table:
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown';

ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS projects_metadata JSONB;

-- Indexes created for performance:
CREATE INDEX idx_local_cluster_usage_health_status ON local_cluster_usage(health_status);
CREATE INDEX idx_local_cluster_usage_projects_metadata ON local_cluster_usage USING GIN (projects_metadata);
```

**Status:** Migration file created, needs to be applied to production.

---

### 2. Backend API Updates ✅

#### A. Heartbeat Endpoint
**File:** [src/app/api/centcom/clusters/local/heartbeat/route.ts](src/app/api/centcom/clusters/local/heartbeat/route.ts)

**What it accepts:**
```typescript
interface HeartbeatRequest {
  status: {
    is_running: boolean
    uptime_seconds: number
    version: string
    health?: 'healthy' | 'degraded' | 'offline'  // ✅ NEW
    last_error?: string                           // ✅ NEW
  }
  usage_metrics: { /* ... */ }
  projects?: ProjectMetadata[]                    // ✅ NEW
  last_sync_at?: string
}

interface ProjectMetadata {
  project_id: string
  project_name: string
  created_at: string
  last_updated_at: string
  measurement_count: number
  table_names: string[]
}
```

**What it does:**
```typescript
// Lines 104-122: Store enhanced data in database
const healthStatus = status.health || (status.is_running ? 'healthy' : 'offline')

await dbOperations.supabaseAdmin
  .from('local_cluster_usage')
  .update({
    // ... existing fields
    health_status: healthStatus,                              // ✅ STORED
    last_error: status.last_error || null,                   // ✅ STORED
    projects_metadata: body.projects ? JSON.stringify(body.projects) : null, // ✅ STORED
    last_heartbeat_at: new Date().toISOString(),
    // ...
  })
  .eq('cluster_id', cluster_id)
```

**Logging:**
```typescript
// Lines 91-96: Enhanced logging
if (status.health) {
  console.log('📊 Health status:', status.health)
}
if (projects && projects.length > 0) {
  console.log(`📁 Received ${projects.length} projects from cluster`)
}
```

---

#### B. Clusters List API
**File:** [src/app/api/clusters/route.ts](src/app/api/clusters/route.ts:484-516)

**What it returns:**
```typescript
// Lines 484-516: Parse and return enhanced data
const fifteenMinutesAgo = new Date().getTime() - (15 * 60 * 1000)
const isConnected = cluster.last_heartbeat_at &&
  new Date(cluster.last_heartbeat_at).getTime() > fifteenMinutesAgo

// Parse projects metadata
let projectsMetadata = []
if (cluster.projects_metadata) {
  try {
    projectsMetadata = typeof cluster.projects_metadata === 'string'
      ? JSON.parse(cluster.projects_metadata)
      : cluster.projects_metadata
  } catch (e) {
    console.error('Failed to parse projects_metadata', e)
  }
}

const healthStatus = cluster.health_status || (isConnected ? 'healthy' : 'offline')

return {
  // ... existing fields
  health_status: healthStatus,        // ✅ RETURNED
  is_connected: isConnected,          // ✅ RETURNED
  last_error: cluster.last_error,     // ✅ RETURNED
  projects_metadata: projectsMetadata // ✅ RETURNED
}
```

---

#### C. Cluster Details API
**File:** [src/app/api/clusters/by-key/[clusterKey]/route.ts](src/app/api/clusters/by-key/[clusterKey]/route.ts:91-123)

**What it returns:**
```typescript
// Lines 91-123: Same connection detection and parsing logic
const now = new Date()
const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
const lastHeartbeat = new Date(localCluster.last_heartbeat_at)
const isConnected = lastHeartbeat > fifteenMinutesAgo

// Parse projects metadata (lines 98-108)
let projectsMetadata = []
if (localCluster.projects_metadata) {
  try {
    projectsMetadata = typeof localCluster.projects_metadata === 'string'
      ? JSON.parse(localCluster.projects_metadata)
      : localCluster.projects_metadata
  } catch (e) {
    console.error('Failed to parse projects_metadata:', e)
  }
}

// Transform cluster (lines 110-123)
const transformedCluster = {
  // ... existing fields
  health_status: localCluster.health_status || (isConnected ? 'healthy' : 'offline'),
  is_connected: isConnected,
  last_error: localCluster.last_error,
  projects_metadata: projectsMetadata
}
```

---

### 3. Frontend UI Updates ✅

#### A. Clusters Table
**File:** [src/app/clusters/page.tsx](src/app/clusters/page.tsx)

**Features:**
- ✅ Displays connection status with green pulsing dot
- ✅ Shows "Connected" / "Offline" badge for local clusters
- ✅ Auto-refreshes every 30 seconds
- ✅ Shows health status (`healthy`, `degraded`, `offline`, `unknown`)
- ✅ Displays cluster ID in table

**Visual indicators:**
```tsx
{cluster.cluster_type === 'local' && (
  <span
    className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border ${
      cluster.is_connected
        ? 'bg-green-500 animate-pulse'  // ✅ Green pulsing dot when connected
        : 'bg-gray-400'                  // Gray dot when offline
    }`}
  />
)}

{cluster.cluster_type === 'local' && (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
    cluster.is_connected
      ? 'bg-green-100 text-green-800'  // ✅ Green badge
      : 'bg-gray-100 text-gray-600'    // Gray badge
  }`}>
    {cluster.is_connected ? 'Connected' : 'Offline'}
  </span>
)}
```

---

#### B. Cluster Details Page
**File:** [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx)

**Features:**
- ✅ Connection status badge in header with pulsing dot
- ✅ Last seen timestamp
- ✅ Cluster ID display
- ✅ Health status display
- ✅ Last error display (if any)
- ✅ **Projects table** with Jira-like styling
- ✅ Auto-refreshes every 30 seconds

**Projects table (lines 502-563):**
```tsx
{cluster.cluster_type === 'local' && cluster.projects_metadata && cluster.projects_metadata.length > 0 && (
  <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
    <div className="px-4 py-5 sm:px-6">
      <h3>Projects ({cluster.projects_metadata.length})</h3>
      <p>ClickHouse projects synced from your local cluster</p>
    </div>
    <table className="min-w-full">
      <thead>
        <tr>
          <th>Project Name</th>
          <th>Measurements</th>
          <th>Tables</th>
          <th>Created</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        {cluster.projects_metadata.map((project) => (
          <tr key={project.project_id}>
            <td>
              <CircleStackIcon className="h-5 w-5 text-blue-500 mr-2" />
              {project.project_name}
            </td>
            <td>{project.measurement_count.toLocaleString()}</td>
            <td>{project.table_names.length}</td>
            <td>{new Date(project.created_at).toLocaleDateString()}</td>
            <td>{new Date(project.last_updated_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

**Header with connection status:**
```tsx
<div>
  <div className="flex items-center gap-2">
    <h1>{cluster.name}</h1>
    {cluster.cluster_type === 'local' && (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs ${
        cluster.is_connected
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-600'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
          cluster.is_connected ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        {cluster.is_connected ? 'Connected' : 'Offline'}
      </span>
    )}
  </div>
  <div className="mt-1">
    <p className="text-xs font-mono">ID: {cluster.id}</p>
    {cluster.last_heartbeat_at && (
      <p className="text-xs">Last seen: {new Date(cluster.last_heartbeat_at).toLocaleString()}</p>
    )}
  </div>
</div>
```

---

## 🔒 Security: Authorization Ready ✅

**File:** [src/app/api/centcom/clusters/local/heartbeat/route.ts](src/app/api/centcom/clusters/local/heartbeat/route.ts:54-82)

The heartbeat endpoint requires and validates JWT sync tokens:

```typescript
// Lines 54-59: Check Authorization header
const authHeader = request.headers.get('authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return NextResponse.json({
    error: 'Missing or invalid Authorization header'
  }, { status: 401 })
}

// Lines 61-74: Verify JWT token
const token = authHeader.substring(7)
try {
  const signingKey = process.env.CENTCOM_SIGNING_KEY || 'default-dev-key'
  decoded = jwt.verify(token, signingKey)
} catch (jwtError: any) {
  console.log('❌ Invalid sync token:', jwtError.message)
  return NextResponse.json({
    error: 'Invalid or expired sync token. Please re-register your cluster.',
    code: 'SYNC_TOKEN_INVALID'
  }, { status: 401 })
}

// Lines 76-82: Validate payload
const { cluster_id, machine_fingerprint, user_id, license_id } = decoded
if (!cluster_id || !machine_fingerprint) {
  return NextResponse.json({
    error: 'Invalid sync token payload'
  }, { status: 401 })
}
```

**Token payload structure:**
```typescript
{
  iss: 'lyceum',
  aud: 'centcom-sync',
  sub: user_id,
  cluster_id: 'uuid',
  machine_fingerprint: 'string',
  license_id: 'uuid',
  iat: timestamp,
  exp: timestamp  // 90 days from issue
}
```

---

## 📊 Connection Detection Logic

**15-minute detection window:**
```typescript
// CentCom sends heartbeats every 10 minutes
// We consider it connected if heartbeat is within 15 minutes (1.5x interval)
const fifteenMinutesAgo = new Date().getTime() - (15 * 60 * 1000)
const isConnected = cluster.last_heartbeat_at &&
  new Date(cluster.last_heartbeat_at).getTime() > fifteenMinutesAgo
```

**Status derivation:**
- `is_connected = true` → Status: "active", Health: "healthy" (unless explicit health sent)
- `is_connected = false` → Status: "offline", Health: "offline" (unless explicit health sent)

**Auto-refresh:**
- Both clusters table and cluster details page refresh every 30 seconds
- Ensures near-real-time status updates

---

## 🎯 What CentCom Needs to Do

Now that Lyceum is ready, the CentCom team needs to:

### 1. Apply Authorization Header Fix ✅

**Reference:** [AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md](AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md)

**Required changes in CentCom code:**

```rust
// File: src-tauri/src/commands/cluster_heartbeat.rs:134-141

let response = client
    .post(&endpoint)
    .header("Content-Type", "application/json")
    .header("Authorization", format!("Bearer {}", credentials.sync_token))  // ← MUST ADD
    .json(&request)
    .send()
    .await
```

### 2. Send Enhanced Heartbeat Data

**Update heartbeat payload to include:**

```typescript
{
  "status": {
    "is_running": true,
    "uptime_seconds": 3600,
    "version": "24.1.3",
    "health": "healthy",           // ✅ NEW: 'healthy' | 'degraded' | 'offline'
    "last_error": null             // ✅ NEW: Error message if any
  },
  "usage_metrics": {
    // ... existing metrics
  },
  "projects": [                    // ✅ NEW: Array of project metadata
    {
      "project_id": "uuid",
      "project_name": "Analytics Project",
      "created_at": "2025-01-01T00:00:00Z",
      "last_updated_at": "2025-01-07T10:30:00Z",
      "measurement_count": 1250,
      "table_names": ["events", "users", "sessions"]
    }
  ],
  "last_sync_at": "2025-01-07T10:30:00Z"
}
```

### 3. Ensure sync_token in Database

**CentCom database must have sync_token:**

```rust
// File: src-tauri/src/commands/cluster_registration.rs

pub struct ClusterCredentials {
    pub cluster_id: String,
    pub cluster_key: String,
    pub sync_token: String,  // ← MUST BE PRESENT
    pub registered_at: String,
    pub last_heartbeat_at: Option<String>,
}

// Database schema:
CREATE TABLE IF NOT EXISTS cluster_credentials (
    id INTEGER PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    cluster_key TEXT NOT NULL,
    sync_token TEXT NOT NULL,  // ← MUST BE PRESENT
    registered_at TIMESTAMP NOT NULL,
    last_heartbeat_at TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
)
```

### 4. Testing Checklist

Once CentCom applies fixes, verify:

- [ ] ✅ Cluster registration logs show `sync_token` is received and stored
- [ ] ✅ Heartbeat logs show "Sync Token: eyJhbGc..." (first 20 chars)
- [ ] ✅ Heartbeat response status: 200 OK
- [ ] ✅ Lyceum terminal shows "✅ Heartbeat received for cluster"
- [ ] ✅ Lyceum terminal shows "📊 Health status: healthy"
- [ ] ✅ Lyceum terminal shows "📁 Received X projects from cluster"
- [ ] ✅ Lyceum UI shows cluster as "Connected" with green badge
- [ ] ✅ Lyceum UI shows health status as "healthy"
- [ ] ✅ Lyceum UI shows projects table with project data
- [ ] ✅ Database query shows `last_heartbeat_at` is recent (< 10 min)

---

## 📝 Expected Logs When Working

### CentCom Terminal:
```
✅ Cluster credentials stored: cluster_key=LOCAL-XXXX, sync_token=eyJhbGc...
💓 AuthContext: Heartbeat service started
🔍 Heartbeat Debug Info:
  Sync Token: eyJhbGciOiJIUzI1NiI...
💓 Sending heartbeat to: https://lyceum-sable.vercel.app/api/centcom/clusters/local/heartbeat
📊 Heartbeat response status: 200
✅ Heartbeat sent successfully
```

### Lyceum Terminal:
```
✅ Heartbeat received for cluster: xxx-xxx-xxx
📊 Health status: healthy
📁 Received 3 projects from cluster
✅ Cluster status updated: xxx-xxx-xxx
```

### Lyceum UI:
- **Clusters Table:**
  - Status: **active** ✅
  - Health: **healthy** ✅
  - Badge: **🟢 Connected** ✅
  - Last seen: **Just now** ✅

- **Cluster Details Page:**
  - Connection badge: **🟢 Connected**
  - Last seen: **1 minute ago**
  - Health status: **healthy**
  - Projects table: **3 projects displayed**

### Database:
```sql
SELECT
  cluster_key,
  health_status,
  cluster_status,
  is_running,
  last_heartbeat_at,
  projects_metadata IS NOT NULL as has_projects
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-XXXX';

-- Expected results:
-- cluster_key: LOCAL-XXXX
-- health_status: healthy
-- cluster_status: online
-- is_running: true
-- last_heartbeat_at: 2025-01-07 11:30:00 (< 10 min ago)
-- has_projects: true
```

---

## 🚀 Deployment Steps for Lyceum

### Apply Database Migration:

```bash
# In Lyceum project directory
cd supabase

# Apply migration locally (if testing)
npx supabase db reset

# OR apply to production via Supabase dashboard:
# 1. Go to Supabase dashboard
# 2. Navigate to SQL Editor
# 3. Copy contents of migrations/20250107_add_cluster_health_and_projects.sql
# 4. Execute the SQL
```

### Verify Migration Applied:

```sql
-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'local_cluster_usage'
  AND column_name IN ('health_status', 'last_error', 'projects_metadata');

-- Expected output:
-- health_status    | character varying(20)
-- last_error       | text
-- projects_metadata| jsonb
```

---

## 📚 Related Documentation

1. **[AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md](AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md)**
   Step-by-step verification that CentCom has Authorization header fix applied

2. **[CLUSTER_HEALTH_AND_PROJECTS_IMPLEMENTATION.md](CLUSTER_HEALTH_AND_PROJECTS_IMPLEMENTATION.md)**
   Complete implementation guide for health status and projects feature

3. **[LOCAL_CLUSTER_CONNECTION_STATUS_IMPLEMENTATION.md](LOCAL_CLUSTER_CONNECTION_STATUS_IMPLEMENTATION.md)**
   Implementation guide for real-time connection status feature

4. **[CENTCOM_HEARTBEAT_DIAGNOSTIC_QUESTIONS.md](CENTCOM_HEARTBEAT_DIAGNOSTIC_QUESTIONS.md)**
   Comprehensive diagnostic questions for troubleshooting heartbeat issues

---

## ✅ Summary: Ready to Receive

| Component | Status | Notes |
|-----------|--------|-------|
| Database schema | ✅ READY | Migration created, needs deployment |
| Heartbeat endpoint | ✅ READY | Accepts and stores all enhanced data |
| Clusters list API | ✅ READY | Returns enhanced data with parsing |
| Cluster details API | ✅ READY | Returns enhanced data with parsing |
| Frontend UI (table) | ✅ READY | Displays connection status, health |
| Frontend UI (details) | ✅ READY | Displays projects table, health, errors |
| Authorization | ✅ READY | JWT sync_token validation working |
| Auto-refresh | ✅ READY | 30-second refresh intervals |
| Connection detection | ✅ READY | 15-minute window (1.5x heartbeat) |

**Lyceum is 100% ready to receive enhanced heartbeat data from CentCom.**

**Next step:** CentCom team applies Authorization header fix and sends enhanced payload.

---

**Created:** January 7, 2025
**Last Updated:** January 7, 2025
**Status:** ✅ VERIFIED READY
