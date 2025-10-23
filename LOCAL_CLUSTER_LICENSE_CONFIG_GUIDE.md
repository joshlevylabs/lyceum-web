# Local Cluster Configuration in License Creation

**Status:** ✅ LIVE IN PRODUCTION
**URL:** https://lyceum-sable.vercel.app/admin/licenses/create-enhanced

---

## What's New

Admins can now configure local cluster settings when creating licenses through the enhanced license creation UI!

---

## How to Use

### Step 1: Navigate to License Creation

1. Go to: https://lyceum-sable.vercel.app/admin/licenses/create-enhanced
2. Select **License Category** (CentCom Application or Plugin)
3. Select **License Type** (Trial, Standard, Professional, Enterprise, or Gratis)

###Step 2: Configure Local Cluster Settings

In **Step 2: Configuration**, you'll see a new section called **"Local Cluster Deployment"**

#### Enable/Disable Local Clusters

- **Toggle Switch** at the top right: Enable or disable local cluster support
- When enabled, configuration options appear below

#### Configuration Options

When local clusters are enabled, you can configure:

1. **Max Storage (GB)** - per license
   - Default: 10GB (Standard), 100GB (Professional), 500GB (Enterprise)
   - Total storage across ALL local clusters for this license
   - Example: If user has desktop + laptop, limit applies to both combined

2. **Max Monthly Queries** - per license
   - Default: 100,000 (Standard), 1M (Professional), 10M (Enterprise)
   - Total queries across ALL local clusters for this license
   - Resets monthly

3. **Max Users** - per cluster
   - Default: 1 (Standard), 5 (Professional), -1 unlimited (Enterprise)
   - Set to `-1` for unlimited users
   - Applies to each individual cluster

4. **Offline Grace Period** (days)
   - Default: 7 (Standard), 14 (Professional), 30 (Enterprise)
   - Days before offline cluster enters read-only mode
   - Range: 1-90 days

5. **Enable Lifecycle Tiers** (checkbox)
   - Default: Disabled (Standard), Enabled (Professional/Enterprise)
   - Allows HOT/WARM/COLD data tiering for cost optimization
   - Advanced feature for large datasets

---

## Auto-Defaults by License Type

The form automatically sets sensible defaults based on license type:

### Enterprise License
```
✅ Local Clusters: ENABLED by default
- Max Storage: 500GB
- Max Queries: 10,000,000/month
- Max Users: Unlimited (-1)
- Grace Period: 30 days
- Lifecycle Tiers: Enabled
```

### Professional License
```
✅ Local Clusters: ENABLED by default
- Max Storage: 100GB
- Max Queries: 1,000,000/month
- Max Users: 5
- Grace Period: 14 days
- Lifecycle Tiers: Enabled
```

### Standard/Trial License
```
❌ Local Clusters: DISABLED by default
(Can be manually enabled with conservative limits)
- Max Storage: 10GB
- Max Queries: 100,000/month
- Max Users: 1
- Grace Period: 7 days
- Lifecycle Tiers: Disabled
```

---

## UI Features

### Visual Indicators

- **Toggle Switch**: Green when enabled, gray when disabled
- **"Enabled" / "Disabled" Label**: Clear status indicator
- **Expandable Panel**: Configuration options only show when enabled
- **Info Box**: Blue info panel explaining aggregate limits

### Form Validation

- All fields have minimum/maximum values
- Storage/Queries accept numbers only
- Grace period: 1-90 days
- Max users: -1 or positive number

### Helpful Labels

- **"per license"** - Aggregate across all clusters
- **"per cluster"** - Applies to each individual cluster
- Tooltips explain each setting

---

## Example Use Cases

### Use Case 1: Enterprise Client with Multiple Machines

**License Type:** Enterprise
**Configuration:**
- Max Storage: 1,000GB (1TB)
- Max Queries: 50,000,000/month
- Max Users: -1 (unlimited)
- Grace Period: 60 days
- Lifecycle Tiers: Enabled

**Result:**
User can deploy local clusters on:
- Work desktop (500GB used)
- Work laptop (300GB used)
- Home workstation (200GB used)

Total: 1,000GB across 3 machines ✅ Within limit

### Use Case 2: Professional Consultant

**License Type:** Professional
**Configuration:**
- Max Storage: 100GB
- Max Queries: 2,000,000/month
- Max Users: 3 per cluster
- Grace Period: 14 days
- Lifecycle Tiers: Enabled

**Result:**
Consultant can:
- Deploy on office desktop + laptop
- Each cluster can have 3 users
- Combined usage: 100GB max
- Can work offline for 2 weeks

### Use Case 3: Trial User (Testing Only)

**License Type:** Trial
**Configuration:**
- Max Storage: 5GB
- Max Queries: 10,000/month
- Max Users: 1
- Grace Period: 3 days
- Lifecycle Tiers: Disabled

**Result:**
Trial user gets:
- Small local deployment for testing
- Single user only
- Limited storage and queries
- Short grace period

---

## How It Works Behind the Scenes

### Database Storage

License settings are saved to the `license_keys` table:

```sql
allows_local_cluster: BOOLEAN
local_cluster_limits: JSONB {
  "max_storage_gb": 500,
  "max_monthly_queries": 10000000,
  "max_users": -1,
  "lifecycle_tiers_enabled": true,
  "offline_grace_days": 30
}
```

### API Validation

When Centcom desktop app calls `/api/centcom/clusters/local/register`:
1. Checks `allows_local_cluster` is `true`
2. Returns `403 Forbidden` if not allowed
3. Returns limit configuration from `local_cluster_limits`

### Limit Enforcement

Heartbeat endpoint (`/api/centcom/clusters/local/heartbeat`):
1. Aggregates usage across ALL user's local clusters
2. Compares against license limits
3. Returns `should_throttle: true` if limits exceeded
4. Centcom enforces read-only mode locally

---

## Testing the Feature

### Test 1: Create Enterprise License with Local Clusters

1. Go to `/admin/licenses/create-enhanced`
2. Select "CentCom Application"
3. Select "Enterprise"
4. Go to Step 2 → Notice **Local Cluster is already ENABLED** ✅
5. See defaults: 500GB, 10M queries, unlimited users
6. Modify if needed
7. Complete license creation

### Test 2: Create Standard License WITHOUT Local Clusters

1. Select "Standard" license type
2. Go to Step 2 → Notice **Local Cluster is DISABLED** by default
3. (Optional) Enable manually if needed
4. Complete license creation

### Test 3: Verify in Database

```sql
SELECT
  key_code,
  license_type,
  allows_local_cluster,
  local_cluster_limits
FROM license_keys
WHERE key_code = 'YOUR-NEW-LICENSE-KEY';
```

Expected output:
```
key_code: CENTCOM-ENT-2025-ABCD1234
license_type: enterprise
allows_local_cluster: true
local_cluster_limits: {"max_storage_gb": 500, "max_monthly_queries": 10000000, ...}
```

---

## Screenshots (UI Overview)

### Toggle Switch (Disabled)
```
[ Local Cluster Deployment              ]
[ Allow users to deploy local ClickHouse clusters ]
[                                  ⚪ Disabled ]
```

### Toggle Switch (Enabled)
```
[ Local Cluster Deployment              ]
[ Allow users to deploy local ClickHouse clusters ]
[                            🟢 Enabled         ]
```

### Configuration Panel (Expanded)
```
[ Max Storage (GB) per license ]  [ Max Monthly Queries per license ]
[ 500                          ]  [ 10000000                         ]

[ Max Users per cluster        ]  [ Offline Grace Period (days) ]
[ -1                           ]  [ 30                          ]

☑ Enable Lifecycle Tiers (HOT/WARM/COLD)

ℹ️ Local Cluster Limits
   Users can deploy multiple local clusters (e.g., desktop + laptop).
   Limits are enforced on the aggregate across all their clusters.
```

---

## Troubleshooting

### Issue: Local cluster toggle not visible

**Solution:** Make sure you're on Step 2 (Configuration). Toggle is only visible in the configuration step.

### Issue: Values reset when changing license type

**Expected behavior:** When you change license type, defaults are automatically updated to match the new tier. This ensures enterprise licenses get enterprise-level limits.

### Issue: Can't save license with local clusters enabled

**Check:**
1. All required fields filled (max_storage_gb, max_monthly_queries, etc.)
2. Values are positive numbers (or -1 for unlimited)
3. Grace period is between 1-90 days

### Issue: License created but local clusters don't work

**Verify:**
1. Check database: `SELECT allows_local_cluster FROM license_keys WHERE key_code = '...'`
2. Should be `true`
3. If `false`, update: `UPDATE license_keys SET allows_local_cluster = true WHERE key_code = '...'`

---

## Future Enhancements (Not Yet Implemented)

Potential future additions:
- [ ] Edit local cluster settings on existing licenses
- [ ] View current usage vs limits in admin panel
- [ ] Alerts when users approach limits
- [ ] Bulk enable/disable for multiple licenses
- [ ] License templates with preset configurations

---

## API Integration

The Centcom desktop app checks local cluster permission during registration:

**Request:**
```bash
POST /api/centcom/clusters/local/register
Authorization: Bearer <user_jwt>
{
  "license_key": "CENTCOM-ENT-2025-ABCD1234",
  ...
}
```

**Response (Allowed):**
```json
{
  "success": true,
  "cluster_id": "...",
  "license": {
    "max_storage_gb": 500,
    "max_monthly_queries": 10000000,
    "offline_grace_days": 30
  }
}
```

**Response (Not Allowed):**
```json
{
  "error": "Your license does not support local cluster deployment. Please upgrade your license."
}
```

---

## Summary

✅ **What You Can Do Now:**
- Configure local cluster settings when creating licenses
- Auto-defaults based on license tier (Enterprise, Professional, Standard)
- Toggle on/off with visual switch
- Set storage, query, user, and grace period limits
- Enable/disable lifecycle tier features

✅ **What Happens Automatically:**
- Enterprise licenses: Local clusters enabled by default (generous limits)
- Professional licenses: Enabled with moderate limits
- Standard/Trial: Disabled by default (can be manually enabled)
- Settings saved to database
- API endpoints enforce configured limits

✅ **What's Next:**
- Use the form to create licenses with local cluster support!
- Test with Centcom desktop app
- Monitor usage in production

---

**Feature Status:** LIVE ✅
**Last Updated:** 2025-10-22
**Documentation:** Complete

**Need Help?**
- UI issues: Check browser console
- Database issues: Check Supabase logs
- API issues: Check Vercel function logs
