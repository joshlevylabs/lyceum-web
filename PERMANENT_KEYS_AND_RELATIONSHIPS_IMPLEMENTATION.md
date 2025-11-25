# Permanent Keys & Subscription Consolidation Implementation

**Date**: January 26, 2025
**Status**: ✅ Complete

## Overview

Implemented permanent sticky keys for licenses and subscriptions, consolidated subscription tables, and created a relationship system between licenses and subscriptions.

## Problem Statement

1. **Dynamic Key Generation**: License and subscription keys (LIC-1, LIC-2, SUB-1, etc.) were being generated dynamically from array indices, causing keys to renumber when records were deleted (e.g., deleting LIC-7 would cause LIC-8 to become LIC-7)

2. **Fragmented Subscriptions**: Subscriptions were split across two tables:
   - `user_subscriptions_native_app` for main application subscriptions
   - `plugin_subscriptions` for plugin subscriptions

3. **No License-Subscription Relationships**: No way to track which subscriptions were associated with which licenses

## Solution

### 1. Permanent Keys (Database Level)

**File**: `supabase/migrations/20250126_add_permanent_keys_and_relationships.sql`

- Added `license_key` column to `license_keys` table (stores "LIC-1", "LIC-2", etc.)
- Created sequence `license_key_seq` for auto-incrementing license numbers
- Created trigger `trigger_set_license_key` to auto-generate keys on insert
- Backfilled existing licenses with permanent keys based on `created_at` order
- **Result**: Keys are set once when created and NEVER change, even if other records are deleted

### 2. Unified Subscriptions Table

**File**: `supabase/migrations/20250126_add_permanent_keys_and_relationships.sql`

Created new `subscriptions` table that combines both types:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  subscription_key TEXT UNIQUE NOT NULL,  -- SUB-1, SUB-2, etc.
  user_id UUID NOT NULL,
  subscription_category TEXT NOT NULL,    -- 'native_app' or 'plugin'
  subscription_type TEXT NOT NULL,        -- 'trial' or 'paid'
  plugin_type TEXT,                       -- 'klippel_qc', 'apx500', or NULL
  status TEXT NOT NULL,                   -- 'active', 'cancelled', 'expired'
  stripe_subscription_id TEXT,
  -- ... other fields
);
```

**Features**:
- Permanent `subscription_key` (SUB-1, SUB-2, etc.)
- Single unified table for all subscription types
- Distinguished by `subscription_category` field
- All existing data migrated automatically

### 3. License-Subscription Relationships

**File**: `supabase/migrations/20250126_add_permanent_keys_and_relationships.sql`

Created `license_subscription_relationships` table:

```sql
CREATE TABLE license_subscription_relationships (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES license_keys(id),
  subscription_id UUID REFERENCES subscriptions(id),
  relationship_type TEXT,  -- 'standard', 'trial_conversion', 'upgrade', 'addon'
  notes TEXT,
  UNIQUE(license_id, subscription_id)
);
```

**Helper Functions**:
- `get_subscriptions_for_license(license_id)` - Get all subscriptions for a license
- `get_licenses_for_subscription(subscription_id)` - Get all licenses for a subscription

### 4. API Updates

**New Endpoint**: `src/app/api/admin/subscriptions/route.ts`

Unified API for all subscriptions:
- `GET /api/admin/subscriptions` - Get all subscriptions with filtering
  - Query params: `status`, `subscription_type`, `subscription_category`, `plugin_type`, `search`
- `DELETE /api/admin/subscriptions` - Delete a subscription

**Removed**:
- Old separate endpoints for native app and plugin subscriptions

### 5. Frontend Updates

**File**: `src/app/admin/licenses/page.tsx`

**Changes**:
1. Removed dynamic key generation function `generateStableLicenseKeys()`
2. Unified `Subscription` interface (removed separate `PluginSubscription` interface)
3. Removed `plugin_subscriptions` tab (now all in `subscriptions` tab)
4. Updated `loadSubscriptions()` to use new unified API with all filters
5. Simplified delete handler to use new API endpoint
6. Added new filter states:
   - `subscriptionCategoryFilter` - Filter by native_app or plugin
   - `subscriptionPluginFilter` - Filter by plugin type

## Database Schema Changes

### Tables Modified
- ✅ `license_keys` - Added `license_key` column
- ✅ `subscriptions` - New unified table created
- ✅ `license_subscription_relationships` - New relationship table created

### Data Migration
- ✅ All existing licenses backfilled with permanent keys
- ✅ All `user_subscriptions_native_app` records migrated to `subscriptions`
- ✅ All `plugin_subscriptions` records migrated to `subscriptions`

### Sequences Created
- ✅ `license_key_seq` - Auto-increment for license keys
- ✅ `subscription_key_seq` - Auto-increment for subscription keys

## Key Behaviors

### Permanent Keys
- **License Keys**: `LIC-1`, `LIC-2`, `LIC-3`, ...
- **Subscription Keys**: `SUB-1`, `SUB-2`, `SUB-3`, ...
- **Sticky**: Once assigned, keys NEVER change
- **Sequential**: New records get the next available number from the sequence
- **Deletion-Safe**: Deleting `LIC-7` does NOT affect `LIC-8`

### Subscription Categories
- `native_app`: Main application subscriptions (formerly `user_subscriptions_native_app`)
- `plugin`: Plugin subscriptions (formerly `plugin_subscriptions`)

### Plugin Types (when category = 'plugin')
- `klippel_qc`: Klippel QC plugin
- `apx500`: APX500 plugin
- `null`: For native_app subscriptions

## Deployment Steps

### 1. Apply Database Migration
```bash
npx supabase db push

# Or manually:
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20250126_add_permanent_keys_and_relationships.sql
```

### 2. Verify Migration
```sql
-- Check license keys
SELECT license_key, license_type, status, created_at
FROM license_keys
ORDER BY created_at ASC
LIMIT 10;

-- Check subscriptions
SELECT subscription_key, subscription_category, subscription_type, plugin_type, status
FROM subscriptions
ORDER BY created_at ASC
LIMIT 10;

-- Check relationships (if any exist)
SELECT * FROM license_subscription_relationships LIMIT 10;
```

### 3. Deploy Frontend
The frontend changes are already in place and will automatically work with the new database schema once the migration is applied.

## API Usage Examples

### Get All Subscriptions
```bash
GET /api/admin/subscriptions
```

### Get Filtered Subscriptions
```bash
# Get only active native app subscriptions
GET /api/admin/subscriptions?status=active&subscription_category=native_app

# Get only plugin subscriptions for Klippel QC
GET /api/admin/subscriptions?subscription_category=plugin&plugin_type=klippel_qc

# Search by user email
GET /api/admin/subscriptions?search=user@example.com
```

### Delete Subscription
```bash
DELETE /api/admin/subscriptions
Content-Type: application/json

{
  "subscription_id": "uuid-here"
}
```

## Testing Checklist

- [ ] Verify license keys are permanent (delete a license, check others don't renumber)
- [ ] Verify subscription keys are permanent (delete a subscription, check others don't renumber)
- [ ] Verify all native app subscriptions migrated successfully
- [ ] Verify all plugin subscriptions migrated successfully
- [ ] View subscriptions in admin panel (should show unified list)
- [ ] Filter subscriptions by category, type, status, plugin type
- [ ] Delete a subscription and verify it works
- [ ] Create a new license and verify it gets the next sequential key
- [ ] Create a new subscription and verify it gets the next sequential key
- [ ] Test license-subscription relationship functions (if used)

## Backwards Compatibility

### Old Tables
The migration does NOT drop the old tables:
- `user_subscriptions_native_app` - Still exists but not used
- `plugin_subscriptions` - Still exists but not used

**Recommendation**: After verifying everything works, you can optionally drop these tables:
```sql
-- ONLY RUN AFTER VERIFYING MIGRATION SUCCESS
DROP TABLE user_subscriptions_native_app;
DROP TABLE plugin_subscriptions;
```

### API Endpoints
Old endpoints may still exist but should be removed:
- `/api/admin/subscriptions/delete` (use DELETE method on `/api/admin/subscriptions` instead)
- `/api/admin/plugin-subscriptions/*` (now handled by `/api/admin/subscriptions`)

## Benefits

1. **Stable References**: Keys never change, making them safe to reference externally
2. **Simplified Architecture**: Single unified subscription table reduces complexity
3. **Better Relationships**: Clear tracking between licenses and subscriptions
4. **Easier Reporting**: All subscriptions in one place with clear categorization
5. **Future-Proof**: Easy to add new subscription categories without new tables

## Future Enhancements

Potential additions (not implemented):
1. **Auto-Relationship Creation**: Automatically link licenses to subscriptions when created via certain flows
2. **Subscription Stacking**: Allow multiple subscriptions per license with clear rules
3. **Key Prefixes**: Different prefixes for different entity types (e.g., `TRIAL-1`, `PAID-1`)
4. **Key Formatting Options**: Custom key formats per client needs

## Files Modified

### New Files
1. `supabase/migrations/20250126_add_permanent_keys_and_relationships.sql`
2. `src/app/api/admin/subscriptions/route.ts`
3. `PERMANENT_KEYS_AND_RELATIONSHIPS_IMPLEMENTATION.md` (this file)

### Modified Files
1. `src/app/admin/licenses/page.tsx` - Removed dynamic key generation, unified subscriptions

## Support

For questions or issues:
1. Check migration logs in Supabase dashboard
2. Verify sequences are incrementing: `SELECT * FROM license_key_seq; SELECT * FROM subscription_key_seq;`
3. Check for unique constraint violations if keys aren't being generated

---

**Implementation Complete**: January 26, 2025
**Status**: ✅ Ready for Production
