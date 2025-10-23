# Lyceum Local Cluster Integration - Answers for Centcom Team

**Date:** 2025-10-22
**Status:** ✅ Complete Answers Ready
**Prepared By:** Lyceum Backend Team

---

## Overview

This document provides detailed answers to all Centcom team questions regarding local cluster integration with Lyceum's license validation and cluster registration system.

---

## Answers to Critical Questions

### 1. License Validation vs. Cluster Registration Flow

**Answer:** Your understanding is CORRECT. Here's the precise flow:

```
User Login to Centcom
  ↓
POST /api/centcom/auth/login (existing endpoint)
  → Returns: { success: true, session_token, user: {...}, licenses: [...] }
  ↓
[For each license, check if local_cluster is enabled]
POST /api/licenses/validate
  → Request: { license_key, user_id }
  → Returns: { valid: true, local_cluster: { enabled: true, limits: {...} } }
  ↓
Configure Local ClickHouse with limits (but DON'T start it yet)
  ↓
[Show UI: "Local Cluster Available - Click to Register with Lyceum"]
  ↓
User clicks "Register with Lyceum" button
  ↓
POST /api/centcom/clusters/local/register
  → Request: { license_key, cluster_name, machine_fingerprint, cluster_config }
  → Returns: { success: true, cluster_id: "uuid", cluster_key: "LOCAL-0011" }
  ↓
Start ClickHouse with registered configuration
  ↓
Start automatic heartbeat (every 10 minutes)
```

**Specific Answers:**

a) ✅ **Yes, your flow is correct**

b) ✅ **Yes**, `/api/licenses/validate` returns `local_cluster` config even if the cluster is NOT registered yet. This is by design - it tells you if the license ALLOWS local clusters, but registration is a separate step.

c) ✅ **Use `/api/centcom/clusters/local/register`** for cluster registration. This is the correct endpoint.

d) **Relationship between keys:**
   - **License Key** (e.g., `CENTCOM-ENT-2025-9X00UFMU`): Identifies the user's license and determines what features they have access to (including local cluster limits)
   - **Cluster Key** (e.g., `LOCAL-0011`): Identifies a specific local cluster instance registered under that license
   - **One license can have MULTIPLE cluster keys** (e.g., user's desktop + laptop)
   - The license key is used to validate that the user has permission to register a cluster
   - The cluster key is used for subsequent heartbeats and cluster management

---

### 2. Local Cluster Configuration Retrieval

**Answer:** Use `/api/licenses/validate` (NOT the v1 endpoint)

**Recommended Implementation:**

```typescript
// During login flow (after successful authentication)
async function getLicenseConfiguration(licenseKey: string, userId: string) {
  const response = await fetch('https://lyceum-sable.vercel.app/api/licenses/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey,
      user_id: userId,
      user_type: 'engineer',  // Optional
      requested_plugin: 'centcom'  // Optional
    })
  });

  const result = await response.json();

  if (result.valid && result.local_cluster?.enabled) {
    return result.local_cluster.limits;
  }

  return null; // Local clusters not available
}
```

**Specific Answers:**

a) ✅ **Use `/api/licenses/validate`** (primary endpoint, not v1)

b) **Required parameters:**
   ```json
   {
     "license_key": "CENTCOM-ENT-2025-9X00UFMU",  // REQUIRED
     "user_id": "user-uuid"                       // REQUIRED
   }
   ```

   **Optional parameters:**
   ```json
   {
     "user_type": "engineer",        // Optional but recommended
     "requested_plugin": "centcom",  // Optional
     "requested_action": "use"       // Optional
   }
   ```

c) ✅ **One call per license key**. You need to validate each license separately. However, you should only validate the MAIN APPLICATION license (the one with `license_category === 'main_application'`).

d) ❌ **No machine_fingerprint during validation**. The `machine_fingerprint` is ONLY needed during cluster registration (`/register` endpoint).

---

### 3. Identifying the "CENTCOM" License

**Answer:** Use `license_category === 'main_application'`

**Recommended Implementation:**

```typescript
// After user login, get all licenses from /api/centcom/auth/login response
const licenses = loginResponse.licenses || [];

// Find the main application license
const mainLicense = licenses.find(license =>
  license.license_category === 'main_application'
);

if (!mainLicense) {
  console.error('No main application license found');
  return;
}

// Now validate this license to get local cluster config
const validation = await getLicenseConfiguration(
  mainLicense.key_code,
  loginResponse.user.id
);

if (validation?.local_cluster?.enabled) {
  // Configure local cluster with limits
  configureLocalCluster(validation.local_cluster.limits);
}
```

**Specific Answers:**

a) ⚠️ **Checking for 'CENTCOM' in key_code is NOT reliable** - key formats may change

b) ✅ **Use `license_category === 'main_application'`** - this is the correct and reliable method

c) ❌ **No, a user should only have ONE main_application license at a time** - if there are multiple, it's a data issue

d) **If multiple exist** (edge case): Use the one with `status === 'active'` and the most recent `created_at` date

e) ❌ **Don't use "most permissive limits"** - use the single active main_application license. If there are multiple, log a warning and report to Lyceum team.

---

### 4. Unlimited Values (-1) Interpretation

**Answer:** Yes, `-1` means unlimited/no limit

**Recommended Implementation:**

```typescript
interface LocalClusterLimits {
  max_storage_gb: number;
  max_monthly_queries: number;  // -1 = unlimited
  max_users: number;             // -1 = unlimited
  lifecycle_tiers_enabled: boolean;
  offline_grace_days: number;
}

function isUnlimited(value: number): boolean {
  return value === -1;
}

function canExecuteQuery(currentQueries: number, limit: number): boolean {
  if (isUnlimited(limit)) {
    return true;  // Always allow
  }
  return currentQueries < limit;
}

// Usage example
const limits = validation.local_cluster.limits;

if (isUnlimited(limits.max_monthly_queries)) {
  console.log('✅ Unlimited queries enabled');
} else {
  console.log(`Query limit: ${limits.max_monthly_queries.toLocaleString()}`);
}
```

**Specific Answers:**

a) ✅ **Yes, `-1` means "no limit" (unlimited)**

b) ✅ **Treat `-1` as unlimited** - don't use `Number.MAX_SAFE_INTEGER`, just skip enforcement checks

c) **Special values:**
   - `-1` = Unlimited (for queries and users only, never for storage)
   - `> 0` = Specific limit
   - `0` = Not allowed (should be treated as an error)
   - `null` = Should use default values (see default fallback below)

d) ✅ **If `local_cluster.enabled` is `false`**:
   - ❌ **Disable the entire local cluster feature**
   - Hide the "Register with Lyceum" button
   - Show message: "Local cluster deployment is not available with your current license"

**Default Fallback (if limits are missing):**
```typescript
const DEFAULT_LIMITS = {
  max_storage_gb: 10,
  max_monthly_queries: 100000,
  max_users: 1,
  lifecycle_tiers_enabled: false,
  offline_grace_days: 7
};

const limits = validation.local_cluster?.limits || DEFAULT_LIMITS;
```

---

### 5. Cluster Registration Endpoint

**Answer:** Your implementation is CORRECT

**Endpoint:** `POST /api/centcom/clusters/local/register`

**Request Format:**
```json
{
  "license_key": "CENTCOM-ENT-2025-9X00UFMU",
  "cluster_name": "Local Cluster (DESKTOP-ABC123)",
  "machine_fingerprint": "sha256-hash-of-machine-info",
  "cluster_config": {
    "version": "25.9.2.1",
    "port": 9000,
    "http_port": 8123,
    "storage_path": "C:\\Users\\...\\.centcom\\clickhouse"
  }
}
```

**Expected Response (SUCCESS):**
```json
{
  "success": true,
  "cluster": {
    "id": "uuid-here",
    "cluster_key": "LOCAL-0011",
    "cluster_name": "Local Cluster (DESKTOP-ABC123)",
    "status": "healthy"
  },
  "message": "Local cluster registered successfully"
}
```

**Expected Response (ERROR - License doesn't allow local clusters):**
```json
{
  "success": false,
  "error": "Local cluster deployment not allowed for this license"
}
```

**Specific Answers:**

a) ✅ **Yes, `/api/centcom/clusters/local/register` is correct**

b) **Response structure:**
   ```typescript
   interface RegistrationResponse {
     success: boolean;
     cluster?: {
       id: string;              // UUID for database reference
       cluster_key: string;     // Human-readable key like "LOCAL-0011"
       cluster_name: string;    // Your cluster name
       status: string;          // "healthy", "offline", etc.
     };
     message?: string;
     error?: string;            // If success is false
   }
   ```

   **Note:** There is NO `sync_token` or `sync_interval_seconds` in the response. Just use the cluster `id` for heartbeats.

c) ✅ **Yes, `LOCAL-#` keys are auto-generated sequentially** by the backend

d) ✅ **Yes, one license can register MULTIPLE clusters** (e.g., desktop + laptop + server)

e) ✅ **Yes, `machine_fingerprint` should be unique per device**. This is how the backend identifies different machines.

---

### 6. Multiple Local Clusters Showing Up

**Answer:** This is likely due to the `/discover` endpoint returning ALL clusters (not just the current user's)

**Current Behavior:**
```typescript
// GET /api/centcom/clusters/discover currently returns:
{
  "cloud_clusters": [
    { id: "1", name: "Production Cloud", type: "cloud", status: "healthy" },
    // ... all cloud clusters
  ],
  "local_clusters": [
    // ALL local clusters from ALL users (this is the issue)
    { id: "2", name: "John's Desktop", type: "local", status: "healthy" },
    { id: "3", name: "Jane's Laptop", type: "local", status: "healthy" },
    // ... many more
  ]
}
```

**Solution:** Filter clusters by the current user's license

**Recommended Implementation:**

```typescript
async function getMyLocalClusters(licenseKey: string) {
  // Get all clusters
  const response = await fetch('https://lyceum-sable.vercel.app/api/centcom/clusters/discover', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,  // Include auth token
      'X-License-Key': licenseKey  // Include license key
    }
  });

  const data = await response.json();

  // Filter to only show user's own local clusters
  const myLocalClusters = data.local_clusters.filter(cluster => {
    // Check if this cluster belongs to the current license
    return cluster.license_key === licenseKey;
  });

  return {
    cloud_clusters: data.cloud_clusters,
    local_clusters: myLocalClusters
  };
}
```

**Specific Answers:**

a) ✅ **Yes, `/discover` SHOULD only return clusters for the current user**, but currently returns all. **I will fix this in the backend.**

b) **Duplicate detection:** The backend uses `machine_fingerprint` to identify the same machine. If you register with the same `machine_fingerprint` twice, it should update the existing cluster rather than create a new one.

c) ✅ **Yes, Centcom should filter out its own local cluster from the "Cloud Clusters" UI list** since it's already running locally. Show it in a separate "My Local Cluster" section.

d) **Expected response from `/discover`:**
   ```json
   {
     "cloud_clusters": [
       {
         "id": "uuid",
         "cluster_name": "Production Cloud",
         "cluster_key": "CLOUD-001",
         "cluster_type": "cloud",
         "status": "healthy",
         "host": "production.example.com",
         "port": 9000
       }
     ],
     "local_clusters": [
       {
         "id": "uuid",
         "cluster_name": "My Desktop",
         "cluster_key": "LOCAL-0011",
         "cluster_type": "local",
         "status": "healthy",
         "last_heartbeat_at": "2025-10-22T12:00:00Z"
       }
     ],
     "stats": {
       "total_clusters": 2,
       "cloud_count": 1,
       "local_count": 1
     }
   }
   ```

---

### 7. Offline Grace Period

**Answer:** Offline grace period starts counting from the last successful heartbeat

**Recommended Implementation:**

```typescript
interface OfflineTracker {
  lastSuccessfulHeartbeat: Date;
  offlineGraceDays: number;
}

function checkOfflineStatus(tracker: OfflineTracker): OfflineStatus {
  const now = new Date();
  const daysSinceLastHeartbeat =
    (now.getTime() - tracker.lastSuccessfulHeartbeat.getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceLastHeartbeat < tracker.offlineGraceDays) {
    // Still within grace period
    return {
      status: 'online_or_grace',
      daysRemaining: tracker.offlineGraceDays - daysSinceLastHeartbeat,
      action: 'allow_all_operations'
    };
  } else if (daysSinceLastHeartbeat < tracker.offlineGraceDays * 1.5) {
    // Grace period expired but give extra buffer
    return {
      status: 'grace_expired_warning',
      daysOverdue: daysSinceLastHeartbeat - tracker.offlineGraceDays,
      action: 'show_warning_continue_working'
    };
  } else {
    // Too long offline - restrict operations
    return {
      status: 'offline_too_long',
      daysOverdue: daysSinceLastHeartbeat - tracker.offlineGraceDays,
      action: 'read_only_mode'
    };
  }
}

// Usage
const status = checkOfflineStatus(tracker);

switch (status.action) {
  case 'allow_all_operations':
    // Normal operation
    break;
  case 'show_warning_continue_working':
    showWarning(`Reconnect to Lyceum soon. ${status.daysOverdue} days overdue.`);
    break;
  case 'read_only_mode':
    showError('Local cluster is in read-only mode. Reconnect to Lyceum.');
    setReadOnlyMode(true);
    break;
}
```

**Specific Answers:**

a) ✅ **Yes, store the last successful heartbeat timestamp** in local storage

b) **After offline_grace_days expires:**
   - **First 50% extra time:** Show warning but continue working
   - **After 150% of grace period:** Enter read-only mode
   - **Example:** 30 day grace period
     - Days 0-30: Normal operation
     - Days 31-45: Show warning, allow all operations
     - Days 46+: Read-only mode (can query, cannot insert/update)

c) ✅ **Yes, attempt to re-validate when network returns:**
   ```typescript
   window.addEventListener('online', async () => {
     console.log('Network reconnected, re-validating license...');
     await performHeartbeat();
   });
   ```

d) ✅ **Yes, update `last_heartbeat_at` field** during each heartbeat. The backend automatically tracks this.

---

### 8. License Validation Caching

**Answer:** Cache for 24 hours, re-validate on startup and reconnection

**Recommended Implementation:**

```typescript
interface CachedLicenseValidation {
  timestamp: number;
  validation: {
    valid: boolean;
    local_cluster: {
      enabled: boolean;
      limits: LocalClusterLimits;
    };
  };
}

class LicenseValidator {
  private cache: CachedLicenseValidation | null = null;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async validate(licenseKey: string, userId: string, forceRefresh = false): Promise<any> {
    // Check cache first
    if (!forceRefresh && this.cache) {
      const age = Date.now() - this.cache.timestamp;
      if (age < this.CACHE_TTL) {
        console.log(`Using cached validation (age: ${Math.round(age / 1000 / 60)} minutes)`);
        return this.cache.validation;
      }
    }

    // Cache expired or force refresh - fetch from API
    try {
      const response = await fetch('/api/licenses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: licenseKey, user_id: userId })
      });

      if (!response.ok) {
        // Validation failed - use cached data if available
        if (this.cache) {
          console.warn('Validation failed, using cached data');
          return this.cache.validation;
        }
        throw new Error('License validation failed and no cache available');
      }

      const validation = await response.json();

      // Update cache
      this.cache = {
        timestamp: Date.now(),
        validation
      };

      // Persist to local storage
      localStorage.setItem('license_validation_cache', JSON.stringify(this.cache));

      return validation;

    } catch (error) {
      // Network error - use cache if available
      if (this.cache) {
        console.warn('Network error, using cached validation');
        return this.cache.validation;
      }
      throw error;
    }
  }

  // Load cache from local storage on startup
  loadCache() {
    const cached = localStorage.getItem('license_validation_cache');
    if (cached) {
      this.cache = JSON.parse(cached);
    }
  }
}
```

**Specific Answers:**

a) ✅ **Yes, cache `local_cluster` config locally** in local storage

b) **Cache validity: 24 hours**

c) ✅ **Yes, re-validate on every app startup** (but use cache as fallback if validation fails)

d) ✅ **Yes, re-validate after network reconnection**

e) **If validation fails but cache exists:**
   - **Use cached config** and continue operating
   - **Show a warning** to the user: "Unable to verify license. Using cached configuration."
   - **Retry validation** every hour until successful

**Validation Schedule:**
- ✅ On app startup
- ✅ Every 24 hours (background task)
- ✅ When network reconnects (after being offline)
- ✅ When user clicks "Refresh License" button (manual)

---

### 9. Local Cluster Configuration Updates

**Answer:** Poll for updates every 24 hours, apply non-disruptive changes immediately

**Recommended Implementation:**

```typescript
interface LicenseUpdateCheck {
  lastCheck: Date;
  currentLimits: LocalClusterLimits;
}

async function checkForLicenseUpdates(
  licenseKey: string,
  userId: string,
  currentLimits: LocalClusterLimits
) {
  // Fetch latest license config
  const validation = await fetch('/api/licenses/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey, user_id: userId })
  }).then(r => r.json());

  const newLimits = validation.local_cluster.limits;

  // Compare with current limits
  const changes = detectChanges(currentLimits, newLimits);

  if (changes.length === 0) {
    console.log('No license limit changes detected');
    return;
  }

  // Apply changes based on type
  for (const change of changes) {
    if (change.field === 'max_monthly_queries') {
      // Can apply immediately (just updates counter logic)
      updateQueryLimit(change.newValue);
      showNotification(`Query limit updated: ${formatLimit(change.newValue)}`);
    }

    if (change.field === 'max_users') {
      // Can apply immediately
      updateUserLimit(change.newValue);
      showNotification(`User limit updated: ${formatLimit(change.newValue)}`);
    }

    if (change.field === 'max_storage_gb') {
      if (change.newValue > change.oldValue) {
        // Increase - can apply immediately
        updateStorageLimit(change.newValue);
        showNotification(`Storage limit increased to ${change.newValue}GB`);
      } else {
        // Decrease - check current usage
        const currentUsage = await getStorageUsage();
        if (currentUsage > change.newValue) {
          // User is over new limit
          showWarning(
            `Storage limit decreased to ${change.newValue}GB. ` +
            `You are currently using ${currentUsage}GB. ` +
            `Please reduce storage usage to avoid service interruption.`
          );
          // Still update the limit
          updateStorageLimit(change.newValue);
        } else {
          // Under new limit, safe to apply
          updateStorageLimit(change.newValue);
          showNotification(`Storage limit updated to ${change.newValue}GB`);
        }
      }
    }

    if (change.field === 'lifecycle_tiers_enabled') {
      if (change.newValue === true) {
        // Enabling - can apply after restart
        showNotification('Lifecycle tiers enabled. Restart Centcom to apply.');
      } else {
        // Disabling - needs careful migration
        showWarning('Lifecycle tiers disabled. Restart required.');
      }
    }
  }
}

function formatLimit(value: number): string {
  return value === -1 ? 'Unlimited' : value.toLocaleString();
}
```

**Specific Answers:**

a) ✅ **Yes, refresh license configuration every 24 hours** (same schedule as cache expiry)

b) **Apply changes:**
   - **Immediately:** Query limits, user limits, storage increases
   - **On restart:** Lifecycle tiers, major configuration changes
   - **Never automatic:** Storage decreases below current usage (warn user)

c) **If new limits are MORE restrictive:**
   - **Storage:** If current usage > new limit, show warning but don't block
   - **Queries:** Reset monthly counter, apply new limit starting next month
   - **Users:** If current users > new limit, allow existing but block new users

   **Example:**
   ```typescript
   if (currentStorageGB > newLimitGB) {
     showWarning(
       `Your license storage limit has been reduced to ${newLimitGB}GB. ` +
       `You are currently using ${currentStorageGB}GB. ` +
       `New data writes will be blocked until usage falls below the limit.`
     );
     blockNewWrites = true;
   }
   ```

d) ✅ **Yes, send notifications:**
   - **Increases:** "Your storage limit has been increased to 1TB"
   - **Decreases:** "Your storage limit has been reduced. Current usage exceeds new limit."
   - **Feature enabled:** "Lifecycle tiers have been enabled for your cluster"

---

### 10. Multiple License Keys per User

**Answer:** Only use the main application license

**Recommended Implementation:**

```typescript
async function getLocalClusterConfig(loginResponse: any) {
  const licenses = loginResponse.licenses || [];

  // Filter to only main application licenses
  const mainLicenses = licenses.filter(l =>
    l.license_category === 'main_application' &&
    l.status === 'active'
  );

  if (mainLicenses.length === 0) {
    console.log('No main application license found');
    return null;
  }

  if (mainLicenses.length > 1) {
    console.warn('Multiple main application licenses found - using most recent');
    // Sort by created_at descending
    mainLicenses.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // Use the first (most recent) main application license
  const mainLicense = mainLicenses[0];

  // Validate this license to get local cluster config
  const validation = await fetch('/api/licenses/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: mainLicense.key_code,
      user_id: loginResponse.user.id
    })
  }).then(r => r.json());

  return validation.local_cluster;
}
```

**Specific Answers:**

a) ✅ **Main application license controls local cluster limits** (the one with `license_category === 'main_application'`)

b) ✅ **Yes, only look at `license_category === 'main_application'`** licenses. Ignore plugin licenses.

c) ⚠️ **Users SHOULD NOT have multiple main_application licenses**, but if they do:
   - Use the one with `status === 'active'`
   - If multiple are active, use the most recently created (`created_at` DESC)
   - Log a warning for the Lyceum team to investigate

d) ❌ **No, don't use "highest limits"** - use the single active main license

**Plugin licenses** (e.g., `PLUGIN-APX500-ENT-2025`):
- Do NOT affect local cluster limits
- Only control plugin-specific features
- Are validated separately when the plugin is loaded

---

### 11. Heartbeat Failure Handling

**Answer:** Retry with exponential backoff, warn after 3 failures

**Recommended Implementation:**

```typescript
class HeartbeatService {
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;
  private intervalMs = 10 * 60 * 1000; // 10 minutes
  private timerId: any = null;

  async sendHeartbeat(clusterId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/centcom/clusters/local/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster_id: clusterId,
          status: 'healthy',
          metrics: {
            queries_count: await getQueryCount(),
            storage_used_gb: await getStorageUsed(),
            active_users: await getActiveUsers()
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        this.handleFailure(response.status, error);
        return false;
      }

      const result = await response.json();

      // Reset failure count on success
      this.failureCount = 0;
      localStorage.setItem('last_successful_heartbeat', new Date().toISOString());

      return true;

    } catch (error) {
      this.handleFailure(0, error); // Network error
      return false;
    }
  }

  private handleFailure(statusCode: number, error: any) {
    this.failureCount++;

    console.error(`Heartbeat failed (${this.failureCount}/${this.MAX_FAILURES})`, error);

    if (statusCode === 404) {
      // Cluster not found - need to re-register
      console.error('Cluster not found in Lyceum. Re-registration required.');
      this.stop();
      showError('Local cluster connection lost. Please re-register with Lyceum.');
      // Trigger re-registration flow
      return;
    }

    if (statusCode === 401 || statusCode === 403) {
      // License invalid or expired
      console.error('License validation failed. Local cluster may be restricted.');
      this.stop();
      showError('License validation failed. Please check your license status.');
      // Trigger license re-validation
      return;
    }

    // Network error or temporary issue
    if (this.failureCount >= this.MAX_FAILURES) {
      showWarning(
        `Unable to reach Lyceum (${this.failureCount} failed attempts). ` +
        `Local cluster will continue operating in offline mode.`
      );
    }

    // Continue trying (don't stop the heartbeat)
  }

  start(clusterId: string) {
    this.stop(); // Clear any existing timer

    // Send immediate heartbeat
    this.sendHeartbeat(clusterId);

    // Schedule periodic heartbeats
    this.timerId = setInterval(() => {
      this.sendHeartbeat(clusterId);
    }, this.intervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
```

**Specific Answers:**

a) **Warn after 3 consecutive failures** (show warning banner)

b) ❌ **No, keep the same interval** (10 minutes). Don't increase frequency - it might indicate a network/server issue.

c) ✅ **Yes, offline_grace_period starts from last SUCCESSFUL heartbeat**

d) **HTTP Status Code Meanings:**
   - **200 OK:** Success - reset failure counter
   - **401 Unauthorized:** Invalid session/token - re-authenticate
   - **403 Forbidden:** License expired/revoked - stop cluster, show error
   - **404 Not Found:** Cluster doesn't exist - re-register
   - **500 Internal Server Error:** Temporary issue - retry
   - **0 (Network Error):** Offline or server down - retry, start offline grace period

**Retry Strategy:**
- ✅ Retry: 500, network errors
- ⚠️ Warn and continue: Repeated failures (3+)
- ❌ Stop and re-register: 404
- ❌ Stop and re-authenticate: 401, 403

---

### 12. Usage Enforcement

**Answer:** Enforce limits with warnings at 80%, 90%, 95%

**Recommended Implementation:**

```typescript
class UsageEnforcement {
  private limits: LocalClusterLimits;
  private currentUsage: Usage;

  constructor(limits: LocalClusterLimits) {
    this.limits = limits;
  }

  async checkStorageLimit(requestedGB: number): Promise<EnforcementResult> {
    const currentGB = await this.getStorageUsed();
    const newTotal = currentGB + requestedGB;
    const limitGB = this.limits.max_storage_gb;

    if (newTotal > limitGB) {
      return {
        allowed: false,
        reason: `Storage limit exceeded. Limit: ${limitGB}GB, Current: ${currentGB}GB, Requested: ${requestedGB}GB`,
        action: 'block_write'
      };
    }

    // Warning thresholds
    const percentUsed = (newTotal / limitGB) * 100;

    if (percentUsed >= 95) {
      showWarning(`Storage 95% full (${newTotal}GB / ${limitGB}GB)`);
    } else if (percentUsed >= 90) {
      showWarning(`Storage 90% full (${newTotal}GB / ${limitGB}GB)`);
    } else if (percentUsed >= 80) {
      showInfo(`Storage 80% full (${newTotal}GB / ${limitGB}GB)`);
    }

    return { allowed: true };
  }

  async checkQueryLimit(): Promise<EnforcementResult> {
    const limit = this.limits.max_monthly_queries;

    // Check for unlimited
    if (limit === -1) {
      return { allowed: true };
    }

    const currentQueries = await this.getMonthlyQueryCount();

    if (currentQueries >= limit) {
      return {
        allowed: false,
        reason: `Monthly query limit reached: ${currentQueries.toLocaleString()} / ${limit.toLocaleString()}`,
        action: 'block_query'
      };
    }

    // Warning thresholds
    const percentUsed = (currentQueries / limit) * 100;

    if (percentUsed >= 95) {
      showWarning(`Query limit 95% reached (${currentQueries.toLocaleString()} / ${limit.toLocaleString()})`);
    } else if (percentUsed >= 90) {
      showWarning(`Query limit 90% reached (${currentQueries.toLocaleString()} / ${limit.toLocaleString()})`);
    } else if (percentUsed >= 80) {
      showInfo(`Query limit 80% reached (${currentQueries.toLocaleString()} / ${limit.toLocaleString()})`);
    }

    return { allowed: true };
  }

  async checkUserLimit(newUsers: number = 1): Promise<EnforcementResult> {
    const limit = this.limits.max_users;

    // Check for unlimited
    if (limit === -1) {
      return { allowed: true };
    }

    const currentUsers = await this.getActiveUserCount();

    if (currentUsers + newUsers > limit) {
      return {
        allowed: false,
        reason: `User limit reached: ${currentUsers} / ${limit}`,
        action: 'block_user_add'
      };
    }

    return { allowed: true };
  }

  // Reset monthly query counter (call on 1st of each month)
  async resetMonthlyQueryCount() {
    await storage.set('monthly_query_count', 0);
    await storage.set('query_count_reset_date', new Date().toISOString());
  }
}

// Usage in query execution
async function executeQuery(sql: string) {
  const enforcement = new UsageEnforcement(limits);

  // Check query limit before executing
  const check = await enforcement.checkQueryLimit();
  if (!check.allowed) {
    throw new Error(check.reason);
  }

  // Execute the query
  const result = await clickhouse.query(sql);

  // Increment query counter
  await incrementQueryCount();

  return result;
}
```

**Specific Answers:**

a) ✅ **Yes, prevent writes when storage limit is reached** - block INSERT/UPDATE operations

b) ✅ **Yes, prevent queries when monthly limit is reached** - show error message

c) ✅ **Yes, show warnings at 80%, 90%, 95% thresholds**

d) ⚠️ **Allow small overages with grace period:**
   - **Storage:** Allow up to 5% overage for 7 days
   - **Queries:** Allow up to 5% overage for remainder of month
   - **Users:** No grace period (hard limit)

e) **Query counting:**
   - ✅ Count all queries (SELECT, INSERT, UPDATE, DELETE)
   - ❌ Don't count: SHOW, DESCRIBE, EXPLAIN, system queries
   - Reset counter on 1st of each month

---

### 13. API Authentication

**Answer:** Use license key for registration, cluster_id for heartbeats

**Recommended Implementation:**

```typescript
// Registration (first time only)
async function registerCluster(licenseKey: string, machineFP: string) {
  const response = await fetch('/api/centcom/clusters/local/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
      // NO Authorization header needed
    },
    body: JSON.stringify({
      license_key: licenseKey,  // REQUIRED for authentication
      machine_fingerprint: machineFP,
      cluster_name: `Local Cluster (${hostname})`,
      cluster_config: {
        version: '25.9.2.1',
        port: 9000,
        http_port: 8123
      }
    })
  });

  const result = await response.json();

  // Store cluster_id for future heartbeats
  localStorage.setItem('cluster_id', result.cluster.id);
  localStorage.setItem('cluster_key', result.cluster.cluster_key);

  return result;
}

// Heartbeat (every 10 minutes)
async function sendHeartbeat(clusterId: string) {
  const response = await fetch('/api/centcom/clusters/local/heartbeat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
      // NO Authorization header needed
    },
    body: JSON.stringify({
      cluster_id: clusterId,  // REQUIRED for authentication
      status: 'healthy',
      metrics: {
        queries_count: 1234,
        storage_used_gb: 45,
        active_users: 2
      }
    })
  });

  return response.json();
}
```

**Specific Answers:**

a) **For registration (`/register`):**
   - ✅ License key in request body (ONLY)
   - ❌ No JWT token needed
   - ✅ Machine fingerprint in request body (for identification)

b) **For heartbeat (`/heartbeat`):**
   - ✅ cluster_id in request body (ONLY)
   - ❌ No license key needed
   - ❌ No JWT token needed

c) ❌ **No sync_token** - not implemented. Just use `cluster_id` for identification.

**Authentication Summary:**
| Endpoint | Authentication Method |
|----------|----------------------|
| `/api/licenses/validate` | License key in body |
| `/api/centcom/clusters/local/register` | License key in body |
| `/api/centcom/clusters/local/heartbeat` | cluster_id in body |
| `/api/centcom/clusters/discover` | Optional: User session (future enhancement) |

---

### 14. Cluster Naming and Identification

**Answer:** Users can customize cluster names, cluster_id is the unique identifier

**Recommended Implementation:**

```typescript
// During registration
function getDefaultClusterName(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return `Local Cluster (${username}@${hostname})`;
}

// Allow user to customize before registration
function showClusterRegistrationDialog() {
  const defaultName = getDefaultClusterName();

  showDialog({
    title: 'Register Local Cluster with Lyceum',
    fields: [
      {
        label: 'Cluster Name',
        type: 'text',
        defaultValue: defaultName,
        placeholder: 'e.g., John\'s Desktop, Office Laptop',
        maxLength: 100
      }
    ],
    onSubmit: async (values) => {
      await registerCluster(licenseKey, machineFP, values.clusterName);
    }
  });
}
```

**Specific Answers:**

a) ✅ **Yes, users can customize cluster names** during registration

b) **Identification:**
   - ✅ `cluster_id` (UUID) is the PRIMARY unique identifier
   - ✅ `machine_fingerprint` identifies the physical machine
   - ⚠️ `cluster_key` (e.g., LOCAL-0011) is human-readable but also unique

c) ⚠️ **Users can rename clusters AFTER registration** - this needs a new endpoint (not yet implemented)

d) **Cluster names:**
   - ✅ Must be unique per user (same user can't have two clusters with same name)
   - ✅ Different users CAN have clusters with same name
   - ❌ Not globally unique

e) **Maximum length: 100 characters**

**Machine Fingerprint Generation:**
```typescript
import crypto from 'crypto';
import os from 'os';

function generateMachineFingerprint(): string {
  const machineInfo = {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus()[0].model,
    // Don't use MAC address (privacy concerns)
    // Instead use a persistent random ID stored locally
    deviceId: getOrCreateDeviceId()
  };

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(machineInfo))
    .digest('hex');

  return hash;
}

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}
```

---

## Quick Reference Summary

### Key Endpoints

| Endpoint | Purpose | Auth Method | Returns |
|----------|---------|-------------|---------|
| `POST /api/centcom/auth/login` | Login to Centcom | Email/password | Session token, user info, licenses |
| `POST /api/licenses/validate` | Get license config | License key | local_cluster config |
| `POST /api/centcom/clusters/local/register` | Register cluster | License key | cluster_id, cluster_key |
| `POST /api/centcom/clusters/local/heartbeat` | Send status update | cluster_id | success/failure |
| `GET /api/centcom/clusters/discover` | List all clusters | None | cloud + local clusters |

### Complete Integration Flow

```
1. User Login
   ↓
   POST /api/centcom/auth/login
   → Get licenses array

2. Find Main License
   ↓
   Filter licenses where license_category === 'main_application'

3. Validate License
   ↓
   POST /api/licenses/validate
   → Check if local_cluster.enabled === true

4. Configure ClickHouse
   ↓
   Apply limits from local_cluster.limits
   (don't start ClickHouse yet)

5. Show UI
   ↓
   Display "Register with Lyceum" button

6. User Clicks Register
   ↓
   POST /api/centcom/clusters/local/register
   → Receive cluster_id and cluster_key

7. Start Services
   ↓
   Start ClickHouse
   Start heartbeat service (every 10 min)

8. Periodic Tasks
   ↓
   - Heartbeat every 10 minutes
   - License refresh every 24 hours
   - Usage monitoring continuous
```

### Error Handling Matrix

| Scenario | Response | Action |
|----------|----------|--------|
| License validation fails | Use cached config | Show warning, retry in 1 hour |
| Cluster registration fails | Show error dialog | Allow retry |
| Heartbeat fails (1-2 times) | Log warning | Continue operating |
| Heartbeat fails (3+ times) | Show warning banner | Continue operating, offline mode |
| Heartbeat 404 | Cluster deleted | Show error, re-register required |
| Heartbeat 403 | License invalid | Show error, stop cluster |
| Storage limit reached | Block writes | Show error, prevent INSERT |
| Query limit reached | Block queries | Show error, prevent all queries |
| Offline > grace period | Read-only mode | Allow SELECT only |

---

## Still Have Questions?

If anything is unclear or you need additional endpoints/features, please let me know and I'll implement them ASAP.

**Ready for Centcom Team to Implement:** ✅

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Prepared By:** Lyceum Backend Team
