# Subscription and Payment Implementation Guide

## Overview

This document describes the complete implementation of the native app subscription and payment system, including credit card collection, payment processing, license generation, and download access.

---

## User Flow

### 1. User Visits Dashboard
- User sees "Get Lyceum Native" (or "Get Centcom") button
- Button navigates to `/native-app/subscribe`

### 2. Subscription Page
**Location:** [src/app/native-app/subscribe/page.tsx](src/app/native-app/subscribe/page.tsx)

**Features:**
- Two pricing options:
  - **Free Trial**: $0 for 30 days (requires credit card)
  - **Paid Subscription**: $49 one-time payment (lifetime access)
- Comprehensive features showcase with placeholders for screenshots/videos
- Both options redirect to payment page

**Action:** User clicks "Start Free Trial" or "Subscribe Now"

### 3. Payment Page
**Location:** [src/app/native-app/payment/page.tsx](src/app/native-app/payment/page.tsx)

**Features:**
- Displays selected plan summary (trial or paid)
- Secure credit card form:
  - Card number (auto-formatted with spaces)
  - Name on card
  - Expiry date (MM/YY format)
  - CVV
  - Billing ZIP code
- Form validation
- Security notice with shield icon

**Flow:**
1. User enters payment information
2. Validates card details
3. Processes payment via API
4. Creates subscription
5. Generates license automatically
6. Redirects to download page

### 4. Payment Processing
**API Endpoint:** [src/app/api/payment/process/route.ts](src/app/api/payment/process/route.ts)

**Process:**
1. Validates authentication
2. Validates payment information
3. Checks card expiry
4. Processes payment (currently simulated, needs real processor)
5. Creates payment transaction record
6. Returns success with transaction ID

**Note:** Currently uses simulated payment. In production, integrate with:
- Stripe
- PayPal
- Square
- Or other payment processor

### 5. Subscription Creation
**API Endpoint:** [src/app/api/subscriptions/native-app/route.ts](src/app/api/subscriptions/native-app/route.ts)

**Process:**
1. Verifies payment completed
2. Creates subscription record
3. Sets expiration (30 days for trial, null for paid)
4. Marks as active

### 6. License Generation
**API Endpoint:** [src/app/api/licenses/generate-main-app/route.ts](src/app/api/licenses/generate-main-app/route.ts)

**Process:**
1. Checks for existing license
2. Generates new license key
3. Associates with user account
4. Sets permissions based on subscription type

### 7. Download Page
**Location:** [src/app/download-app/page.tsx](src/app/download-app/page.tsx)

**Features:**
- Checks for active subscription before rendering
- Displays subscription status badge
- Shows EULA for acceptance
- Provides download options (EXE/MSI for Windows)

**Access Control:**
- Redirects to subscription page if no active subscription
- Only accessible with valid subscription

---

## Database Tables

### 1. Payment Transactions
**Migration:** [supabase/migrations/20250107_payment_transactions.sql](supabase/migrations/20250107_payment_transactions.sql)

**Schema:**
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subscription_type TEXT ('trial' | 'paid'),
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  card_last_four TEXT,
  card_brand TEXT,
  billing_zip TEXT,
  status TEXT ('pending' | 'completed' | 'failed' | 'refunded'),
  transaction_id TEXT UNIQUE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 2. Native App Subscriptions
**Migration:** [supabase/migrations/20250107_native_app_subscriptions.sql](supabase/migrations/20250107_native_app_subscriptions.sql)

**Schema:**
```sql
CREATE TABLE native_app_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subscription_type TEXT ('trial' | 'paid'),
  status TEXT ('active' | 'expired' | 'cancelled'),
  started_at TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for paid (lifetime)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Components Created

### Pages
1. **Subscription Page** - `/native-app/subscribe`
   - Pricing cards
   - Features showcase
   - Video demo section (placeholder)
   - Screenshot sections (placeholders)

2. **Payment Page** - `/native-app/payment`
   - Credit card form
   - Plan summary
   - Payment processing

3. **Download Page** - `/download-app` (updated)
   - Subscription verification
   - EULA acceptance
   - Download options

### API Endpoints
1. **Payment Processing** - `/api/payment/process`
   - Card validation
   - Payment processing
   - Transaction logging

2. **Subscription Management** - `/api/subscriptions/native-app`
   - GET: Check subscription status
   - POST: Create subscription

3. **License Generation** - `/api/licenses/generate-main-app`
   - Auto-generates license on subscription

---

## Next Steps

### 1. Apply Database Migrations

Run the migrations in your Supabase dashboard or via CLI:

```bash
# Apply native app subscriptions table
supabase migration apply 20250107_native_app_subscriptions.sql

# Apply payment transactions table
supabase migration apply 20250107_payment_transactions.sql
```

### 2. Integrate Real Payment Processor

**Current State:** Payment processing is simulated

**To Integrate Stripe:**

1. Install Stripe SDK:
```bash
npm install stripe @stripe/stripe-js
```

2. Update payment processing endpoint:
```typescript
// src/app/api/payment/process/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Replace simulated payment with:
const paymentIntent = await stripe.paymentIntents.create({
  amount: subscription_type === 'paid' ? 4900 : 0, // Amount in cents
  currency: 'usd',
  payment_method: paymentMethod,
  confirm: true,
  metadata: {
    user_id: user.id,
    subscription_type
  }
})
```

3. Add Stripe webhook handler for payment confirmations

### 3. Add Media Assets

Follow the guide in [MEDIA_ASSETS_GUIDE.md](MEDIA_ASSETS_GUIDE.md) to add:
- Demo video (`/videos/demo.mp4`)
- Feature screenshots:
  - `/screenshots/cluster-management.png`
  - `/screenshots/test-data-projects.png`
  - `/screenshots/plugin-ecosystem.png`
  - `/screenshots/realtime-sync.png`

### 4. Test the Complete Flow

1. **Test Trial Subscription:**
   - Navigate to `/native-app/subscribe`
   - Click "Start Free Trial"
   - Enter payment information
   - Verify subscription created
   - Verify license generated
   - Verify redirect to download page

2. **Test Paid Subscription:**
   - Navigate to `/native-app/subscribe`
   - Click "Subscribe Now"
   - Enter payment information
   - Verify $49 payment processed
   - Verify subscription created
   - Verify license generated
   - Verify redirect to download page

3. **Test Access Control:**
   - Try accessing `/download-app` without subscription
   - Verify redirect to subscription page
   - Complete subscription
   - Verify download page accessible

### 5. Add Subscription Management

Create a subscription management page where users can:
- View current subscription status
- Cancel subscription
- Upgrade from trial to paid
- View payment history

**Suggested location:** `/settings/subscription`

### 6. Add Trial Expiration Handling

Create a scheduled job to:
- Check for expired trials daily
- Mark subscriptions as expired
- Send expiration notification emails
- Prompt users to upgrade

### 7. Add Payment History

Create a page showing:
- Past transactions
- Payment receipts
- Invoice downloads

**Suggested location:** `/settings/payment-history`

---

## Security Considerations

### Implemented
- ✅ Credit card information is NOT stored in database
- ✅ Only last 4 digits and card brand stored
- ✅ RLS policies on subscription tables
- ✅ Authentication required for all endpoints
- ✅ Payment validation before processing

### TODO
- [ ] Integrate with PCI-compliant payment processor
- [ ] Add rate limiting on payment endpoints
- [ ] Implement fraud detection
- [ ] Add 3D Secure support
- [ ] Encrypt sensitive payment logs

---

## Testing Checklist

### Payment Form
- [ ] Card number accepts only digits
- [ ] Card number auto-formats with spaces
- [ ] Expiry date validates format (MM/YY)
- [ ] Expiry date rejects expired cards
- [ ] CVV accepts 3-4 digits
- [ ] ZIP code validates format
- [ ] Form shows validation errors

### Payment Processing
- [ ] Trial subscription creates $0 transaction
- [ ] Paid subscription creates $49 transaction
- [ ] Transaction ID is unique
- [ ] Payment record created in database
- [ ] Failed payments show error message

### Subscription Creation
- [ ] Trial subscription has 30-day expiration
- [ ] Paid subscription has null expiration (lifetime)
- [ ] Users cannot create duplicate subscriptions
- [ ] Users cannot have multiple active subscriptions

### License Generation
- [ ] License auto-generated after subscription
- [ ] License key is unique
- [ ] License has correct permissions
- [ ] License shows on download page

### Access Control
- [ ] Download page requires active subscription
- [ ] Expired subscriptions redirect to subscribe page
- [ ] Non-authenticated users redirect to sign in

---

## Troubleshooting

### Issue: Double Title Bar
**Status:** ✅ Fixed
- Removed duplicate header from subscription page
- Title now only appears in DashboardLayout sidebar

### Issue: "No Credit Card Required" Text
**Status:** ✅ Fixed
- Removed from trial plan card
- Both plans now require credit card

### Issue: Direct Subscription Creation
**Status:** ✅ Fixed
- Now redirects to payment page
- Payment processed before subscription created

### Issue: Missing License Generation
**Status:** ✅ Fixed
- License auto-generated in payment flow
- Occurs after subscription creation

### Issue: Payment Simulation
**Status:** ⚠️ TODO
- Currently using simulated payment
- Need to integrate real payment processor

---

## Summary

The subscription and payment system is now implemented with:

1. ✅ Subscription page with pricing options
2. ✅ Payment page with credit card form
3. ✅ Payment processing API (simulated)
4. ✅ Subscription creation API
5. ✅ Automatic license generation
6. ✅ Download page with access control
7. ✅ Database tables for transactions and subscriptions
8. ⚠️ Real payment processor integration (TODO)
9. ⚠️ Media assets (screenshots/videos) (TODO)

**Next Priority:** Integrate with a real payment processor (Stripe recommended)

---

**Created:** January 7, 2025
**Status:** Implementation Complete (Pending Payment Processor Integration)
