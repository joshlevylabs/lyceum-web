# Payment System Fixes - January 23, 2025

## Issues Found and Fixed

### 1. ✅ Duplicate Licenses Created
**Problem**: Users were getting 2 licenses when subscribing
**Root Cause**: No database constraint preventing duplicate active licenses per user
**Fix**:
- Added unique partial index on `license_keys` table
- Migration automatically marks older duplicate licenses as "superseded"
- Keeps only the newest license active per user
**Files Changed**:
- `supabase/migrations/20250123_prevent_duplicate_licenses.sql` (NEW)

### 2. ✅ Subscription Showing as One-Time Payment
**Problem**: Subscriptions displayed as one-time payments instead of recurring
**Root Cause**: Missing `stripe_subscription_id` field in database
**Fix**:
- Added `stripe_subscription_id` column to `user_subscriptions_native_app` table
- Updated webhook to store Stripe subscription IDs
- System now properly tracks recurring vs one-time payments
**Files Changed**:
- `supabase/migrations/20250123_add_stripe_subscription_id.sql` (NEW)
- `src/app/api/stripe/webhook/route.ts` (UPDATED)

### 3. ✅ Payment Method Not Being Saved
**Problem**: Payment methods weren't showing in Settings > Payment page
**Root Cause**: Webhook wasn't extracting and saving payment method details
**Fix**:
- Updated webhook to extract payment method from checkout session
- Saves card details (last 4 digits, brand, expiration) to `stored_payment_methods` table
- Properly handles payment method retrieval from Stripe API
**Files Changed**:
- `src/app/api/stripe/webhook/route.ts` (UPDATED)

### 4. ✅ Payment History Not Showing Transactions
**Problem**: No transactions appearing in Payment History section
**Root Cause**: Payment history API was querying wrong table (`subscriptions` instead of `user_subscriptions_native_app`)
**Fix**:
- Updated payment history endpoint to query `payment_transactions` table (primary)
- Falls back to `user_subscriptions_native_app` table for existing data
- Shows comprehensive payment history including card details
**Files Changed**:
- `src/app/api/billing/payment-history/route.ts` (UPDATED)

## Database Changes

### New Migrations Created:

1. **20250123_add_stripe_subscription_id.sql**
   - Adds `stripe_subscription_id` column
   - Creates index for efficient lookups
   - Tracks recurring Stripe subscriptions

2. **20250123_prevent_duplicate_licenses.sql**
   - Cleans up existing duplicate licenses
   - Adds unique constraint preventing future duplicates
   - Marks older licenses as "superseded"

### Tables Modified:

- `user_subscriptions_native_app`: Added `stripe_subscription_id` column
- `license_keys`: Added unique index on (assigned_to, license_type)

### Tables Used (No Schema Changes):

- `stored_payment_methods`: Existing table now properly populated by webhook
- `payment_transactions`: Existing table now properly populated by webhook

## Enhanced Webhook Functionality

The webhook (`src/app/api/stripe/webhook/route.ts`) now:

1. **Updates user profiles** with Stripe customer ID
2. **Updates subscriptions** with all Stripe IDs (customer, session, payment intent, subscription)
3. **Extracts and saves payment methods**:
   - Retrieves payment intent and payment method from Stripe
   - Stores card last 4, brand, expiration, billing zip
   - Marks as default payment method
4. **Records payment transactions**:
   - Creates entry in `payment_transactions` table
   - Stores amount, currency, status
   - Links to checkout session ID
5. **Handles errors gracefully**: Won't fail entire webhook if payment method or transaction save fails

## Deployment Instructions

### Step 1: Run Database Migrations

```bash
# Connect to your Supabase database
# Go to Supabase Dashboard > SQL Editor

# Run migration 1: Add stripe_subscription_id
# Copy and paste contents of:
# supabase/migrations/20250123_add_stripe_subscription_id.sql

# Run migration 2: Prevent duplicate licenses
# Copy and paste contents of:
# supabase/migrations/20250123_prevent_duplicate_licenses.sql
```

### Step 2: Deploy Code Changes

```bash
# Commit the changes
git add .
git commit -m "fix: Resolve payment system issues - duplicate licenses, payment methods, and history"

# Push to deploy
git push origin main

# Or deploy directly to Vercel
vercel --prod
```

### Step 3: Verify Webhook is Working

1. Go to Stripe Dashboard > Webhooks
2. Find your production webhook endpoint
3. Click "Send test webhook"
4. Select "checkout.session.completed"
5. Check webhook logs for "✅ Payment method saved" and "✅ Payment transaction recorded"

### Step 4: Clean Up Existing Duplicate Licenses

The migration automatically handles this, but verify:

```sql
-- Check for any remaining duplicates (should be empty)
SELECT assigned_to, COUNT(*) as count, ARRAY_AGG(key_code) as licenses
FROM license_keys
WHERE license_type = 'main-application'
  AND status IN ('active', 'trial')
  AND assigned_to IS NOT NULL
GROUP BY assigned_to
HAVING COUNT(*) > 1;
```

## Testing Checklist

After deployment, test with a new payment:

- [ ] User goes through checkout flow
- [ ] Payment completes successfully
- [ ] **Only ONE license** is created (check Settings > Licenses)
- [ ] License shows correct status ("active" not "trial")
- [ ] Payment method appears in Settings > Payment > Payment Methods
- [ ] Transaction appears in Settings > Payment > Payment History
- [ ] Transaction shows card details (last 4 digits, brand)
- [ ] Stripe webhook shows successful processing in logs

## Monitoring

### Check Webhook Logs

In your server logs, look for:
```
✅ Payment method saved for user: [user-id]
✅ Payment transaction recorded for user: [user-id]
```

### Check Stripe Dashboard

1. Go to Stripe Dashboard > Customers
2. Find the customer by email
3. Verify:
   - Payment method is attached
   - Payment succeeded
   - Subscription created (if recurring)

### Database Queries for Verification

```sql
-- Check user's licenses
SELECT key_code, status, created_at, expires_at
FROM license_keys
WHERE assigned_to = '[user-id]'
  AND license_type = 'main-application'
ORDER BY created_at DESC;

-- Check user's subscriptions
SELECT subscription_type, status, stripe_subscription_id, stripe_customer_id
FROM user_subscriptions_native_app
WHERE user_id = '[user-id]'
ORDER BY created_at DESC;

-- Check user's payment methods
SELECT card_brand, card_last_four, card_exp_month, card_exp_year
FROM stored_payment_methods
WHERE user_id = '[user-id]';

-- Check user's payment history
SELECT description, amount, status, created_at
FROM payment_transactions
WHERE user_id = '[user-id]'
ORDER BY created_at DESC;
```

## Rollback Plan

If issues occur, rollback:

```bash
# Rollback code
git revert HEAD
git push origin main

# Rollback database (if needed)
DROP INDEX IF EXISTS idx_unique_active_main_app_license_per_user;
ALTER TABLE user_subscriptions_native_app DROP COLUMN IF EXISTS stripe_subscription_id;
```

## Notes

- The system still supports one-time payments ($49 lifetime license)
- Webhook enhancements are backward compatible
- Existing subscriptions/licenses are not affected
- Duplicate license cleanup is safe and only marks extras as "superseded"
- Payment method and transaction recording won't fail webhook if they error

## Support

If issues persist:
1. Check Stripe webhook logs
2. Check server application logs
3. Verify database migrations ran successfully
4. Test with Stripe test mode first before live mode
