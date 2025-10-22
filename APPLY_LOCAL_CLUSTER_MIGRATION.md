# Apply Local Cluster Phase 1 Migration

**Date:** 2025-10-22
**Status:** Ready to deploy
**Priority:** HIGH - Required for Centcom local cluster integration

---

## Overview

This migration adds complete support for local cluster registration and heartbeat tracking. It enhances the existing `local_cluster_usage` table and creates supporting tables for history and analytics.

---

## What This Migration Does

### 1. Table Enhancements
- Adds 15 new columns to `local_cluster_usage` for registration data
- Creates `local_cluster_usage_history` for heartbeat time-series data
- Creates `local_cluster_usage_monthly` for long-term aggregation

### 2. Helper Functions
- `generate_cluster_key()` - Auto-generate LOCAL-#### keys
- `is_cluster_online()` - Check if cluster heartbeat is recent
- `get_user_total_local_usage()` - Aggregate usage across all user machines
- `decommission_stale_clusters()` - Auto-cleanup after 30 days offline

### 3. Performance Indexes
- 8 new indexes for fast queries on cluster_id, status, timestamps

### 4. Security
- RLS policies for history and monthly tables
- Grants for service_role

---

## Deployment Options

### Option 1: Supabase SQL Editor (Recommended)

**Steps:**
1. Open Supabase Dashboard: https://app.supabase.com
2. Navigate to your project: `lyceum` (kffiaqsihldgqdwagook)
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste contents from:
   ```
   supabase/migrations/20251022_enhance_local_clusters_phase1.sql
   ```
6. Click **Run** (green button)
7. Verify success messages in output

**Expected Output:**
```
✅ Local cluster Phase 1 migration complete!

Summary:
- Enhanced local_cluster_usage table with 15 new columns
- Created local_cluster_usage_history table
- Created local_cluster_usage_monthly table
- Added 6 helper functions
- Created 8 indexes for performance

Next steps:
1. Deploy registration endpoint: /api/centcom/clusters/local/register
2. Deploy heartbeat endpoint: /api/centcom/clusters/local/heartbeat
3. Test with Centcom desktop app
```

---

### Option 2: Supabase CLI

**Prerequisites:**
```bash
npm install -g supabase
```

**Steps:**
```bash
# Link to your project (if not already linked)
npx supabase link --project-ref kffiaqsihldgqdwagook

# Apply migration
npx supabase db push

# Or run specific migration file
npx supabase db execute --file supabase/migrations/20251022_enhance_local_clusters_phase1.sql
```

---

### Option 3: Manual SQL Execution

If you prefer to run SQL directly:

```bash
# Using psql (if you have database credentials)
psql postgresql://postgres:[PASSWORD]@db.kffiaqsihldgqdwagook.supabase.co:5432/postgres \
  -f supabase/migrations/20251022_enhance_local_clusters_phase1.sql
```

---

## Verification

After running the migration, verify it worked:

### Check 1: New Columns Exist
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'local_cluster_usage'
  AND column_name IN (
    'cluster_id', 'cluster_key', 'cluster_name',
    'installation_id', 'centcom_version'
  );
```

Expected: 5+ rows returned

### Check 2: History Table Created
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'local_cluster_usage_history';
```

Expected: `1`

### Check 3: Helper Functions Created
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'is_cluster_online',
  'get_user_total_local_usage',
  'decommission_stale_clusters'
);
```

Expected: 3 rows

---

## What Happens to Existing Data?

✅ **SAFE** - This migration is backwards compatible:
- Existing rows in `local_cluster_usage` will be preserved
- New columns have default values or allow NULL
- Existing RLS policies are maintained
- No data is deleted or modified

### Automatic Actions
1. Existing rows get auto-generated `cluster_id` (UUID)
2. Existing rows get auto-generated `cluster_key` (LOCAL-0001, LOCAL-0002, etc.)
3. All new columns default to NULL or sensible defaults

---

## Testing After Migration

### Test 1: Registration Endpoint
```bash
# Get access token first
TOKEN=$(curl -s -X POST https://lyceum-sable.vercel.app/api/centcom/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lyceum-analytics.com",
    "password": "YOUR_PASSWORD",
    "client_info": {"version": "1.0.0", "platform": "Windows"}
  }' | jq -r '.session.access_token')

# Test registration
curl -X POST https://lyceum-sable.vercel.app/api/centcom/clusters/local/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_fingerprint": "test-abc123",
    "license_key": "PLUGIN-ENT-2025-HQ21CIBF",
    "cluster_name": "Test Cluster",
    "centcom_version": "1.0.0",
    "system_info": {
      "os": "Windows",
      "os_version": "11",
      "architecture": "x64",
      "hostname": "TEST-PC",
      "cpu_cores": 8,
      "memory_gb": 16
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "cluster_id": "...",
  "cluster_key": "LOCAL-0001",
  "sync_token": "eyJhbGc...",
  "sync_interval_seconds": 600,
  "license": {
    "license_type": "enterprise",
    "max_storage_gb": 500,
    "max_monthly_queries": 10000000,
    "offline_grace_days": 30,
    "expires_at": null
  },
  "message": "Cluster registered successfully"
}
```

### Test 2: Heartbeat Endpoint
```bash
# Use sync_token from registration response
SYNC_TOKEN="<sync_token_from_registration>"

curl -X POST https://lyceum-sable.vercel.app/api/centcom/clusters/local/heartbeat \
  -H "Authorization: Bearer $SYNC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": {
      "is_running": true,
      "uptime_seconds": 3600,
      "version": "25.9.2"
    },
    "usage_metrics": {
      "storage_used_gb": 2.5,
      "storage_bytes": 2684354560,
      "queries_this_month": 1500,
      "project_count": 3,
      "measurement_count": 50000,
      "table_count": 12
    }
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "cluster_status": "healthy",
  "should_throttle": false,
  "warnings": [],
  "next_heartbeat_seconds": 600,
  "limits": {
    "storage_used_percentage": 0.5,
    "queries_used_percentage": 0.015
  }
}
```

### Test 3: Discovery Endpoint
```bash
# Use user access token
curl -X GET https://lyceum-sable.vercel.app/api/centcom/clusters/discover \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "clusters": [
    {
      "id": "...",
      "deployment_type": "cloud",
      "type": "managed",
      ...
    },
    {
      "id": "...",
      "deployment_type": "local",
      "type": "local",
      "status": "online",
      "usage": {...}
    }
  ],
  "total": 2,
  "breakdown": {
    "cloud": 1,
    "local": 1
  }
}
```

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS local_cluster_usage_history CASCADE;
DROP TABLE IF EXISTS local_cluster_usage_monthly CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS generate_cluster_key();
DROP FUNCTION IF EXISTS is_cluster_online(UUID);
DROP FUNCTION IF EXISTS get_user_total_local_usage(UUID);
DROP FUNCTION IF EXISTS decommission_stale_clusters();

-- Drop new columns (CAUTION: This removes data)
ALTER TABLE local_cluster_usage
DROP COLUMN IF EXISTS cluster_id,
DROP COLUMN IF EXISTS cluster_key,
DROP COLUMN IF EXISTS cluster_name,
DROP COLUMN IF EXISTS installation_id,
DROP COLUMN IF EXISTS centcom_version,
DROP COLUMN IF EXISTS uptime_seconds,
DROP COLUMN IF EXISTS project_count,
DROP COLUMN IF EXISTS measurement_count,
DROP COLUMN IF EXISTS table_count,
DROP COLUMN IF EXISTS storage_bytes,
DROP COLUMN IF EXISTS sync_token_hash,
DROP COLUMN IF EXISTS os_version,
DROP COLUMN IF EXISTS architecture,
DROP COLUMN IF EXISTS is_running,
DROP COLUMN IF EXISTS hostname;
```

⚠️ **Warning:** Rollback will delete all local cluster registration data!

---

## Support

If you encounter errors:

1. **Permission Errors:**
   - Make sure you're logged into Supabase as project owner
   - Check that service_role key is correct in `.env`

2. **Column Already Exists:**
   - This is OK! Migration uses `IF NOT EXISTS`
   - Migration is idempotent (safe to run multiple times)

3. **Foreign Key Errors:**
   - Check that `local_cluster_usage` table exists
   - Verify RLS is enabled on the table

4. **Function Errors:**
   - Make sure you have `plpgsql` extension enabled
   - Check PostgreSQL version (requires 12+)

---

## Next Steps After Migration

1. ✅ Deploy backend to production (Vercel)
2. ✅ Verify endpoints are accessible
3. ✅ Test with Centcom desktop app
4. 📝 Update Centcom team that Phase 1 backend is ready
5. 🎉 Integration testing with real Centcom instances

---

**Migration Status:** Ready to deploy
**Risk Level:** LOW (backwards compatible, idempotent)
**Estimated Time:** 2-3 minutes to execute

Deploy when ready!
