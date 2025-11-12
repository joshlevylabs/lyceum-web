# Payment Method Detection & License Check - Implementation Guide

## Summary of Issues Fixed

### Issue 1: Payment Methods Not Detected
**Problem:** User has payment methods in Stripe but the system returns `hasPaymentMethod: false` because:
- Payment methods are stored in Stripe, not in the local `stored_payment_methods` table
- User's `stripe_customer_id` is not stored in their `user_profiles` record
- Payment check API only looked in the local database, not in Stripe

**Solution Implemented:**
1. ✅ Updated [src/app/api/payment/check/route.ts](src/app/api/payment/check/route.ts) to search Stripe when no local payment methods found
2. ✅ Added email-based Stripe customer search when `stripe_customer_id` not in profile
3. ✅ Added automatic storage of Stripe customer ID in profile for future lookups (lines 88-100)
4. ✅ Created migration to add `stripe_customer_id` column to `user_profiles` table

### Issue 2: User With License Redirected to Subscription Page
**Problem:** Dashboard "Get Lyceum Native" button doesn't check for existing licenses before routing to subscription page.

**Solution Implemented:**
1. ✅ Added GET endpoint to [src/app/api/licenses/generate-main-app/route.ts](src/app/api/licenses/generate-main-app/route.ts#L9-L76) to check for existing licenses
2. ✅ Updated [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) button to check for license before routing
3. ✅ Routes directly to `/download-app` if license exists, otherwise to `/native-app/subscribe`

### Issue 3: Settings Page Errors
**Problem:** Settings > Payment tab showing 404 and 500 errors.

**Solution Implemented:**
1. ✅ Fixed [src/app/api/billing/payment-info/route.ts](src/app/api/billing/payment-info/route.ts) to use new payment system tables
2. ✅ Fixed [src/app/api/billing/invoices/route.ts](src/app/api/billing/invoices/route.ts) to query `payment_transactions` instead of non-existent `invoices` table
3. ✅ Both endpoints now gracefully handle missing tables

---

## Required Database Migrations

The following migrations **MUST** be applied to your Supabase database:

### 1. Add Stripe Customer ID Column
**File:** `supabase/migrations/20250107_add_stripe_customer_id_to_profiles.sql`
**Purpose:** Allows caching of Stripe customer ID to avoid repeated API lookups
**Status:** ⚠️ NEEDS TO BE APPLIED

### 2. Create Stored Payment Methods Table
**File:** `supabase/migrations/20250107_stored_payment_methods.sql`
**Purpose:** Store user payment methods locally (PCI-compliant - no full card numbers)
**Status:** ⚠️ NEEDS TO BE APPLIED

### 3. Create Payment Transactions Table
**File:** `supabase/migrations/20250107_payment_transactions.sql`
**Purpose:** Track all payment transactions for billing history
**Status:** ⚠️ NEEDS TO BE APPLIED

### 4. Create Native App Subscriptions Table
**File:** `supabase/migrations/20250107_native_app_subscriptions.sql`
**Purpose:** Manage native app subscription status (trial/paid)
**Status:** ⚠️ NEEDS TO BE APPLIED

### How to Apply Migrations

**Option 1: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of each migration file **in order**:
   - `20250107_add_stripe_customer_id_to_profiles.sql`
   - `20250107_stored_payment_methods.sql`
   - `20250107_payment_transactions.sql`
   - `20250107_native_app_subscriptions.sql`
5. Run each migration
6. Verify no errors in the output

**Option 2: Via Supabase CLI**
```bash
npx supabase db push
```

---

## Diagnostic SQL Queries

### Check Database Schema Status
**File:** `CHECK_DATABASE_SCHEMA.sql`
**Purpose:** Verify which tables and columns exist, identify missing migrations
**How to use:**
1. Open Supabase SQL Editor
2. Copy and paste the contents of `CHECK_DATABASE_SCHEMA.sql`
3. Run the query
4. Review the output to see:
   - Which payment tables exist
   - If `stripe_customer_id` column exists in `user_profiles`
   - Which migrations still need to be applied

### Check User License Status
**File:** `CHECK_USER_LICENSE.sql`
**Purpose:** Investigate why user doesn't have a main-application license
**How to use:**
1. Open Supabase SQL Editor
2. Copy and paste the contents of `CHECK_USER_LICENSE.sql`
3. Run the query
4. Review the output to see:
   - User's account information
   - All licenses assigned to user
   - Specifically main-application licenses
   - User's subscriptions
   - Diagnosis of what needs to happen next

**Expected Output:**
- If user has NO licenses: Diagnosis will say "User does NOT have an active main-application license"
- If user has license: Will show license details with key_code, status, features, etc.

---

## Testing the Fixes

### Test 1: Payment Method Detection

1. **Clear browser cache** or open incognito window
2. Navigate to `/native-app/subscribe`
3. Click **"Start Free Trial"**
4. **Expected behavior:**
   - Console should show: `Found Stripe customer by email: cus_T7ZjWDtzZA3IG6`
   - Console should show: `Found payment methods in Stripe: 3`
   - Console should show: `Storing Stripe customer ID in user profile...`
   - Console should show: `Payment data: {hasPaymentMethod: true, paymentMethod: {...}}`
   - Should NOT redirect to payment page
   - Should process subscription and redirect to `/download-app`

5. **Terminal logs should show:**
```
No Stripe customer ID in profile, searching by email: josh@thelyceum.io
Found Stripe customer by email: cus_T7ZjWDtzZA3IG6
Storing Stripe customer ID in user profile...
Successfully stored Stripe customer ID in profile
Found payment methods in Stripe: 3
Final payment check result: { hasStoredPaymentMethod: false, hasStripePaymentMethod: true, hasPaymentMethod: true }
```

### Test 2: License Check on Dashboard

1. Navigate to `/dashboard`
2. Click **"Get Lyceum Native"** button
3. **If user has license:**
   - Console should show: `User has license, redirecting to download page`
   - Should redirect to `/download-app`
4. **If user does NOT have license:**
   - Console should show: `User does not have license`
   - Console should show: `Redirecting to subscription page`
   - Should redirect to `/native-app/subscribe`

### Test 3: Settings Page Payment Tab

1. Navigate to **Profile Settings > Payment**
2. **Expected behavior:**
   - Should NOT show 404 or 500 errors
   - Should display payment methods (either from Stripe or local DB)
   - Should show transaction history

---

## Investigation: Why User Doesn't Have License

Based on the logs, the user does NOT currently have a main-application license:
```
📄 License data: {hasLicense: false, license: null}
```

**Possible Reasons:**
1. License was never generated
2. License was created with wrong `license_type`
3. License has `status` other than 'active' (e.g., 'expired', 'revoked')
4. License is assigned to different user ID

**To Investigate:**
1. Run the diagnostic query in `CHECK_USER_LICENSE.sql`
2. Review the output to see if user has ANY licenses
3. If no licenses exist, user needs to complete the subscription flow to generate one
4. If licenses exist but wrong type/status, may need manual database update

**How User Gets a License:**
1. **Automatic via subscription flow:**
   - User clicks "Start Free Trial" or "Subscribe Now"
   - If user has payment method, system calls POST `/api/licenses/generate-main-app`
   - License is auto-generated and assigned to user

2. **Manual generation:**
   - User can directly POST to `/api/licenses/generate-main-app` with valid auth token
   - System will generate license if user doesn't have one

---

## Expected Flow After Fixes

### For Users WITH Payment Methods:
1. User clicks "Start Free Trial" → ✅ Payment check finds Stripe payment methods
2. System creates subscription → ✅ Calls POST `/api/subscriptions/native-app`
3. System generates license → ✅ Calls POST `/api/licenses/generate-main-app`
4. User redirected to download page → ✅ `/download-app`

### For Users WITHOUT Payment Methods:
1. User clicks "Start Free Trial" → ❌ No payment methods found
2. User redirected to payment page → `/native-app/payment?type=trial`
3. User enters payment info → Saves to Stripe
4. System creates subscription → Creates subscription record
5. System generates license → Generates main-application license
6. User redirected to download page → `/download-app`

### For Users WITH License:
1. User clicks "Get Lyceum Native" on dashboard → ✅ License check finds existing license
2. User redirected directly to download page → `/download-app`
3. No subscription flow needed

---

## Files Modified

1. [src/app/api/payment/check/route.ts](src/app/api/payment/check/route.ts)
   - Added Stripe payment method lookup
   - Added email-based Stripe customer search
   - Added automatic storage of Stripe customer ID in profile

2. [src/app/api/licenses/generate-main-app/route.ts](src/app/api/licenses/generate-main-app/route.ts)
   - Added GET endpoint to check for existing licenses

3. [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)
   - Updated "Get Lyceum Native" button to check for license before routing

4. [src/app/api/billing/payment-info/route.ts](src/app/api/billing/payment-info/route.ts)
   - Fixed to use new payment system tables
   - Made user profile optional

5. [src/app/api/billing/invoices/route.ts](src/app/api/billing/invoices/route.ts)
   - Fixed to query payment_transactions instead of invoices table
   - Added graceful error handling

---

## Next Steps

1. ✅ **Apply Database Migrations** (REQUIRED)
   - Run all 4 migration files in Supabase SQL Editor
   - Verify tables created successfully

2. ✅ **Run Diagnostic Queries** (RECOMMENDED)
   - Run `CHECK_DATABASE_SCHEMA.sql` to verify schema
   - Run `CHECK_USER_LICENSE.sql` to investigate license status

3. ✅ **Test Payment Method Detection**
   - Try clicking "Start Free Trial" again
   - Verify payment methods are detected
   - Check console and terminal logs

4. ✅ **Test License Check**
   - Click "Get Lyceum Native" on dashboard
   - Verify routing behavior based on license status

5. ✅ **Generate License if Needed**
   - If diagnostic shows no license, complete subscription flow
   - Or manually POST to `/api/licenses/generate-main-app`

---

## Support

If issues persist after applying migrations and testing:
1. Check console logs in browser DevTools
2. Check terminal logs in development server
3. Run diagnostic SQL queries to verify database state
4. Verify Stripe customer exists: `cus_T7ZjWDtzZA3IG6`
5. Verify Stripe payment methods exist for customer
