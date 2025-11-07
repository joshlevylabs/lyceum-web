# Migration Safety Check Guide

Run this guide step-by-step to ensure safe migrations.

## Step 1: Run Diagnostic Check

**File:** `00_DIAGNOSTIC_CHECK_EXISTING_TABLES.sql`

Run this in Supabase SQL Editor and share the results. This will show:
1. All existing tables
2. `cluster_projects` table structure
3. Whether plugin tables exist
4. Whether test_data tables exist
5. Existing indexes
6. Existing functions

## Step 2: Analyze Results

### For cluster_projects Extension (Migration: 20250104_extend_cluster_projects.sql)

**Check if these columns exist in cluster_projects:**
- [ ] `metadata` (JSONB)
- [ ] `sync_status` (VARCHAR)
- [ ] `last_synced_at` (TIMESTAMPTZ)
- [ ] `sync_error` (TEXT)
- [ ] `project_type` (VARCHAR)

**Safe to run if:** Any of the above columns are missing.
**Skip if:** All columns already exist.

### For Plugins System (Migration: 20250104_plugins_store_system.sql)

**Check if these tables exist:**
- [ ] `plugins`
- [ ] `plugin_licenses`
- [ ] `plugin_purchases`
- [ ] `plugin_reviews`
- [ ] `user_payment_methods`

**Safe to run if:** NONE of the above tables exist.
**Skip if:** ANY of the above tables already exist.

### For Test Data System (Migration: 20250104_test_data_integration.sql)

**Check if these tables exist:**
- [ ] `test_data_measurements`
- [ ] `test_data_files`
- [ ] `test_data_exports`
- [ ] `test_data_templates`

**Safe to run if:** NONE of the above tables exist.
**Skip if:** ANY of the above tables already exist.

## Step 3: Decision Matrix

Based on diagnostic results, paste the output here and I'll tell you exactly which migrations to run.

### Example Response Format:

```
DIAGNOSTIC RESULTS:

1. Existing tables:
   - cluster_projects: EXISTS
   - plugins: DOES NOT EXIST
   - test_data_measurements: DOES NOT EXIST

2. cluster_projects columns:
   - id, cluster_id, owner_id, name, description, created_at, updated_at
   - (missing: metadata, sync_status, last_synced_at, sync_error, project_type)

3. Indexes on cluster_projects:
   - idx_cluster_projects_cluster_id
   - idx_cluster_projects_owner_id
```

## Safety Rules

✅ **SAFE Operations:**
- Adding columns with `IF NOT EXISTS` check
- Creating new tables that don't exist
- Creating indexes with `IF NOT EXISTS` check
- Creating functions with `OR REPLACE`

❌ **UNSAFE Operations:**
- Dropping existing columns
- Renaming existing tables
- Modifying existing constraints
- Dropping indexes without checking

## Quick Safety Checklist

Before running ANY migration:

1. ✅ Backup your database (Supabase has automatic backups, but verify)
2. ✅ Run in a transaction if possible
3. ✅ Test in development/staging first
4. ✅ Check for conflicting table/column names
5. ✅ Verify RLS policies won't break existing functionality

## Transaction Wrapper (Recommended)

Wrap migrations in a transaction for safety:

```sql
BEGIN;

-- Run migration SQL here

-- Check if everything looks good
SELECT * FROM [new_table] LIMIT 1;

-- If good:
COMMIT;

-- If something wrong:
-- ROLLBACK;
```

---

## Next Steps

1. Run the diagnostic check
2. Share the output with me
3. I'll provide exact migration commands to run safely
