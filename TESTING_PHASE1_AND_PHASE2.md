# Testing Guide: Phase 1 & Phase 2

## Overview

This guide will help you verify that Phase 1 (removing duplicate Stripe functionality) and Phase 2 (webhook consolidation & license lifecycle) are working correctly.

---

## Prerequisites

Before testing, ensure:
- [x] Migrations have been run:
  - `20250124_remove_coupon_system.sql`
  - `20250124_remove_invoice_system.sql`
  - `add_stripe_subscription_id.sql`
  - `prevent_duplicate_licenses.sql`
- [x] Dev server is running: `npm run dev`
- [x] Stripe webhook endpoint is configured (for production testing)
- [x] You have Stripe test mode enabled (use test credit card: 4242 4242 4242 4242)

---

## Phase 1 Testing: Removed Systems

### Test 1.1: Verify Coupon System Removed ✅

**Goal:** Confirm custom coupon system no longer exists

**Steps:**
1. Navigate to admin panel: http://localhost:3594/admin
2. **Expected:** No "Coupons & Discounts" menu item should appear
3. Try accessing old URL directly: http://localhost:3594/admin/coupons
4. **Expected:** 404 error or redirect (page doesn't exist)

**Database Verification:**
```sql
-- Run in Supabase SQL Editor
-- Should return 0 rows (tables removed):
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('coupons', 'user_coupons', 'coupon_usage_log');
```

**Expected Result:** Query returns 0 rows

---

### Test 1.2: Verify Invoice System Removed ✅

**Goal:** Confirm custom invoice system no longer exists

**Database Verification:**
```sql
-- Should return 0 rows (tables removed):
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('invoices', 'invoice_line_items');

-- Should return 2 rows (tables kept for usage tracking):
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('billing_periods', 'billing_usage_snapshots');
```

**Expected Results:**
- First query: 0 rows (invoice tables removed)
- Second query: 2 rows (usage tracking tables kept)

---

### Test 1.3: Test Stripe Promotion Codes (Replacement for Coupons) ✅

**Goal:** Verify Stripe Promotion Codes work at checkout

**Setup - Create Test Promotion Code in Stripe:**

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/coupons
2. Click "+ New" to create a coupon
3. Set:
   - **Discount:** 20% off
   - **Duration:** Once
   - **Name:** "Test 20% Off"
4. Click "Create coupon"
5. In the coupon details, click "Add promotion code"
6. Set code to: `TEST20`
7. Click "Create promotion code"

**Test Steps:**

1. Navigate to: http://localhost:3594/billing
2. Click "Get Started" on any plan (e.g., Starter - $29/month)
3. **Expected:** Redirected to Stripe Checkout
4. Look for "Add promotion code" link below payment form
5. Click it and enter: `TEST20`
6. **Expected:** Discount appears, price reduced by 20%
7. **DO NOT complete checkout yet** - just verify the promotion code works

**Expected Result:** ✅ Promotion code applies successfully, showing discounted price

---

### Test 1.4: Verify Usage Tracking Still Works ✅

**Goal:** Confirm billing service still calculates usage/costs

**Database Setup:**
```sql
-- Create test billing period (replace YOUR_USER_ID with your actual user ID)
-- Example: '21b9fa0f-26cc-4b7a-865c-48759f778a38'
INSERT INTO billing_periods (
  user_id,
  period_start,
  period_end,
  period_label,
  status,
  total_amount_cents,
  currency
)
VALUES (
  '21b9fa0f-26cc-4b7a-865c-48759f778a38',  -- Replace with your user ID
  NOW(),
  NOW() + INTERVAL '1 month',
  TO_CHAR(NOW(), 'Month YYYY'),
  'active',
  0,
  'USD'
);

-- Create test usage snapshot
INSERT INTO billing_usage_snapshots (
  user_id,
  billing_period_id,
  licenses_breakdown,
  clusters_breakdown,
  additional_users,
  storage_overage_gb,
  estimated_monthly_cost_cents
)
SELECT
  '21b9fa0f-26cc-4b7a-865c-48759f778a38',  -- Replace with your user ID
  id,
  '{"professional": 2}'::jsonb,  -- 2 professional licenses
  '{"production": {"medium": 1}}'::jsonb,  -- 1 medium production cluster
  0,  -- 0 additional users
  5,  -- 5GB overage
  3900  -- $39.00 in cents
FROM billing_periods
WHERE user_id = '21b9fa0f-26cc-4b7a-865c-48759f778a38'  -- Replace with your user ID
  AND status = 'active'
LIMIT 1;
```

**API Test:**
```bash
# Test billing summary endpoint (replace TOKEN with your auth token)
curl -X GET http://localhost:3594/api/user-billing/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "subscription_status": "active",
  "plan_name": "starter",
  "stripe_customer_id": "cus_...",
  "estimatedMonthlyCost": 3900,
  "currentUsage": {
    "licenses": 2,
    "clusters": 1,
    "additionalUsers": 0,
    "storageOverageGB": 5
  }
}
```

**Expected Result:** ✅ Usage tracking returns estimated costs correctly

---

## Phase 2 Testing: Webhooks & License Lifecycle

### Test 2.1: Verify Duplicate Webhook Deleted ✅

**Goal:** Confirm only one webhook handler exists

**File Check:**
```bash
# This should NOT exist:
ls src/app/api/billing/stripe-webhook/route.ts

# This SHOULD exist:
ls src/app/api/stripe/webhook/route.ts
```

**Expected Results:**
- First command: File not found (deleted)
- Second command: File exists

---

### Test 2.2: Test Complete Subscription Flow ✅

**Goal:** Verify subscription creation, license generation, and webhook processing

**Steps:**

1. **Create Subscription:**
   - Go to: http://localhost:3594/billing
   - Click "Get Started" on Starter plan
   - Complete Stripe Checkout with test card: `4242 4242 4242 4242`
   - Any future date for expiry, any 3-digit CVC
   - Click "Subscribe"

2. **Wait for Redirect:**
   - **Expected:** Redirected to success page (e.g., `/admin/billing/success`)
   - Check server logs for webhook events

3. **Verify Webhook Processed:**
   - Check server console output for:
   ```
   ✅ Stripe webhook event: checkout.session.completed
   ✅ Stripe webhook event: customer.subscription.created
   ✅ Payment method saved for user: [USER_ID]
   ✅ Payment transaction recorded for user: [USER_ID]
   ```

4. **Verify Database Updates:**
   ```sql
   -- Check user profile updated
   SELECT
     id,
     email,
     subscription_status,
     stripe_customer_id,
     plan_name
   FROM user_profiles
   WHERE email = 'YOUR_EMAIL';
   -- Expected: subscription_status = 'active'

   -- Check subscription record created
   SELECT
     id,
     user_id,
     status,
     stripe_subscription_id,
     stripe_customer_id
   FROM user_subscriptions_native_app
   WHERE user_id = 'YOUR_USER_ID';
   -- Expected: status = 'active', stripe_subscription_id populated

   -- Check license generated
   SELECT
     id,
     license_key,
     status,
     user_id,
     created_at
   FROM licenses
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 1;
   -- Expected: status = 'active', license_key generated
   ```

**Expected Results:**
- ✅ Subscription created in Stripe
- ✅ `checkout.session.completed` webhook processed
- ✅ `customer.subscription.created` webhook processed
- ✅ user_profiles.subscription_status = 'active'
- ✅ user_subscriptions_native_app record created
- ✅ License generated with status = 'active'

---

### Test 2.3: Test Stripe Billing Portal ✅

**Goal:** Verify users can access Billing Portal for self-service

**Steps:**

1. **Access Billing Page:**
   - Go to: http://localhost:3594/billing
   - **Expected:** See "Current Subscription" section showing your active plan

2. **Open Billing Portal:**
   - Click "Manage Billing" button
   - **Expected:** Redirected to Stripe's Billing Portal
   - URL should be: `https://billing.stripe.com/p/session/...`

3. **Test Portal Features:**
   - ✅ View invoices list
   - ✅ Click invoice to see details
   - ✅ Download invoice PDF
   - ✅ See payment method
   - ✅ Update payment method (can test but don't save)
   - ✅ See subscription details

4. **Return to App:**
   - Click "Return to [Your App Name]" in portal
   - **Expected:** Redirected back to http://localhost:3594/billing

**Expected Result:** ✅ Billing Portal accessible and all features work

---

### Test 2.4: Test License Lifecycle (CRITICAL TEST) 🔥

**Goal:** Verify licenses automatically expire when subscription is cancelled

**Setup - Get Test Data:**
```sql
-- Get your user ID, subscription ID, and license key
SELECT
  up.id as user_id,
  up.email,
  up.subscription_status,
  us.stripe_subscription_id,
  l.id as license_id,
  l.license_key,
  l.status as license_status
FROM user_profiles up
LEFT JOIN user_subscriptions_native_app us ON us.user_id = up.id
LEFT JOIN licenses l ON l.user_id = up.id
WHERE up.email = 'YOUR_EMAIL'
  AND l.status = 'active'
ORDER BY l.created_at DESC
LIMIT 1;
```

**Record these values:**
- user_id: `__________________`
- stripe_subscription_id: `sub___________________`
- license_key: `__________________`
- license_status (should be 'active'): `__________________`

**Test Steps:**

1. **Cancel Subscription via Billing Portal:**
   - Go to: http://localhost:3594/billing
   - Click "Manage Billing"
   - In Stripe portal, find "Cancel plan"
   - Click "Cancel plan" → "Cancel plan" (confirm)
   - Choose reason: "Other"
   - Click "Cancel plan" (final confirmation)
   - **Expected:** "Your subscription has been cancelled"

2. **Wait for Webhook (5-30 seconds):**
   - Watch server console logs
   - **Expected to see:**
   ```
   Stripe webhook event: customer.subscription.deleted
   Subscription deleted: sub_XXXXXXXXXXXXX
   ✅ Expired 1 license(s) for user: [USER_ID]
   ✅ Subscription cancelled and licenses expired for user: [USER_ID]
   ```

3. **Verify License Expired:**
   ```sql
   SELECT
     id,
     license_key,
     status,
     updated_at
   FROM licenses
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY updated_at DESC;
   -- Expected: status = 'expired', updated_at = recent timestamp
   ```

4. **Verify User Profile Updated:**
   ```sql
   SELECT
     id,
     email,
     subscription_status,
     updated_at
   FROM user_profiles
   WHERE id = 'YOUR_USER_ID';
   -- Expected: subscription_status = 'canceled'
   ```

5. **Verify Native App Subscription Updated:**
   ```sql
   SELECT
     id,
     user_id,
     status,
     stripe_subscription_id,
     updated_at
   FROM user_subscriptions_native_app
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY updated_at DESC
   LIMIT 1;
   -- Expected: status = 'cancelled'
   ```

**Expected Results:**
- ✅ Subscription cancelled in Stripe
- ✅ `customer.subscription.deleted` webhook received
- ✅ Console logs show license expiration
- ✅ licenses.status = 'expired'
- ✅ user_profiles.subscription_status = 'canceled'
- ✅ user_subscriptions_native_app.status = 'cancelled'

**This is the most important test!** It verifies Phase 2's license lifecycle management is working.

---

### Test 2.5: Test Subscription Reactivation ✅

**Goal:** Verify resubscribing creates a new license

**Steps:**

1. **Subscribe Again:**
   - Go to: http://localhost:3594/billing
   - Click "Get Started" on any plan
   - Complete checkout with test card
   - **Expected:** Successful checkout

2. **Verify New License Created:**
   ```sql
   SELECT
     id,
     license_key,
     status,
     created_at,
     user_id
   FROM licenses
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 5;
   -- Expected: New license with status = 'active'
   -- Old license should still be 'expired'
   ```

3. **Verify Counts:**
   ```sql
   -- Count active and expired licenses
   SELECT
     status,
     COUNT(*) as count
   FROM licenses
   WHERE user_id = 'YOUR_USER_ID'
   GROUP BY status;
   -- Expected: 1 active, X expired (where X = number of previous cancellations)
   ```

**Expected Results:**
- ✅ New subscription created
- ✅ New active license generated
- ✅ Old licenses remain expired (not reactivated)

---

## Webhook Testing (Production)

### Setup Stripe Webhook Endpoint

**For production/staging, configure webhook endpoint:**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the webhook signing secret: `whsec_...`
7. Add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Test Webhook Delivery

**Using Stripe CLI (for local testing):**

```bash
# Install Stripe CLI if you haven't
# Download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3594/api/stripe/webhook

# Test webhook
stripe trigger customer.subscription.deleted
```

**Expected Output:**
```
✅ Webhook received!
✅ Processing: customer.subscription.deleted
✅ Expired X license(s) for user: [USER_ID]
✅ Subscription cancelled and licenses expired for user: [USER_ID]
```

---

## Error Checking

### Check for Errors in Logs

**Look for these issues:**

```bash
# Run dev server and watch for errors
npm run dev
```

**Should NOT see:**
- ❌ `Error: relation "invoices" does not exist`
- ❌ `Error: relation "coupons" does not exist`
- ❌ `Error: relation "user_coupons" does not exist`
- ❌ `TypeError: Cannot read property of undefined` (in webhook handler)

**Should see (during normal operation):**
- ✅ `Stripe webhook event: [event_type]`
- ✅ `Payment method saved for user: [id]`
- ✅ `Payment transaction recorded for user: [id]`
- ✅ `Expired X license(s) for user: [id]` (when subscription cancelled)

---

## Complete Testing Checklist

### Phase 1 Tests:
- [ ] 1.1: Custom coupon system removed from admin UI
- [ ] 1.2: Invoice tables removed from database
- [ ] 1.3: Stripe Promotion Codes work at checkout
- [ ] 1.4: Usage tracking still calculates costs correctly

### Phase 2 Tests:
- [ ] 2.1: Duplicate webhook handler deleted
- [ ] 2.2: Complete subscription flow works (checkout → license generation)
- [ ] 2.3: Billing Portal accessible and functional
- [ ] 2.4: License lifecycle works (cancel → auto-expire)
- [ ] 2.5: Resubscription creates new license

### Error Checks:
- [ ] No database errors in logs
- [ ] No TypeScript compilation errors
- [ ] Webhooks process successfully
- [ ] All database queries return expected results

---

## Troubleshooting

### Issue: Webhook not firing locally

**Solution:** Use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:3594/api/stripe/webhook
```

### Issue: "No billing account found" error

**Solution:** Ensure customer exists in Stripe with correct email:
```sql
-- Check user's stripe_customer_id
SELECT email, stripe_customer_id FROM user_profiles WHERE email = 'YOUR_EMAIL';
```

### Issue: Licenses not expiring on cancellation

**Solution:** Check webhook logs:
1. Verify `customer.subscription.deleted` webhook received
2. Check server console for error messages
3. Verify user has `metadata.userId` in Stripe customer object

### Issue: Database queries return errors

**Solution:** Verify migrations were run:
```sql
-- Should NOT exist:
SELECT * FROM coupons LIMIT 1;  -- Error expected
SELECT * FROM invoices LIMIT 1;  -- Error expected

-- Should exist:
SELECT * FROM billing_periods LIMIT 1;  -- Should work
SELECT * FROM licenses LIMIT 1;  -- Should work
```

---

## Success Criteria

**Phase 1 & 2 are successful if:**

✅ All custom coupon system code removed
✅ All custom invoice system code removed
✅ Stripe Promotion Codes work at checkout
✅ Usage tracking still calculates correctly
✅ Only one webhook handler exists
✅ Webhooks process successfully
✅ Licenses generate on subscription creation
✅ Licenses auto-expire on subscription cancellation
✅ Billing Portal accessible and functional
✅ No errors in server logs
✅ All database queries return expected data

**If all tests pass, Phase 1 & 2 are production-ready!** 🚀

---

## Next Steps After Testing

1. **If all tests pass:**
   - Deploy to staging environment
   - Run tests again in staging
   - Configure production webhook endpoint
   - Deploy to production

2. **If any tests fail:**
   - Check error messages in console
   - Verify migrations were run
   - Check database schema matches expected
   - Review webhook handler code
   - Consult troubleshooting section above

3. **Optional: Proceed to Phase 3**
   - Remove `stored_payment_methods` table
   - Remove `payment_transactions` table
   - Implement Stripe's built-in trial periods
   - Enhanced webhook logging

---

**Happy Testing!** 🧪

If you encounter any issues, refer to:
- [PHASE1_COMPLETE.md](PHASE1_COMPLETE.md)
- [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md)
- Stripe Docs: https://stripe.com/docs
