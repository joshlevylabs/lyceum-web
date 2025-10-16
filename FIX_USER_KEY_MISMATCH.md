# Fix: User Key Mismatch Issue in Admin Portal

## Problem Description

When accessing user profile pages via the admin portal at https://www.thelyceum.io/admin/users, clicking on a user's "view" button would display the wrong user's profile information.

For example:
- Clicking on USER-3 (josh@thelyceum.io) would display profile data for USER-5 (test@example.com)
- The user key resolution was working (USER-3 → correct user ID), but the wrong profile data was being returned

## Root Cause

The user keys (USER-1, USER-2, etc.) were being **dynamically generated on the client-side based on array indices** rather than being stored persistently in the database. This caused issues because:

1. User keys were position-dependent (USER-1 = first user in array, USER-2 = second user, etc.)
2. Different queries or sorting orders would produce different array positions
3. If users were deleted, all subsequent users would get different keys
4. The mapping between user keys and actual users was fragile and inconsistent

The issue was in these files:
- [src/app/api/admin/users/resolve-key/[userKey]/route.ts](src/app/api/admin/users/resolve-key/[userKey]/route.ts) - Array index-based key resolution
- [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx) - Client-side dynamic key generation

## Solution Implemented

### 1. Database Schema Change
Created a new migration: [ADD_USER_KEY_COLUMN.sql](ADD_USER_KEY_COLUMN.sql)

- Added `user_key` column to `user_profiles` table
- Created index for faster lookups
- Backfilled existing users with stable keys based on creation order
- Added trigger to auto-assign keys to new users
- Created function to generate next available key number

### 2. API Updates

#### [src/app/api/admin/users/resolve-key/[userKey]/route.ts:33-46](src/app/api/admin/users/resolve-key/[userKey]/route.ts#L33-L46)
- Replaced array index lookup with direct database query
- Now queries `user_key` column directly: `.eq('user_key', userKey)`
- Removed all array manipulation and index-based logic

#### [src/app/api/admin/users/list/route.ts:17](src/app/api/admin/users/list/route.ts#L17)
- Added `user_key` to SELECT statement
- Changed ordering to `created_at` for consistency

#### [src/app/api/user-profiles/enhanced/route.ts:27](src/app/api/user-profiles/enhanced/route.ts#L27)
- Added `user_key` to profile data selection
- Included in enhanced profile response

### 3. Frontend Updates

#### [src/app/admin/users/page.tsx:30](src/app/admin/users/page.tsx#L30)
- Removed `generateStableUserKeys()` function
- Updated `loadUsers()` to use database-provided keys
- Added `user_key` to User interface

## Deployment Steps

### Step 1: Run the Database Migration

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d postgres -f ADD_USER_KEY_COLUMN.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `ADD_USER_KEY_COLUMN.sql`
3. Execute the migration

### Step 2: Verify Migration

```sql
-- Check that user_key column exists and has values
SELECT id, email, user_key, created_at
FROM public.user_profiles
ORDER BY created_at ASC;
```

Expected output:
- All users should have a `user_key` value (USER-1, USER-2, etc.)
- Keys should be ordered by creation date

### Step 3: Deploy Code Changes

```bash
# Build and deploy the updated code
npm run build
# Deploy to production (method depends on your deployment setup)
```

### Step 4: Test the Fix

1. Go to https://www.thelyceum.io/admin/users
2. Find a specific user (e.g., josh@thelyceum.io with key USER-3)
3. Click the "view" button
4. Verify that the correct user's profile is displayed
5. Check that the email matches the expected user

## Files Changed

1. **New Files:**
   - `ADD_USER_KEY_COLUMN.sql` - Database migration script

2. **Modified Files:**
   - `src/app/api/admin/users/resolve-key/[userKey]/route.ts` - Simplified to use DB lookup
   - `src/app/api/admin/users/list/route.ts` - Added user_key to response
   - `src/app/api/user-profiles/enhanced/route.ts` - Added user_key to profile
   - `src/app/admin/users/page.tsx` - Removed client-side key generation

## Verification

After deployment, check the browser console logs:
- Should see: `✅ Resolved user ID: <correct-uuid>`
- Should see: `✅ API response data: {success: true, user_id: <correct-uuid>, user_key: 'USER-X'}`
- Profile data email should match the clicked user

## Benefits

1. **Stability**: User keys are now persistent and don't change
2. **Consistency**: Same user always has the same key across all queries
3. **Performance**: Direct database lookup is faster than array operations
4. **Maintainability**: Simpler logic with no client-side key generation
5. **Scalability**: Works correctly regardless of query ordering or filters

## Rollback Plan

If issues occur, you can rollback the code changes and the old array-based system will work (though with the original bug). The `user_key` column won't cause issues if present but unused.

To completely rollback:
```sql
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS user_key;
DROP FUNCTION IF EXISTS generate_next_user_key();
DROP FUNCTION IF EXISTS assign_user_key_on_insert();
```
