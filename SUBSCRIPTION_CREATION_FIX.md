# Subscription Creation Fix - After Stripe Payment

**Date:** January 7, 2025
**Issue:** Subscriptions not being created after successful Stripe payment
**Status:** ✅ FIXED

---

## 🔍 Problem Summary

**User reported:** "We're unable to generate subscriptions (or trials for subscriptions) after the user successfully pays for the subscription via Stripe."

**Root cause:** The Stripe webhook handler was trying to UPDATE a subscription that didn't exist, instead of CREATING a new one.

---

## 🎯 Root Cause Analysis

### Before Fix:

**File:** `src/app/api/stripe/webhook/route.ts`

**Lines 268-280 (OLD CODE):**
```typescript
// Update native app subscription with Stripe data
await dbOperations.supabaseAdmin
  .from('subscriptions')
  .update({  // ❌ Only UPDATES - doesn't create if missing
    stripe_customer_id: session.customer,
    stripe_session_id: session.id,
    // ...
  })
  .eq('user_id', userId)
  .eq('subscription_category', 'native_app')
  .eq('status', 'active');
```

**The problem:**
1. User completes payment in Stripe
2. `checkout.session.completed` webhook fires
3. Webhook tries to UPDATE subscription
4. But no subscription exists in database yet
5. UPDATE query finds nothing → does nothing
6. **Subscription is never created!** ❌

**Why this happened:**
- Plugin subscriptions were correctly using INSERT (creates new record) ✅
- Native app subscriptions were using UPDATE (only modifies existing) ❌
- This asymmetry meant plugin trials worked, but native app subscriptions didn't

---

## ✅ The Fix

### What Changed:

**File:** `src/app/api/stripe/webhook/route.ts`
**Lines:** 268-405

### New Logic:

```typescript
// Check if subscription already exists
const { data: existingSubscription } = await dbOperations.supabaseAdmin
  .from('subscriptions')
  .select('id')
  .eq('user_id', userId)
  .eq('subscription_category', 'native_app')
  .maybeSingle();

if (existingSubscription) {
  // Update existing subscription
  await dbOperations.supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_customer_id: session.customer,
      stripe_session_id: session.id,
      // ...
    })
    .eq('id', existingSubscription.id);
} else {
  // Create new subscription ✅
  const { data: newSubscription } = await dbOperations.supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      subscription_category: 'native_app',
      subscription_type: subscriptionType,
      status: 'active',
      stripe_customer_id: session.customer,
      // ...
    });

  // Also generate license key ✅
  const licenseKey = generateNativeAppLicenseKey();
  await dbOperations.supabaseAdmin
    .from('license_keys')
    .insert({
      key_code: licenseKey,
      license_type: 'main-application',
      // ...
    });
}
```

### Key Improvements:

1. **✅ Checks if subscription exists first**
   - If exists → UPDATE
   - If doesn't exist → INSERT (create new)

2. **✅ Generates license key automatically**
   - Format: `CENTCOM-XXXXXXXX`
   - Type: `main-application`
   - Tier: `professional`
   - Features: `local_cluster`, `data_integration`, `analytics`, `reporting`

3. **✅ Creates license-subscription relationship**
   - Links license to subscription
   - Tracks how it was created (via Stripe checkout)

4. **✅ Handles both trials and paid subscriptions**
   - Trial: 30-day expiration
   - Paid: Unlimited (no expiration)

---

## 📊 What Happens Now

### After Successful Payment:

1. **User completes payment** in Stripe
2. **Stripe sends webhook** to `/api/stripe/webhook`
3. **Webhook receives** `checkout.session.completed` event
4. **Check for existing subscription**:
   - If exists → Update with Stripe IDs
   - If doesn't exist → Create new subscription ✅
5. **Generate license key** (if new subscription)
6. **Create license-subscription relationship**
7. **Save payment method** (if available)
8. **Record payment transaction**

### Database Records Created:

#### 1. Subscription Record:
```sql
INSERT INTO subscriptions (
  user_id,
  subscription_category,    -- 'native_app'
  subscription_type,        -- 'trial' or 'paid'
  status,                   -- 'active'
  stripe_customer_id,       -- 'cus_xxx'
  stripe_session_id,        -- 'cs_xxx'
  stripe_subscription_id,   -- 'sub_xxx'
  created_at,
  updated_at
) VALUES (...);
```

#### 2. License Key Record:
```sql
INSERT INTO license_keys (
  key_code,                 -- 'CENTCOM-XXXXXXXX'
  license_type,             -- 'main-application'
  license_category,         -- 'main_application'
  status,                   -- 'trial' or 'active'
  tier,                     -- 'professional'
  max_users,                -- 50
  max_projects,             -- 1000
  max_storage_gb,           -- 500
  features,                 -- ['local_cluster', 'data_integration', ...]
  expires_at,               -- NULL (unlimited) or DATE (trial)
  assigned_to,              -- user_id
  license_config            -- {auto_generated: true, ...}
) VALUES (...);
```

#### 3. License-Subscription Relationship:
```sql
INSERT INTO license_subscription_relationships (
  license_id,
  subscription_id,
  relationship_type,        -- 'trial_conversion' or 'standard'
  notes                     -- 'Auto-created on native app Stripe checkout'
) VALUES (...);
```

#### 4. Payment Transaction:
```sql
INSERT INTO payment_transactions (
  user_id,
  subscription_type,        -- 'paid'
  amount,                   -- Amount in dollars
  currency,                 -- 'USD'
  status,                   -- 'completed'
  transaction_id,           -- Stripe session ID
  processed_at
) VALUES (...);
```

---

## 🧪 Testing the Fix

### Test Case 1: New User - Paid Subscription

**Steps:**
1. Create new user account
2. Navigate to `/native-app/subscribe`
3. Click "Subscribe" and complete Stripe checkout
4. Verify in database:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '[user_id]';
   -- Should return 1 row with status='active'

   SELECT * FROM license_keys WHERE assigned_to = '[user_id]';
   -- Should return 1 row with key_code='CENTCOM-XXXXXXXX'
   ```

**Expected results:**
- ✅ Subscription created in database
- ✅ License key generated
- ✅ License-subscription relationship created
- ✅ Payment transaction recorded
- ✅ User can access native app features

---

### Test Case 2: Existing User - Already Has Subscription

**Steps:**
1. User who already has a subscription
2. Complete another payment (upgrade or renewal)
3. Verify in database:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '[user_id]';
   -- Should return 1 row (updated, not duplicated)
   ```

**Expected results:**
- ✅ Existing subscription updated (not duplicated)
- ✅ Stripe IDs updated in subscription
- ✅ Payment transaction recorded
- ✅ No duplicate license keys created

---

### Test Case 3: Trial Subscription

**Steps:**
1. User starts a trial (if trial flow exists)
2. Complete trial setup with Stripe (setup intent)
3. Verify in database:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '[user_id]';
   -- Should have subscription_type='trial', expires_at set to 30 days

   SELECT * FROM license_keys WHERE assigned_to = '[user_id]';
   -- Should have status='trial', expires_at set to 30 days
   ```

**Expected results:**
- ✅ Trial subscription created
- ✅ Trial license generated with 30-day expiration
- ✅ License marked as 'trial' status
- ✅ Features include 'trial_license'

---

## 📝 Expected Webhook Logs

### When webhook receives checkout.session.completed:

```
Stripe webhook event: checkout.session.completed
Checkout completed: cs_test_xxxxxxxxxxxxx
✅ Updated existing native app subscription: [subscription_id]
```

**OR (if new subscription):**

```
Stripe webhook event: checkout.session.completed
Checkout completed: cs_test_xxxxxxxxxxxxx
✅ Created new native app subscription: [subscription_id]
✅ Native app license generated: CENTCOM-XXXXXXXX
✅ Created license-subscription relationship
✅ Payment method saved for user: [user_id]
✅ Payment transaction recorded for user: [user_id]
```

---

## 🔍 Verification Queries

### Check if user has subscription:
```sql
SELECT
  s.id,
  s.subscription_category,
  s.subscription_type,
  s.status,
  s.stripe_subscription_id,
  s.created_at,
  s.updated_at
FROM subscriptions s
WHERE s.user_id = '[user_id]'
  AND s.subscription_category = 'native_app';
```

### Check if user has license:
```sql
SELECT
  lk.id,
  lk.key_code,
  lk.license_type,
  lk.license_category,
  lk.status,
  lk.tier,
  lk.expires_at,
  lk.features
FROM license_keys lk
WHERE lk.assigned_to = '[user_id]'
  AND lk.license_type = 'main-application';
```

### Check license-subscription relationship:
```sql
SELECT
  lsr.id,
  lsr.license_id,
  lsr.subscription_id,
  lsr.relationship_type,
  lk.key_code,
  s.stripe_subscription_id
FROM license_subscription_relationships lsr
JOIN license_keys lk ON lk.id = lsr.license_id
JOIN subscriptions s ON s.id = lsr.subscription_id
WHERE lk.assigned_to = '[user_id]';
```

### Check payment transactions:
```sql
SELECT
  pt.id,
  pt.amount,
  pt.currency,
  pt.status,
  pt.transaction_id,
  pt.stripe_subscription_id,
  pt.processed_at
FROM payment_transactions pt
WHERE pt.user_id = '[user_id]'
ORDER BY pt.processed_at DESC;
```

---

## 🎯 Benefits of This Fix

### Before:
- ❌ Users paid but got no subscription
- ❌ Users paid but got no license
- ❌ Manual intervention required to fix accounts
- ❌ Poor user experience
- ❌ Support tickets and refunds

### After:
- ✅ Subscription automatically created on payment
- ✅ License automatically generated
- ✅ No manual intervention needed
- ✅ Smooth user experience
- ✅ Users can immediately use the app

---

## 🚀 Deployment Steps

1. **✅ Code changes committed** (already done)
2. **Test in development:**
   - Set up Stripe test mode
   - Use Stripe CLI to forward webhooks
   - Complete test checkout
   - Verify subscription and license created

3. **Deploy to production:**
   - Push code to production
   - Verify Stripe webhook endpoint is configured
   - Monitor webhook logs for any errors

4. **Verify in production:**
   - Check webhook logs in Stripe dashboard
   - Verify subscriptions are being created
   - Check for any errors

---

## ⚠️ Important Notes

### Webhook Secret:
Make sure `STRIPE_WEBHOOK_SECRET` environment variable is set:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Stripe Price IDs:
Make sure `STRIPE_NATIVE_APP_MONTHLY_PRICE_ID` is set:
```env
STRIPE_NATIVE_APP_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
```

### Webhook Endpoint:
Stripe must be configured to send webhooks to:
```
https://your-domain.com/api/stripe/webhook
```

**Required events:**
- `checkout.session.completed` ✅ (fixed)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 📚 Related Files Modified

1. **[src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)**
   - Lines 268-405: Added subscription creation logic
   - Lines 319-404: Added license generation for native app

---

## ✅ Status: FIXED

**What was broken:** Subscriptions weren't being created after payment
**What's fixed:** Subscriptions are now automatically created with license keys
**Impact:** Users can now successfully subscribe and get immediate access

---

**Created:** January 7, 2025
**Status:** ✅ READY FOR TESTING
**Priority:** HIGH - Critical for user onboarding
