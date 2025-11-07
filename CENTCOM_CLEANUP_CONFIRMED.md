# CentCom Cleanup - Confirmed Locations

## 🎯 Summary

LOCAL-0002 keeps reappearing because CentCom stores data in **two places**:

1. **Local SQLite database**: `C:\Users\joshual\AppData\Local\centcom\database.db`
2. **PostgreSQL database**: `localhost:5432/centcom_dev`

And it syncs to:

3. **Lyceum Supabase**: `kffiaqsihldgqdwagook.supabase.co`

---

## ✅ Verified Data Locations

```
✅ FOUND: C:\Users\joshual\AppData\Roaming\centcom
   - clickhouse/
   - plugins/
   - plugin_registry.json

✅ FOUND: C:\Users\joshual\AppData\Local\centcom
   - EBWebView/
   - database.db ⭐ (SQLite - contains cluster registrations)

✅ FOUND: C:\Users\joshual\AppData\Local\com.centcom.app
   - (Tauri app data)

✅ PostgreSQL running on localhost:5432 ⭐
```

---

## 🚀 Two Cleanup Options

### Option 1: Delete CentCom Data Folders (Easiest)

**Pros:**
- ✅ No database tools needed
- ✅ Guaranteed to remove all local data
- ✅ Simple one-command solution

**Cons:**
- ⚠️ Removes ALL CentCom settings (will need to re-login)
- ⚠️ Removes plugins and configurations

**Steps:**

1. **Close CentCom application completely**

2. **Run the cleanup script:**
   ```powershell
   cd C:\Users\joshual\Documents\Cursor\lyceum
   .\cleanup-centcom-complete.ps1
   ```

3. **Type `DELETE` when prompted** (case-sensitive)

4. **Script will delete:**
   - `C:\Users\joshual\AppData\Local\centcom` (database.db)
   - `C:\Users\joshual\AppData\Local\com.centcom.app`
   - `C:\Users\joshual\AppData\Roaming\centcom`
   - `C:\Users\joshual\AppData\Roaming\com.centcom.app`

5. **Verify Lyceum Supabase is clean:**
   - Go to: https://app.supabase.com/project/kffiaqsihldgqdwagook/editor
   - Table: `local_cluster_usage`
   - Ensure LOCAL-0002 is NOT there

6. **Restart CentCom**
   - Re-login if needed
   - Check Database Connections page
   - Should only show LOCAL-0011 ✅

---

### Option 2: Direct PostgreSQL Cleanup (Surgical)

**Pros:**
- ✅ Keeps CentCom settings intact
- ✅ Only removes the problematic cluster record
- ✅ Preserves plugins and configurations

**Cons:**
- ⚠️ Requires PostgreSQL tools (psql, pgAdmin, or DBeaver)
- ⚠️ More technical

**Steps:**

1. **Install PostgreSQL client** (if not already installed):
   - pgAdmin: https://www.pgadmin.org/download/
   - Or use psql command line

2. **Connect to CentCom database:**
   ```
   Host: localhost (127.0.0.1)
   Port: 5432
   Database: centcom_dev
   Username: joshual
   Password: postgres
   ```

3. **Run the SQL script:**
   ```powershell
   psql -U joshual -d centcom_dev -h localhost -p 5432 -f cleanup-postgresql-direct.sql
   ```

   Or manually in pgAdmin:
   ```sql
   -- View clusters
   SELECT cluster_key, machine_fingerprint
   FROM cluster_registrations;

   -- Delete LOCAL-0002
   DELETE FROM cluster_registrations
   WHERE cluster_key = 'LOCAL-0002';

   -- Verify
   SELECT * FROM cluster_registrations;
   ```

4. **Verify Lyceum Supabase is clean** (same as Option 1)

5. **Restart CentCom** (same as Option 1)

---

## 🧪 Verification Steps

After cleanup (either option):

### 1. Check CentCom
- Start CentCom application
- Go to **Database Connections** page
- **Expected:** Only shows LOCAL-0011
- **NOT:** Both LOCAL-0002 and LOCAL-0011

### 2. Check Lyceum Web App
- Navigate to: http://localhost:3594/clusters
- **Expected:** Only 1 local cluster
- **NOT:** 2 local clusters

### 3. Test Persistence
- Close CentCom completely
- Wait 5 seconds
- Start CentCom again
- Check Database Connections page
- **Expected:** Still only LOCAL-0011 (not recreated)

### 4. Check Logs
CentCom terminal should show:
```
✅ EXPECTED:
📋 Loaded cluster credentials: cluster_key=LOCAL-0011

❌ NOT:
📋 Loaded cluster credentials: cluster_key=LOCAL-0002
```

---

## 🎯 Recommended Approach

**For most users: Use Option 1** (Delete data folders)

Why?
- Fastest and simplest
- No database tools required
- Guaranteed to work
- CentCom will recreate settings on next login
- Takes only 2 minutes

**Use Option 2 if:**
- You have custom CentCom configurations you don't want to lose
- You're comfortable with database tools
- You want to preserve plugins and settings

---

## 📋 Files Reference

### Cleanup Scripts
- ✅ [cleanup-centcom-complete.ps1](cleanup-centcom-complete.ps1) - Deletes all CentCom folders (Option 1)
- ✅ [cleanup-postgresql-direct.sql](cleanup-postgresql-direct.sql) - SQL script for PostgreSQL (Option 2)
- ✅ [find-centcom-data.ps1](find-centcom-data.ps1) - Diagnostic script to find CentCom data

### Documentation
- 📄 [FINAL_SOLUTION.md](FINAL_SOLUTION.md) - Complete explanation of the problem
- 📄 [CENTCOM_CLEANUP_GUIDE.md](CENTCOM_CLEANUP_GUIDE.md) - Original cleanup guide
- 📄 [CENTCOM_CLEANUP_CONFIRMED.md](CENTCOM_CLEANUP_CONFIRMED.md) - This file (with verified locations)

---

## ⏰ Time Estimate

**Option 1 (Recommended):**
- Close CentCom: 10 seconds
- Run script: 30 seconds
- Verify Lyceum: 1 minute
- Restart and test: 2 minutes
- **Total: ~4 minutes**

**Option 2:**
- Install PostgreSQL client: 5-10 minutes (if not installed)
- Connect and run SQL: 2 minutes
- Verify and test: 3 minutes
- **Total: ~10-15 minutes**

---

## 🆘 Troubleshooting

### Issue: Script says "No CentCom directories found"
**Cause:** CentCom was already cleaned or uses different storage
**Solution:** Check if LOCAL-0002 still appears. If yes, use PostgreSQL cleanup (Option 2)

### Issue: PowerShell script won't run
**Cause:** Execution policy restriction
**Solution:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\cleanup-centcom-complete.ps1
```

### Issue: Can't connect to PostgreSQL
**Cause:** PostgreSQL not running or wrong credentials
**Solution:**
1. Check if PostgreSQL is running: `Test-NetConnection localhost -Port 5432`
2. Try connecting with pgAdmin using the credentials above
3. If it still fails, use Option 1 (delete folders) instead

### Issue: LOCAL-0002 still comes back after cleanup
**Cause:** You may have only cleaned one location, not both
**Solution:**
1. Run Option 1 script to delete ALL local data
2. Manually verify Lyceum Supabase (delete LOCAL-0002 from Table Editor)
3. Ensure PostgreSQL database is also cleaned
4. If all else fails, uninstall and reinstall CentCom

---

## ✅ Success Criteria

You'll know the fix worked when:
- ✅ CentCom Database Connections page shows ONLY LOCAL-0011
- ✅ Lyceum `/clusters` page shows ONLY 1 local cluster
- ✅ Restarting CentCom does NOT recreate LOCAL-0002
- ✅ No errors in CentCom logs about corrupted fingerprints
- ✅ Cluster heartbeats update existing cluster (not creating duplicates)

---

## 🎉 Next Step

**Run this command now:**

```powershell
cd C:\Users\joshual\Documents\Cursor\lyceum
.\cleanup-centcom-complete.ps1
```

Type `DELETE` when prompted, then follow the verification steps above.
