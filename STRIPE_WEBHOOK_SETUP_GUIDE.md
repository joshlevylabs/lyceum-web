# Stripe Webhook Setup & Billing System Testing Guide

This guide walks you through setting up Stripe webhooks for both test and live modes, then testing the complete billing system.

## 🔧 Part 1: Stripe Webhook Setup

### Test Mode Setup

#### Step 1: Access Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test Mode** (toggle in top-left should show "Test mode")
3. Navigate to **Developers** → **Webhooks**

#### Step 2: Create Test Webhook Endpoint
1. Click **"Add endpoint"**
2. **Endpoint URL**: `https://your-domain.com/api/billing/stripe-webhook`
   - For local testing: `https://your-ngrok-url.ngrok.io/api/billing/stripe-webhook`
   - For deployed: `https://your-vercel-app.vercel.app/api/billing/stripe-webhook`

#### Step 3: Select Events
Select these specific events:
```
✅ invoice.created
✅ invoice.finalized  
✅ invoice.payment_succeeded
✅ invoice.payment_failed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ payment_method.attached
```

#### Step 4: Get Test Webhook Secret
1. After creating the webhook, click on it
2. Go to **"Signing secret"** section
3. Click **"Reveal"** and copy the webhook secret
4. It will look like: `whsec_test_...`

### Live Mode Setup

#### Step 1: Switch to Live Mode
1. In Stripe Dashboard, toggle to **Live Mode**
2. Navigate to **Developers** → **Webhooks**

#### Step 2: Create Live Webhook Endpoint
1. Click **"Add endpoint"**
2. **Endpoint URL**: `https://your-production-domain.com/api/billing/stripe-webhook`
3. Select the same events as test mode
4. Get the live webhook secret: `whsec_live_...`

## ⚙️ Part 2: Environment Configuration

### Update Your Environment Variables

Create/update your `.env.local`:

```bash
# Stripe Test Mode Configuration
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_your_test_webhook_secret_here

# For Live Mode (when ready):
# STRIPE_SECRET_KEY=sk_live_your_live_key_here
# STRIPE_WEBHOOK_SECRET=whsec_live_your_live_webhook_secret_here

# Billing System Configuration
CRON_SECRET=your-secure-random-string-here
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Restart Your Development Server
```bash
npm run dev
# or
yarn dev
```

## 🧪 Part 3: Billing System Testing

### Step 1: Initialize the Billing System

#### A. Setup Database Tables
```bash
# Using API endpoint (recommended)
curl -X POST "http://localhost:3594/api/billing/setup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

#### B. Verify Setup
```bash
# Check system status
curl -X GET "http://localhost:3594/api/billing/setup" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "system_ready": true,
  "data": {
    "tables": {
      "billing_periods": true,
      "invoices": true,
      "invoice_line_items": true,
      "billing_usage_snapshots": true,
      "billing_automation_log": true
    }
  }
}
```

### Step 2: Create Test User Usage

#### A. Add Test Licenses
1. Go to your admin panel
2. Navigate to **Users** → select a test user
3. Assign some test licenses (basic, professional, enterprise)

#### B. Add Test Clusters  
1. In admin panel, go to **Clusters**
2. Create test database clusters for your user
3. Vary the sizes (small, medium, large) and types (development, production, analytics)

### Step 3: Test Usage Tracking

#### A. Check Current Usage
```bash
curl -X GET "http://localhost:3594/api/billing/usage?include_estimate=true" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "usage": {
      "licenses": [
        {"type": "professional", "quantity": 2},
        {"type": "basic", "quantity": 1}
      ],
      "clusters": [
        {"size": "medium", "type": "production", "quantity": 1},
        {"size": "small", "type": "development", "quantity": 2}
      ],
      "additionalUsers": 0,
      "storageOverageGB": 0
    },
    "estimated_monthly_cost": {
      "total_cents": 14000,
      "total_dollars": 140.00,
      "line_items": [...]
    }
  }
}
```

### Step 4: Test Manual Billing Process

#### A. Process Monthly Billing
```bash
curl -X POST "http://localhost:3594/api/billing/process-monthly" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "message": "Monthly billing processed successfully",
  "data": {
    "billing_period": {
      "id": "uuid-here",
      "period_label": "January 2025",
      "status": "billed"
    },
    "invoice": {
      "id": "uuid-here", 
      "invoice_number": "INV-202501-001-JOSHUAL",
      "total_cents": 14000,
      "status": "draft"
    }
  }
}
```

#### B. Get Generated Invoice
```bash
curl -X GET "http://localhost:3594/api/billing/invoices?limit=1" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

Verify the invoice has:
- Correct line items
- Proper pricing calculations
- Invoice number format

### Step 5: Test Payment Processing

#### A. Setup Payment Method (if not already done)
```bash
curl -X POST "http://localhost:3594/api/billing/setup-subscription" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "payment_method_id": "pm_test_stripe_payment_method_id",
    "trial_days": 0
  }'
```

#### B. Process Payment for Invoice
```bash
# Get invoice ID from previous step
curl -X POST "http://localhost:3594/api/billing/process-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "invoice_id": "your-invoice-id-here"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "payment_status": "paid",
    "stripe_invoice_id": "in_test_...",
    "payment_intent_id": "pi_test_..."
  }
}
```

### Step 6: Verify Webhook Integration

#### A. Check Webhook Logs in Stripe
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **"Logs"** tab for recent events
4. Verify events are being sent and received (200 status codes)

#### B. Check Billing Automation Logs
```bash
curl -X GET "http://localhost:3594/api/billing/automated-billing?limit=20" \
  -H "Authorization: Bearer CRON_SECRET"
```

Look for webhook events and payment processing logs.

### Step 7: Test Billing Dashboard

#### A. Navigate to Billing Dashboard
1. Go to your app: `http://localhost:3594`
2. Login as the test user
3. Navigate to billing/usage section

#### B. Verify Dashboard Shows:
- ✅ Current usage breakdown
- ✅ Estimated monthly cost
- ✅ Invoice history
- ✅ Payment status
- ✅ Usage analytics

### Step 8: Test Automated Billing (Optional)

#### A. Test Cron Endpoint
```bash
curl -X POST "http://localhost:3594/api/billing/automated-billing" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This will process billing for all users with periods ready for billing.

## 🔍 Part 4: Testing Verification Checklist

### Database Verification
- [ ] All billing tables created successfully
- [ ] Billing periods exist for test users
- [ ] Invoices generated with correct amounts
- [ ] Line items show proper breakdown
- [ ] Usage snapshots captured accurately

### Stripe Integration Verification  
- [ ] Stripe customer created for user
- [ ] Stripe invoice created and finalized
- [ ] Payment processed successfully
- [ ] Webhook events received and processed
- [ ] Payment status updated in database

### API Endpoints Verification
- [ ] `/api/billing/usage` returns current usage
- [ ] `/api/billing/process-monthly` creates invoice
- [ ] `/api/billing/invoices` lists user invoices
- [ ] `/api/billing/process-payment` charges customer
- [ ] `/api/billing/stripe-webhook` handles events

### UI Verification
- [ ] Billing dashboard loads without errors
- [ ] Usage data displays correctly
- [ ] Invoice history shows properly
- [ ] Cost breakdowns are accurate
- [ ] Payment status indicators work

## 🚨 Troubleshooting Common Issues

### Webhook Not Receiving Events
1. **Check URL**: Ensure webhook URL is accessible
2. **Verify HTTPS**: Stripe requires HTTPS (use ngrok for local)
3. **Check Events**: Ensure correct events are selected
4. **Test Endpoint**: Use Stripe CLI to test webhooks

### Payment Processing Failures
1. **Check Test Cards**: Use Stripe test card numbers
2. **Verify Customer**: Ensure Stripe customer exists
3. **Payment Method**: Confirm payment method is attached
4. **Review Logs**: Check Stripe dashboard for error details

### Database Issues
1. **Table Creation**: Verify all tables were created
2. **Permissions**: Check Supabase RLS policies
3. **Data Types**: Ensure correct data types for amounts (cents)
4. **Foreign Keys**: Verify relationships are intact

### Usage Tracking Issues
1. **License Data**: Ensure licenses are properly assigned
2. **Cluster Data**: Verify cluster information is available
3. **Calculations**: Check pricing configuration
4. **Snapshots**: Confirm usage snapshots are created

## 🎯 Production Deployment

### When Ready for Live Mode:
1. **Switch Environment Variables** to live Stripe keys
2. **Update Webhook URL** to production domain
3. **Test Live Webhooks** with small amounts
4. **Monitor Carefully** for first few billing cycles
5. **Set up Monitoring** alerts for failures

### Recommended Live Testing:
1. Create a test customer with minimal usage
2. Process one billing cycle manually
3. Verify payment processing works
4. Check all webhooks fire correctly
5. Confirm billing dashboard updates

---

🎉 **Your billing system is now ready!** Follow these steps and you'll have a fully functional monthly billing system with Stripe integration.


