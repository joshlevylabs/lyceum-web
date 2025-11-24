# Quick Test Commands Reference

Quick reference for testing Phase 1 & 2. See [TESTING_PHASE1_AND_PHASE2.md](TESTING_PHASE1_AND_PHASE2.md) for detailed instructions.

---

## Database Verification Queries

### Phase 1: Verify Tables Removed
```sql
-- Should return 0 rows (removed tables):
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('coupons', 'user_coupons', 'coupon_usage_log', 'invoices', 'invoice_line_items');

-- Should return 2 rows (kept tables for usage tracking):
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('billing_periods', 'billing_usage_snapshots');

-- Verify billing_periods schema:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'billing_periods'
ORDER BY ordinal_position;
-- Expected columns: id, user_id, period_start, period_end, period_label, status,
--                   total_amount_cents, currency, billed_at, created_at, updated_at
```

### Phase 2: Check Subscription & License Status
```sql
-- Get current subscription and license status (replace YOUR_EMAIL):
SELECT
  up.id as user_id,
  up.email,
  up.subscription_status,
  up.stripe_customer_id,
  us.stripe_subscription_id,
  l.license_key,
  l.status as license_status,
  l.created_at,
  l.updated_at
FROM user_profiles up
LEFT JOIN user_subscriptions_native_app us ON us.user_id = up.id
LEFT JOIN licenses l ON l.user_id = up.id
WHERE up.email = 'YOUR_EMAIL'
ORDER BY l.created_at DESC;
```

### Check All Licenses for User
```sql
-- See all licenses (active and expired):
SELECT
  id,
  license_key,
  status,
  created_at,
  updated_at,
  user_id
FROM licenses
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

### Count Licenses by Status
```sql
-- Count active vs expired licenses:
SELECT
  status,
  COUNT(*) as count
FROM licenses
WHERE user_id = 'YOUR_USER_ID'
GROUP BY status;
```

---

## Stripe CLI Commands

### Setup
```bash
# Install Stripe CLI (one-time)
# Download from: https://stripe.com/docs/stripe-cli

# Login
stripe login
```

### Local Webhook Testing
```bash
# Forward webhooks to local dev server
stripe listen --forward-to localhost:3594/api/stripe/webhook

# Test specific webhook events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### View Recent Events
```bash
# See recent Stripe events
stripe events list --limit 10
```

---

## API Testing

### Check User Billing Status
```bash
# Get your auth token first (from browser dev tools → Application → Cookies → sb-*-auth-token)
# Then test the API:
curl -X GET http://localhost:3594/api/user-billing/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### Test Billing Portal
```bash
# Create billing portal session
curl -X POST http://localhost:3594/api/stripe/billing-portal \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"

# Should return: { "success": true, "portalUrl": "https://billing.stripe.com/..." }
```

---

## File Verification

### Check Webhook Files
```bash
# Verify only one webhook handler exists:
ls src/app/api/stripe/webhook/route.ts        # Should exist ✅
ls src/app/api/billing/stripe-webhook/route.ts  # Should NOT exist ❌
```

### Check Removed Files
```bash
# These should NOT exist:
ls src/app/admin/coupons/                      # Should NOT exist ❌
ls src/app/api/admin/coupons/                  # Should NOT exist ❌
ls src/app/api/billing/invoices/               # Should NOT exist ❌
ls src/app/api/admin/invoices/                 # Should NOT exist ❌
```

---

## Quick Test Flow

### 1. Subscribe (Create Test Subscription)
1. Go to: http://localhost:3594/billing
2. Click "Get Started" on any plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout

### 2. Verify in Database
```sql
-- Check subscription created:
SELECT subscription_status, stripe_customer_id FROM user_profiles WHERE email = 'YOUR_EMAIL';

-- Check license generated:
SELECT license_key, status FROM licenses WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 1;
```

### 3. Test Billing Portal
1. Go to: http://localhost:3594/billing
2. Click "Manage Billing"
3. Verify portal opens

### 4. Cancel Subscription
1. In Billing Portal, click "Cancel plan"
2. Confirm cancellation
3. Check server logs for:
   ```
   ✅ Expired X license(s) for user: [USER_ID]
   ```

### 5. Verify License Expired
```sql
-- Should show status = 'expired':
SELECT license_key, status, updated_at FROM licenses WHERE user_id = 'YOUR_USER_ID' ORDER BY updated_at DESC LIMIT 1;
```

---

## Watch Server Logs

### What to Look For

**Good Signs (✅):**
```
Stripe webhook event: checkout.session.completed
Stripe webhook event: customer.subscription.created
Stripe webhook event: customer.subscription.deleted
✅ Payment method saved for user: [id]
✅ Payment transaction recorded for user: [id]
✅ Expired 1 license(s) for user: [id]
✅ Subscription cancelled and licenses expired for user: [id]
```

**Bad Signs (❌):**
```
Error: relation "invoices" does not exist
Error: relation "coupons" does not exist
TypeError: Cannot read property of undefined
Webhook signature verification failed
```

---

## Stripe Dashboard Links

### Test Mode URLs:
- **Customers:** https://dashboard.stripe.com/test/customers
- **Subscriptions:** https://dashboard.stripe.com/test/subscriptions
- **Invoices:** https://dashboard.stripe.com/test/invoices
- **Coupons/Promo Codes:** https://dashboard.stripe.com/test/coupons
- **Webhooks:** https://dashboard.stripe.com/test/webhooks
- **Events:** https://dashboard.stripe.com/test/events

---

## Test Promotion Code

### Create in Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/test/coupons
2. Create coupon: 20% off, once duration
3. Add promotion code: `TEST20`

### Test at Checkout:
1. Go to: http://localhost:3594/billing
2. Start checkout
3. Click "Add promotion code"
4. Enter: `TEST20`
5. Verify discount applies

---

## Emergency Rollback

### If Something Goes Wrong:
```bash
# Revert code changes (find commit hash first)
git log --oneline -10
git revert COMMIT_HASH

# Restore database tables (if needed)
# Run original migration files from backup
```

---

## Success Indicators

All tests pass when:
- ✅ No coupon/invoice tables in database
- ✅ Promotion codes work at checkout
- ✅ Subscriptions create successfully
- ✅ Licenses generate on subscription creation
- ✅ Billing Portal opens and works
- ✅ Licenses auto-expire on cancellation
- ✅ No errors in server logs
- ✅ Only one webhook handler file exists

---

**For detailed step-by-step instructions, see:** [TESTING_PHASE1_AND_PHASE2.md](TESTING_PHASE1_AND_PHASE2.md)
