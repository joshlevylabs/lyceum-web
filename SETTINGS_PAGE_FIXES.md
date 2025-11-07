# Settings Page Error Fixes

## Issues Fixed

### 1. Error 404: "User profile not found"
**Root Cause**: Some users in `auth.users` didn't have corresponding records in the `user_profiles` table.

**Solutions Implemented**:
- **SQL Script**: Created [supabase/FIX_USER_PROFILES_AND_INVOICES.sql](supabase/FIX_USER_PROFILES_AND_INVOICES.sql) that:
  - Sets up an auto-trigger to create user profiles for new signups
  - Backfills missing user profiles for existing users

- **API Enhancement**: Updated [src/app/api/billing/payment-info/route.ts](src/app/api/billing/payment-info/route.ts) to:
  - Auto-create user profiles on-the-fly if missing
  - Look up user data from `auth.users` and create the profile
  - No more 404 errors for missing profiles

### 2. Error 500: Invoices API returning 500
**Root Cause**: Multiple issues:
- The `invoices`, `billing_periods`, and `invoice_line_items` tables may not exist
- Column name mismatch: code used `total_amount_cents` but table uses `total_cents`

**Solutions Implemented**:
- **SQL Script**: The same [supabase/FIX_USER_PROFILES_AND_INVOICES.sql](supabase/FIX_USER_PROFILES_AND_INVOICES.sql) also:
  - Creates the `invoices` table if it doesn't exist
  - Creates the `billing_periods` table if it doesn't exist
  - Creates the `invoice_line_items` table if it doesn't exist
  - Sets up proper RLS (Row Level Security) policies
  - Creates indexes for better performance

- **API Fix**: Updated [src/app/api/billing/payment-info/route.ts](src/app/api/billing/payment-info/route.ts):
  - Changed `total_amount_cents` to `total_cents` to match the database schema
  - Added error logging without failing the entire request

- **UI Fix**: Updated [src/app/settings/page.tsx](src/app/settings/page.tsx):
  - Made invoice display work with both column names for backward compatibility
  - Uses `invoice.total_cents || invoice.total_amount_cents || 0`

## What You Need to Do

### Step 1: Run the SQL Script
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open the file [supabase/FIX_USER_PROFILES_AND_INVOICES.sql](supabase/FIX_USER_PROFILES_AND_INVOICES.sql)
4. Copy and paste the entire content into the SQL Editor
5. Click "Run"

The script will:
- Create the user profile trigger
- Backfill missing user profiles
- Create invoice-related tables if needed
- Show a summary with counts

### Step 2: Test the Settings Page
1. Start your development server: `npm run dev`
2. Navigate to the Settings page
3. Check the Payment tab - should now load without 404 errors
4. Check the Invoices section - should now load without 500 errors

## Files Modified

### Created Files
- [supabase/FIX_USER_PROFILES_AND_INVOICES.sql](supabase/FIX_USER_PROFILES_AND_INVOICES.sql) - Comprehensive SQL fix script

### Modified Files
- [src/app/api/billing/payment-info/route.ts](src/app/api/billing/payment-info/route.ts)
  - Auto-creates missing user profiles
  - Fixed column name from `total_amount_cents` to `total_cents`
  - Better error handling

- [src/app/settings/page.tsx](src/app/settings/page.tsx)
  - Fixed invoice total display to handle both column names

## Database Schema Created

### user_profiles
- Automatic trigger creates profiles when users sign up
- Backfill creates profiles for existing users

### invoices
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `invoice_number` (VARCHAR, unique)
- `invoice_date` (TIMESTAMP)
- `due_date` (TIMESTAMP)
- `status` (VARCHAR: draft, pending, paid, overdue, cancelled)
- `subtotal_cents` (BIGINT)
- `tax_cents` (BIGINT)
- `total_cents` (BIGINT)
- `notes` (TEXT)
- RLS enabled with user-based access control

### billing_periods
- Links invoices to specific billing periods
- Tracks period start/end dates
- Status: open, closed, invoiced

### invoice_line_items
- Individual line items for each invoice
- Quantity, unit price, total price
- Links back to invoices

## Expected Outcome

After running the SQL script and restarting your app:
- No more "User profile not found" errors
- No more "Invoices API 500" errors
- Settings page loads completely
- Payment information displays correctly
- Invoices section works (even if empty)
- Future users will automatically get profiles created

## Verification

Run this query in Supabase SQL Editor to verify everything is set up:

```sql
-- Check user profiles
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.user_profiles) as total_profiles,
  (SELECT COUNT(*)
   FROM auth.users au
   LEFT JOIN public.user_profiles up ON au.id = up.id
   WHERE up.id IS NULL) as missing_profiles;

-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'invoices', 'billing_periods', 'invoice_line_items');

-- Check trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

All counts should match and missing_profiles should be 0.
