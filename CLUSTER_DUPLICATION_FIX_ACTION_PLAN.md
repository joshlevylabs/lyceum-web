# Cluster Duplication Fix - Action Plan

## ✅ What I've Done (Backend)

### 1. Added Backend Validation
**File:** [src/app/api/centcom/clusters/local/register/route.ts](src/app/api/centcom/clusters/local/register/route.ts#L69-L81)

The registration endpoint now **rejects corrupted machine fingerprints** with validation:
- Must be a string
- Must be at least 8 characters
- Cannot contain `[object`, `undefined`, or `null`

**Result:** Future registration attempts with corrupted fingerprints will fail with a clear error message instead of creating duplicate clusters.

### 2. Created SQL Cleanup Script
**File:** [FIX_DUPLICATE_CLUSTERS.sql](FIX_DUPLICATE_CLUSTERS.sql)

This script will remove the corrupted `LOCAL-0002` cluster from your database.

### 3. Created Tauri Bug Documentation
**File:** [TAURI_BUG_FIX.md](TAURI_BUG_FIX.md)

Complete guide for fixing the Tauri app bug with code examples and testing instructions.

---

## 🎯 What You Need to Do

### STEP 1: Clean Up the Database (Immediate - 2 minutes)

1. Open your **Supabase SQL Editor**
2. Copy and paste the contents of [FIX_DUPLICATE_CLUSTERS.sql](FIX_DUPLICATE_CLUSTERS.sql)
3. Run **STEP 1** to see the corrupted clusters
4. **Uncomment** the DELETE statement in STEP 2
5. Run the DELETE to remove `LOCAL-0002`
6. Run **STEP 3** to verify only `LOCAL-0011` remains

**Expected Result:**
- `LOCAL-0002` (corrupted) → ❌ DELETED
- `LOCAL-0011` (valid) → ✅ KEPT
- Web app `/clusters` page shows only 1 local cluster

---

### STEP 2: Fix the Tauri App Bug (Required for permanent fix)

The Tauri native app is the source of the bug. You need to fix it in the Tauri codebase.

#### A. Locate the Bug

In your **Tauri app repository**, search for:
```bash
# Find cluster registration code
grep -r "clusters/local/register" src/
grep -r "machine_fingerprint" src/
```

#### B. Common File Locations
Look for files like:
- `src/services/cluster-registration.ts`
- `src/services/centcom.ts`
- `src/lib/cluster.ts`
- `src-tauri/src/commands/cluster.rs` (if using Rust commands)

#### C. Apply the Fix

See [TAURI_BUG_FIX.md](TAURI_BUG_FIX.md) for:
- ✅ Correct implementation example
- ❌ Common mistakes to avoid
- 🧪 Testing instructions
- 🔍 Debug logging

**Key Points:**
1. `machine_fingerprint` must be a **string hash** (e.g., `'6bb0d83e'`)
2. NOT an object stringified as `'[object Object]'`
3. Generate it from system info (OS, arch, hostname) using SHA-256

#### D. Test the Fix

1. Build the Tauri app with the fix
2. Run it locally
3. Check the registration logs - should see:
   ```
   Machine fingerprint: '6bb0d83e' (valid hash)
   ```
4. Verify in Supabase - should UPDATE existing cluster, not create new one

---

### STEP 3: Deploy Backend Changes (Already Done ✅)

The backend validation is already in place in this codebase:
- [src/app/api/centcom/clusters/local/register/route.ts](src/app/api/centcom/clusters/local/register/route.ts)

Next time you deploy this web app to production, the validation will be live.

**When to deploy:**
- Can deploy anytime (backward compatible)
- Will prevent future corrupted registrations
- Existing valid clusters are unaffected

---

## 📊 Current Status

### Before Fix:
```
User sees in /clusters:
├── LOCAL-0002 ❌ (corrupted, machine_fingerprint: '[object ')
└── LOCAL-0011 ✅ (valid, machine_fingerprint: '6bb0d83e')

Problem: Duplicate clusters!
```

### After STEP 1 (DB Cleanup):
```
User sees in /clusters:
└── LOCAL-0011 ✅ (valid, machine_fingerprint: '6bb0d83e')

Result: Only one cluster! But Tauri app will create duplicates again if restarted.
```

### After STEP 2 (Tauri Fix):
```
User sees in /clusters:
└── LOCAL-0011 ✅ (valid, machine_fingerprint: '6bb0d83e')

Result: Only one cluster, and restarting Tauri app WON'T create duplicates!
```

---

## 🔧 Testing the Complete Fix

After completing STEPS 1 and 2:

### Test 1: Restart Tauri App (Should NOT Create Duplicate)
1. Close the Lyceum native app
2. Start it again
3. Check `/clusters` page
4. **Expected:** Still shows only 1 local cluster (LOCAL-0011)
5. **Success:** Heartbeat updated existing cluster instead of creating new one

### Test 2: Check Database
```sql
SELECT
  cluster_key,
  machine_fingerprint,
  last_heartbeat_at,
  updated_at
FROM local_cluster_usage
WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
ORDER BY last_heartbeat_at DESC;
```

**Expected Result:**
- Only 1 row
- `cluster_key = 'LOCAL-0011'`
- `machine_fingerprint = '6bb0d83e'` (or similar valid hash)
- `last_heartbeat_at` is recent (within last 10 minutes)

### Test 3: Check Backend Logs
When Tauri app connects, you should see:
```
✅ Heartbeat received for cluster: LOCAL-0011
✅ Cluster status updated: LOCAL-0011
```

NOT:
```
❌ Invalid machine_fingerprint format: [object
```

---

## 🚨 If Issues Persist

### Issue: Tauri app gets 400 error after fix
**Cause:** Backend validation rejecting corrupted fingerprint (good!)
**Solution:** The Tauri app STILL has the bug - review the fix in TAURI_BUG_FIX.md

### Issue: Multiple clusters still appearing
**Cause:** STEP 1 (database cleanup) not completed
**Solution:** Run the SQL cleanup script to remove duplicates

### Issue: Can't find Tauri registration code
**Response:** Share your Tauri app's file structure:
```bash
cd /path/to/tauri/app
find src -name "*.ts" -o -name "*.tsx" | head -30
```

---

## 📁 Files Created

1. ✅ **FIX_DUPLICATE_CLUSTERS.sql** - Database cleanup script
2. ✅ **TAURI_BUG_FIX.md** - Tauri app fix documentation
3. ✅ **DELETE_CORRUPTED_CLUSTER.sql** - Alternative cleanup (simpler)
4. ✅ **Backend validation added** - Prevents future corruption

---

## ⏰ Time Estimates

- **STEP 1 (DB Cleanup):** 2-5 minutes
- **STEP 2 (Tauri Fix):** 15-30 minutes (depending on codebase familiarity)
- **Testing:** 5-10 minutes

**Total:** ~20-45 minutes for complete fix

---

## 🎉 Success Criteria

✅ Only 1 local cluster visible in `/clusters` page
✅ `LOCAL-0011` with valid machine_fingerprint
✅ Restarting Tauri app does NOT create duplicates
✅ Backend logs show cluster updates, not new registrations
✅ No `[object` strings in database

---

## Need Help?

If you need assistance:
1. Share the Tauri app file structure
2. Show the registration code from the Tauri app
3. Share any error messages from backend logs

I can help you locate and fix the exact bug in your Tauri codebase.
