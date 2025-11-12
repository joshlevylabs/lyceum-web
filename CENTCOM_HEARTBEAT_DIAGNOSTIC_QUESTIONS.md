# CentCom Heartbeat Diagnostic Questions

## 🔴 Issue Report

**Problem:** Local cluster shows as "offline" and health status "unknown" in Lyceum, even though CentCom is running and cluster is registered.

**Expected Behavior:**
- Cluster status: "active"
- Health status: "healthy"
- Connection badge: "Connected" (green)

**Current Behavior:**
- Cluster status: "offline"
- Health status: "unknown"
- Connection badge: "Offline" (gray)

---

## 📋 Questions for CentCom Team

### Section 1: Heartbeat Service Status

**Q1.1: Is the heartbeat service running?**
- [ ] Where in the code is the heartbeat service initialized?
- [ ] File path: `src-tauri/src/commands/cluster_heartbeat.rs`?
- [ ] Is it started automatically when CentCom launches?
- [ ] Is there a way to check if the heartbeat loop is active?

**Q1.2: What is the current heartbeat interval?**
- Expected: Every 10 minutes (600 seconds)
- Actual interval in code: ______________ seconds
- Why: Lyceum considers cluster "offline" if no heartbeat in last 15 minutes

**Q1.3: Is the heartbeat loop actually executing?**
```rust
// Are you seeing these logs in CentCom terminal?
println!("🔄 Starting heartbeat loop...");
println!("💓 Sending heartbeat for cluster: {}", cluster_id);
println!("✅ Heartbeat sent successfully");
```
- [ ] Yes, I see heartbeat logs
- [ ] No, I don't see any heartbeat logs
- [ ] I see some logs but not all of them

**Q1.4: Are there any errors in the heartbeat loop?**
```rust
// Do you see error logs like these?
println!("❌ Heartbeat failed: {}", error);
println!("⚠️ Failed to send heartbeat: {}", error);
```
- [ ] Yes, seeing errors (please provide error messages)
- [ ] No errors visible
- [ ] Not sure how to check

---

### Section 2: Cluster Registration

**Q2.1: Was cluster registration successful?**
- [ ] Check logs for: `✅ Cluster registered successfully`
- [ ] Cluster key received: `LOCAL-____` (what is the cluster key?)
- [ ] Sync token received and stored?

**Q2.2: Is cluster registration persisted?**
```rust
// After registration, is this data saved?
- cluster_id: UUID
- sync_token: JWT token
- cluster_key: LOCAL-XXXX
- machine_fingerprint: hash
```
- [ ] Yes, stored in local database/file
- [ ] Not sure where it's stored
- [ ] Registration seems to work but data not persisted

**Q2.3: After restart, does CentCom load saved credentials?**
```rust
// On app startup, do you see:
println!("📋 Loaded cluster credentials: cluster_key={}", cluster_key);
println!("🔑 Loaded sync token from storage");
```
- [ ] Yes, credentials loaded from storage
- [ ] No, seems to re-register every time
- [ ] Credentials lost after restart

---

### Section 3: Heartbeat Request Details

**Q3.1: What URL is being called for heartbeat?**
- Expected: `POST http://localhost:3594/api/centcom/clusters/local/heartbeat`
- Actual URL in code: _________________________________

**Q3.2: Is the Authorization header included?**
```rust
// Should look like this:
headers.insert("Authorization", format!("Bearer {}", sync_token));
```
- [ ] Yes, Authorization header is included
- [ ] No, missing Authorization header
- [ ] Not sure

**Q3.3: What is the HTTP status code returned?**
```rust
// After sending heartbeat, what response do you get?
let response = client.post(url).send().await?;
let status = response.status();
println!("📊 Heartbeat response status: {}", status);
```
- [ ] 200 (Success)
- [ ] 401 (Unauthorized - token issue)
- [ ] 400 (Bad Request - payload issue)
- [ ] 500 (Server Error - Lyceum backend issue)
- [ ] Other: __________
- [ ] No response / timeout

**Q3.4: What payload is being sent?**
```rust
// Current payload structure
{
  "status": {
    "is_running": true,
    "uptime_seconds": 3600,
    "version": "23.12"
    // health?: missing?
    // last_error?: missing?
  },
  "usage_metrics": {
    "storage_used_gb": 2.5,
    "storage_bytes": 2684354560,
    "queries_this_month": 150,
    "project_count": 2,
    "measurement_count": 23500,
    "table_count": 5
  }
  // projects?: missing?
}
```

**Please confirm:**
- [ ] `status.is_running` is always `true` when CentCom is running
- [ ] `status.version` contains ClickHouse version
- [ ] `usage_metrics` contains all required fields
- [ ] Is `status.health` included? (NEW field - optional but helps)
- [ ] Is `projects` array included? (NEW field - optional)

---

### Section 4: Response Handling

**Q4.1: Is the response from Lyceum being read?**
```rust
let response_body = response.text().await?;
println!("📥 Heartbeat response: {}", response_body);
```
- [ ] Yes, response is logged
- [ ] No, response not checked
- [ ] Response checked but not logged

**Q4.2: If heartbeat fails, is there retry logic?**
- [ ] Yes, retries X times
- [ ] No retry logic
- [ ] Not sure

**Q4.3: What happens if heartbeat fails?**
- [ ] Error logged and continues
- [ ] App crashes
- [ ] Heartbeat loop stops
- [ ] Other: __________

---

### Section 5: Authentication & Sync Token

**Q5.1: Is the sync token valid?**
```rust
// After registration, sync_token should look like:
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJseWNldW0iLCJhdWQiOiJjZW50Y29tLXN5bmMiLCJzdWIiOiJ1c2VyX2lkIiwiY2x1c3Rlcl9pZCI6ImNsdXN0ZXJfaWQiLCJtYWNoaW5lX2ZpbmdlcnByaW50IjoiZmluZ2VycHJpbnQiLCJsaWNlbnNlX2lkIjoibGljZW5zZV9pZCIsImlhdCI6MTcwNDY3MjAwMCwiZXhwIjoxNzEyNDQ4MDAwfQ.signature"
```
- [ ] Token looks correct (JWT format)
- [ ] Token is too short or malformed
- [ ] Not sure how to check

**Q5.2: Is the sync token expired?**
- Tokens valid for: 90 days
- When was cluster registered? ______________ (date)
- Has 90 days passed since registration?
- [ ] No, token should be valid
- [ ] Yes, might be expired
- [ ] Not sure

**Q5.3: Are you receiving 401 Unauthorized errors?**
```rust
// Lyceum will respond with 401 if:
// - Token is invalid
// - Token is expired
// - Token is malformed
// - Token signature doesn't match
```
- [ ] Yes, seeing 401 errors
- [ ] No 401 errors
- [ ] Not checking response codes

---

### Section 6: Network & Connectivity

**Q6.1: Is Lyceum backend reachable from CentCom?**
```bash
# Can you curl the heartbeat endpoint?
curl -X POST http://localhost:3594/api/centcom/clusters/local/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN" \
  -d '{"status":{"is_running":true,"uptime_seconds":100,"version":"23.12"},"usage_metrics":{"storage_used_gb":1,"storage_bytes":1000000000,"queries_this_month":10,"project_count":1,"measurement_count":100,"table_count":1}}'
```
- [ ] Yes, curl works and returns 200
- [ ] No, connection refused
- [ ] Timeout
- [ ] Other error: __________

**Q6.2: Is the Lyceum API URL correct?**
- Expected: `http://localhost:3594` (development)
- Actual URL in CentCom config: __________________________________
- [ ] Correct
- [ ] Wrong port
- [ ] Wrong host
- [ ] Not configured

**Q6.3: Are there any CORS issues?**
```rust
// Check if you see CORS-related errors in logs
"Access to fetch at 'http://localhost:3594/api/...' from origin '...' has been blocked by CORS policy"
```
- [ ] Yes, CORS errors visible
- [ ] No CORS errors
- [ ] Not sure

---

### Section 7: Database State

**Q7.1: What does the Lyceum database show?**

**Run this query in Lyceum's Supabase:**
```sql
SELECT
  cluster_key,
  cluster_id,
  last_heartbeat_at,
  health_status,
  is_running,
  cluster_status,
  uptime_seconds,
  clickhouse_version,
  created_at
FROM local_cluster_usage
WHERE cluster_key = 'LOCAL-XXXX' -- Replace with your cluster key
ORDER BY last_heartbeat_at DESC;
```

**Please provide:**
- `cluster_key`: ______________
- `last_heartbeat_at`: ______________ (timestamp)
- `health_status`: ______________
- `is_running`: ______________
- `cluster_status`: ______________

**Q7.2: How old is the last heartbeat?**
- Calculate: Current time - `last_heartbeat_at` = ________ minutes
- Expected: Less than 15 minutes for "connected" status
- If > 15 minutes: Heartbeats are not reaching Lyceum

**Q7.3: Is `last_heartbeat_at` being updated?**
- [ ] Yes, timestamp updates every 10 minutes
- [ ] No, timestamp stuck at old value
- [ ] Timestamp is NULL
- [ ] Not sure how to check

---

### Section 8: Code Implementation

**Q8.1: Where is the heartbeat function defined?**
- File path: __________________________________
- Function name: __________________________________

**Q8.2: How is the heartbeat loop started?**
```rust
// Is it called from main.rs?
// Is it spawned as a background task?
// Is it triggered by user action?
```
- [ ] Started automatically on app launch
- [ ] Started after user logs in
- [ ] Started after cluster registration
- [ ] Other: __________

**Q8.3: Is the heartbeat loop async/await or sync?**
```rust
async fn send_heartbeat() { ... }  // Async
fn send_heartbeat() { ... }        // Sync
```
- [ ] Async (with tokio or similar)
- [ ] Sync (blocking)
- [ ] Not sure

**Q8.4: Is there a background task running?**
```rust
// Example pattern
tokio::spawn(async move {
    loop {
        send_heartbeat().await;
        tokio::time::sleep(Duration::from_secs(600)).await;
    }
});
```
- [ ] Yes, using tokio::spawn or similar
- [ ] No background task
- [ ] Not sure

---

### Section 9: Logging & Debugging

**Q9.1: Can you enable verbose logging for heartbeat?**
```rust
// Add detailed logs:
println!("🔍 DEBUG: Heartbeat starting");
println!("🔍 DEBUG: Cluster ID: {}", cluster_id);
println!("🔍 DEBUG: Sync Token: {}...", &sync_token[..20]);
println!("🔍 DEBUG: URL: {}", url);
println!("🔍 DEBUG: Payload: {}", serde_json::to_string_pretty(&payload)?);
println!("🔍 DEBUG: Response Status: {}", response.status());
println!("🔍 DEBUG: Response Body: {}", response.text().await?);
```
- [ ] Can add and will provide logs
- [ ] Already have verbose logs
- [ ] Not sure how to add logs

**Q9.2: Are there any panics or crashes?**
```rust
// Look for:
thread 'main' panicked at 'error message', src/file.rs:line:col
```
- [ ] Yes, seeing panics (please provide)
- [ ] No panics
- [ ] App crashes without error message

---

### Section 10: Specific Implementation Questions

**Q10.1: After user logs in, is heartbeat loop started?**

**User Flow:**
1. User opens CentCom
2. User signs in with credentials
3. Cluster registration happens (if not already registered)
4. ??? Does heartbeat loop start here?

Please trace the flow:
```
User Login → _____________ → _____________ → Heartbeat Loop Start?
```

**Q10.2: Is there a "heartbeat manager" or similar?**
- [ ] Yes, there's a HeartbeatManager/Service
- [ ] No, heartbeat logic is scattered
- [ ] Heartbeat is part of another service

**Q10.3: Can you manually trigger a heartbeat?**
```rust
// Is there a function like:
pub fn trigger_heartbeat_now() { ... }
```
- [ ] Yes, can trigger manually
- [ ] No manual trigger available
- [ ] Not sure

**Q10.4: Does CentCom wait for cluster registration before starting heartbeat?**
```rust
// Expected flow:
1. Register cluster → get sync_token
2. Save sync_token to storage
3. Start heartbeat loop using sync_token
```
- [ ] Yes, follows this flow
- [ ] No, tries to send heartbeat before registration
- [ ] Not sure

---

## 🔧 Diagnostic Tests to Run

### Test 1: Manual Heartbeat Test

**From CentCom terminal, run:**
```rust
// Add a test function that manually sends ONE heartbeat
// and prints the full response
```

**Expected output:**
```
🧪 Sending test heartbeat...
📤 URL: http://localhost:3594/api/centcom/clusters/local/heartbeat
📤 Headers: {
  "Authorization": "Bearer eyJhbGc...",
  "Content-Type": "application/json"
}
📤 Payload: { ... }
📥 Response Status: 200 OK
📥 Response Body: {
  "success": true,
  "cluster_status": "healthy",
  "should_throttle": false,
  "warnings": [],
  "next_heartbeat_seconds": 600
}
✅ Test heartbeat successful!
```

Can you add this test function and run it?

---

### Test 2: Check Heartbeat Timing

**Add a timestamp log:**
```rust
println!("💓 Heartbeat sent at: {}", chrono::Local::now().to_rfc3339());
```

**Expected output pattern:**
```
💓 Heartbeat sent at: 2025-01-07T10:00:00-08:00
💓 Heartbeat sent at: 2025-01-07T10:10:00-08:00
💓 Heartbeat sent at: 2025-01-07T10:20:00-08:00
```

Are you seeing heartbeats every 10 minutes?

---

### Test 3: Check Lyceum Backend Logs

**In Lyceum terminal (where Next.js is running), look for:**
```
✅ Heartbeat received for cluster: xxx-xxx-xxx
📊 Health status: healthy
✅ Cluster status updated: xxx-xxx-xxx
```

**If you see:**
```
❌ Invalid sync token
❌ Failed to update cluster
```

Then there's a problem with the token or database update.

---

## 📊 Expected vs Actual Comparison

| What | Expected | Actual | Status |
|------|----------|--------|--------|
| Heartbeat Interval | 10 minutes (600s) | __________ | ⚠️ |
| Heartbeat URL | `localhost:3594/api/centcom/clusters/local/heartbeat` | __________ | ⚠️ |
| Response Status | 200 OK | __________ | ⚠️ |
| `last_heartbeat_at` age | < 15 minutes | __________ | ⚠️ |
| `health_status` in DB | `healthy` | `unknown` | ❌ |
| `cluster_status` in DB | `online` | __________ | ⚠️ |
| Connection indicator | Green "Connected" | Gray "Offline" | ❌ |
| Heartbeat logs visible | Yes | __________ | ⚠️ |
| Sync token valid | Yes (90 days) | __________ | ⚠️ |

---

## 🎯 Most Likely Issues (Ranked)

Based on symptoms (offline + unknown), most likely causes:

### 1. **Heartbeat Loop Not Running** (90% probability)
**Symptoms:**
- No heartbeat logs in CentCom terminal
- `last_heartbeat_at` is old or NULL
- Status stays offline regardless of time

**How to confirm:**
- Check if you see `💓 Sending heartbeat` logs
- Check `last_heartbeat_at` in database

**Fix:**
- Ensure heartbeat loop starts after registration
- Verify background task is spawned

---

### 2. **Heartbeat Failing Silently** (70% probability)
**Symptoms:**
- Heartbeat loop is running (see logs)
- But no successful responses
- Errors might be swallowed

**How to confirm:**
- Check response status codes
- Look for error logs

**Fix:**
- Add better error handling and logging
- Don't silently ignore failures

---

### 3. **Sync Token Issues** (50% probability)
**Symptoms:**
- Heartbeats sent but getting 401
- Token expired or invalid

**How to confirm:**
- Check if token is JWT format
- Check expiration date in token payload
- Try re-registering cluster

**Fix:**
- Re-register cluster to get new token
- Implement token refresh logic

---

### 4. **Wrong Payload Format** (30% probability)
**Symptoms:**
- Getting 400 Bad Request
- Required fields missing

**How to confirm:**
- Check response body for error message
- Validate payload against interface

**Fix:**
- Ensure all required fields are included
- Match TypeScript interface exactly

---

### 5. **Health Status Not Sent** (20% probability - minor)
**Symptoms:**
- Connected but health shows "unknown"
- Heartbeat working but missing health field

**How to confirm:**
- Check if `status.health` is in payload

**Fix:**
- Add `health: "healthy"` to status object
- This is optional but improves UX

---

## ✅ Action Items for CentCom Team

**High Priority (Fix immediately):**

1. [ ] **Verify heartbeat loop is running**
   - Add log at start: `println!("🔄 Heartbeat loop started")`
   - Add log for each heartbeat: `println!("💓 Sending heartbeat #{}", count)`
   - Provide logs showing heartbeat is executing

2. [ ] **Check response status codes**
   - Log: `println!("📊 Response status: {}", response.status())`
   - Log: `println!("📥 Response body: {}", response.text().await?)`
   - Report what you see

3. [ ] **Verify sync token is included**
   - Log: `println!("🔑 Sync token: {}...", &sync_token[..20])`
   - Confirm Authorization header is set

4. [ ] **Check `last_heartbeat_at` in database**
   - Query Lyceum database
   - Report the timestamp
   - Calculate age (current time - last_heartbeat_at)

**Medium Priority (Improve reliability):**

5. [ ] **Add `health: "healthy"` to heartbeat payload**
   ```rust
   status: {
     is_running: true,
     version: "23.12",
     uptime_seconds: 3600,
     health: "healthy", // ADD THIS
   }
   ```

6. [ ] **Add error handling and retry logic**
   - Don't silently ignore failures
   - Log errors clearly
   - Retry failed heartbeats

7. [ ] **Test manual heartbeat trigger**
   - Add test function
   - Run it while CentCom is open
   - Verify Lyceum receives it

**Low Priority (Nice to have):**

8. [ ] **Add projects array to heartbeat**
   - Query ClickHouse for projects
   - Include in payload
   - Users will see projects in Lyceum

9. [ ] **Implement health detection**
   - Check disk space
   - Check for errors
   - Set health: "healthy", "degraded", or "offline"

---

## 📞 How to Provide Answers

Please create a document or message with:

1. **Answers to all questions marked with [ ]**
2. **Logs from CentCom showing:**
   - App startup
   - Login flow
   - Cluster registration
   - Heartbeat attempts (if any)
   - Any errors

3. **Database query results:**
   ```sql
   SELECT * FROM local_cluster_usage WHERE cluster_key = 'LOCAL-XXXX';
   ```

4. **Code snippets:**
   - Where heartbeat is defined
   - Where heartbeat loop is started
   - Current payload structure

5. **Test results:**
   - Manual heartbeat test
   - curl test from terminal
   - Timing test (are heartbeats 10 min apart?)

---

## 🎯 Expected Resolution

Once we identify the root cause, the fix should result in:

**In Lyceum `/clusters` page:**
- Status: "active" ✅
- Health: "healthy" ✅
- Badge: Green "Connected" ✅
- Last seen: "Just now" or "X minutes ago" ✅

**In database:**
- `last_heartbeat_at`: Within last 10 minutes ✅
- `health_status`: "healthy" ✅
- `cluster_status`: "online" ✅
- `is_running`: true ✅

**In logs:**
- Heartbeat sent every 10 minutes ✅
- Response: 200 OK ✅
- No errors ✅

---

**Document Created:** January 7, 2025
**Issue:** Cluster showing offline despite CentCom being active
**Next Step:** CentCom team to answer questions and provide logs
