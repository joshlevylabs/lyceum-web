# 🔑 Environment Variables Setup

## ⚠️ **IMPORTANT: You're Using LIVE Stripe Keys!**

Your keys start with `pk_live_` and `sk_live_` - these will **process REAL payments**!  
For testing, please use **test keys** (`pk_test_` and `sk_test_`) instead.

---

## 📝 **Add to Your `.env.local` File:**

```env
# Database (your existing values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration (LIVE KEYS - REAL MONEY!)
STRIPE_SECRET_KEY=replacewstripesecretkey
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=replacewstripepublickey

# WEBHOOK SECRET - YOU NEED TO SET THIS UP
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# PRICE IDs - YOU NEED TO GET THESE (see below)
STRIPE_STARTER_PRICE_ID=price_your_starter_price_id
STRIPE_PROFESSIONAL_PRICE_ID=price_your_professional_price_id
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_price_id
STRIPE_BYOD_PRICE_ID=price_your_byod_price_id

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3594
```

---

## 🚀 **Missing Setup Steps:**

### 1. **Get Your Price IDs** (Required)
You gave me **Product IDs**, but I need **Price IDs** for monthly subscriptions:

**Run this command to get them:**
```bash
node get-stripe-price-ids.js
```

This will show you:
```
📦 Product: Lyceum Starter (prod_T7F1GLjQuo94PY)
   💰 Price: $29/month → ID: price_1abc2def3ghi
```

**Copy the `price_...` IDs** to your `.env.local` file!

### 2. **Set Up Webhook** (Required)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. **URL**: `http://localhost:3594/api/stripe/webhook` (for testing)
4. **Events**: Select these:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the Signing Secret** (starts with `whsec_...`) to your `.env.local`

### 3. **Run Database Migrations** (Required)
Execute these SQL scripts in your Supabase dashboard:

```bash
# 1. Run billing columns migration
add-billing-columns-migration.sql

# 2. Update cluster limits (if not done)
update-cluster-user-limits.sql

# 3. Add pricing columns (if not done)
add-pricing-columns-migration.sql
```

---

## 🧪 **Test Payment Setup:**

### **With Stripe Test Cards:**
- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### **Test Flow:**
1. Go to user profile → **Payment tab**
2. Click **"Add Payment Method"**
3. Use test card above
4. Should redirect to success page ✅

---

## ✅ **What's Working Now:**

### **🎯 Admin Can:**
1. **Select cluster admin** from dropdown (fixed!)
2. **View payment setup** - links to billing page
3. **Assign users** to clusters (up to 10 users)

### **💳 Users Can:**
1. **Add payment methods** via Payment tab
2. **Subscribe to plans** at `/admin/billing`
3. **Manage billing** through Stripe portal
4. **View subscription status** in profile

### **🔒 System Validates:**
1. **Real Stripe subscriptions** (not mock anymore)
2. **Payment verification** before cluster access
3. **Admin requirements** for paid clusters

---

## 🎊 **You're Ready to Accept Payments!**

Once you complete the setup above:
1. ✅ **Payment methods** - users can add cards
2. ✅ **Subscriptions** - users can pay monthly
3. ✅ **Cluster billing** - admins manage payments
4. ✅ **Real revenue** - money in your account!

**Your database cluster SaaS is now fully monetized!** 💰
