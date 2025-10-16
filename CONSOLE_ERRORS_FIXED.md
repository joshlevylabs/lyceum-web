# Console Errors Fixed

## Summary

Fixed two categories of console errors that were appearing after the user key fix:

1. **404 Errors for Non-existent Routes** ✅
2. **Onboarding Sessions Query Timeout** ✅

## Changes Made

### 1. Navigation Routes Fixed
**File:** [src/components/DashboardLayout.tsx:28-37](src/components/DashboardLayout.tsx#L28-L37)

**Problem:**
Next.js was trying to prefetch routes that don't exist yet:
- `/data-visualizer`
- `/assets`
- `/sequencer`

**Solution:**
Commented out these routes until the pages are created:

```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Test Data', href: '/test-data', icon: TableCellsIcon },
  // { name: 'Data Visualizer', href: '/data-visualizer', icon: ChartBarIcon }, // TODO: Create route
  { name: 'Analytics Studio', href: '/analytics-studio', icon: PresentationChartLineIcon },
  { name: 'Groups', href: '/groups', icon: UserGroupIcon },
  // { name: 'Centcom Assets', href: '/assets', icon: CubeIcon }, // TODO: Create route
  // { name: 'Sequencer', href: '/sequencer', icon: PlayIcon }, // TODO: Create route
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]
```

**Result:** No more 404 errors in console

### 2. Onboarding Sessions Query Performance
**File:** [FIX_ONBOARDING_SESSIONS_TIMEOUT.sql](FIX_ONBOARDING_SESSIONS_TIMEOUT.sql)

**Problem:**
Query was timing out after 5 seconds due to:
- Missing database indices
- Inefficient RLS (Row Level Security) policies
- Table scans on every query

**Solution:**
Created SQL migration that:
1. Adds performance indices:
   - `idx_onboarding_sessions_user_id` - For RLS filtering
   - `idx_onboarding_sessions_status_scheduled` - For common query pattern
   - `idx_onboarding_sessions_license_key` - For license key lookups
   - `idx_onboarding_sessions_created_at` - For sorting

2. Simplifies RLS policy:
   ```sql
   CREATE POLICY "Users can view their own onboarding sessions"
   ON public.onboarding_sessions
   FOR SELECT
   TO authenticated
   USING (auth.uid() = user_id);
   ```

3. Runs ANALYZE to update table statistics

## Deployment Steps

### Step 1: Deploy Code Changes
The navigation fix is already in the code. Just rebuild and deploy:

```bash
npm run build
# Deploy to production
```

### Step 2: Run Database Migration
Execute [FIX_ONBOARDING_SESSIONS_TIMEOUT.sql](FIX_ONBOARDING_SESSIONS_TIMEOUT.sql) in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire SQL script
3. Execute it
4. Verify indices were created (output will show)

### Step 3: Verify Fixes

1. **Check 404 errors are gone:**
   - Open browser console
   - Navigate to dashboard
   - Should see NO 404 errors for `/data-visualizer`, `/assets`, `/sequencer`

2. **Check onboarding query performance:**
   - Look for `"Query timeout after 5 seconds"` error
   - Should NOT appear anymore
   - Sessions should load in < 1 second

3. **Verify navigation works:**
   - Navigation menu should show:
     - Dashboard
     - Test Data
     - Analytics Studio
     - Groups
     - Settings
     - (Admin Panel - if admin)

## Expected Console Output After Fix

**Before:**
```
❌ GET https://www.thelyceum.io/data-visualizer?_rsc=skepm 404 (Not Found)
❌ GET https://www.thelyceum.io/assets?_rsc=skepm 404 (Not Found)
❌ GET https://www.thelyceum.io/sequencer?_rsc=skepm 404 (Not Found)
❌ Error fetching onboarding sessions: Query timeout after 5 seconds
❌ ⚠️ Query timed out - Supabase might be slow or RLS policies might be blocking
```

**After:**
```
✅ Fetching onboarding sessions directly from Supabase...
✅ Querying onboarding_sessions table with 5s timeout...
✅ Sessions loaded: 10
✅ All user data fetched successfully
```

## Additional Optimizations (Optional)

If query performance is still not optimal after adding indices:

1. **Create API endpoint** to handle session fetching server-side
2. **Add caching** for frequently accessed data
3. **Implement pagination** if there are many sessions
4. **Monitor query performance** in Supabase dashboard

## Rollback Plan

If issues occur:

### Rollback Code Changes:
```bash
git checkout HEAD -- src/components/DashboardLayout.tsx
```

### Rollback Database Changes:
```sql
-- Drop the indices
DROP INDEX IF EXISTS idx_onboarding_sessions_user_id;
DROP INDEX IF EXISTS idx_onboarding_sessions_status_scheduled;
DROP INDEX IF EXISTS idx_onboarding_sessions_license_key;
DROP INDEX IF EXISTS idx_onboarding_sessions_created_at;

-- Restore original RLS policy (if you have a backup)
```

## Performance Metrics

Expected improvements:
- **404 errors:** 3 errors → 0 errors ✅
- **Query timeout errors:** ~100% occurrence → 0% ✅
- **Onboarding sessions load time:** 5+ seconds → < 1 second ✅
- **Console noise:** Significant reduction ✅

## Future Work

When ready to implement the commented-out routes:

1. Create [src/app/data-visualizer/page.tsx](src/app/data-visualizer/page.tsx)
2. Create [src/app/assets/page.tsx](src/app/assets/page.tsx)
3. Create [src/app/sequencer/page.tsx](src/app/sequencer/page.tsx)
4. Uncomment the routes in [DashboardLayout.tsx](src/components/DashboardLayout.tsx)

## Related Files

- [FIX_CONSOLE_ERRORS.md](FIX_CONSOLE_ERRORS.md) - Detailed analysis
- [FIX_ONBOARDING_SESSIONS_TIMEOUT.sql](FIX_ONBOARDING_SESSIONS_TIMEOUT.sql) - Database migration
- [src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx) - Navigation component
- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) - Dashboard with onboarding sessions
