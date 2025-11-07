# Tauri App Machine Fingerprint Bug Fix

## Problem Summary

The Lyceum native application (Tauri) is sending a **corrupted machine_fingerprint** when registering local clusters, causing duplicate cluster records to be created.

### What's happening:
- **Expected:** `machine_fingerprint: '6bb0d83e'` (hash string)
- **Actual:** `machine_fingerprint: '[object '` (corrupted object serialization)

### Impact:
- Each time the Tauri app starts, it creates a **new cluster** instead of updating the existing one
- Users see multiple duplicate clusters in the `/clusters` page
- The backend cannot properly deduplicate because the fingerprint is different each time

---

## Root Cause

The bug is in the **cluster registration code** in the Tauri app where it constructs the API request to `/api/centcom/clusters/local/register`.

The JavaScript/TypeScript code is likely doing something like:

```typescript
// ❌ WRONG - Object being converted to string incorrectly
const machineFingerprint = getMachineFingerprint() // Returns an object
const body = {
  machine_fingerprint: machineFingerprint, // Object gets stringified as "[object Object]"
  // ... other fields
}
```

Or:

```typescript
// ❌ WRONG - String concatenation with object
const machineFingerprint = getMachineFingerprint()
const body = {
  machine_fingerprint: String(machineFingerprint), // "[object Object]"
  // ... other fields
}
```

---

## Solution

The `machine_fingerprint` must be a **proper string hash** before being sent to the API.

### ✅ Correct Implementation:

```typescript
// 1. Generate machine fingerprint as a hash string
async function getMachineFingerprint(): Promise<string> {
  const { platform, arch, hostname } = await import('@tauri-apps/api/os')

  const platformName = await platform()
  const architecture = await arch()
  const hostName = await hostname()

  // Combine system identifiers
  const systemId = `${platformName}-${architecture}-${hostName}`

  // Hash to create fingerprint (using crypto or a hash library)
  const encoder = new TextEncoder()
  const data = encoder.encode(systemId)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Return first 8 characters as fingerprint
  return hashHex.substring(0, 8)
}

// 2. Use it correctly in registration
async function registerCluster() {
  const machineFingerprint = await getMachineFingerprint()

  // Ensure it's a string
  console.log('Machine fingerprint:', machineFingerprint)
  console.log('Type:', typeof machineFingerprint)

  const body = {
    machine_fingerprint: machineFingerprint, // ✅ Now it's a string like '6bb0d83e'
    license_key: licenseKey,
    cluster_name: clusterName,
    system_info: {
      os: await platform(),
      os_version: await version(),
      architecture: await arch(),
      hostname: await hostname(),
      cpu_cores: cpuCores,
      memory_gb: memoryGb
    },
    clickhouse_version: clickhouseVersion,
    centcom_version: CENTCOM_VERSION
  }

  const response = await fetch('https://lyceum-sable.vercel.app/api/centcom/clusters/local/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(body)
  })

  return response.json()
}
```

---

## Testing the Fix

After implementing the fix, verify the machine fingerprint is correct:

### 1. Add Debug Logging

```typescript
console.log('🔍 Machine Fingerprint Debug:', {
  fingerprint: machineFingerprint,
  type: typeof machineFingerprint,
  length: machineFingerprint?.length,
  isString: typeof machineFingerprint === 'string',
  preview: machineFingerprint?.substring(0, 20)
})
```

### 2. Expected Output

```
🔍 Machine Fingerprint Debug: {
  fingerprint: '6bb0d83e',
  type: 'string',
  length: 8,
  isString: true,
  preview: '6bb0d83e'
}
```

### 3. ❌ Bad Output (Current Bug)

```
🔍 Machine Fingerprint Debug: {
  fingerprint: '[object Object]',
  type: 'string',
  length: 15,
  isString: true,
  preview: '[object Object]'
}
```

---

## Where to Look in Tauri Codebase

Search for these files/patterns in your Tauri app repository:

1. **Cluster registration logic:**
   - `src/services/cluster.ts`
   - `src/services/centcom.ts`
   - `src/lib/cluster-registration.ts`

2. **Search for these patterns:**
   ```bash
   # Find cluster registration API calls
   grep -r "clusters/local/register" src/

   # Find machine_fingerprint usage
   grep -r "machine_fingerprint" src/

   # Find getMachineFingerprint or similar
   grep -r "getMachineFingerprint\|machineFingerprint\|machine_id" src/
   ```

3. **Look for:**
   - Where the API request body is constructed
   - Where `machine_fingerprint` is generated or retrieved
   - Any object-to-string conversions

---

## Backend Deduplication Logic

For reference, the backend deduplicates clusters using:

```sql
-- From: src/app/api/centcom/clusters/local/register/route.ts
.upsert({
  user_id: user.id,
  license_id: license.id,
  machine_fingerprint,  -- Must be a string hash
  // ...
}, {
  onConflict: 'user_id,machine_fingerprint',  -- Unique constraint
  ignoreDuplicates: false
})
```

The backend expects:
- `machine_fingerprint` to be a **stable string hash** (e.g., `'6bb0d83e'`)
- Same `user_id` + same `machine_fingerprint` = **update existing cluster**
- Different fingerprints = **create new cluster**

---

## Verification After Fix

After deploying the fix:

1. **Restart the Tauri app** (should update existing cluster, not create new one)
2. **Check the logs** in Supabase:
   ```sql
   SELECT
     cluster_key,
     machine_fingerprint,
     last_heartbeat_at
   FROM local_cluster_usage
   WHERE user_id = '2c3d4747-8d67-45af-90f5-b5e9058ec246'
   ORDER BY last_heartbeat_at DESC;
   ```
3. **Verify only ONE cluster** exists (no new duplicates)
4. **Check the web app** at `/clusters` - should show only one local cluster

---

## Related Files

- **Web App API:** [src/app/api/centcom/clusters/local/register/route.ts](src/app/api/centcom/clusters/local/register/route.ts)
- **Cleanup SQL:** [FIX_DUPLICATE_CLUSTERS.sql](FIX_DUPLICATE_CLUSTERS.sql)
- **Clusters Page:** [src/app/clusters/page.tsx](src/app/clusters/page.tsx)

---

## Questions?

If you need help finding the specific file in the Tauri codebase, share the file structure and I can help locate the bug.
