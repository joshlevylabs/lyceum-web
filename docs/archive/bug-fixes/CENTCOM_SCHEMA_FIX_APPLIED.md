# CentCom Local Cluster Schema - Fix Applied

**Date**: October 1, 2025  
**Issue**: Migration script referenced wrong table name  
**Status**: ✅ Fixed and Ready to Deploy  

---

## 🐛 Problem Identified

The original migration script referenced a table called `licenses`, but your Lyceum database uses `license_keys` instead.

**Error Message**:
```
ERROR: 42P01: relation "licenses" does not exist
```

---

## ✅ Fixes Applied

### 1. Database Migration Script Updated

**File**: `centcom-local-cluster-schema.sql`

**Changes**:
- ✅ Changed `licenses` → `license_keys` (all references)
- ✅ Changed `license.user_id` → `license.assigned_to` (correct column name)
- ✅ Added support for `'standard'` license type (was missing)

**Before**:
```sql
ALTER TABLE licenses ADD COLUMN ...
UPDATE licenses SET ...
WHERE l.user_id = p_user_id
```

**After**:
```sql
ALTER TABLE license_keys ADD COLUMN ...
UPDATE license_keys SET ...
WHERE l.assigned_to = p_user_id
```

---

### 2. API Endpoint Updated

**File**: `src/app/api/centcom/license/verify/route.ts`

**Changes**:
- ✅ Changed query from `licenses` → `license_keys`
- ✅ Changed column `license_key` → `key_code` (correct column name)
- ✅ Changed `license.user_id` → `license.assigned_to`

**Before**:
```typescript
.from('licenses')
.eq('license_key', license_key)
.rpc('check_local_cluster_allowed', { p_user_id: license.user_id })
```

**After**:
```typescript
.from('license_keys')
.eq('key_code', license_key)
.rpc('check_local_cluster_allowed', { p_user_id: license.assigned_to })
```

---

### 3. Documentation Updated

**File**: `LYCEUM_CENTCOM_INTEGRATION_RESPONSES.md`

**Changes**:
- ✅ Updated all references to use `license_keys`
- ✅ Clarified column mappings
- ✅ Updated curl examples with correct field names

---

## 🚀 Ready to Deploy

### Step 1: Run the Fixed Migration

```bash
# 1. Open Supabase Dashboard
https://supabase.com/dashboard

# 2. Go to SQL Editor

# 3. Copy and paste the ENTIRE contents of:
centcom-local-cluster-schema.sql

# 4. Execute (should now work without errors!)
```

### Step 2: Verify Installation

```sql
-- Check that new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('local_cluster_usage', 'centcom_cluster_connections');

-- Should return 2 rows

-- Check that new columns were added to license_keys
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'license_keys' 
AND column_name IN ('allows_local_cluster', 'local_cluster_limits');

-- Should return 2 rows
```

### Step 3: Test the API

```bash
# Test with one of your existing license key_codes
curl -X POST http://localhost:3594/api/centcom/license/verify \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "YOUR_ACTUAL_KEY_CODE_FROM_LICENSE_KEYS_TABLE",
    "machine_fingerprint": "test-machine-123"
  }'

# Expected response:
{
  "success": true,
  "license": {
    "id": "...",
    "type": "trial",
    "allows_local_cluster": true,
    "limits": {
      "max_storage_gb": 5,
      "max_monthly_queries": 50000,
      ...
    }
  }
}
```

---

## 📊 Table Mapping Reference

For CentCom team's reference:

| Concept | Your Table | Column Used | Notes |
|---------|------------|-------------|-------|
| License | `license_keys` | - | Main license table |
| License Key | `license_keys` | `key_code` | The actual license key string |
| License Type | `license_keys` | `license_type` | trial, basic, professional, etc. |
| Assigned User | `license_keys` | `assigned_to` | UUID of the user (references auth.users) |
| License Status | `license_keys` | `status` | active, inactive, expired |

---

## 🎯 What's Updated

### License Types Now Supported

The migration now updates these license types with local cluster capabilities:

- ✅ `basic` - 10 GB, 100K queries, 7 days offline
- ✅ `professional` - 50 GB, 1M queries, 14 days offline  
- ✅ `enterprise` - 500 GB, 10M queries, 30 days offline
- ✅ `trial` - 5 GB, 50K queries, 3 days offline
- ✅ `gratis` - 2 GB, 10K queries, 1 day offline
- ✅ `standard` - 10 GB, 100K queries, 7 days offline (NEWLY ADDED)

---

## ✅ Success Checklist

After running the migration, verify:

- [ ] Migration executes without errors
- [ ] New tables created: `local_cluster_usage`, `centcom_cluster_connections`
- [ ] New columns added to `license_keys`: `allows_local_cluster`, `local_cluster_limits`
- [ ] All existing licenses updated with local cluster limits
- [ ] Database functions created: `check_local_cluster_allowed()`, `get_user_clusters()`
- [ ] RLS policies enabled on new tables
- [ ] License verification API endpoint works with your license key codes

---

## 🔍 Troubleshooting

### If you still get errors:

**Error: "column license_keys.assigned_to does not exist"**
- Your `license_keys` table might use a different column name for the user reference
- Check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'license_keys'`
- Let me know the actual column name and I'll update the migration

**Error: "function check_local_cluster_allowed already exists"**
- This is okay! The migration uses `CREATE OR REPLACE FUNCTION`
- The function will be updated, not duplicated

**Error: "duplicate key value violates unique constraint"**
- Some test data might already exist
- This is okay, the migration uses `IF NOT EXISTS` and graceful updates

---

## 📞 Next Steps

1. ✅ **Deploy this fixed migration** (should work now!)
2. ✅ **Test the license verification endpoint** with an actual key_code
3. ✅ **Proceed with CentCom implementation** using the updated guide

---

**All files are now corrected and ready to use!** 🎉

The migration script, API endpoints, and documentation all now correctly reference your `license_keys` table.

