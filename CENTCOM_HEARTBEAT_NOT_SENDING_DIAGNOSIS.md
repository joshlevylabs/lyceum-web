# CentCom Heartbeat Not Sending - Diagnosis

**Problem:** CentCom is running and collecting data, but heartbeat service is NOT sending heartbeats to Lyceum

**Date:** January 7, 2025

---

## 🔍 What We See in Logs

### ✅ Working:
- ClickHouse started successfully
- User authenticated: `josh@thelyceum.io`
- Cluster credentials loaded: `cluster_key=LOCAL-0001, sync_token=eyJhbGciOiJIUzI1NiIs...`
- Statistics collected: `2 projects, 315 measurements, 4 tables, 1445195 bytes`
- Lyceum Manager initialized

### ❌ Missing:
- **NO heartbeat sending logs**
- Should see: `💓 Sending heartbeat to: ...`
- Should see: `🔍 Heartbeat Debug Info:`
- Should see: `📊 Heartbeat response status: ...`

---

## 🎯 Root Cause

The **heartbeat service is not starting** or **not triggering the send loop**.

---

## 🔧 Diagnostic Steps

### Step 1: Check if Heartbeat Service is Initialized

**Look for in CentCom logs:**
```
💓 Starting heartbeat service...
💓 Heartbeat service started
```

**❌ If NOT present:** Heartbeat service initialization failed or wasn't triggered

---

### Step 2: Check Cluster Registration Status

**CentCom logs show:**
```
📋 Loaded cluster credentials: cluster_key=LOCAL-0001, sync_token=eyJhbGciOiJIUzI1NiIs...
```

This means credentials exist, so cluster IS registered. ✅

**But - need to verify in database:**

```sql
-- Run this in CentCom's PostgreSQL database (centcom_dev)
SELECT
  id,
  cluster_id,
  cluster_key,
  LENGTH(sync_token) as token_length,
  registered_at,
  last_heartbeat_at
FROM cluster_credentials;
```

**Expected:**
- `cluster_key`: LOCAL-0001
- `sync_token`: Should have length > 100 characters
- `registered_at`: Recent timestamp
- `last_heartbeat_at`: May be NULL if never sent

**❌ If `sync_token` is NULL or empty:** Registration incomplete, heartbeat can't send

---

### Step 3: Check Heartbeat Service Code

**File to check:** `src-tauri/src/commands/cluster_heartbeat.rs` (or similar)

**Look for heartbeat initialization:**

```rust
// Should have something like:
pub async fn start_heartbeat_loop(/* ... */) {
    loop {
        // Send heartbeat
        tokio::time::sleep(Duration::from_secs(600)).await; // 10 minutes
    }
}
```

**Check if heartbeat service is called after login:**

**File to check:** `src-tauri/src/lib.rs` or authentication handler

```rust
// After successful authentication, should have:
tauri::async_runtime::spawn(async move {
    start_heartbeat_loop(/* ... */).await;
});
```

**❌ If heartbeat loop is not spawned:** Service never starts

---

### Step 4: Check for Silent Failures

**Look for error logs around:**
- `Lyceum Manager initialized`
- After user login

**Possible silent failures:**
- Credentials retrieval failed
- ClickHouse connection failed
- Network error preventing heartbeat

**Add debug logging to heartbeat service:**

```rust
// Add at start of heartbeat function
eprintln!("🔍 DEBUG: Heartbeat service starting...");
eprintln!("🔍 DEBUG: Cluster credentials: {:?}", credentials);
eprintln!("🔍 DEBUG: Heartbeat endpoint: {}", endpoint);
```

---

### Step 5: Check Heartbeat Triggering Logic

**Common patterns that might fail:**

**Pattern 1: Heartbeat only starts after cluster registration**
```rust
// If registration happens AFTER login, heartbeat might not start
// Check if there's a "register cluster" button/action needed
```

**Pattern 2: Heartbeat requires explicit "Start" command**
```rust
// Some implementations require user to manually start heartbeat
// Check if there's a UI button or setting to enable heartbeat
```

**Pattern 3: Heartbeat only runs when ClickHouse is active**
```rust
// Check if heartbeat service checks ClickHouse status before starting
if !clickhouse_manager.is_running() {
    return; // This would prevent heartbeat from starting
}
```

---

### Step 6: Check Frontend Heartbeat Trigger

**File to check:** `src/contexts/AuthContext.tsx` or similar frontend file

**Look for heartbeat service start after login:**

```typescript
// After successful login:
useEffect(() => {
  if (user) {
    // Start heartbeat service
    clusterService.startHeartbeat()  // ← Should be here!
  }
}, [user])
```

**❌ If `startHeartbeat()` is not called:** Frontend never triggers heartbeat service

---

## 🔍 Quick Diagnostic Tests

### Test 1: Manual Heartbeat Trigger

**If CentCom has a command to manually send heartbeat, try:**

```bash
# In CentCom dev tools console or via Tauri command
invoke('send_heartbeat_now')
```

**If this works:** Heartbeat service code is fine, but loop isn't starting

**If this fails:** Check error message for root cause

---

### Test 2: Check Database for Registration

Run in CentCom's PostgreSQL:

```sql
-- Check if cluster is registered
SELECT * FROM cluster_credentials LIMIT 1;
```

**Expected:** 1 row with `cluster_key=LOCAL-0001` and `sync_token` present

**❌ If 0 rows:** Cluster not registered, need to register first

**❌ If `sync_token` is NULL:** Registration incomplete

---

### Test 3: Check Lyceum Backend for Previous Heartbeats

Run in Lyceum's Supabase:

```sql
SELECT
  cluster_key,
  last_heartbeat_at,
  NOW() - last_heartbeat_at as time_since_heartbeat,
  health_status,
  cluster_status
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-0001'
ORDER BY last_heartbeat_at DESC
LIMIT 1;
```

**If `last_heartbeat_at` is very old (> 1 hour):**
- Heartbeat was working before but stopped
- Check if service crashed or was disabled

**If `last_heartbeat_at` is NULL:**
- Heartbeat never worked
- Need to verify service initialization

---

## 🎯 Most Likely Issues

### Issue 1: Heartbeat Service Never Initialized (80% probability)

**Symptoms:**
- ✅ User logged in
- ✅ Cluster credentials loaded
- ❌ NO heartbeat logs at all

**Root cause:**
- Heartbeat loop is not spawned after login
- Frontend doesn't call `startHeartbeat()`
- Service initialization failed silently

**How to fix:**
1. Find where user login completes
2. Add heartbeat service start:
   ```rust
   // After successful login
   tauri::async_runtime::spawn(async move {
       start_heartbeat_loop(state).await;
   });
   ```

---

### Issue 2: Cluster Not Fully Registered (15% probability)

**Symptoms:**
- ✅ User logged in
- ✅ Credentials loaded (but may be incomplete)
- ❌ `sync_token` is NULL or empty

**Root cause:**
- Registration process incomplete
- Lyceum didn't return sync_token
- Token wasn't stored in database

**How to fix:**
1. Re-register cluster with Lyceum
2. Verify Lyceum registration endpoint returns sync_token
3. Check database has sync_token stored

---

### Issue 3: Heartbeat Loop Crashes Immediately (5% probability)

**Symptoms:**
- ✅ Service starts
- ❌ Crashes before first heartbeat
- ❌ No error logs (crashes silently)

**Root cause:**
- Network error accessing Lyceum
- Credentials retrieval fails
- ClickHouse query fails

**How to fix:**
1. Add try-catch around heartbeat loop
2. Log errors explicitly
3. Add retry logic

---

## 🔧 Recommended Fix

Based on the logs, here's what to do:

### 1. Add Heartbeat Service Initialization

**File:** Where user login completes (likely `src-tauri/src/lib.rs` or auth handler)

```rust
// After successful login:
use crate::commands::cluster_heartbeat::start_heartbeat_service;

// Spawn heartbeat service
let app_handle = app.handle();
tauri::async_runtime::spawn(async move {
    eprintln!("💓 Starting heartbeat service...");

    match start_heartbeat_service(app_handle).await {
        Ok(_) => eprintln!("✅ Heartbeat service started"),
        Err(e) => eprintln!("❌ Failed to start heartbeat service: {}", e),
    }
});
```

### 2. Add Heartbeat Loop Function

**File:** `src-tauri/src/commands/cluster_heartbeat.rs`

```rust
pub async fn start_heartbeat_service(app_handle: tauri::AppHandle) -> Result<(), String> {
    eprintln!("💓 Heartbeat service initializing...");

    loop {
        // Get credentials
        let credentials = match get_cluster_credentials(&app_handle).await {
            Ok(Some(creds)) => creds,
            Ok(None) => {
                eprintln!("⚠️ No cluster credentials found, waiting...");
                tokio::time::sleep(Duration::from_secs(60)).await;
                continue;
            }
            Err(e) => {
                eprintln!("❌ Failed to get credentials: {}", e);
                tokio::time::sleep(Duration::from_secs(60)).await;
                continue;
            }
        };

        eprintln!("🔍 Heartbeat Debug Info:");
        eprintln!("  Cluster ID: {}", credentials.cluster_id);
        eprintln!("  Sync Token: {}...", &credentials.sync_token[..20]);

        // Send heartbeat
        match send_heartbeat(credentials, &app_handle).await {
            Ok(_) => eprintln!("✅ Heartbeat sent successfully"),
            Err(e) => eprintln!("❌ Heartbeat failed: {}", e),
        }

        // Wait 10 minutes
        tokio::time::sleep(Duration::from_secs(600)).await;
    }
}
```

### 3. Verify Credentials Exist

**File:** `src-tauri/src/commands/cluster_registration.rs` or database query file

```rust
pub async fn get_cluster_credentials(app_handle: &tauri::AppHandle) -> Result<Option<ClusterCredentials>, String> {
    // Query database for credentials
    let result = app_handle
        .state::<DatabasePool>()
        .get()
        .map_err(|e| format!("Failed to get database: {}", e))?
        .query_one(
            "SELECT cluster_id, cluster_key, sync_token, registered_at, last_heartbeat_at
             FROM cluster_credentials LIMIT 1"
        )
        .await;

    match result {
        Ok(row) => {
            let sync_token: String = row.get("sync_token");

            if sync_token.is_empty() {
                return Err("sync_token is empty".to_string());
            }

            Ok(Some(ClusterCredentials {
                cluster_id: row.get("cluster_id"),
                cluster_key: row.get("cluster_key"),
                sync_token,
                registered_at: row.get("registered_at"),
                last_heartbeat_at: row.get("last_heartbeat_at"),
            }))
        }
        Err(sqlx::Error::RowNotFound) => Ok(None),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}
```

---

## 🔍 Immediate Action Items

1. **Check CentCom code for heartbeat service initialization**
   - Search for: `start_heartbeat`, `heartbeat_loop`, `send_heartbeat`
   - Verify it's called after login

2. **Verify sync_token in database**
   ```sql
   SELECT cluster_key, LENGTH(sync_token) as token_length
   FROM cluster_credentials;
   ```

3. **Add debug logging to heartbeat service**
   - Add `eprintln!` statements at key points
   - Restart CentCom and check for new logs

4. **Check frontend for heartbeat trigger**
   - Search for: `clusterService.startHeartbeat()`, `invoke('start_heartbeat')`
   - Verify it's called after login

---

## 📋 Checklist

Run through this checklist:

- [ ] Cluster is registered (credentials exist in database)
- [ ] `sync_token` is present and not empty
- [ ] Heartbeat service function exists in code
- [ ] Heartbeat service is initialized after login
- [ ] Heartbeat loop is spawned (async task)
- [ ] No errors in logs preventing heartbeat
- [ ] Network can reach Lyceum backend
- [ ] Authorization header is added to request

---

## 🎯 Expected Logs After Fix

Once fixed, you should see:

```
✅ Lyceum authentication successful for: josh@thelyceum.io
💓 Starting heartbeat service...
✅ Heartbeat service started
🔍 Heartbeat Debug Info:
  Cluster ID: 6d8f3c6e-789f-4871-80f9-e03f54e2f73f
  Sync Token: eyJhbGciOiJIUzI1NiIs...
💓 Sending heartbeat to: https://lyceum-sable.vercel.app/api/centcom/clusters/local/heartbeat
📊 Heartbeat payload includes:
  - Health: healthy
  - Projects: 2
  - Storage: 1445195 bytes
📊 Heartbeat response status: 200
✅ Heartbeat sent successfully
```

---

**Created:** January 7, 2025
**Status:** 🔍 DIAGNOSIS IN PROGRESS
**Next Step:** Check CentCom code for heartbeat service initialization
