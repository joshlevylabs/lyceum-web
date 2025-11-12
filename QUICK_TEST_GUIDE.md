# Quick Test Guide: CentCom Heartbeat Integration

**Time to complete:** 5 minutes
**Purpose:** Verify Lyceum is receiving and displaying CentCom heartbeat data

---

## 🚀 Quick Test (5 Steps)

### Step 1: Apply Database Migration (30 seconds)

Open Supabase SQL Editor and run:

```sql
-- Quick check if migration is needed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'local_cluster_usage'
  AND column_name IN ('health_status', 'last_error', 'projects_metadata');
```

**If you see 3 rows:** ✅ Skip to Step 2

**If you see 0 rows:** Run this:
```sql
ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown';

ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE local_cluster_usage
ADD COLUMN IF NOT EXISTS projects_metadata JSONB;
```

---

### Step 2: Restart CentCom (1 minute)

```bash
# Stop if running (Ctrl+C)
# Then restart:
cd centcom
npm run tauri:dev
```

---

### Step 3: Wait for Heartbeat (1-2 minutes)

Watch the **Lyceum terminal** for these logs:

```
✅ Heartbeat received for cluster: xxx-xxx-xxx
📊 Health status: healthy
📁 Received 2 projects from cluster
✅ Cluster status updated: xxx-xxx-xxx
```

**✅ If you see these:** Great! Continue to Step 4

**❌ If you don't see logs after 2 minutes:**
```sql
-- Check when last heartbeat was received
SELECT cluster_key, last_heartbeat_at, NOW() - last_heartbeat_at as age
FROM local_cluster_usage
WHERE cluster_key LIKE 'LOCAL-%'
ORDER BY last_heartbeat_at DESC
LIMIT 1;
```

If `age > 15 minutes`, see [AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md](AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md)

---

### Step 4: Check Database (30 seconds)

Run in Supabase SQL Editor:

```sql
SELECT
  cluster_key,
  health_status,
  storage_bytes,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN jsonb_array_length(projects_metadata)
    ELSE 0
  END as projects_count,
  NOW() - last_heartbeat_at as heartbeat_age
FROM local_cluster_usage
WHERE cluster_key LIKE 'LOCAL-%'
ORDER BY last_heartbeat_at DESC
LIMIT 1;
```

**Expected results:**
```
cluster_key:     LOCAL-XXXX
health_status:   healthy       ← Should be "healthy" not "unknown"
storage_bytes:   1445195       ← Should have actual value
projects_count:  2             ← Should show number of projects
heartbeat_age:   00:02:00      ← Should be < 10 minutes
```

**✅ If results match:** Perfect! Continue to Step 5

**❌ If health_status is "unknown" or storage_bytes is 0:**
- Wait another 10 minutes for next heartbeat
- OR check [CENTCOM_HEARTBEAT_INTEGRATION_VERIFICATION.md](CENTCOM_HEARTBEAT_INTEGRATION_VERIFICATION.md) for troubleshooting

---

### Step 5: Check UI (1 minute)

Open in browser: `http://localhost:3000/clusters`

**Look for your local cluster:**

| What to Check | Expected | Actual |
|---------------|----------|--------|
| Connection badge | 🟢 **Connected** | ______ |
| Connection dot | Green pulsing dot | ______ |
| Health status | **healthy** | ______ |
| Status | **active** | ______ |

**Click on the cluster** to see details page:

| What to Check | Expected | Actual |
|---------------|----------|--------|
| Header badge | 🟢 **Connected** | ______ |
| Last seen | "X minutes ago" | ______ |
| Storage | "1.4 MB" (not "0 MB") | ______ |
| Projects table | Shows 2 projects | ______ |
| Projects measurements | 150 and 165 | ______ |

---

## ✅ Success Criteria

All of these should be true:

- [ ] Lyceum terminal shows heartbeat logs
- [ ] `health_status` = "healthy" in database
- [ ] `storage_bytes` has actual value (not 0)
- [ ] `projects_count` >= 0
- [ ] `heartbeat_age` < 10 minutes
- [ ] UI shows 🟢 "Connected" badge
- [ ] UI shows "healthy" status
- [ ] Projects table appears with data

---

## ❌ If Something's Wrong

### Issue: No heartbeat logs in Lyceum terminal

**Quick fix:**
1. Check CentCom terminal for "Sending heartbeat" logs
2. Verify Authorization header is present (see checklist below)

**Diagnostic query:**
```sql
SELECT cluster_key, last_heartbeat_at, NOW() - last_heartbeat_at as age
FROM local_cluster_usage
WHERE cluster_key LIKE 'LOCAL-%'
ORDER BY last_heartbeat_at DESC LIMIT 1;
```

If `age > 15 minutes`, see: [AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md](AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md)

---

### Issue: health_status is "unknown"

**Possible causes:**
1. **First heartbeat not sent yet** - Wait 10 minutes
2. **CentCom not sending health field** - Check CentCom payload
3. **Old data in database** - Wait for next heartbeat

**Quick fix:**
```sql
-- Force update to see if it's a display issue
UPDATE local_cluster_usage
SET health_status = 'healthy'
WHERE cluster_key = 'LOCAL-XXXX' AND is_running = true;
```

Then refresh UI. If it reverts to "unknown" after next heartbeat, CentCom isn't sending the health field.

---

### Issue: Projects table doesn't appear

**Quick check:**
```sql
SELECT
  cluster_key,
  projects_metadata IS NULL as is_null,
  CASE
    WHEN projects_metadata IS NOT NULL
    THEN projects_metadata::text
    ELSE 'NULL'
  END as projects_json
FROM local_cluster_usage
WHERE cluster_key LIKE 'LOCAL-%'
LIMIT 1;
```

**If `is_null = true`:**
- CentCom is not sending `projects` array in payload
- Verify CentCom has `get_clickhouse_projects()` function implemented
- Check CentCom logs for "Heartbeat payload includes: Projects: 2"

**If `is_null = false` but UI doesn't show:**
- Check browser console for errors
- Verify frontend TypeScript interface matches data structure

---

### Issue: Storage shows "0 MB"

**Quick check:**
```sql
SELECT cluster_key, storage_bytes, storage_used_gb
FROM local_cluster_usage
WHERE cluster_key LIKE 'LOCAL-%'
LIMIT 1;
```

**If both are 0 or NULL:**
- CentCom hasn't sent storage data yet
- Wait for next heartbeat

**If `storage_bytes` has value but UI shows 0:**
- Frontend might be reading wrong field
- Check cluster details page code

---

## 📋 Complete Verification Script

For a comprehensive check, run this in Supabase SQL Editor:

**File:** [supabase/VERIFY_CENTCOM_HEARTBEAT.sql](supabase/VERIFY_CENTCOM_HEARTBEAT.sql)

This script runs 10 verification checks and provides detailed results.

---

## 📚 Detailed Documentation

For comprehensive troubleshooting, see:

1. **[CENTCOM_HEARTBEAT_INTEGRATION_VERIFICATION.md](CENTCOM_HEARTBEAT_INTEGRATION_VERIFICATION.md)**
   Complete verification guide with all possible issues

2. **[LYCEUM_BACKEND_READY_FOR_ENHANCED_HEARTBEATS.md](LYCEUM_BACKEND_READY_FOR_ENHANCED_HEARTBEATS.md)**
   Overview of what's ready on Lyceum side

3. **[AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md](AUTHORIZATION_FIX_VERIFICATION_CHECKLIST.md)**
   Verify Authorization header is working

---

## 🎯 Expected Timeline

| Time | What Happens |
|------|--------------|
| 0:00 | Restart CentCom |
| 0:30 | CentCom starts, registers cluster |
| 1:00 | First heartbeat sent |
| 1:01 | Lyceum receives heartbeat, stores data |
| 1:02 | UI refreshes, shows "Connected" |
| 11:00 | Second heartbeat sent |
| 21:00 | Third heartbeat sent |

---

## ✅ You're Done When...

You see all of these:

**In Lyceum Terminal:**
```
✅ Heartbeat received for cluster: xxx-xxx-xxx
📊 Health status: healthy
📁 Received 2 projects from cluster
```

**In Database:**
```
health_status:   healthy
storage_bytes:   1445195
projects_count:  2
heartbeat_age:   00:02:00
```

**In UI:**
```
🟢 Connected | healthy | 1.4 MB storage | 2 projects
```

---

**Time to complete:** ~5 minutes
**Created:** January 7, 2025
**Status:** ✅ READY FOR TESTING
