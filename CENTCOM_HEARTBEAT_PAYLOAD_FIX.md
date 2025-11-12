# CentCom Heartbeat Payload Fix Required

**Problem:** CentCom is collecting statistics but NOT sending them in heartbeat payload

**Date:** January 7, 2025

---

## 🔍 Diagnosis Results

### What We Found in Lyceum Database:

✅ **Working (being sent by CentCom):**
- `storage_bytes`: 1445195 ✅
- `project_count`: 2 ✅
- `measurement_count`: 315 ✅
- `table_count`: 4 ✅
- `cluster_status`: "online" ✅

❌ **NOT Working (NOT being sent by CentCom):**
- `health_status`: "unknown" (should be "healthy") ❌
- `projects_metadata`: NULL (should be array of 2 projects) ❌

### What This Means:

CentCom logs show statistics are being collected:
```
LocalClusterManager.ts:422 📊 Cluster statistics received: {
  project_count: 2,
  measurement_count: 315,
  table_count: 4,
  database_size_bytes: 1445195
}
```

But these fields are **NOT being included in the heartbeat payload** sent to Lyceum.

---

## 🎯 Root Cause

The heartbeat payload sent by CentCom is **missing two critical fields:**

1. **`status.health`** - Health status field
2. **`projects`** - Projects metadata array

---

## 🔧 Required Fix

### Current Payload (What CentCom is sending)

```typescript
// Current heartbeat payload
{
  "cluster_id": "6d8f3c6e-789f-4871-80f9-e03f54e2f73f",
  "status": {
    "is_running": true,
    "uptime_seconds": 58,
    "version": "25.9.2.1"
    // ❌ Missing: health
    // ❌ Missing: last_error
  },
  "usage_metrics": {
    "storage_bytes": 1445195,
    "storage_used_gb": 0.00138,
    "project_count": 2,
    "measurement_count": 315,
    "table_count": 4,
    "queries_this_month": 0
  }
  // ❌ Missing: projects array
}
```

### Required Payload (What needs to be sent)

```typescript
// Required heartbeat payload
{
  "cluster_id": "6d8f3c6e-789f-4871-80f9-e03f54e2f73f",
  "status": {
    "is_running": true,
    "uptime_seconds": 58,
    "version": "25.9.2.1",
    "health": "healthy",           // ✅ ADD THIS!
    "last_error": null             // ✅ ADD THIS!
  },
  "usage_metrics": {
    "storage_bytes": 1445195,
    "storage_used_gb": 0.00138,
    "project_count": 2,
    "measurement_count": 315,
    "table_count": 4,
    "queries_this_month": 0
  },
  "projects": [                    // ✅ ADD THIS!
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

---

## 📋 What CentCom Team Needs to Do

### Step 1: Find Heartbeat Send Function

**File to check:** `src/services/ClusterRegistrationService.ts` or similar

Look for the function that sends heartbeat to Lyceum. It probably looks like:

```typescript
async sendHeartbeat() {
  const payload = {
    cluster_id: this.clusterId,
    status: {
      is_running: true,
      uptime_seconds: this.uptimeSeconds,
      version: this.version
      // ❌ Missing health and last_error
    },
    usage_metrics: {
      // ... metrics
    }
    // ❌ Missing projects array
  }

  await fetch(heartbeatEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${syncToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}
```

---

### Step 2: Add Health Status to Payload

**Add this to `status` object:**

```typescript
status: {
  is_running: true,
  uptime_seconds: this.uptimeSeconds,
  version: this.version,
  health: this.isRunning ? 'healthy' : 'offline',  // ✅ ADD THIS
  last_error: this.lastError || null                // ✅ ADD THIS
}
```

**Health calculation logic:**
```typescript
const health = this.clickhouseRunning ? 'healthy' : 'offline'
// OR
const health: 'healthy' | 'degraded' | 'offline' =
  this.clickhouseRunning && !this.hasErrors ? 'healthy' :
  this.clickhouseRunning && this.hasErrors ? 'degraded' :
  'offline'
```

---

### Step 3: Add Projects Array to Payload

**Get projects data from LocalClusterManager:**

```typescript
// Get projects data (this is already being collected based on logs)
const statistics = await this.localClusterManager.getStatistics()
const projects = await this.localClusterManager.getProjects()

// Add to payload
const payload = {
  cluster_id: this.clusterId,
  status: { /* ... with health */ },
  usage_metrics: { /* ... */ },
  projects: projects,  // ✅ ADD THIS
  last_sync_at: new Date().toISOString()
}
```

**Projects structure** (already being collected, just needs to be included):

```typescript
interface ProjectMetadata {
  project_id: string
  project_name: string
  created_at: string
  last_updated_at: string
  measurement_count: number
  table_names: string[]
}
```

---

### Step 4: Verify Payload Before Sending

**Add logging to see what's being sent:**

```typescript
console.log('📊 Heartbeat payload:', JSON.stringify(payload, null, 2))

// Should see:
// {
//   "status": {
//     "health": "healthy"  ← Should be here!
//   },
//   "projects": [...]      ← Should be here!
// }
```

---

### Step 5: Test and Verify

After making changes:

1. **Restart CentCom**
2. **Wait for next heartbeat** (within 10 minutes)
3. **Check CentCom logs** for payload with health and projects
4. **Check Lyceum terminal** for these logs:
   ```
   ✅ Heartbeat received for cluster: xxx-xxx-xxx
   📊 Health status: healthy          ← Should appear!
   📁 Received 2 projects from cluster ← Should appear!
   ```
5. **Run SQL query** to verify data is stored:
   ```sql
   SELECT health_status,
          jsonb_array_length(projects_metadata) as projects_count
   FROM local_cluster_usage
   WHERE cluster_key = 'LOCAL-0001';
   ```
   - `health_status` should be "healthy"
   - `projects_count` should be 2

---

## 🔍 Code Examples

### Example: Complete Heartbeat Function

```typescript
async sendHeartbeat() {
  try {
    // Get current statistics
    const stats = await this.localClusterManager.getStatistics()
    const projects = await this.localClusterManager.getProjects()
    const credentials = await this.getClusterCredentials()

    // Determine health
    const health = stats.is_running && !stats.last_error ? 'healthy' : 'offline'

    // Build payload
    const payload = {
      cluster_id: credentials.cluster_id,
      status: {
        is_running: stats.is_running,
        uptime_seconds: stats.uptime_seconds,
        version: stats.clickhouse_version,
        health: health,                      // ✅ ADDED
        last_error: stats.last_error || null // ✅ ADDED
      },
      usage_metrics: {
        storage_bytes: stats.storage_bytes,
        storage_used_gb: stats.storage_used_gb,
        project_count: stats.project_count,
        measurement_count: stats.measurement_count,
        table_count: stats.table_count,
        queries_this_month: stats.queries_this_month
      },
      projects: projects,                    // ✅ ADDED
      last_sync_at: new Date().toISOString()
    }

    console.log('📊 Sending heartbeat with payload:', {
      health: payload.status.health,
      projects_count: payload.projects?.length || 0
    })

    // Send to Lyceum
    const response = await fetch(this.heartbeatEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.sync_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    console.log('✅ Heartbeat sent successfully:', result)

  } catch (error) {
    console.error('❌ Heartbeat failed:', error)
  }
}
```

---

## 📊 Expected Logs After Fix

### CentCom Terminal:
```
📊 Cluster statistics received: {
  project_count: 2,
  measurement_count: 315,
  table_count: 4,
  database_size_bytes: 1445195
}
📊 Sending heartbeat with payload: {
  health: "healthy",
  projects_count: 2
}
✅ Heartbeat sent successfully: {
  cluster_status: "healthy",
  should_throttle: false
}
```

### Lyceum Terminal:
```
✅ Heartbeat received for cluster: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
📊 Health status: healthy             ← NEW! Should appear
📁 Received 2 projects from cluster   ← NEW! Should appear
✅ Cluster status updated: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
```

### Database:
```sql
health_status: "healthy"    ✅ Changed from "unknown"
projects_count: 2           ✅ Changed from 0
```

### Lyceum UI:
- Health status: **healthy** ✅
- Projects table: **2 projects displayed** ✅

---

## ✅ Verification Checklist

After applying the fix, verify:

- [ ] CentCom logs show "Sending heartbeat with payload" including health and projects
- [ ] Lyceum terminal shows "📊 Health status: healthy"
- [ ] Lyceum terminal shows "📁 Received 2 projects from cluster"
- [ ] Database query shows `health_status = 'healthy'`
- [ ] Database query shows `projects_count = 2`
- [ ] Lyceum UI displays health status correctly
- [ ] Lyceum UI shows projects table

---

## 🎯 Summary

**Current Issue:**
- CentCom collects statistics ✅
- But doesn't include them in heartbeat payload ❌

**Required Fix:**
1. Add `status.health` field to heartbeat payload
2. Add `projects` array to heartbeat payload

**Files to modify:**
- `ClusterRegistrationService.ts` (or wherever heartbeat is sent)
- Add health calculation
- Include projects array from LocalClusterManager

**Expected Result:**
- Lyceum will receive health and projects data
- Database will store health_status and projects_metadata
- UI will display health status and projects table correctly

---

**Created:** January 7, 2025
**Status:** 🔧 FIX REQUIRED IN CENTCOM
**Priority:** HIGH - Required for health monitoring and projects display
