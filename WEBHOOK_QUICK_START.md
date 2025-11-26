# Stripe Webhook Testing - Quick Start

**5-Minute Setup Guide**

---

## 🚀 Quick Start (Easiest Method)

### 1. Start Your Dev Server

```bash
npm run dev
```

### 2. Start Webhook Forwarding

**Option A: Use the batch file**
```bash
start-webhook-forwarding.bat
```

**Option B: Manual command**
```bash
cd "C:\Users\joshual\Documents\Josh Levy Labs\Stripe"
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 3. Copy the Webhook Secret

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### 4. Update .env.local

Add or update this line:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 5. Restart Dev Server

**IMPORTANT:** Stop and restart `npm run dev` to load the new secret!

### 6. Test the Flow

1. Go to `http://localhost:3000/dashboard`
2. Click "Click to Download"
3. Click "Start Free Trial"
4. Use test card: `4242 4242 4242 4242` (any future expiry, any CVV)
5. Complete checkout

### 7. Watch the Logs

**Next.js Terminal:**
```
Stripe webhook event: checkout.session.completed
✅ Created new native app subscription: [id]
✅ Created main-application license: { keyCode: 'LYC-APP-2025-XXXXXXXX' }
✅ Created license-subscription relationship
```

**Stripe CLI Terminal:**
```
2025-01-25 12:34:56   --> checkout.session.completed [evt_xxxxxxxxxxxxx]
2025-01-25 12:34:56   <-- [200] POST http://localhost:3000/api/stripe/webhook
```

### 8. Verify in Database

Run this in Supabase SQL Editor:
```sql
-- Get your user ID
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Verify subscription created
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 1;

-- Verify license created
SELECT * FROM license_keys WHERE assigned_to = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 1;
```

---

## ✅ Success Indicators

You know it's working when:

1. ✅ Stripe CLI shows `[200]` response
2. ✅ Next.js logs show "✅ Created native app subscription"
3. ✅ Next.js logs show "✅ Created main-application license"
4. ✅ Success page displays license key
5. ✅ Database has new subscription + license records

---

## ❌ Common Issues

### "Webhook signature verification failed"

**Fix:** Make sure you:
1. Copied the correct secret from Stripe CLI
2. Updated `.env.local`
3. Restarted Next.js dev server

### "No events showing in Stripe CLI"

**Fix:** Check:
1. Dev server is running on correct port
2. Stripe CLI forward URL matches your port
3. You're completing checkout in your browser

### "Subscription created but no license"

**Fix:** Check Next.js terminal for error messages like:
- "❌ Failed to create license"
- PostgreSQL errors

---

## 📚 More Details

See [STRIPE_WEBHOOK_TESTING.md](./STRIPE_WEBHOOK_TESTING.md) for:
- Manual webhook triggering
- Direct endpoint testing
- Comprehensive troubleshooting
- Security notes

See [verify-webhook-results.sql](./verify-webhook-results.sql) for:
- Database verification queries
- Checking for orphaned records
- Timeline of webhook processing

---

**Total Time:** 5 minutes
**Difficulty:** Easy
**Next Steps:** Test and verify!
