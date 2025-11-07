# CentCom Database Cleanup Guide

## 🔍 Root Cause Discovered

**The problem:** CentCom has **TWO databases**:
1. **CentCom's Local PostgreSQL** (`centcom_dev`) - stores cluster credentials locally
2. **Lyceum's Supabase** - stores cluster data for the web app

When you delete a cluster from Lyceum, it **comes back** because CentCom still has it in its local database and re-registers it on startup!

---

## 🎯 Solution: Clean Up Both Databases

You've already cleaned Lyceum (Step 1 ✅), now you need to clean CentCom's local database (Step 2).

---

## Step 1: ✅ Already Done - Lyceum Cleanup

You deleted LOCAL-0002 from Lyceum's Supabase database using Table Editor.

---

## Step 2: 🔨 CentCom PostgreSQL Cleanup

### Option A: Using pgAdmin (Easiest with GUI)

1. **Open pgAdmin** (if installed)
   - Connection details from logs:
     ```
     Host: 127.0.0.1
     Port: 5432
     Database: centcom_dev
     Username: joshual
     Password: postgres
     ```

2. **Connect to `centcom_dev` database**

3. **Open Query Tool**

4. **Run this query to see clusters:**
   ```sql
   SELECT
     cluster_key,
     machine_fingerprint,
     cluster_name
   FROM cluster_registrations
   ORDER BY cluster_key;
   ```

5. **Delete LOCAL-0002:**
   ```sql
   DELETE FROM cluster_registrations
   WHERE cluster_key = 'LOCAL-0002';
   ```

6. **Verify:**
   ```sql
   SELECT * FROM cluster_registrations;
   -- Should only show LOCAL-0011
   ```

---

### Option B: Using psql Command Line

1. **Open Command Prompt or PowerShell**

2. **Connect to CentCom database:**
   ```bash
   psql -U joshual -d centcom_dev -h 127.0.0.1 -p 5432
   ```
   - Password: `postgres`

3. **View clusters:**
   ```sql
   SELECT cluster_key, machine_fingerprint FROM cluster_registrations;
   ```

4. **Delete LOCAL-0002:**
   ```sql
   DELETE FROM cluster_registrations WHERE cluster_key = 'LOCAL-0002';
   ```

5. **Verify:**
   ```sql
   SELECT * FROM cluster_registrations;
   ```

6. **Exit:**
   ```sql
   \q
   ```

---

### Option C: Using DBeaver or DataGrip

1. **Create new connection:**
   - Type: PostgreSQL
   - Host: localhost (127.0.0.1)
   - Port: 5432
   - Database: centcom_dev
   - User: joshual
   - Password: postgres

2. **Open SQL console**

3. **Run the queries from Option A**

---

### Option D: If You Don't Have PostgreSQL Tools

**Quick method** - use CentCom's built-in database access:

1. **Stop CentCom app** (close it completely)

2. **Delete CentCom's data directory:**
   ```bash
   # Windows
   del /s /q %APPDATA%\.centcom\cluster_credentials.json

   # Or manually navigate to:
   C:\Users\joshual\AppData\Roaming\.centcom\
   # Delete cluster_credentials.json or the entire .centcom folder
   ```

3. **Restart CentCom**
   - It will re-register only the current machine (LOCAL-0011)
   - Will NOT recreate LOCAL-0002

---

## Step 3: 🧪 Test the Fix

After cleaning up CentCom's database:

### Test 1: Restart CentCom
1. Close CentCom app completely
2. Start it again
3. Go to Database Connections page
4. **Expected:** Only shows LOCAL-0011 ✅

### Test 2: Check Lyceum
1. Go to http://localhost:3594/clusters
2. **Expected:** Only 1 local cluster (LOCAL-0011) ✅
3. **NOT:** 2 clusters with LOCAL-0002 reappearing ❌

### Test 3: Verify Logs
CentCom terminal should show:
```
📋 Loaded cluster credentials: cluster_key=LOCAL-0011
```

**NOT:**
```
📋 Loaded cluster credentials: cluster_key=LOCAL-0002
```

---

## 🔍 How to Verify the Table Name

If `cluster_registrations` doesn't exist, try these table names:

```sql
-- List all tables in CentCom database
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%cluster%';

-- Common alternatives:
-- clusters
-- local_clusters
-- registered_clusters
-- cluster_configs
```

Then use the correct table name in the DELETE statement.

---

## ⚠️ Prevention: Why This Happened

### The Architecture:
```
CentCom App
    ↓ (stores locally)
CentCom PostgreSQL (localhost:5432/centcom_dev)
    ↓ (syncs to)
Lyceum Supabase (kffiaqsihldgqdwagook.supabase.co)
    ↓ (displays in)
Lyceum Web App (/clusters page)
```

### What Went Wrong:
1. Old CentCom version had bug → created LOCAL-0002 with corrupted fingerprint
2. Stored in **both databases** (CentCom local + Lyceum remote)
3. You deleted from Lyceum only
4. CentCom still had it locally
5. On restart, CentCom re-synced local data to Lyceum → LOCAL-0002 came back!

### How to Prevent:
- ✅ Backend validation now rejects corrupted fingerprints
- ✅ CentCom code is fixed (no longer creates corrupted data)
- ✅ After cleaning both databases, won't happen again

---

## 🚨 If You Can't Access PostgreSQL

If you don't have psql or pgAdmin installed:

### Quick Fix: Delete CentCom's Storage

```bash
# Stop CentCom first!

# Windows
rmdir /s /q "%APPDATA%\.centcom"

# Or navigate and delete manually:
# C:\Users\joshual\AppData\Roaming\.centcom\
```

This will:
- ✅ Delete all local cluster registrations
- ✅ Force CentCom to re-register from scratch
- ✅ Only register current machine (LOCAL-0011)
- ❌ Lose other local settings (may need to re-configure)

---

## 📋 Summary

**Problem:** Two separate databases need cleanup

**Solution:**
1. ✅ Clean Lyceum (done via Table Editor)
2. 🔨 Clean CentCom PostgreSQL (do now)
   - Use pgAdmin, psql, or delete `.centcom` folder

**Expected Result:**
- Only LOCAL-0011 exists in both databases
- Restarting CentCom does NOT recreate LOCAL-0002
- Web app shows only 1 local cluster

---

## Need Help?

If you're stuck connecting to PostgreSQL, try the **Quick Fix** method (delete `.centcom` folder). It's the fastest way to clean up CentCom's local data without needing database tools.
