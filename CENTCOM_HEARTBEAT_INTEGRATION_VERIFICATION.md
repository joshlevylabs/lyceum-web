# CentCom Heartbeat Integration Verification

**Status:** Ready for Testing
**Date:** January 7, 2025
**Purpose:** Verify Lyceum correctly receives, stores, and displays enhanced heartbeat data from CentCom

---

## 🎯 Overview

CentCom now sends enhanced heartbeat data including:
- ✅ **Health Status** (`"healthy"` or `"offline"`)
- ✅ **Last Error** (for debugging)
- ✅ **Projects Metadata** (array of projects with measurements and tables)
- ✅ **Storage Bytes** (actual storage usage)

This document verifies that Lyceum properly handles this data.

---

## ✅ Step 1: Apply Database Migration

### Check if Migration is Applied

Run this in your terminal or Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'local_cluster_usage'
  AND column_name IN ('health_status', 'last_error', 'projects_metadata')
ORDER BY column_name;
```

**Expected output:**
```
 column_name       | data_type            | is_nullable
-------------------+----------------------+-------------
 health_status     | character varying(20)| YES
 last_error        | text                 | YES
 projects_metadata | jsonb                | YES
```

### If Columns Don't Exist - Apply Migration

**File:** [supabase/migrations/20250107_add_cluster_health_and_projects.sql](supabase/migrations/20250107_add_cluster_health_and_projects.sql)

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `20250107_add_cluster_health_and_projects.sql`
3. Execute the SQL

**Option B: Via CLI (if using local Supabase)**
```bash
npx supabase db reset
# OR
npx supabase migration up
```

---

## ✅ Step 2: Verify Heartbeat Endpoint

### Current Payload Structure

CentCom is sending:
```json
{
  "cluster_id": "6d8f3c6e-789f-4871-80f9-e03f54e2f73f",
  "status": {
    "is_running": true,
    "uptime_seconds": 58,
    "version": "25.9.2.1",
    "health": "healthy",
    "last_error": null
  },
  "usage_metrics": {
    "storage_bytes": 1445195,
    "storage_used_gb": 0.00138,
    "project_count": 2,
    "measurement_count": 315,
    "table_count": 2,
    "queries_this_month": 0
  },
  "projects": [
    {
      "project_id": "project_test_project_1",
      "project_name": "Test Project 1",
      "created_at": "2025-11-01 10:00:00",
      "last_updated_at": "2025-11-07 15:30:00",
      "measurement_count": 150,
      "table_names": ["measurements"]
    },
    {
      "project_id": "project_test_project_2",
      "project_name": "Test Project 2",
      "created_at": "2025-11-03 14:00:00",
      "last_updated_at": "2025-11-06 09:15:00",
      "measurement_count": 165,
      "table_names": ["measurements"]
    }
  ],
  "last_sync_at": "2025-01-07T15:30:00Z"
}
```

### Heartbeat Endpoint Code Review

**File:** [src/app/api/centcom/clusters/local/heartbeat/route.ts](src/app/api/centcom/clusters/local/heartbeat/route.ts)

**Lines 88-96: Extract and log enhanced data ✅**
```typescript
const { status, usage_metrics, last_sync_at, projects } = body

// Log enhanced data if present
if (status.health) {
  console.log('📊 Health status:', status.health)
}
if (projects && projects.length > 0) {
  console.log(`📁 Received ${projects.length} projects from cluster`)
}
```

**Lines 104-122: Store in database ✅**
```typescript
const healthStatus = status.health || (status.is_running ? 'healthy' : 'offline')

await dbOperations.supabaseAdmin
  .from('local_cluster_usage')
  .update({
    is_running: status.is_running,
    uptime_seconds: status.uptime_seconds,
    clickhouse_version: status.version,
    health_status: healthStatus,                                           // ✅ STORES
    last_error: status.last_error || null,                                 // ✅ STORES
    storage_used_gb: usage_metrics.storage_used_gb,
    storage_bytes: usage_metrics.storage_bytes,                            // ✅ STORES
    queries_this_month: usage_metrics.queries_this_month,
    project_count: usage_metrics.project_count,
    measurement_count: usage_metrics.measurement_count,
    table_count: usage_metrics.table_count,
    projects_metadata: body.projects ? JSON.stringify(body.projects) : null, // ✅ STORES
    last_heartbeat_at: new Date().toISOString(),
    cluster_status: status.is_running ? 'online' : 'offline',
    updated_at: new Date().toISOString()
  })
  .eq('cluster_id', cluster_id)
```

**Status:** Endpoint is correctly configured ✅

---

## ✅ Step 3: Test Heartbeat Flow

### A. Start CentCom

```bash
cd centcom
npm run tauri:dev
```

### B. Monitor Lyceum Backend Logs

In your Lyceum terminal (where Next.js dev server is running), you should see:

```
✅ Heartbeat received for cluster: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
📊 Health status: healthy
📁 Received 2 projects from cluster
✅ Cluster status updated: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
```

**If you see these logs:** ✅ Heartbeat is working!

**If you don't see logs:**
- Check CentCom terminal for heartbeat send logs
- Verify Authorization header is present in CentCom heartbeat request
- Check for 401 errors (sync_token invalid)

### C. Verify Data in Database

Wait 1-2 minutes after CentCom starts, then query:

```sql
SELECT
  cluster_key,
  health_status,
  cluster_status,
  is_running,
  storage_bytes,
  storage_used_gb,
  project_count,
  measurement_count,
  last_heartbeat_at,
  NOW() - last_heartbeat_at as heartbeat_age,
  projects_metadata IS NOT NULL as has_projects,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_count
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001'  -- Replace with your cluster key
ORDER BY last_heartbeat_at DESC
LIMIT 1;
```

**Expected results:**
```
cluster_key:     LOCAL-0001
health_status:   healthy
cluster_status:  online
is_running:      true
storage_bytes:   1445195
storage_used_gb: 0.00138
project_count:   2
measurement_count: 315
last_heartbeat_at: 2025-01-07 15:32:00 (< 10 min ago)
heartbeat_age:   00:02:00 (2 minutes)
has_projects:    true
projects_count:  2
```

**If data is outdated or null:**
- ❌ Heartbeat not reaching Lyceum
- ❌ Migration not applied
- ❌ Authorization header missing

### D. Verify Projects Data Structure

```sql
SELECT
  cluster_key,
  projects_metadata
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001'  -- Replace with your cluster key
LIMIT 1;
```

**Expected projects_metadata structure:**
```json
[
  {
    "project_id": "project_test_project_1",
    "project_name": "Test Project 1",
    "created_at": "2025-11-01 10:00:00",
    "last_updated_at": "2025-11-07 15:30:00",
    "measurement_count": 150,
    "table_names": ["measurements"]
  },
  {
    "project_id": "project_test_project_2",
    "project_name": "Test Project 2",
    "created_at": "2025-11-03 14:00:00",
    "last_updated_at": "2025-11-06 09:15:00",
    "measurement_count": 165,
    "table_names": ["measurements"]
  }
]
```

---

## ✅ Step 4: Verify Frontend Display

### A. Clusters Table

Navigate to: `http://localhost:3000/clusters`

**Check for your local cluster:**

| Element | Expected | Location |
|---------|----------|----------|
| Status badge | 🟢 **Connected** | Next to cluster icon |
| Health status | **healthy** | Status column |
| Connection dot | Green pulsing dot | Top-right of cluster icon |
| Cluster ID | `bd26116a-...` | Cluster ID column |
| Last heartbeat | "X minutes ago" | Last Heartbeat column |

**Visual indicator code (page.tsx:lines 380-392):**
```tsx
{cluster.cluster_type === 'local' && (
  <span
    className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border ${
      cluster.is_connected
        ? 'bg-green-500 animate-pulse'  // ✅ Should be green and pulsing
        : 'bg-gray-400'
    }`}
  />
)}

{cluster.cluster_type === 'local' && (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
    cluster.is_connected
      ? 'bg-green-100 text-green-800'  // ✅ Should show "Connected"
      : 'bg-gray-100 text-gray-600'
  }`}>
    {cluster.is_connected ? 'Connected' : 'Offline'}
  </span>
)}
```

**If showing "Offline" or "unknown":**
- Check `last_heartbeat_at` in database (must be < 15 minutes)
- Verify heartbeat is actually running (check CentCom logs)
- Check API response includes `is_connected: true`

### B. Cluster Details Page

Click on your local cluster or navigate to:
`http://localhost:3000/clusters/LOCAL-0001`

**Header section should show:**
```
CentCom Local - XXXXXXXX  [🟢 Connected]
Key: LOCAL-0001
ID: bd26116a-827c-42d8-8041-711d97d92776
Last seen: 2 minutes ago
```

**Cluster Information section should show:**

| Field | Expected Value |
|-------|---------------|
| Status | ✅ active |
| Health | ✅ healthy |
| Type | local |
| Region | Local |
| Architecture | centcom |
| Version | 25.9.2.1 |
| Storage | 1.4 MB (not "0 MB") |
| Queries | 0 |

**Projects table should appear:**

```
Projects (2)
ClickHouse projects synced from your local cluster

┌─────────────────┬──────────────┬────────┬────────────┬──────────────┐
│ Project Name    │ Measurements │ Tables │ Created    │ Last Updated │
├─────────────────┼──────────────┼────────┼────────────┼──────────────┤
│ Test Project 1  │ 150          │ 1      │ 11/1/2025  │ 11/7/2025    │
│ Test Project 2  │ 165          │ 1      │ 11/3/2025  │ 11/6/2025    │
└─────────────────┴──────────────┴────────┴────────────┴──────────────┘
```

**Projects table code ([clusterKey]/page.tsx:lines 503-563):**
```tsx
{cluster.cluster_type === 'local' && cluster.projects_metadata && cluster.projects_metadata.length > 0 && (
  <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
    <div className="px-4 py-5 sm:px-6">
      <h3>Projects ({cluster.projects_metadata.length})</h3>
      <p>ClickHouse projects synced from your local cluster</p>
    </div>
    <table className="min-w-full">
      <tbody>
        {cluster.projects_metadata.map((project) => (
          <tr key={project.project_id}>
            <td>{project.project_name}</td>
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

**If projects table doesn't appear:**
- Verify `projects_metadata` in database is not null
- Check browser console for JSON parse errors
- Verify API response includes `projects_metadata` array

---

## 🔍 Troubleshooting Common Issues

### Issue 1: Migration Not Applied

**Symptoms:**
- Database error: `column "health_status" does not exist`
- Heartbeat endpoint returns 500 error
- Data not storing

**Solution:**
```sql
-- Apply the migration manually
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown';

ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS projects_metadata JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_health_status
ON local_cluster_usage(health_status);

CREATE INDEX IF NOT EXISTS idx_local_cluster_usage_projects_metadata
ON local_cluster_usage USING GIN (projects_metadata);
```

### Issue 2: Cluster Showing "Offline" Despite CentCom Running

**Symptoms:**
- CentCom is running and sending heartbeats
- Lyceum shows "Offline" and "unknown" health
- `last_heartbeat_at` is old (> 15 minutes)

**Possible causes:**
1. **Authorization header missing** - See [AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md](AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md)
2. **Heartbeat loop not running** - Check CentCom logs for "Sending heartbeat"
3. **Wrong endpoint URL** - Verify CentCom is sending to correct URL

**Diagnostic queries:**
```sql
-- Check when last heartbeat was received
SELECT
  cluster_key,
  last_heartbeat_at,
  NOW() - last_heartbeat_at as time_since_heartbeat,
  cluster_status,
  health_status
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001';

-- If time_since_heartbeat > 15 minutes, heartbeats are not reaching Lyceum
```

### Issue 3: Projects Not Displaying

**Symptoms:**
- Cluster shows as "Connected" and "healthy"
- But no projects table appears
- `projects_metadata` is null in database

**Diagnostic queries:**
```sql
-- Check if projects_metadata is being stored
SELECT
  cluster_key,
  projects_metadata IS NULL as is_null,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as project_count
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001';
```

**If `is_null = true`:**
1. Check CentCom is sending `projects` array in payload
2. Verify Lyceum logs show "📁 Received X projects from cluster"
3. Check heartbeat endpoint is calling `JSON.stringify(body.projects)`

**If `is_null = false` but frontend doesn't show:**
1. Check browser console for errors
2. Verify API response includes `projects_metadata`
3. Check TypeScript interface matches data structure

### Issue 4: Storage Shows "0 MB"

**Symptoms:**
- `storage_used_gb` is 0 or null
- But CentCom is sending `storage_bytes: 1445195`

**Cause:** CentCom sends both `storage_bytes` and `storage_used_gb`, but Lyceum might only be reading one.

**Verify in database:**
```sql
SELECT
  cluster_key,
  storage_bytes,
  storage_used_gb,
  CASE
    WHEN storage_bytes IS NOT NULL
    THEN storage_bytes / (1024.0 * 1024.0)  -- Convert bytes to MB
    ELSE 0
  END as calculated_mb
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001';
```

**Expected:**
- `storage_bytes`: 1445195
- `storage_used_gb`: 0.00138
- `calculated_mb`: 1.38

**If storage_bytes is null:**
- Check heartbeat endpoint stores `storage_bytes` (line 117)
- Verify CentCom payload includes `storage_bytes`

---

## 📊 Complete Verification Checklist

Run through this checklist to verify everything is working:

- [ ] **Database Migration Applied**
  - [ ] `health_status` column exists
  - [ ] `last_error` column exists
  - [ ] `projects_metadata` column exists
  - [ ] Indexes created

- [ ] **Heartbeat Endpoint Working**
  - [ ] CentCom sends heartbeat every 10 minutes
  - [ ] Lyceum logs show "✅ Heartbeat received"
  - [ ] Lyceum logs show "📊 Health status: healthy"
  - [ ] Lyceum logs show "📁 Received X projects"
  - [ ] Response status is 200 OK

- [ ] **Database Storing Data**
  - [ ] `health_status` = "healthy" (not "unknown")
  - [ ] `cluster_status` = "online" (not "offline")
  - [ ] `last_heartbeat_at` is recent (< 10 min)
  - [ ] `storage_bytes` has value (> 0)
  - [ ] `projects_metadata` is not null
  - [ ] `projects_metadata` has correct structure

- [ ] **Clusters Table UI**
  - [ ] Shows "🟢 Connected" badge
  - [ ] Connection dot is green and pulsing
  - [ ] Health shows "healthy"
  - [ ] Cluster ID is visible
  - [ ] Last heartbeat shows recent time
  - [ ] Auto-refreshes every 30 seconds

- [ ] **Cluster Details UI**
  - [ ] Header shows "🟢 Connected"
  - [ ] Last seen shows recent time
  - [ ] Cluster ID is displayed
  - [ ] Health status is "healthy"
  - [ ] Storage shows actual value (not "0 MB")
  - [ ] Projects table appears with data
  - [ ] Projects show correct counts
  - [ ] Auto-refreshes every 30 seconds

---

## 🎯 Expected Final State

When everything is working correctly:

### CentCom Terminal
```
💓 AuthContext: Heartbeat service started
🔍 Heartbeat Debug Info:
  Cluster ID: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
  Sync Token: eyJhbGciOiJIUzI1NiI...
💓 Sending heartbeat to: https://lyceum-sable.vercel.app/api/centcom/clusters/local/heartbeat
📊 Heartbeat payload includes:
  - Health: healthy
  - Projects: 2
  - Storage: 1445195 bytes
📊 Heartbeat response status: 200
✅ Heartbeat sent successfully
```

### Lyceum Terminal
```
✅ Heartbeat received for cluster: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
📊 Health status: healthy
📁 Received 2 projects from cluster
✅ Cluster status updated: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
```

### Database State
```sql
health_status:     healthy ✅
cluster_status:    online ✅
is_running:        true ✅
storage_bytes:     1445195 ✅
project_count:     2 ✅
measurement_count: 315 ✅
projects_metadata: [2 projects with full data] ✅
last_heartbeat_at: 2025-01-07 15:35:00 (< 10 min) ✅
```

### UI Display
- **Clusters Table:** 🟢 Connected | healthy | LOCAL-0001 | Just now ✅
- **Cluster Details:**
  - Header: 🟢 Connected, Last seen: 2 minutes ago ✅
  - Storage: 1.4 MB ✅
  - Projects: Table with 2 projects ✅
  - Health: healthy ✅

---

## 📚 Related Documentation

1. **[LYCEUM_BACKEND_READY_FOR_ENHANCED_HEARTBEATS.md](LYCEUM_BACKEND_READY_FOR_ENHANCED_HEARTBEATS.md)**
   Complete overview of what's ready on Lyceum side

2. **[AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md](AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md)**
   Verify Authorization header is properly implemented

3. **[CLUSTER_HEALTH_AND_PROJECTS_IMPLEMENTATION.md](CLUSTER_HEALTH_AND_PROJECTS_IMPLEMENTATION.md)**
   Original implementation guide for health and projects feature

4. **[CENTCOM_HEARTBEAT_DIAGNOSTIC_QUESTIONS.md](CENTCOM_HEARTBEAT_DIAGNOSTIC_QUESTIONS.md)**
   Comprehensive diagnostic questions for troubleshooting

---

**Created:** January 7, 2025
**Last Updated:** January 7, 2025
**Status:** ✅ READY FOR TESTING
