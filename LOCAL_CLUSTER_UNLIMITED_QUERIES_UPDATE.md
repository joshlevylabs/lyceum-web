# Local Cluster: Unlimited Queries & Centcom Integration

**Date:** 2025-10-22
**Commit:** `3a884c2`
**Status:** ✅ Deployed to Production

---

## Overview

This update adds two critical features for local cluster management:

1. **Unlimited Monthly Queries Option** - Admins can now enable unlimited queries for licenses
2. **Centcom License Validation Integration** - Centcom app now receives full local cluster configuration during license validation

---

## Part 1: Unlimited Queries Option

### Admin Panel Changes

#### License Creation Page ([create-enhanced](https://lyceum-sable.vercel.app/admin/licenses/create-enhanced))

**New UI Component:**
```
Max Monthly Queries
☐ Unlimited Queries          <- New checkbox

[Input field for number]      <- Only shown if unlimited is NOT checked
e.g., 10000000

Helper text: "No limit on total queries" (when unlimited)
            "Total queries across all clusters" (when limited)
```

**Behavior:**
- Checkbox for "Unlimited Queries"
- When **checked**: Sets `max_monthly_queries = -1`
- When **unchecked**: Shows number input field (default: 100,000)
- Enterprise licenses now default to **unlimited** queries (`-1`)

#### License Details Page ([license/[id]/details](https://lyceum-sable.vercel.app/admin/licenses))

**View Mode:**
```
Max Monthly Queries
Unlimited                     <- Shows "Unlimited" when -1
```

**Edit Mode:**
```
Max Monthly Queries
☑ Unlimited Queries           <- Checkbox (same as create page)

[Input field hidden when unlimited is checked]
```

### License Type Defaults

| License Type | Max Monthly Queries | Default Behavior |
|--------------|---------------------|------------------|
| **Enterprise** | `-1` (Unlimited) | ✅ Auto-enabled |
| **Professional** | `1,000,000` | ✅ Auto-enabled |
| **Standard** | `100,000` | ❌ Disabled by default |
| **Trial** | `100,000` | ❌ Disabled by default |

### Database Storage

- Field: `local_cluster_limits.max_monthly_queries`
- Type: `INTEGER`
- Values:
  - `-1` = Unlimited queries
  - `> 0` = Specific limit
  - Should never be `0` or `null` when local clusters are enabled

---

## Part 2: Centcom License Validation

### What Changed

When the Centcom desktop application validates a license, it now receives **full local cluster configuration** in the response.

### API Endpoints Updated

#### 1. `/api/licenses/validate` (Primary Validation Endpoint)

**Request:**
```json
POST /api/licenses/validate
{
  "license_key": "LIC-2025-ABC123",
  "user_id": "user-uuid",
  "user_type": "engineer",
  "requested_plugin": "centcom"
}
```

**Response (NEW - includes local_cluster):**
```json
{
  "valid": true,
  "license_id": "uuid",
  "license_type": "enterprise",
  "permissions": { ... },
  "restrictions": { ... },
  "warnings": [],

  // NEW: Local cluster configuration
  "local_cluster": {
    "enabled": true,
    "limits": {
      "max_storage_gb": 500,
      "max_monthly_queries": -1,          // -1 = unlimited
      "max_users": -1,                     // -1 = unlimited
      "lifecycle_tiers_enabled": true,
      "offline_grace_days": 30
    }
  }
}
```

**Response when local clusters are disabled:**
```json
{
  "valid": true,
  "license_id": "uuid",
  "license_type": "standard",
  "permissions": { ... },
  "restrictions": { ... },
  "warnings": [],

  // Local clusters disabled
  "local_cluster": {
    "enabled": false
  }
}
```

#### 2. `/api/v1/licenses/validate` (Alternative Validation Endpoint)

**Request:**
```json
POST /api/v1/licenses/validate
{
  "license_key": "CENTCOM-encoded-license-key",
  "plugin_id": "centcom",
  "machine_fingerprint": "abc123",
  "client_version": "1.0.0"
}
```

**Response (NEW - includes local_cluster in license_info):**
```json
{
  "status": "valid",
  "message": "License validation successful",
  "license_info": {
    "key_id": "uuid",
    "plugin_id": "centcom",
    "user_id": "user-uuid",
    "features": ["feature1", "feature2"],
    "expiration": "2026-01-01T00:00:00.000Z",
    "created_at": "2025-01-01T00:00:00.000Z",
    "revoked": false,

    // NEW: Local cluster configuration
    "local_cluster": {
      "enabled": true,
      "limits": {
        "max_storage_gb": 500,
        "max_monthly_queries": -1,
        "max_users": -1,
        "lifecycle_tiers_enabled": true,
        "offline_grace_days": 30
      }
    }
  },
  "server_time": "2025-10-22T12:00:00.000Z",
  "rbac": { ... }
}
```

---

## How Centcom Should Use This Information

### Startup Flow

```typescript
// 1. Validate license when Centcom starts
const validationResponse = await fetch('/api/licenses/validate', {
  method: 'POST',
  body: JSON.stringify({
    license_key: storedLicenseKey,
    user_id: currentUserId,
    user_type: 'engineer',
    requested_plugin: 'centcom'
  })
});

const validation = await validationResponse.json();

// 2. Check if local cluster is enabled
if (validation.local_cluster.enabled) {
  const limits = validation.local_cluster.limits;

  // 3. Configure local cluster based on limits
  configureLocalCluster({
    maxStorageGB: limits.max_storage_gb,
    maxMonthlyQueries: limits.max_monthly_queries,  // -1 = unlimited
    maxUsers: limits.max_users,                      // -1 = unlimited
    lifecycleTiersEnabled: limits.lifecycle_tiers_enabled,
    offlineGraceDays: limits.offline_grace_days
  });

  // 4. Enable local cluster UI
  showLocalClusterOptions();
} else {
  // Local clusters not allowed for this license
  hideLocalClusterOptions();
}
```

### Handling Unlimited Values

```typescript
function applyQueryLimit(limit: number) {
  if (limit === -1) {
    // Unlimited queries - no enforcement needed
    return null; // or Number.MAX_SAFE_INTEGER
  } else {
    // Apply the specific limit
    return limit;
  }
}

// Example usage
const queryLimit = applyQueryLimit(limits.max_monthly_queries);
if (queryLimit === null) {
  console.log('Unlimited queries allowed');
} else {
  console.log(`Query limit: ${queryLimit.toLocaleString()}`);
}
```

### Enforcing Limits

```typescript
class LocalClusterManager {
  private config: LocalClusterConfig;
  private currentUsage: Usage;

  constructor(licenseValidation: any) {
    this.config = licenseValidation.local_cluster.limits;
  }

  canExecuteQuery(): boolean {
    // Check if unlimited
    if (this.config.max_monthly_queries === -1) {
      return true; // Always allow
    }

    // Check against limit
    return this.currentUsage.queriesThisMonth < this.config.max_monthly_queries;
  }

  canAddUser(): boolean {
    // Check if unlimited
    if (this.config.max_users === -1) {
      return true; // Always allow
    }

    // Check against limit
    return this.currentUsage.userCount < this.config.max_users;
  }

  canAllocateStorage(requestedGB: number): boolean {
    const newTotal = this.currentUsage.storageGB + requestedGB;
    return newTotal <= this.config.max_storage_gb;
  }

  isLifecycleTiersEnabled(): boolean {
    return this.config.lifecycle_tiers_enabled;
  }

  getOfflineGracePeriod(): number {
    return this.config.offline_grace_days;
  }
}
```

### UI Display Examples

```typescript
// Display in Centcom UI
function renderLicenseInfo(validation: any) {
  if (!validation.local_cluster.enabled) {
    return (
      <Alert>
        Local cluster deployment is not available with your current license.
        Contact your administrator to upgrade.
      </Alert>
    );
  }

  const limits = validation.local_cluster.limits;

  return (
    <Panel title="Local Cluster Configuration">
      <LimitDisplay
        label="Storage"
        value={`${limits.max_storage_gb} GB`}
      />
      <LimitDisplay
        label="Monthly Queries"
        value={limits.max_monthly_queries === -1 ? 'Unlimited' : limits.max_monthly_queries.toLocaleString()}
      />
      <LimitDisplay
        label="Max Users"
        value={limits.max_users === -1 ? 'Unlimited' : limits.max_users}
      />
      <LimitDisplay
        label="Lifecycle Tiers"
        value={limits.lifecycle_tiers_enabled ? 'Enabled' : 'Disabled'}
      />
      <LimitDisplay
        label="Offline Grace Period"
        value={`${limits.offline_grace_days} days`}
      />
    </Panel>
  );
}
```

---

## Testing in Production

### Test Case 1: Unlimited Queries (Enterprise License)

1. Go to [Admin Panel > Create License](https://lyceum-sable.vercel.app/admin/licenses/create-enhanced)
2. Select **License Type: Enterprise**
3. Scroll to **Local Cluster Deployment** section
4. Verify **"Unlimited Queries"** checkbox is **checked**
5. Save the license
6. Call `/api/licenses/validate` with the new license key
7. Verify response includes:
   ```json
   "local_cluster": {
     "enabled": true,
     "limits": {
       "max_monthly_queries": -1  // Should be -1
     }
   }
   ```

### Test Case 2: Limited Queries (Professional License)

1. Create a Professional license
2. Local cluster should be enabled with `max_monthly_queries: 1000000`
3. Edit the license
4. Check the **"Unlimited Queries"** checkbox
5. Save changes
6. Validate license again
7. Verify `max_monthly_queries` changed from `1000000` to `-1`

### Test Case 3: View Mode Display

1. Create or edit any license with unlimited queries
2. Save and exit edit mode
3. In view mode, verify it displays **"Unlimited"** (not "-1")
4. Create a license with limited queries (e.g., 500,000)
5. In view mode, verify it displays **"500,000"** (formatted with comma)

### Test Case 4: Centcom License Validation

Use the existing test page or browser console:

```javascript
// Test 1: Validate a license with unlimited queries
const response1 = await fetch('https://lyceum-sable.vercel.app/api/licenses/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    license_key: 'YOUR-LICENSE-KEY-HERE',
    user_id: 'test-user-id'
  })
});
const data1 = await response1.json();
console.log('Local cluster config:', data1.local_cluster);

// Test 2: Validate a license without local clusters
const response2 = await fetch('https://lyceum-sable.vercel.app/api/licenses/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    license_key: 'STANDARD-LICENSE-KEY',
    user_id: 'test-user-id'
  })
});
const data2 = await response2.json();
console.log('Local cluster disabled:', data2.local_cluster);
```

---

## Important Notes for Centcom Team

### 1. Always Check for `-1` (Unlimited)

**DO:**
```typescript
if (limits.max_monthly_queries === -1) {
  // Unlimited - skip enforcement
} else {
  // Enforce the limit
}
```

**DON'T:**
```typescript
// Bad - treats -1 as a limit!
if (currentQueries >= limits.max_monthly_queries) {
  throw new Error('Query limit exceeded');
}
```

### 2. Handle Missing Fields Gracefully

```typescript
// Good defensive coding
const limits = validation.local_cluster?.limits || {
  max_storage_gb: 10,
  max_monthly_queries: 100000,
  max_users: 1,
  lifecycle_tiers_enabled: false,
  offline_grace_days: 7
};
```

### 3. Cache Validation Results

- License validation response should be cached locally
- Re-validate periodically (e.g., every 24 hours)
- Re-validate when application starts
- Re-validate after network reconnection

### 4. Offline Grace Period

The `offline_grace_days` field tells you how long the local cluster can operate without contacting Lyceum:

```typescript
const lastOnlineTimestamp = getLastOnlineTime();
const daysSinceOnline = (Date.now() - lastOnlineTimestamp) / (1000 * 60 * 60 * 24);

if (daysSinceOnline > limits.offline_grace_days) {
  // Show warning or restrict features
  showOfflineWarning(`Please reconnect to Lyceum within ${limits.offline_grace_days} days`);
}
```

---

## Files Modified

### Frontend (Admin Panel)
1. **src/app/admin/licenses/create-enhanced/page.tsx**
   - Added unlimited queries checkbox
   - Updated enterprise default to -1
   - Dynamic helper text based on unlimited state

2. **src/app/admin/licenses/[licenseId]/details/page.tsx**
   - Added unlimited queries checkbox in edit mode
   - Display "Unlimited" in view mode when -1
   - Dynamic helper text in edit mode

### Backend (API)
3. **src/app/api/licenses/validate/route.ts**
   - Added `local_cluster` object to validation response
   - Includes `enabled` flag and `limits` object
   - Defaults to disabled if not set

4. **src/app/api/v1/licenses/validate/route.ts**
   - Added `local_cluster` to `license_info` object
   - Same structure as primary validation endpoint
   - Works with both `licenses` and `license_keys` tables

---

## Summary

✅ **Unlimited queries option** added to license creation and editing
✅ **License validation endpoints** updated to include local cluster config
✅ **Centcom app** can now retrieve and apply local cluster settings
✅ **Enterprise licenses** default to unlimited queries (`-1`)
✅ **Professional licenses** default to 1,000,000 queries
✅ **All changes** deployed to production and auto-deploying on git push

### Next Steps for Centcom Team

1. Update license validation logic to parse `local_cluster` from response
2. Store local cluster limits in app configuration
3. Apply limits during cluster creation and operation
4. Handle `-1` as unlimited for queries and users
5. Implement UI to display license limits to end users
6. Test with various license types (enterprise, professional, standard, trial)

---

**Deployment Status:** ✅ Live in Production
**Commit Hash:** `3a884c2`
**GitHub:** https://github.com/joshlevylabs/lyceum-web/commit/3a884c2
