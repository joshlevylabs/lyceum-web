# 🚀 Stripe Payment Portal Setup Guide

## 📋 Quick Setup Checklist

### 1. Install Stripe Package
```bash
npm install stripe
```

### 2. Create Stripe Account & Get Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create account or log in
3. Get your **Test Keys** from the Dashboard:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 3. Add Environment Variables
Add these to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (create these next)
STRIPE_STARTER_PRICE_ID=price_starter_plan_id
STRIPE_PROFESSIONAL_PRICE_ID=price_professional_plan_id  
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_plan_id
STRIPE_BYOD_PRICE_ID=price_byod_plan_id
```

### 4. Create Products & Prices in Stripe
Go to **Products** → **Add Product** in Stripe Dashboard:

#### Starter Plan
- **Name**: Lyceum Starter
- **Price**: $29.00/month recurring
- **Copy the Price ID** → Add to `STRIPE_STARTER_PRICE_ID`

#### Professional Plan  
- **Name**: Lyceum Professional
- **Price**: $99.00/month recurring
- **Copy the Price ID** → Add to `STRIPE_PROFESSIONAL_PRICE_ID`

#### Enterprise Plan
- **Name**: Lyceum Enterprise  
- **Price**: $299.00/month recurring
- **Copy the Price ID** → Add to `STRIPE_ENTERPRISE_PRICE_ID`

#### BYOD Plan
- **Name**: Lyceum BYOD
- **Price**: $10.00/month recurring
- **Copy the Price ID** → Add to `STRIPE_BYOD_PRICE_ID`

### 5. Set Up Webhook Endpoint
1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. **URL**: `https://yourdomain.com/api/stripe/webhook` (or `http://localhost:3594/api/stripe/webhook` for testing)
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the Webhook Secret** → Add to `STRIPE_WEBHOOK_SECRET`

### 6. Run Database Migrations
Execute these SQL scripts in your Supabase dashboard:

```bash
# Run this first if not already done
add-pricing-columns-migration.sql

# Then run this for billing support  
add-billing-columns-migration.sql

# Finally update cluster limits
update-cluster-user-limits.sql
```

### 7. Test Payment Flow
1. **Start your server**: `npm run dev`
2. **Navigate to**: `http://localhost:3594/admin/billing`
3. **Test with Stripe test cards**:
   - Success: `4242 4242 4242 4242`
   - Declined: `4000 0000 0000 0002`

## 🎯 Key Features Enabled

### ✅ **What Works Now:**
- **Subscription Management**: Users can subscribe to any plan
- **Billing Portal**: Users can manage their billing through Stripe
- **Payment Verification**: Real Stripe subscription checking
- **Cluster Billing**: Clusters can be linked to paid subscriptions
- **Admin Selection**: Fixed admin selection dropdown
- **Webhook Processing**: Automatic subscription status updates

### 🔄 **User Flow:**
1. User clicks "Change Admin" → Selects admin from dropdown
2. Admin clicks "Set up billing" → Redirected to billing page
3. Admin selects plan → Stripe checkout → Payment success
4. Webhook updates user profile → Payment verified ✅
5. Admin can now create paid clusters

## 🚦 Testing with Stripe Test Mode

### Test Card Numbers:
- **Visa**: `4242 4242 4242 4242`
- **Visa (debit)**: `4000 0566 5566 5556`
- **Mastercard**: `5555 5555 5555 4444`
- **Declined**: `4000 0000 0000 0002`

### Test Details:
- **Expiry**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

## 🎊 Ready for Your First Paying Customer!

Once setup is complete:
1. **Switch to Live Mode** in Stripe Dashboard
2. **Update environment variables** with live keys
3. **Update webhook URL** to production domain
4. **You're ready to accept real payments!** 💰

---

## 📞 Support
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Test Cards**: https://stripe.com/docs/testing#cards
