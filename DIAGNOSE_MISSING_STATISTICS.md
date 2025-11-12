# Diagnosing Missing Statistics Display

**Problem:** CentCom is collecting statistics and sending heartbeats, but data isn't displaying correctly

**Date:** January 7, 2025

---

## 🔍 Two Separate Issues

### Issue 1: CentCom UI Not Showing Statistics

**What we see in logs:**
```
LocalClusterManager.ts:422 📊 Cluster statistics received: {
  project_count: 2,
  measurement_count: 315,
  table_count: 4,
  database_size_bytes: 1445195
}
```

**What's missing:** These statistics aren't appearing in CentCom's "Real-Time Statistics" UI

**This is a CentCom frontend issue** - data is collected but not rendered

---

### Issue 2: Lyceum Web UI Not Showing Health Status

**What we see in logs:**
```
ClusterRegistrationService.ts:240 ✅ Heartbeat sent successfully: {
  cluster_status: 'healthy'
}
```

**What's missing:** Health status not showing on Lyceum web app

**This is a Lyceum issue** - need to verify data is being received and stored

---

## 📋 Diagnostic Steps

### Part A: Check Lyceum Backend (Web App)

#### Step 1: Verify Lyceum is Receiving Heartbeats

**Check Lyceum terminal** (where `npm run dev` is running) for logs:

```
✅ Heartbeat received for cluster: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
📊 Health status: healthy
📁 Received 2 projects from cluster
✅ Cluster status updated: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
```

**✅ If you see these logs:** Lyceum is receiving heartbeats, continue to Step 2

**❌ If you DON'T see these logs:** Heartbeats aren't reaching Lyceum
- Check if Lyceum dev server is running
- Check CentCom is sending to correct URL
- Check for CORS errors in browser console

---

#### Step 2: Check Database Has Data

Run this in Supabase SQL Editor:

```sql
SELECT
  cluster_key,
  health_status,
  cluster_status,
  is_running,
  storage_bytes,
  project_count,
  measurement_count,
  table_count,
  last_heartbeat_at,
  NOW() - last_heartbeat_at as heartbeat_age,
  projects_metadata IS NOT NULL as has_projects,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_count
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001'
ORDER BY last_heartbeat_at DESC
LIMIT 1;
```

**Expected results:**
```
cluster_key:      LOCAL-0001
health_status:    healthy          ← Should be "healthy"
cluster_status:   online           ← Should be "online"
is_running:       true             ← Should be true
storage_bytes:    1445195          ← Should have value
project_count:    2                ← Should be 2
measurement_count: 315             ← Should be 315
table_count:      4                ← Should be 4
heartbeat_age:    00:02:00         ← Should be < 10 minutes
has_projects:     true             ← Should be true
projects_count:   2                ← Should be 2
```

**✅ If data matches:** Data is stored correctly, issue is in frontend display

**❌ If data is wrong/missing:** Heartbeat endpoint isn't storing data correctly
- health_status = 'unknown' → CentCom not sending health field
- storage_bytes = 0 or NULL → CentCom not sending storage_bytes
- projects_count = 0 → CentCom not sending projects array

---

#### Step 3: Check Frontend API Returns Data

**Option A: Check browser Network tab**

1. Open Lyceum web app in browser
2. Open DevTools (F12)
3. Go to Network tab
4. Navigate to clusters page
5. Look for API call to `/api/clusters` or `/api/clusters/by-key/LOCAL-0001`
6. Check response body for:
   - `health_status`: Should be "healthy"
   - `is_connected`: Should be true
   - `projects_metadata`: Should be array with 2 projects
   - `storage_bytes`: Should be 1445195

**✅ If API returns correct data:** Issue is in frontend rendering

**❌ If API returns wrong data:** Issue is in API transformation

---

#### Step 4: Check Frontend Component Rendering

**For clusters table:** [src/app/clusters/page.tsx](src/app/clusters/page.tsx)

**For cluster details:** [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx)

Check browser console for errors:
- React rendering errors
- JSON parse errors
- TypeScript type mismatches

---

### Part B: Check CentCom UI (Desktop App)

**This is a CentCom issue, not a Lyceum issue.**

The statistics are being collected:
```
📊 Cluster statistics received: {
  project_count: 2,
  measurement_count: 315,
  table_count: 4,
  database_size_bytes: 1445195
}
```

But not displaying in the UI.

**Possible causes:**

1. **UI component not subscribed to statistics updates**
   - LocalClusterManager emits statistics
   - But UI component doesn't listen for the event

2. **State not being updated**
   - Statistics are received but state variable isn't updated
   - React/UI framework doesn't re-render

3. **Wrong component is rendering**
   - "Real-Time Statistics" component might be looking at wrong data source

**How to fix (CentCom team needs to):**

1. Find the component that displays "Real-Time Statistics"
2. Verify it's subscribed to LocalClusterManager events
3. Verify state is updated when statistics are received
4. Add logging to confirm UI component receives the data

---

## 🎯 Quick Diagnostic Commands

### For Lyceum (Run in Supabase SQL Editor)

```sql
-- Quick check
SELECT
  cluster_key,
  health_status,
  storage_bytes,
  project_count,
  measurement_count,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_count,
  NOW() - last_heartbeat_at as age
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001';
```

**Expected:**
- `health_status` = "healthy"
- `storage_bytes` = 1445195
- `project_count` = 2
- `measurement_count` = 315
- `projects_count` = 2
- `age` < 10 minutes

---

### For CentCom (Check console logs)

**Look for:**
```
LocalClusterManager.ts:422 📊 Cluster statistics received
```

**If you see this,** data is being collected. Issue is in UI rendering.

---

## 🔧 Solutions

### Solution 1: Lyceum Health Status Not Showing

**If database has correct data but UI doesn't show it:**

Check these files:
- [src/app/clusters/page.tsx](src/app/clusters/page.tsx) - Clusters table
- [src/app/clusters/[clusterKey]/page.tsx](src/app/clusters/[clusterKey]/page.tsx) - Cluster details

Verify:
1. Component is fetching data from API
2. API response includes `health_status` field
3. Component is rendering health status value

**Quick fix:**

Add console logging to see what data the component receives:

```typescript
useEffect(() => {
  console.log('🔍 Cluster data:', cluster)
  console.log('🔍 Health status:', cluster.health_status)
  console.log('🔍 Is connected:', cluster.is_connected)
}, [cluster])
```

---

### Solution 2: CentCom Statistics Not Displaying

**This requires CentCom code changes.**

The statistics are being collected but not rendered in the UI.

**CentCom team needs to:**

1. Find the component that renders "Real-Time Statistics"
2. Verify it's listening to LocalClusterManager events:
   ```typescript
   localClusterManager.on('statistics-updated', (stats) => {
     setStatistics(stats)
   })
   ```
3. Verify state is updated when event fires
4. Add logging to confirm UI receives the data

---

## 📊 Expected Results When Working

### Lyceum Web App - Clusters Page

| Element | Expected Value |
|---------|---------------|
| Connection badge | 🟢 Connected |
| Health status | healthy |
| Status | active |
| Last heartbeat | < 10 minutes ago |
| Projects | 2 (if details page) |

### CentCom Desktop App - Settings/Database

**Real-Time Statistics section should show:**

| Metric | Expected Value |
|--------|---------------|
| Test Data Projects | 2 |
| Measurements | 315 |
| Database Tables | 4 |
| Current Size | 1.4 MB |
| Queries (This Month) | 0 |

---

## 🔍 Next Steps

### For Lyceum Issue:

1. Run the SQL query to check database has data
2. Check Lyceum terminal for heartbeat logs
3. Check browser Network tab for API responses
4. Check browser console for React errors
5. Report findings

### For CentCom Issue:

**This is a CentCom frontend bug** - data is collected but not displayed.

The CentCom team needs to:
1. Find the UI component
2. Verify event subscription
3. Add logging to debug
4. Fix state update issue

---

**Created:** January 7, 2025
**Status:** 🔍 DIAGNOSIS IN PROGRESS
