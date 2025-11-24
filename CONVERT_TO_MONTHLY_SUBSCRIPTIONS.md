# Convert from Lifetime Licenses to Monthly Recurring Subscriptions

## ⚠️ CRITICAL BUSINESS MODEL CHANGE

Your system was configured for **ONE-TIME $49 payments** (lifetime licenses).
You need **MONTHLY RECURRING $49/month subscriptions**.

## Changes Made

### Code Updates:

1. **[src/app/api/stripe/create-native-app-checkout/route.ts](src/app/api/stripe/create-native-app-checkout/route.ts)**
   - Changed `mode: 'payment'` → `mode: 'subscription'`
   - Changed from `price_data` (one-time) → `price` (recurring using Price ID)
   - Added validation for `STRIPE_NATIVE_APP_MONTHLY_PRICE_ID` environment variable
   - Updated to create recurring Stripe subscriptions

2. **[src/app/api/billing/payment-history/route.ts](src/app/api/billing/payment-history/route.ts)**
   - Changed all descriptions from "Lifetime License" → "Monthly Subscription"
   - Applies to main app and plugins

### What Still Needs TO BE DONE:

## Step 1: Create Monthly Recurring Price in Stripe

**REQUIRED before deployment!**

1. Go to https://dashboard.stripe.com/products
2. **Make sure you're in LIVE mode** (toggle in top-right)
3. Click **"+ Add product"**
4. Create product:
   - **Name**: `Lyceum Native App - Monthly Subscription`
   - **Description**: `Monthly recurring subscription for Lyceum Native desktop application`
   - **Pricing model**: Standard pricing
   - **Price**: `49.00` USD
   - **Billing period**: `Recurring` → **Monthly**
   - **Payment settings**: ✅ **Charge customers automatically**
5. Click **"Save product"**
6. **COPY THE PRICE ID** (starts with `price_live_...`)

## Step 2: Update Environment Variables

### Local Development (.env.local)

Add these lines to your [.env.local](.env.local):

```env
# Lyceum Native App - Monthly Recurring Subscription
STRIPE_NATIVE_APP_MONTHLY_PRICE_ID=price_live_YOUR_PRICE_ID_HERE
NEXT_PUBLIC_STRIPE_NATIVE_APP_MONTHLY_PRICE_ID=price_live_YOUR_PRICE_ID_HERE
```

### Production (Vercel)

Add to Vercel environment variables:

```bash
# Via Vercel CLI
vercel env add STRIPE_NATIVE_APP_MONTHLY_PRICE_ID production
# When prompted, paste: price_live_YOUR_PRICE_ID_HERE

vercel env add NEXT_PUBLIC_STRIPE_NATIVE_APP_MONTHLY_PRICE_ID production
# When prompted, paste: price_live_YOUR_PRICE_ID_HERE
```

Or via Vercel Dashboard:
1. Go to project settings
2. Environment Variables
3. Add both variables for **Production**

## Step 3: Update Webhook to Handle Subscription Events

The webhook ([src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)) already handles subscription events:
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded` (for recurring billing)
- ✅ `invoice.payment_failed`

**Make sure your Stripe webhook is configured to send these events!**

## Step 4: Update Database Comments (Optional)

The migration file has references to "$49 lifetime". Update if desired:

```sql
-- Update table comments
COMMENT ON COLUMN user_subscriptions_native_app.amount_paid_cents IS
  'Amount paid in cents (4900 = $49/month for recurring subscription)';
```

## Important Business Logic Changes

### Before (Lifetime License):
- Customer pays $49 once
- Gets lifetime access
- No recurring billing
- License never expires

### After (Monthly Subscription):
- Customer pays $49/month
- Subscription auto-renews monthly
- Access continues as long as subscription is active
- If subscription cancelled/payment fails → license should be deactivated

### Critical: Subscription Cancellation Handling

**You need to decide what happens when:**

1. **Customer cancels subscription:**
   - Immediate revocation? (harsh but prevents free access)
   - End of billing period? (common, more user-friendly)
   - Grace period? (give them X days to resubscribe)

2. **Payment fails:**
   - How many retry attempts?
   - Grace period before revoking access?
   - Email notifications?

**Current behavior:** The webhook marks subscription as `cancelled` but does NOT automatically revoke the license.

### Recommended: Add License Expiration Logic

Create a cron job or scheduled function to:

```sql
-- Example: Deactivate licenses for cancelled/expired subscriptions
UPDATE license_keys
SET status = 'expired'
WHERE license_type = 'main-application'
  AND status = 'active'
  AND assigned_to IN (
    SELECT user_id
    FROM user_subscriptions_native_app
    WHERE subscription_type = 'paid'
      AND status IN ('cancelled', 'expired')
  );
```

## Testing Checklist

### Before Going Live:

- [ ] Created monthly recurring price in Stripe (live mode)
- [ ] Added `STRIPE_NATIVE_APP_MONTHLY_PRICE_ID` to .env.local
- [ ] Added `STRIPE_NATIVE_APP_MONTHLY_PRICE_ID` to Vercel production
- [ ] Verified webhook has all subscription events enabled
- [ ] Decided on cancellation policy
- [ ] Implemented license revocation logic (if needed)

### Test Flow:

1. **Test subscription creation:**
   - [ ] Go to /native-app/subscribe
   - [ ] Click "Subscribe"
   - [ ] Complete Stripe checkout
   - [ ] Verify creates Stripe subscription (not one-time payment)
   - [ ] Check Stripe Dashboard shows recurring subscription

2. **Verify correct display:**
   - [ ] Settings → Licenses shows license
   - [ ] Settings → Payment → Payment History shows "Monthly Subscription" (not "Lifetime License")
   - [ ] Payment method is saved

3. **Test recurring billing (in Stripe Dashboard):**
   - [ ] Create a test subscription
   - [ ] Use Stripe test clock to advance time 1 month
   - [ ] Verify subscription renews
   - [ ] Verify `invoice.payment_succeeded` webhook fires
   - [ ] Verify access continues

4. **Test cancellation:**
   - [ ] Cancel subscription in Stripe Dashboard
   - [ ] Verify webhook fires
   - [ ] Verify expected behavior (license status, user access)

## Migration Plan for Existing Customers

**If you have existing "lifetime" customers, you need to:**

1. **Grandfather them in:**
   - Keep existing licenses as lifetime
   - New customers get monthly subscriptions

2. **Or migrate them:**
   - Contact customers
   - Explain business model change
   - Offer discount/incentive
   - Create new subscriptions
   - Cancel old licenses

3. **Technical approach:**

```sql
-- Mark existing paid licenses as "legacy_lifetime"
UPDATE license_keys
SET license_config = jsonb_set(
  COALESCE(license_config, '{}'),
  '{legacy_type}',
  '"lifetime"'
)
WHERE license_type = 'main-application'
  AND status = 'active'
  AND created_at < '2025-01-24'::timestamp; -- Before this change
```

## Pricing Considerations

**Current:**
- $49 one-time = $49 total customer lifetime value

**New:**
- $49/month × average retention = higher CLV
- Example: 12 months retention = $588 vs $49
- But: some customers will cancel after 1-2 months

**Consider:**
- Annual plan discount? (e.g., $490/year = $40.83/month, 2 months free)
- Free trial period? (7-30 days)
- Startup/early customer discount?

## Support & Monitoring

### Monitor These Metrics:

1. **Subscription metrics:**
   - Monthly Recurring Revenue (MRR)
   - Churn rate
   - Failed payments
   - Cancellations

2. **Stripe Dashboard:**
   - Subscriptions → Overview
   - Watch for failed payments
   - Customer emails about billing

3. **Database queries:**

```sql
-- Active subscriptions count
SELECT COUNT(*)
FROM user_subscriptions_native_app
WHERE subscription_type = 'paid'
  AND status = 'active';

-- Monthly revenue (estimated)
SELECT COUNT(*) * 49 as monthly_revenue_usd
FROM user_subscriptions_native_app
WHERE subscription_type = 'paid'
  AND status = 'active';

-- Churn this month
SELECT COUNT(*)
FROM user_subscriptions_native_app
WHERE status = 'cancelled'
  AND cancelled_at >= date_trunc('month', NOW());
```

## Rollback Plan

If you need to revert to one-time payments:

```bash
# Revert code changes
git revert HEAD

# Keep the new webhook enhancements (they work for both)
# Just change checkout back to mode: 'payment'
```

## Questions to Answer

Before deployment, decide:

1. **What happens when subscription is cancelled?**
   - Immediate license revocation?
   - Grace period?
   - End of billing cycle?

2. **What happens when payment fails?**
   - Retry schedule?
   - Grace period?
   - Notification to user?

3. **Existing customers?**
   - Grandfather lifetime licenses?
   - Force migration?
   - Offer choice?

4. **Pricing strategy?**
   - Stay at $49/month?
   - Add annual option?
   - Offer discounts?

5. **Free trial?**
   - How long?
   - Require payment method?
   - Auto-convert to paid?

## Need Help?

Contact Stripe support for:
- Setting up subscription logic
- Understanding subscription webhooks
- Best practices for handling failed payments
- Customer migration strategies
