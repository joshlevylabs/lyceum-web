# Cluster Health Status & Project Data Sync Implementation

## ✅ Implementation Complete

Successfully implemented Lyceum backend support for **Issue 3** from the CentCom improvements document: receiving, storing, and displaying cluster health status and project metadata from local clusters.

---

## 🎯 Overview

This implementation enables Lyceum to:
1. **Accept health status** from CentCom heartbeats (`healthy`, `degraded`, `offline`)
2. **Store project metadata** including measurements, tables, and timestamps
3. **Display projects table** on cluster details page
4. **Show health indicators** alongside connection status

---

## 📊 Changes Made

### 1. Database Migration

**File**: [supabase/migrations/20250107_add_cluster_health_and_projects.sql](supabase/migrations/20250107_add_cluster_health_and_projects.sql)

**Changes:**
```sql
-- Add health_status column
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown';

-- Add last_error column for debugging
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Add projects_metadata JSON column
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS projects_metadata JSONB;

-- Add indexes for performance
CREATE INDEX idx_local_cluster_usage_health_status
ON local_cluster_usage(health_status);

CREATE INDEX idx_local_cluster_usage_projects_metadata
ON local_cluster_usage USING GIN (projects_metadata);
```

**New Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `health_status` | VARCHAR(20) | Cluster health: healthy, degraded, offline, unknown |
| `last_error` | TEXT | Last error message for debugging |
| `projects_metadata` | JSONB | Array of project objects with measurements and tables |

---

### 2. Backend API Updates

#### A. Heartbeat Endpoint

**File**: [src/app/api/centcom/clusters/local/heartbeat/route.ts](src/app/api/centcom/clusters/local/heartbeat/route.ts)

**New Interface:**
```typescript
interface ProjectMetadata {
  project_id: string
  project_name: string
  created_at: string
  last_updated_at: string
  measurement_count: number
  table_names: string[]
}

interface HeartbeatRequest {
  status: {
    is_running: boolean
    uptime_seconds: number
    version: string
    health?: 'healthy' | 'degraded' | 'offline' // NEW
    last_error?: string // NEW
  }
  usage_metrics: { /* ... */ }
  projects?: ProjectMetadata[] // NEW
  last_sync_at?: string
}
```

**Database Update Logic:**
```typescript
// Determine health status - use provided health or derive
const healthStatus = status.health || (status.is_running ? 'healthy' : 'offline')

await dbOperations.supabaseAdmin
  .from('local_cluster_usage')
  .update({
    // ... existing fields
    health_status: healthStatus, // NEW
    last_error: status.last_error || null, // NEW
    projects_metadata: body.projects ? JSON.stringify(body.projects) : null, // NEW
    // ...
  })
```

**Logging:**
```typescript
if (status.health) {
  console.log('📊 Health status:', status.health)
}
if (projects && projects.length > 0) {
  console.log(`📁 Received ${projects.length} projects from cluster`)
}
```

#### B. Cluster Details API

**File**: [src/app/api/clusters/by-key/[clusterKey]/route.ts](src/app/api/clusters/by-key/[clusterKey]/route.ts)

**Changes:**
```typescript
// Parse projects metadata if present
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

const transformedCluster = {
  // ... existing fields
  health_status: localCluster.health_status || (isConnected ? 'healthy' : 'offline'),
  last_error: localCluster.last_error,
  projects_metadata: projectsMetadata,
  // ...
}
```

#### C. Clusters List API

**File**: [src/app/api/clusters/route.ts](src/app/api/clusters/route.ts:490-516)

**Changes:**
```typescript
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

// Use actual health_status if available
const healthStatus = cluster.health_status || (isConnected ? 'healthy' : 'offline')

return {
  // ... existing fields
  health_status: healthStatus,
  last_error: cluster.last_error,
  projects_metadata: projectsMetadata,
  // ...
}
```

---

### 3. Frontend Updates

#### A. Cluster Details Interface

**File**: [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx:22-62)

**New Interface:**
```typescript
interface ProjectMetadata {
  project_id: string
  project_name: string
  created_at: string
  last_updated_at: string
  measurement_count: number
  table_names: string[]
}

interface ClusterDetails {
  // ... existing fields
  last_error?: string
  projects_metadata?: ProjectMetadata[]
  // ...
}
```

#### B. Projects Table Component

**File**: [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx:502-563)

**New Section:**
```tsx
{/* Projects Table (for local clusters) */}
{cluster.cluster_type === 'local' && cluster.projects_metadata && cluster.projects_metadata.length > 0 && (
  <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
    <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
        Projects ({cluster.projects_metadata.length})
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        ClickHouse projects synced from your local cluster
      </p>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th>Project Name</th>
            <th>Measurements</th>
            <th>Tables</th>
            <th>Created</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
  </div>
)}
```

**Visual Features:**
- ✅ Beautiful table with Jira-like styling
- ✅ Icon for each project
- ✅ Formatted numbers with commas
- ✅ Date formatting
- ✅ Hover effects on rows
- ✅ Dark mode support
- ✅ Shows project count in header

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CentCom (Tauri App)                                            │
│                                                                 │
│ 1. Query ClickHouse for projects:                             │
│    - Project names                                             │
│    - Measurement counts                                        │
│    - Table names                                               │
│    - Timestamps                                                │
│                                                                 │
│ 2. Detect health status:                                       │
│    - Check disk space                                          │
│    - Check errors                                              │
│    - Determine: healthy, degraded, or offline                 │
│                                                                 │
│ 3. Send enhanced heartbeat every 10 minutes                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Lyceum Backend                                                 │
│                                                                 │
│ POST /api/centcom/clusters/local/heartbeat                     │
│                                                                 │
│ {                                                               │
│   status: {                                                     │
│     is_running: true,                                          │
│     version: "23.12",                                          │
│     health: "healthy",        ← NEW                            │
│     last_error: null          ← NEW                            │
│   },                                                            │
│   projects: [                  ← NEW                            │
│     {                                                           │
│       project_id: "proj_123",                                  │
│       project_name: "sensor_data",                             │
│       measurement_count: 15000,                                │
│       table_names: ["measurements", "aggregates"],             │
│       created_at: "2025-01-01",                                │
│       last_updated_at: "2025-01-07"                            │
│     }                                                           │
│   ]                                                             │
│ }                                                               │
│                                                                 │
│ → Store in local_cluster_usage table                           │
│   - health_status = "healthy"                                  │
│   - projects_metadata = JSON.stringify(projects)               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Lyceum Frontend                                                │
│                                                                 │
│ /clusters/LOCAL-0011                                           │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ 🟢 CentCom Local  [Connected] [Healthy]                  │ │
│ │ Key: LOCAL-0011                                          │ │
│ │ ID: bd26116a-827c-42d8-8041-711d97d92776                │ │
│ │ Last seen: Jan 7, 2025 10:30 AM                         │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Projects (2)                                              │ │
│ │ ClickHouse projects synced from your local cluster       │ │
│ │                                                           │ │
│ │ ╔═══════════════╤═══════════════╤════════╤═══════════╗   │ │
│ │ ║ Project Name  │ Measurements  │ Tables │ Updated   ║   │ │
│ │ ╠═══════════════╪═══════════════╪════════╪═══════════╣   │ │
│ │ ║ sensor_data   │ 15,000        │ 2      │ Jan 7     ║   │ │
│ │ ║ analytics     │ 8,500         │ 3      │ Jan 6     ║   │ │
│ │ ╚═══════════════╧═══════════════╧════════╧═══════════╝   │ │
│ └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test 1: Database Migration

```bash
# Run migration
psql -h localhost -U postgres -d lyceum_dev < supabase/migrations/20250107_add_cluster_health_and_projects.sql

# Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'local_cluster_usage'
  AND column_name IN ('health_status', 'last_error', 'projects_metadata');
```

**Expected Output:**
```
column_name          | data_type
---------------------|------------
health_status        | character varying
last_error           | text
projects_metadata    | jsonb
```

### Test 2: Enhanced Heartbeat

**Send test heartbeat with curl:**
```bash
curl -X POST http://localhost:3594/api/centcom/clusters/local/heartbeat \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": {
      "is_running": true,
      "uptime_seconds": 3600,
      "version": "23.12",
      "health": "healthy",
      "last_error": null
    },
    "usage_metrics": {
      "storage_used_gb": 2.5,
      "storage_bytes": 2684354560,
      "queries_this_month": 150,
      "project_count": 2,
      "measurement_count": 23500,
      "table_count": 5
    },
    "projects": [
      {
        "project_id": "proj_sensor",
        "project_name": "sensor_data",
        "created_at": "2025-01-01T00:00:00Z",
        "last_updated_at": "2025-01-07T10:30:00Z",
        "measurement_count": 15000,
        "table_names": ["measurements", "aggregates"]
      },
      {
        "project_id": "proj_analytics",
        "project_name": "analytics",
        "created_at": "2024-12-15T00:00:00Z",
        "last_updated_at": "2025-01-06T15:00:00Z",
        "measurement_count": 8500,
        "table_names": ["events", "sessions", "users"]
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "cluster_status": "healthy",
  "should_throttle": false,
  "warnings": [],
  "next_heartbeat_seconds": 600
}
```

**Check terminal logs:**
```
✅ Heartbeat received for cluster: xxx-xxx-xxx
📊 Health status: healthy
📁 Received 2 projects from cluster
✅ Cluster status updated: xxx-xxx-xxx
```

### Test 3: View Projects in Lyceum

1. **Navigate to cluster details:**
   - Go to http://localhost:3594/clusters
   - Click eye icon on LOCAL-0011
   - Or go directly to http://localhost:3594/clusters/LOCAL-0011

2. **Expected UI:**
   - ✅ Header shows "Connected" and "Healthy" badges
   - ✅ Projects section appears below Cluster Information
   - ✅ Projects table shows 2 projects with correct data
   - ✅ Table columns: Project Name, Measurements, Tables, Created, Last Updated
   - ✅ Numbers formatted with commas (15,000 not 15000)
   - ✅ Dates formatted nicely (Jan 7, 2025)

3. **Test empty state:**
   - Send heartbeat without projects
   - Projects section should NOT appear
   - No broken UI or errors

### Test 4: Health Status Display

**Test different health states:**

1. **Healthy:**
   ```json
   "status": { "health": "healthy" }
   ```
   - Badge shows green "Healthy"

2. **Degraded:**
   ```json
   "status": {
     "health": "degraded",
     "last_error": "Disk space low"
   }
   ```
   - Badge shows yellow "Degraded"
   - Can add UI to show last_error

3. **Offline:**
   ```json
   "status": { "health": "offline" }
   ```
   - Badge shows gray "Offline"

---

## 📝 CentCom Integration Guide

**For the CentCom team to implement:**

### Step 1: Add Project Query Function

```rust
// In src/commands/cluster_heartbeat.rs or similar

async fn get_clickhouse_projects(app_handle: tauri::AppHandle) -> Result<Vec<ProjectMetadata>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;

    // Query for distinct projects
    let query = r#"
        SELECT DISTINCT
            project_name,
            min(timestamp) as created_at,
            max(timestamp) as last_updated_at,
            count(*) as measurement_count,
            groupArray(table) as table_names
        FROM centcom_analytics.measurements
        GROUP BY project_name
        ORDER BY last_updated_at DESC
    "#;

    let response = client
        .get("http://localhost:8123")
        .query(&[("query", query), ("database", "centcom_analytics")])
        .basic_auth("centcom", Some("centcom123"))
        .send()
        .await
        .map_err(|e| format!("Failed to query projects: {}", e))?;

    let text = response.text().await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Parse TSV response and build ProjectMetadata objects
    let projects = parse_tsv_to_projects(text)?;

    Ok(projects)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub project_id: String,
    pub project_name: String,
    pub created_at: String,
    pub last_updated_at: String,
    pub measurement_count: u64,
    pub table_names: Vec<String>,
}
```

### Step 2: Include Projects in Heartbeat

```rust
// In send_cluster_heartbeat() function

// Get projects (optional - don't fail heartbeat if this fails)
let projects = match get_clickhouse_projects(app_handle.clone()).await {
    Ok(p) => Some(p),
    Err(e) => {
        println!("⚠️ Failed to get projects for heartbeat: {}", e);
        None
    }
};

// Build heartbeat request
let request = HeartbeatRequest {
    cluster_id: credentials.cluster_id.clone(),
    machine_fingerprint: fingerprint.fingerprint.clone(),
    status: ClusterStatus {
        is_running,
        uptime_seconds: usage.uptime_seconds,
        version,
        health: if is_running { "healthy".to_string() } else { "offline".to_string() },
        last_error: None,
    },
    usage_metrics: UsageMetrics { /* ... */ },
    projects,  // ← NEW: Include projects
    last_sync_at: chrono::Utc::now().to_rfc3339(),
};
```

### Step 3: Add Health Detection Logic

```rust
fn detect_cluster_health() -> (&'static str, Option<String>) {
    // Check disk space
    let disk_usage = get_disk_usage();
    if disk_usage > 0.9 {
        return ("degraded", Some("Disk space above 90%".to_string()));
    }

    // Check for recent errors
    if let Some(last_error) = get_last_clickhouse_error() {
        return ("degraded", Some(last_error));
    }

    // Check if ClickHouse is responding
    if !is_clickhouse_responsive() {
        return ("offline", Some("ClickHouse not responding".to_string()));
    }

    ("healthy", None)
}

// Use in heartbeat
let (health, last_error) = detect_cluster_health();

let status = ClusterStatus {
    is_running,
    uptime_seconds: usage.uptime_seconds,
    version,
    health: health.to_string(),
    last_error,
};
```

---

## 🎨 UI Features

### Projects Table Styling

**Features:**
- ✅ Jira-like table design with clear borders
- ✅ Hover effects on rows
- ✅ Icon for each project (CircleStackIcon)
- ✅ Formatted numbers with locale strings
- ✅ Responsive design with horizontal scroll
- ✅ Dark mode support
- ✅ Empty state handling (no broken UI if no projects)

**Colors:**
- Header background: Gray-50 (light) / Gray-900 (dark)
- Row hover: Gray-50 (light) / Gray-700/50 (dark)
- Icon color: Blue-500
- Text: Gray-900 (light) / White (dark)
- Borders: Gray-200 (light) / Gray-700 (dark)

---

## ✅ Success Criteria

After implementation, the following should work:

**Backend:**
- [x] Database has `health_status`, `last_error`, `projects_metadata` columns
- [x] Heartbeat endpoint accepts health and projects data
- [x] Projects stored as JSONB in database
- [x] Health status stored correctly
- [x] API returns projects and health to frontend

**Frontend:**
- [x] Cluster details page shows projects table (when data exists)
- [x] Projects table displays all fields correctly
- [x] Numbers formatted with commas
- [x] Dates formatted nicely
- [x] Dark mode works correctly
- [x] No errors when projects_metadata is null/empty

**Integration:**
- [ ] CentCom sends enhanced heartbeats (pending CentCom implementation)
- [ ] Projects appear automatically after first enhanced heartbeat
- [ ] Health status updates in real-time
- [ ] Auto-refresh keeps data current

---

## 📚 Files Modified

### Backend
- ✅ [supabase/migrations/20250107_add_cluster_health_and_projects.sql](supabase/migrations/20250107_add_cluster_health_and_projects.sql)
- ✅ [src/app/api/centcom/clusters/local/heartbeat/route.ts](src/app/api/centcom/clusters/local/heartbeat/route.ts)
- ✅ [src/app/api/clusters/by-key/[clusterKey]/route.ts](src/app/api/clusters/by-key/[clusterKey]/route.ts)
- ✅ [src/app/api/clusters/route.ts](src/app/api/clusters/route.ts)

### Frontend
- ✅ [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx)

### Documentation
- ✅ [CLUSTER_HEALTH_AND_PROJECTS_IMPLEMENTATION.md](CLUSTER_HEALTH_AND_PROJECTS_IMPLEMENTATION.md) (this file)
- ✅ [LOCAL_CLUSTER_CONNECTION_STATUS_IMPLEMENTATION.md](LOCAL_CLUSTER_CONNECTION_STATUS_IMPLEMENTATION.md) (previous feature)

---

## 🚀 Next Steps

**For Lyceum (DONE):**
- ✅ Database schema updated
- ✅ Backend APIs accepting enhanced data
- ✅ Frontend displaying projects
- ✅ Ready to receive data from CentCom

**For CentCom (TODO):**
- [ ] Implement `get_clickhouse_projects()` function
- [ ] Add health detection logic
- [ ] Include projects and health in heartbeat
- [ ] Test with Lyceum backend
- [ ] Deploy to production

**Testing Together:**
1. CentCom team implements enhanced heartbeat
2. Start CentCom with projects in ClickHouse
3. Verify projects appear on Lyceum cluster details page
4. Test different health states
5. Verify auto-refresh keeps data current

---

## 🎉 Summary

**What was built:**
- ✅ Database columns for health and projects
- ✅ Enhanced heartbeat endpoint
- ✅ Projects table UI component
- ✅ Health status indicators
- ✅ Automatic parsing and display of project data

**What users will see:**
- 🟢 Health status badge (Healthy/Degraded/Offline)
- 📁 Projects table with all ClickHouse projects
- 📊 Project statistics (measurements, tables, dates)
- ✨ Beautiful Jira-like table design
- 🌙 Full dark mode support

**Benefits:**
- Users can see what projects are in their local cluster
- Health status provides quick diagnostics
- No need to open ClickHouse directly
- All data syncs automatically via heartbeats
- Real-time updates every 30 seconds

---

**Last Updated**: January 7, 2025
**Status**: ✅ Lyceum Backend & Frontend Complete
**Next**: ⏳ Awaiting CentCom Enhanced Heartbeat Implementation
