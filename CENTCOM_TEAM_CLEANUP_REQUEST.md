# Request: Remove Duplicate Cluster LOCAL-0002 from CentCom Database

## 📋 Issue Summary

**Problem:** A duplicate cluster record `LOCAL-0002` exists in CentCom's local database with a corrupted `machine_fingerprint` value (`'[object '`). This duplicate keeps re-registering with Lyceum even after being deleted from the Lyceum Supabase database.

**Root Cause:** An older version of CentCom created a corrupted cluster record that persists in the local database. The current CentCom code is correct, but the legacy data needs cleanup.

**Request:** Please help remove `LOCAL-0002` from the CentCom local database using SQL, preserving all other data and settings.

---

## 🎯 Goal

- ✅ Delete only `LOCAL-0002` cluster record
- ✅ Keep `LOCAL-0011` (valid cluster with correct fingerprint)
- ✅ Preserve all CentCom settings, configurations, and plugins
- ✅ Avoid reinstalling or losing user data

---

## 🔍 Current State

### Cluster Information

**Valid Cluster (Keep):**
- `cluster_key`: `LOCAL-0011`
- `machine_fingerprint`: `6bb0d83e` (valid 8+ character hash)
- Status: ✅ Working correctly

**Corrupted Cluster (Delete):**
- `cluster_key`: `LOCAL-0002`
- `machine_fingerprint`: `[object ` (corrupted - serialization bug from old version)
- Status: ❌ Causing duplicates in Lyceum

### Database Locations

CentCom stores cluster data in two places:

1. **PostgreSQL**: `postgresql://localhost:5432/centcom_dev`
   - User: `joshual`
   - Password: `postgres`
   - Table: `cluster_registrations`

2. **SQLite**: `C:\Users\joshual\AppData\Local\centcom\database.db`
   - Table: Likely `cluster_registrations` or `clusters`

---

## 🛠️ Cleanup Instructions

### Prerequisites

**Before starting:**
1. ⚠️ **Close CentCom application** (to avoid database locks)
2. ✅ **Backup databases** (optional but recommended)

**Backup commands:**
```powershell
# Backup PostgreSQL
pg_dump -U joshual -h localhost -p 5432 centcom_dev > centcom_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Backup SQLite
Copy-Item "C:\Users\joshual\AppData\Local\centcom\database.db" "C:\Users\joshual\AppData\Local\centcom\database_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
```

---

### Step 1: Clean PostgreSQL Database

#### Option A: Using pgAdmin

1. **Open pgAdmin**
2. **Connect to CentCom database:**
   - Host: `localhost` (or `127.0.0.1`)
   - Port: `5432`
   - Database: `centcom_dev`
   - Username: `joshual`
   - Password: `postgres`

3. **Open Query Tool** (Tools → Query Tool)

4. **View current clusters:**
   ```sql
   SELECT
     cluster_key,
     machine_fingerprint,
     cluster_name,
     registered_at
   FROM cluster_registrations
   ORDER BY registered_at DESC;
   ```

   **Expected output:**
   ```
   cluster_key | machine_fingerprint | cluster_name | registered_at
   ------------|---------------------|--------------|-------------------
   LOCAL-0011  | 6bb0d83e...         | ...          | 2025-01-06 ...
   LOCAL-0002  | [object             | ...          | 2025-01-05 ...
   ```

5. **Identify corrupted entry:**
   ```sql
   SELECT
     cluster_key,
     machine_fingerprint,
     CASE
       WHEN machine_fingerprint LIKE '[object%' THEN '❌ CORRUPTED - DELETE THIS'
       WHEN LENGTH(machine_fingerprint) < 8 THEN '❌ TOO SHORT'
       ELSE '✅ VALID - KEEP THIS'
     END as status
   FROM cluster_registrations;
   ```

6. **Delete LOCAL-0002:**
   ```sql
   DELETE FROM cluster_registrations
   WHERE cluster_key = 'LOCAL-0002';
   ```

   **Expected result:** `DELETE 1` (one row deleted)

7. **Verify deletion:**
   ```sql
   SELECT * FROM cluster_registrations;
   ```

   **Expected:** Only `LOCAL-0011` remains

#### Option B: Using psql Command Line

```bash
# Connect to database
psql -U joshual -d centcom_dev -h localhost -p 5432

# View clusters
SELECT cluster_key, machine_fingerprint FROM cluster_registrations;

# Delete LOCAL-0002
DELETE FROM cluster_registrations WHERE cluster_key = 'LOCAL-0002';

# Verify
SELECT * FROM cluster_registrations;

# Exit
\q
```

---

### Step 2: Clean SQLite Database

#### Option A: Using DB Browser for SQLite (GUI)

1. **Download DB Browser for SQLite:**
   - https://sqlitebrowser.org/dl/
   - Free, open-source SQLite GUI tool

2. **Open the database file:**
   - File → Open Database
   - Navigate to: `C:\Users\joshual\AppData\Local\centcom\database.db`
   - (Note: AppData is a hidden folder - enable "Show hidden files" in Windows Explorer)

3. **Find the clusters table:**
   - Click "Browse Data" tab
   - Table dropdown: Look for tables like:
     - `cluster_registrations`
     - `clusters`
     - `registered_clusters`
     - Or similar

4. **View cluster records:**
   - Look for rows with `cluster_key` = `LOCAL-0002`
   - Check `machine_fingerprint` column (should show `[object ` or `[object Object]`)

5. **Delete LOCAL-0002:**
   - Select the row where `cluster_key = 'LOCAL-0002'`
   - Click **Delete Record** button
   - Click **Write Changes** to save

6. **Verify:**
   - Refresh the table view
   - Confirm only `LOCAL-0011` remains

#### Option B: Using sqlite3 Command Line

```bash
# Open database
sqlite3 "C:\Users\joshual\AppData\Local\centcom\database.db"

# List tables
.tables

# View clusters (adjust table name if needed)
SELECT cluster_key, machine_fingerprint FROM cluster_registrations;

# Delete LOCAL-0002
DELETE FROM cluster_registrations WHERE cluster_key = 'LOCAL-0002';

# Verify
SELECT * FROM cluster_registrations;

# Exit
.quit
```

---

### Step 3: Verify Lyceum Database is Also Clean

While we're cleaning CentCom's database, we should also ensure Lyceum's database doesn't have the duplicate:

1. **Open Supabase Dashboard:**
   - https://app.supabase.com/project/kffiaqsihldgqdwagook/editor

2. **Navigate to Table Editor:**
   - Click "Table Editor" in left sidebar
   - Select table: `local_cluster_usage`

3. **Find and delete LOCAL-0002:**
   - Look for row where `cluster_key = 'LOCAL-0002'`
   - Click the row → Click "Delete" button
   - Confirm deletion

4. **Verify:**
   - Only `LOCAL-0011` should remain in the table

---

## 🧪 Testing After Cleanup

### Test 1: Start CentCom

1. Open CentCom application
2. Login if prompted
3. Navigate to **Database Connections** page
4. **Expected result:** Only `LOCAL-0011` is listed

### Test 2: Check Lyceum Web App

1. Open browser: http://localhost:3594/clusters
2. **Expected result:** Only 1 local cluster visible

### Test 3: Restart Test (Critical!)

1. Close CentCom completely
2. Wait 10 seconds
3. Start CentCom again
4. Check Database Connections page
5. **Expected result:** Still only `LOCAL-0011` (LOCAL-0002 does NOT reappear)

### Test 4: Check Logs

CentCom terminal should show:

✅ **Expected log:**
```
📋 Loaded cluster credentials: cluster_key=LOCAL-0011
```

❌ **Should NOT see:**
```
📋 Loaded cluster credentials: cluster_key=LOCAL-0002
```

---

## 🔍 Verification Checklist

After completing cleanup:

- [ ] PostgreSQL `cluster_registrations` table has only LOCAL-0011
- [ ] SQLite `database.db` has only LOCAL-0011
- [ ] Lyceum Supabase `local_cluster_usage` table has only LOCAL-0011
- [ ] CentCom Database Connections page shows only LOCAL-0011
- [ ] Lyceum `/clusters` page shows only 1 local cluster
- [ ] Restarting CentCom does NOT recreate LOCAL-0002
- [ ] No errors in CentCom logs about corrupted fingerprints

---

## 📊 SQL Scripts Reference

### Complete PostgreSQL Cleanup Script

```sql
-- ============================================
-- CentCom PostgreSQL Cleanup
-- Database: centcom_dev
-- ============================================

-- Step 1: View all clusters
SELECT
  cluster_key,
  machine_fingerprint,
  cluster_name,
  registered_at
FROM cluster_registrations
ORDER BY registered_at DESC;

-- Step 2: Identify corrupted clusters
SELECT
  cluster_key,
  machine_fingerprint,
  CASE
    WHEN machine_fingerprint LIKE '[object%' THEN '❌ CORRUPTED'
    WHEN LENGTH(machine_fingerprint) < 8 THEN '❌ TOO SHORT'
    ELSE '✅ VALID'
  END as status
FROM cluster_registrations;

-- Step 3: Delete LOCAL-0002
DELETE FROM cluster_registrations
WHERE cluster_key = 'LOCAL-0002';

-- Step 4: Verify only LOCAL-0011 remains
SELECT * FROM cluster_registrations;

-- Expected: 1 row (LOCAL-0011 with valid fingerprint)
```

### Complete SQLite Cleanup Script

```sql
-- ============================================
-- CentCom SQLite Cleanup
-- File: C:\Users\joshual\AppData\Local\centcom\database.db
-- ============================================

-- Step 1: View all clusters
SELECT
  cluster_key,
  machine_fingerprint
FROM cluster_registrations;

-- Step 2: Delete LOCAL-0002
DELETE FROM cluster_registrations
WHERE cluster_key = 'LOCAL-0002';

-- Step 3: Verify
SELECT * FROM cluster_registrations;

-- Expected: 1 row (LOCAL-0011)
```

---

## ⚠️ Important Notes

### If Tables Don't Exist

If `cluster_registrations` table doesn't exist, try:

```sql
-- List all tables
SELECT name FROM sqlite_master WHERE type='table';

-- Or in PostgreSQL:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

Look for tables with names containing:
- `cluster`
- `registration`
- `credentials`

Then adjust the DELETE query to use the correct table name.

### If Deletion Fails

**Error: "database is locked"**
- ✅ Close CentCom application completely
- ✅ Wait 10 seconds for file handles to release
- ✅ Try again

**Error: "table does not exist"**
- ✅ Use `.tables` (SQLite) or `\dt` (PostgreSQL) to list all tables
- ✅ Find the correct table name
- ✅ Adjust the DELETE query

**Error: "permission denied"**
- ✅ Run DB tool as Administrator
- ✅ Check file permissions on database.db

---

## 🆘 Alternative: If SQL Cleanup Doesn't Work

If you encounter issues with SQL cleanup or can't locate the SQLite tables, we can fall back to the "nuclear option":

**Delete CentCom data folders:**
```powershell
# Close CentCom first!
Remove-Item -Path "$env:LOCALAPPDATA\centcom" -Recurse -Force
Remove-Item -Path "$env:LOCALAPPDATA\com.centcom.app" -Recurse -Force
Remove-Item -Path "$env:APPDATA\centcom" -Recurse -Force
Remove-Item -Path "$env:APPDATA\com.centcom.app" -Recurse -Force
```

**Tradeoff:**
- ✅ Guaranteed to work
- ✅ Simple one-command solution
- ⚠️ Requires re-login to CentCom
- ⚠️ Loses custom settings (if any)

---

## 📞 Support Information

**Issue Context:**
- User: Joshua (user_id: `2c3d4747-8d67-45af-90f5-b5e9058ec246`)
- Lyceum project: `kffiaqsihldgqdwagook`
- Valid cluster: `LOCAL-0011` with fingerprint `6bb0d83e`
- Corrupted cluster: `LOCAL-0002` with fingerprint `[object `

**Related Files:**
- Backend validation: `src/app/api/centcom/clusters/local/register/route.ts` (lines 69-81)
- Current code is correct - this is purely legacy data cleanup

**Timeline:**
- Issue discovered: 2025-01-06
- Root cause: Old CentCom version created corrupted fingerprint
- Current CentCom version: ✅ Fixed (no longer creates corrupted data)
- Backend validation: ✅ Added (rejects corrupted fingerprints)

---

## ✅ Success Criteria

The cleanup is successful when:

1. **PostgreSQL database** contains only LOCAL-0011
2. **SQLite database** contains only LOCAL-0011
3. **Lyceum Supabase** contains only LOCAL-0011
4. **CentCom UI** shows only 1 cluster in Database Connections
5. **Lyceum Web App** shows only 1 local cluster
6. **Restart test passes** - LOCAL-0002 does NOT reappear

---

## 🙏 Thank You!

Thank you for helping with this cleanup! The surgical SQL approach preserves all CentCom settings and configurations while removing only the problematic duplicate cluster.

If you have any questions or encounter issues during cleanup, please let me know and I can provide additional guidance.

**Estimated time:** 5-10 minutes (depending on database tool setup)

---

## 📎 Attachments

Related documentation:
- [cleanup-postgresql-direct.sql](cleanup-postgresql-direct.sql) - Ready-to-run SQL script
- [CENTCOM_CLEANUP_CONFIRMED.md](CENTCOM_CLEANUP_CONFIRMED.md) - Technical details of data locations
- [FINAL_SOLUTION.md](FINAL_SOLUTION.md) - Complete problem explanation
