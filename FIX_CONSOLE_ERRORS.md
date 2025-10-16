# Fix: Console Errors and Performance Issues

## Issues Identified

### 1. 404 Errors - Non-existent Routes (Low Priority)
**Error:** `GET https://www.thelyceum.io/data-visualizer?_rsc=skepm 404 (Not Found)`

**Root Cause:**
The [DashboardLayout.tsx:30-34](src/components/DashboardLayout.tsx#L30-L34) navigation includes routes that don't exist yet:
- `/data-visualizer` - Line 30
- `/assets` - Line 33
- `/sequencer` - Line 34

Next.js prefetches these routes when they appear in `<Link>` components, causing 404 errors.

**Impact:**
- Low severity - doesn't break functionality
- Creates console noise
- Minor performance impact from failed prefetch attempts

**Fix Options:**

Option 1: Comment out non-existent routes (Quick fix):
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

Option 2: Create placeholder pages for these routes
Option 3: Disable prefetch on these specific links

### 2. Onboarding Sessions Query Timeout (HIGH PRIORITY)
**Error:** `Error fetching onboarding sessions: Query timeout after 5 seconds`

**Root Cause:**
The query in [src/app/dashboard/page.tsx:212-216](src/app/dashboard/page.tsx#L212-L216) is timing out due to:
1. RLS (Row Level Security) policy performance issues on `onboarding_sessions` table
2. Missing or inefficient database indices
3. RLS policy might be doing table scans

**Current Query:**
```typescript
const queryPromise = supabase
  .from('onboarding_sessions')
  .select('*')
  .in('status', ['scheduled', 'pending', 'rescheduled'])
  .order('scheduled_at', { ascending: true })
```

**Solutions:**

### Solution 1: Check and Optimize RLS Policies

Run this query to check current RLS policies:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'onboarding_sessions';
```

### Solution 2: Add Missing Indices

```sql
-- Add index on user_id for RLS filtering
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id
ON public.onboarding_sessions(user_id);

-- Add composite index for the common query pattern
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status_scheduled
ON public.onboarding_sessions(user_id, status, scheduled_at);

-- Add index on license_key_id if used in RLS
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_license_key
ON public.onboarding_sessions(license_key_id);
```

### Solution 3: Simplify RLS Policy

Current RLS might be doing expensive joins. Simplify it:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their own onboarding sessions"
ON public.onboarding_sessions;

-- Create simpler policy
CREATE POLICY "Users can view their own onboarding sessions"
ON public.onboarding_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Ensure service role bypasses RLS
ALTER TABLE public.onboarding_sessions FORCE ROW LEVEL SECURITY;
```

### Solution 4: Use API Route Instead

Instead of querying directly from the client, create a server-side API:

```typescript
// src/app/api/onboarding/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get user from auth header
  const authHeader = request.headers.get('authorization')
  // ... validate auth ...

  // Query with service role (bypasses RLS)
  const { data, error } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['scheduled', 'pending', 'rescheduled'])
    .order('scheduled_at', { ascending: true })

  return NextResponse.json({ data, error })
}
```

## Recommended Fix Order

1. **Immediate (Quick wins):**
   - Add database indices (Solution 2)
   - Comment out non-existent navigation routes

2. **Short term:**
   - Simplify RLS policy (Solution 3)
   - Verify RLS policy performance

3. **Long term:**
   - Create placeholder pages for commented routes
   - Consider API route approach if RLS continues to be slow
   - Monitor query performance

## Implementation

### Step 1: Add Database Indices
```bash
# Run this SQL via Supabase dashboard
```

### Step 2: Update Navigation
```bash
# Edit src/components/DashboardLayout.tsx
# Comment out lines 30, 33, 34
```

### Step 3: Test
1. Clear browser cache
2. Reload dashboard
3. Check console - should see no 404 errors
4. Onboarding sessions should load quickly

## Verification Queries

```sql
-- Check if indices exist
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'onboarding_sessions';

-- Check query performance
EXPLAIN ANALYZE
SELECT *
FROM public.onboarding_sessions
WHERE user_id = 'some-uuid'
  AND status IN ('scheduled', 'pending', 'rescheduled')
ORDER BY scheduled_at ASC;
```

## Files to Modify

1. [src/components/DashboardLayout.tsx](src/components/DashboardLayout.tsx#L30-L34) - Comment out routes
2. Database - Add indices via SQL
3. Database - Verify/simplify RLS policies
