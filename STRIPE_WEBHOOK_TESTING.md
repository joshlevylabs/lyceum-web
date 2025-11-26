# Stripe Webhook Testing Guide

**Date:** January 25, 2025
**Purpose:** Test the complete subscription flow: Payment → Subscription → License → Onboarding

---

## 🎯 What This Tests

Your webhook handles these events:
- ✅ `checkout.session.completed` - Main subscription creation event
- ✅ `customer.subscription.created` - Subscription lifecycle
- ✅ `customer.subscription.updated` - Subscription changes
- ✅ `customer.subscription.deleted` - Cancellations
- ✅ `invoice.payment_succeeded` - Payment confirmations
- ✅ `invoice.payment_failed` - Payment failures

**Critical Flow:**
```
User pays → checkout.session.completed fires → Subscription created → License generated
```

---

## 🚀 Method 1: Stripe CLI Webhook Forwarding (RECOMMENDED)

This forwards real Stripe webhooks to your local development server.

### Step 1: Start Your Dev Server

```bash
npm run dev
```

**Expected output:** Server running on `http://localhost:3000` (or your configured port)

### Step 2: Start Webhook Forwarding

Open a **NEW terminal** and run:

```bash
cd "C:\Users\joshual\Documents\Josh Levy Labs\Stripe"
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Expected output:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 3: Update Your .env.local

Copy the webhook secret from the terminal output:

```bash
# In .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**IMPORTANT:** Restart your Next.js dev server after updating the secret!

### Step 4: Test the Flow

1. Go to `http://localhost:3000/dashboard`
2. Click "Click to Download" → redirects to `/billing`
3. Click "Start Free Trial"
4. Complete Stripe checkout with test card: `4242 4242 4242 4242`
5. Watch **both terminals**:
   - **Stripe CLI terminal:** Shows webhook events being forwarded
   - **Next.js terminal:** Shows webhook processing logs

**Expected logs in Next.js terminal:**
```
Stripe webhook event: checkout.session.completed
Checkout completed: cs_test_xxxxxxxxxxxxx
✅ Updated user profile with customer ID: cus_xxxxxxxxxxxxx
Creating native app subscription record for desktop app subscription
✅ Cancelled any existing active native_app subscriptions
✅ Created native app subscription record: { id: '...', user_id: '...', status: 'active' }
Creating main-application license for user
✅ Created main-application license: { keyCode: 'LYC-APP-2025-XXXXXXXX', id: '...', assigned_to: '...' }
✅ Created license-subscription relationship
```

**Expected logs in Stripe CLI terminal:**
```
2025-01-25 12:34:56   --> checkout.session.completed [evt_xxxxxxxxxxxxx]
2025-01-25 12:34:56   <-- [200] POST http://localhost:3000/api/stripe/webhook [evt_xxxxxxxxxxxxx]
```

---

## 🧪 Method 2: Manual Webhook Trigger

Trigger webhook events manually without going through checkout.

### Step 1: Start Webhook Forwarding

```bash
cd "C:\Users\joshual\Documents\Josh Levy Labs\Stripe"
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Step 2: Trigger Test Event

Open a **NEW terminal** and run:

```bash
cd "C:\Users\joshual\Documents\Josh Levy Labs\Stripe"
stripe trigger checkout.session.completed
```

**This simulates a successful checkout without actual payment.**

**Expected output:**
```
Setting up fixture for: checkout_session
Running fixture for: checkout_session
Trigger succeeded! Check dashboard for event details.
```

### Limitations:
- ⚠️ Won't have your actual user ID in metadata
- ⚠️ Won't create real subscriptions (test data only)
- ✅ Good for testing webhook connectivity

---

## 🔍 Method 3: Test Webhook Endpoint Directly

Test the webhook endpoint with mock data (bypasses signature verification for testing).

### Step 1: Create Test Script

I've created `test-webhook.js` for you (see below).

### Step 2: Temporarily Disable Signature Verification

**For testing only** - modify `src/app/api/stripe/webhook/route.ts`:

```typescript
// TEMPORARY: Comment out signature verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') as string;

    let event;

    // TESTING ONLY - REMOVE BEFORE PRODUCTION
    if (process.env.NODE_ENV === 'development' && !signature) {
      console.log('⚠️ TEST MODE: Skipping signature verification');
      event = JSON.parse(body);
    } else {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // ... rest of handler
```

### Step 3: Run Test Script

```bash
node test-webhook.js
```

---

## 📊 Method 4: View Webhook Logs in Stripe Dashboard

Check if webhooks are being sent from Stripe.

### Steps:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **Webhooks**
3. Click your webhook endpoint
4. View **Logs** tab

**What to look for:**
- ✅ Events being sent
- ✅ Response status (200 = success)
- ❌ Failed deliveries (4xx/5xx errors)

---

## 🎯 Complete Test Checklist

Use this checklist to verify your entire flow:

### [ ] Webhook Connectivity
- [ ] Stripe CLI forwarding is running
- [ ] Webhook secret is set in `.env.local`
- [ ] Dev server restarted after updating secret
- [ ] Test event triggers successfully

### [ ] Subscription Creation
- [ ] `checkout.session.completed` event fires
- [ ] Console logs: "✅ Created new native app subscription"
- [ ] Database: New row in `subscriptions` table
- [ ] Database: `subscription_category = 'native_app'`
- [ ] Database: `status = 'active'`

### [ ] License Generation
- [ ] Console logs: "✅ Created main-application license"
- [ ] Database: New row in `license_keys` table
- [ ] Database: `license_type = 'main-application'`
- [ ] Database: `assigned_to` = user ID
- [ ] Database: `key_code` format: `LYC-APP-2025-XXXXXXXX`

### [ ] License-Subscription Relationship
- [ ] Console logs: "✅ Created license-subscription relationship"
- [ ] Database: New row in `license_subscription_relationships`
- [ ] Database: Relationship links correct IDs

### [ ] Onboarding Session Creation
- [ ] Check if onboarding session should be created
- [ ] Database: New row in onboarding-related table (if applicable)

### [ ] Success Page Flow
- [ ] User redirected to `/native-app/checkout-success`
- [ ] Page polls for subscription
- [ ] Subscription found within 5 seconds
- [ ] License key displayed on success page
- [ ] Auto-redirect to `/download-app` after 2 seconds

---

## 🐛 Troubleshooting

### Issue: "Webhook signature verification failed"

**Cause:** Webhook secret doesn't match.

**Fix:**
1. Get secret from Stripe CLI: `stripe listen --print-secret`
2. Update `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx`
3. Restart Next.js dev server

### Issue: "No webhook events showing in terminal"

**Cause:** Stripe CLI not forwarding to correct URL.

**Fix:**
```bash
# Check your dev server port
npm run dev  # Note the port (usually 3000)

# Forward to correct port
stripe listen --forward-to localhost:YOUR_PORT/api/stripe/webhook
```

### Issue: "Subscription created but no license"

**Cause:** Error in license generation code.

**Check:**
- Console logs for "❌ Failed to create license"
- Database for orphaned subscriptions (subscription exists, no license)
- PostgreSQL error logs

### Issue: "DISTINCT/ORDER BY error still occurring"

**Cause:** Old code pattern still in use.

**Fix:** Ensure all INSERT queries use `.limit(1)` instead of `.single()`

---

## 📝 Quick Reference Commands

```bash
# Start webhook forwarding
cd "C:\Users\joshual\Documents\Josh Levy Labs\Stripe"
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed

# Get webhook secret
stripe listen --print-secret

# View recent events
stripe events list --limit 10

# View specific event details
stripe events retrieve evt_xxxxxxxxxxxxx
```

---

## 🔐 Security Notes

**NEVER commit:**
- `STRIPE_WEBHOOK_SECRET` to git
- Test mode secrets in production
- Files with actual customer data

**ALWAYS:**
- Use test mode for development (`whsec_test_*`)
- Use live mode for production (`whsec_*`)
- Rotate secrets if compromised

---

## ✅ Success Criteria

Your webhook testing is successful when:

1. ✅ Stripe CLI shows: `[200] POST http://localhost:3000/api/stripe/webhook`
2. ✅ Next.js logs show: "✅ Created native app subscription record"
3. ✅ Next.js logs show: "✅ Created main-application license"
4. ✅ Database has matching subscription + license records
5. ✅ Success page displays license key
6. ✅ User can download app with valid license

---

**Created:** January 25, 2025
**Last Updated:** January 25, 2025
**Status:** ✅ Ready for Testing
