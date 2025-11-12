# Authorization Fix Verification Checklist

## 🎯 Purpose

The CentCom team has documented fixes for the missing Authorization header bug. This checklist verifies if the fixes were **actually applied** and are **working correctly**.

---

## ✅ Pre-Flight Checks

### 1. Have the code changes been applied?

**Check these specific lines in the CentCom codebase:**

#### A. ClusterCredentials struct includes sync_token?
**File:** `src-tauri/src/commands/cluster_registration.rs:41-49`

```rust
// Should look like this:
pub struct ClusterCredentials {
    pub cluster_id: String,
    pub cluster_key: String,
    pub sync_token: String,  // ← Must be present!
    pub registered_at: String,
    pub last_heartbeat_at: Option<String>,
}
```

- [ ] ✅ YES - sync_token field exists
- [ ] ❌ NO - sync_token field missing (APPLY FIX FIRST)

---

#### B. Database schema includes sync_token column?
**File:** `src-tauri/src/commands/cluster_registration.rs:224-250`

```rust
// Should include sync_token in table definition:
CREATE TABLE IF NOT EXISTS cluster_credentials (
    id INTEGER PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    cluster_key TEXT NOT NULL,
    sync_token TEXT NOT NULL,  // ← Must be present!
    registered_at TIMESTAMP NOT NULL,
    last_heartbeat_at TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
)
```

- [ ] ✅ YES - sync_token column in CREATE TABLE
- [ ] ❌ NO - sync_token column missing (APPLY FIX FIRST)

---

#### C. Authorization header added to heartbeat?
**File:** `src-tauri/src/commands/cluster_heartbeat.rs:134-141`

```rust
// Should look like this:
let response = client
    .post(&endpoint)
    .header("Content-Type", "application/json")
    .header("Authorization", format!("Bearer {}", credentials.sync_token))  // ← CRITICAL!
    .json(&request)
    .send()
    .await
    .map_err(|e| format!("Failed to send heartbeat: {}", e))?;
```

- [ ] ✅ YES - Authorization header present
- [ ] ❌ NO - Authorization header missing (APPLY FIX FIRST)

---

## 🔧 If Fixes Are Applied, Verify They're Working

### Step 1: Clean Old Data

**Problem:** Old database doesn't have `sync_token` column

**Solution:**
```bash
# In CentCom development environment, run:
psql -U joshual -d centcom_dev -c "DROP TABLE IF EXISTS cluster_credentials;"

# OR manually delete:
# Windows: C:\Users\joshual\AppData\Local\centcom\database.db
# Mac/Linux: ~/.local/centcom/database.db
```

- [ ] ✅ DONE - Dropped old table
- [ ] ⏳ TODO - Need to drop old table

---

### Step 2: Rebuild CentCom

```bash
cd src-tauri
cargo clean
cargo build
cd ..
npm run tauri:dev
```

- [ ] ✅ DONE - Rebuilt with latest code
- [ ] ⏳ TODO - Need to rebuild

---

### Step 3: Re-register Cluster

1. **Open CentCom**
2. **Sign in** with your Lyceum account
3. **Go to** Settings → Database Connections
4. **Click** "Register with Lyceum"
5. **Enter** license key
6. **Submit**

**Expected logs:**
```
✅ Cluster credentials stored: cluster_key=LOCAL-XXXX, sync_token=eyJhbGc...
```

**Did you see the sync_token in the logs?**
- [ ] ✅ YES - sync_token logged during registration
- [ ] ❌ NO - sync_token NOT in logs (FIX NOT APPLIED)

---

### Step 4: Verify sync_token is Stored in Database

**Query the database:**
```bash
psql -U joshual -d centcom_dev -c "SELECT cluster_key, LENGTH(sync_token) as token_length FROM cluster_credentials;"
```

**Expected output:**
```
 cluster_key | token_length
-------------+--------------
 LOCAL-XXXX  |          200+
```

**Results:**
- [ ] ✅ sync_token stored with length > 100 characters
- [ ] ❌ sync_token column doesn't exist
- [ ] ❌ sync_token is NULL or empty
- [ ] ❌ Error: column "sync_token" does not exist

---

### Step 5: Check Heartbeat Logs

**Within 1-2 minutes, you should see heartbeat logs:**

```
🔍 Heartbeat Debug Info:
  Cluster ID: xxx-xxx-xxx-xxx
  Sync Token: eyJhbGciOiJIUzI1NiI...  ← MUST BE PRESENT!
💓 Sending heartbeat to: https://lyceum-sable.vercel.app/api/centcom/clusters/local/heartbeat
📊 Heartbeat response status: 200
✅ Heartbeat sent successfully:
  Cluster Status: healthy
  Next Heartbeat: 600 seconds
```

**What do you see?**
- [ ] ✅ Sync token logged (first 20 chars)
- [ ] ✅ Response status: 200 OK
- [ ] ✅ "Heartbeat sent successfully"
- [ ] ❌ No sync token in logs
- [ ] ❌ Response status: 401 Unauthorized
- [ ] ❌ Response status: 400 Bad Request
- [ ] ❌ No heartbeat logs at all

---

### Step 6: Check Lyceum Backend Logs

**In your Lyceum terminal (where Next.js dev server is running):**

**Look for:**
```
✅ Heartbeat received for cluster: xxx-xxx-xxx
📊 Health status: healthy
✅ Cluster status updated: xxx-xxx-xxx
```

**What do you see?**
- [ ] ✅ "Heartbeat received for cluster"
- [ ] ✅ "Cluster status updated"
- [ ] ❌ "Invalid or expired sync token"
- [ ] ❌ "Invalid sync token payload"
- [ ] ❌ "Missing or invalid Authorization header"
- [ ] ❌ No heartbeat logs at all in Lyceum

---

### Step 7: Check Lyceum Database

**Run this query in Lyceum's Supabase SQL Editor:**

```sql
SELECT
  cluster_key,
  cluster_id,
  last_heartbeat_at,
  health_status,
  cluster_status,
  is_running,
  NOW() - last_heartbeat_at as heartbeat_age
FROM local_cluster_usage
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY last_heartbeat_at DESC;
```

**Expected results:**
- `last_heartbeat_at`: Within last 10 minutes
- `health_status`: "healthy"
- `cluster_status`: "online"
- `heartbeat_age`: Less than "00:15:00" (15 minutes)

**What do you see?**
- [ ] ✅ last_heartbeat_at is recent (< 10 minutes)
- [ ] ✅ health_status = "healthy"
- [ ] ✅ cluster_status = "online"
- [ ] ❌ last_heartbeat_at is old (> 15 minutes)
- [ ] ❌ health_status = "unknown"
- [ ] ❌ cluster_status = "offline"
- [ ] ❌ last_heartbeat_at is NULL

---

### Step 8: Verify in Lyceum UI

**Go to:** https://lyceum-sable.vercel.app/clusters

**What do you see for LOCAL-XXXX cluster?**

| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| Status | "active" | __________ | ⚠️ |
| Health | "healthy" | __________ | ⚠️ |
| Badge | 🟢 "Connected" | __________ | ⚠️ |
| Last seen | "X minutes ago" (< 10) | __________ | ⚠️ |

**Results:**
- [ ] ✅ All showing correctly
- [ ] ❌ Still showing "offline" / "unknown"

---

## 🔍 Diagnostic: If Still Not Working

### Scenario A: sync_token NOT in database

**Symptoms:**
- Column error: `column "sync_token" does not exist`
- Fixes were documented but NOT applied to code

**Solution:**
1. Verify fixes are in the actual code files (not just documentation)
2. Rebuild: `cargo clean && cargo build`
3. Drop old table and re-register

---

### Scenario B: Heartbeat NOT sending Authorization header

**Symptoms:**
- Logs show: "Sending heartbeat"
- But NO "Sync Token: ..." in logs
- Lyceum responds with 401 Unauthorized

**Solution:**
1. Check `cluster_heartbeat.rs` line ~140
2. Verify this line exists:
   ```rust
   .header("Authorization", format!("Bearer {}", credentials.sync_token))
   ```
3. If missing, add it and rebuild

---

### Scenario C: sync_token retrieved but empty/malformed

**Symptoms:**
- Logs show: "Sync Token: " (empty)
- Or: "Sync Token: null"

**Solution:**
1. Check `get_cluster_credentials()` function
2. Verify it's reading sync_token from database:
   ```rust
   SELECT cluster_id, cluster_key, sync_token, ...
   ```
3. Check query includes sync_token in SELECT
4. Verify tuple parsing includes sync_token

---

### Scenario D: Heartbeat loop not running

**Symptoms:**
- NO heartbeat logs at all
- No "Sending heartbeat" messages

**Solution:**
1. Check if heartbeat service started after login
2. Look for: "💓 AuthContext: Heartbeat service started"
3. If missing, check AuthContext.tsx:517-536
4. Verify `clusterService.startHeartbeat()` is called

---

## 📋 Quick Verification Script

**Run this in CentCom terminal to check everything:**

```bash
echo "=== Checking CentCom Database ==="
psql -U joshual -d centcom_dev -c "
  SELECT
    cluster_key,
    CASE
      WHEN sync_token IS NOT NULL AND LENGTH(sync_token) > 100 THEN '✅ Valid'
      WHEN sync_token IS NULL THEN '❌ NULL'
      ELSE '⚠️ Too Short'
    END as token_status,
    LENGTH(sync_token) as token_length
  FROM cluster_credentials;
"

echo ""
echo "=== Checking Lyceum Database ==="
# Run in Supabase SQL Editor
```

**Expected output:**
```
 cluster_key | token_status | token_length
-------------+--------------+--------------
 LOCAL-XXXX  | ✅ Valid     |          250
```

---

## 🎯 Most Common Issues (Post-Fix)

### Issue 1: Old table without sync_token column (80%)

**How to confirm:**
```bash
psql -U joshual -d centcom_dev -c "\d cluster_credentials"
```

Look for `sync_token` column. If missing:
```bash
DROP TABLE cluster_credentials;
# Then re-register
```

---

### Issue 2: Didn't rebuild after code changes (60%)

**How to confirm:**
```bash
cargo clean
cargo build
# Check logs for compilation errors
```

---

### Issue 3: Authorization header still missing (40%)

**How to confirm:**
Check the actual source code file:
```rust
// Should have this line:
.header("Authorization", format!("Bearer {}", credentials.sync_token))
```

If missing, the fix wasn't applied to your codebase.

---

### Issue 4: Heartbeat service not starting (30%)

**How to confirm:**
Look for startup logs:
```
💓 AuthContext: Heartbeat service started
```

If missing, check `AuthContext.tsx` integration.

---

## ✅ Success Indicators

**When everything is working correctly, you'll see:**

### In CentCom Terminal:
```
✅ Cluster credentials stored: cluster_key=LOCAL-XXXX, sync_token=eyJhbGc...
💓 AuthContext: Heartbeat service started
🔍 Heartbeat Debug Info:
  Sync Token: eyJhbGciOiJIUzI1NiI...
💓 Sending heartbeat to: https://lyceum...
📊 Heartbeat response status: 200
✅ Heartbeat sent successfully
```

### In Lyceum Terminal:
```
✅ Heartbeat received for cluster: xxx-xxx-xxx
✅ Cluster status updated: xxx-xxx-xxx
```

### In Lyceum UI:
- Status: **active** ✅
- Health: **healthy** ✅
- Badge: **🟢 Connected** ✅
- Last seen: **Just now** ✅

### In Database:
```sql
last_heartbeat_at: 2025-01-07 11:30:00 (< 10 min ago) ✅
health_status: healthy ✅
cluster_status: online ✅
```

---

## 📞 Report Template

**When reporting results to Lyceum team, provide:**

```
AUTHORIZATION FIX VERIFICATION RESULTS
======================================

1. Code Changes Applied:
   [ ] sync_token in ClusterCredentials struct
   [ ] sync_token in database schema
   [ ] Authorization header in heartbeat

2. Database State:
   - Table dropped and recreated: [ ] YES / [ ] NO
   - sync_token column exists: [ ] YES / [ ] NO
   - sync_token has value: [ ] YES / [ ] NO
   - Token length: _______ characters

3. Heartbeat Logs:
   - Sync token appears in logs: [ ] YES / [ ] NO
   - Response status: _______
   - Error messages: _______

4. Lyceum Backend Logs:
   - "Heartbeat received": [ ] YES / [ ] NO
   - "Cluster status updated": [ ] YES / [ ] NO
   - Error messages: _______

5. Database Query Results:
   - last_heartbeat_at: _______
   - heartbeat_age: _______ minutes
   - health_status: _______
   - cluster_status: _______

6. UI Status:
   - Cluster status: _______
   - Health: _______
   - Badge: _______
   - Last seen: _______

7. Overall Result:
   [ ] ✅ WORKING - Cluster shows active/healthy
   [ ] ❌ NOT WORKING - Still offline/unknown
   [ ] ⚠️ PARTIAL - Some parts working
```

---

**Created:** January 7, 2025
**Purpose:** Verify Authorization header fixes are applied and working
**Status:** Ready for verification testing
