# User Guide: Payment Tab in Settings

## What's New

Your Settings page now has a fully functional Payment tab that shows:

### 1. Monthly Cost Breakdown
At the top, you'll see a **prominent blue box** showing your estimated monthly total:

```
┌─────────────────────────────────────────────────┐
│ Monthly Cost Breakdown                          │
│ What you're responsible to pay each month       │
├─────────────────────────────────────────────────┤
│                                                 │
│ Estimated Monthly Total          $XX.XX         │
│ Based on current usage                          │
│                                                 │
├─────────────────────────────────────────────────┤
│ Cost Details:                                   │
│                                                 │
│ • Professional License            $XX.XX        │
│   Monthly license subscription                  │
│   Quantity: 1 × $XX.XX                         │
│                                                 │
│ • Database Cluster - Production   $XX.XX        │
│   Optimized tier cluster                        │
│   Quantity: 1 × $XX.XX                         │
│                                                 │
│ • Additional Storage              $XX.XX        │
│   Overage beyond included storage               │
│   Quantity: 5 GB × $X.XX                       │
└─────────────────────────────────────────────────┘
```

This section will **only appear if you have active paid services**. If you don't see it, you don't owe anything!

### 2. Payment Information
Shows your billing account details:

- **Stripe Customer ID** - Your billing account identifier
- **Payment Status** - Green badge if configured, yellow if not

**Payment Methods on File:**
Each card shows:
- Card brand (Visa, Mastercard, etc.)
- Last 4 digits
- Expiration date
- "Default" badge if it's your default payment method

**Button:** "Setup Payment Method" or "Manage Payment Methods"
- Click this to add, remove, or manage your payment methods
- Opens the full payment management page

### 3. Invoices Section
Shows your recent invoices (last 5):

```
┌─────────────────────────────────────────────────┐
│ Invoices                           View All →   │
├─────────────────────────────────────────────────┤
│ Invoice #INV-001                      $XX.XX    │
│ 10/7/2025  Due: 11/7/2025             ●paid     │
│                                                 │
│ Invoice #INV-002                      $XX.XX    │
│ 9/7/2025  Due: 10/7/2025              ●paid     │
└─────────────────────────────────────────────────┘
```

Status badges:
- 🟢 **Paid** - Invoice has been paid
- 🟡 **Sent** - Invoice sent, payment pending
- 🔴 **Overdue** - Payment past due date
- ⚪ **Draft** - Invoice not yet finalized

Click "View All" to see complete invoice history with line items.

## How to Use

### Adding Your First Payment Method

1. Go to **Settings** (top right menu)
2. Click the **Payment** tab
3. You'll see "No payment information configured"
4. Click **"Setup Payment Method"** button
5. You'll be redirected to a secure Stripe payment form
6. Enter your credit card information
7. Submit the form
8. You'll be redirected back to see your new payment method

### Managing Payment Methods

1. Go to **Settings → Payment**
2. Click **"Manage Payment Methods"** button
3. On the payment page you can:
   - Add new payment methods
   - Delete existing methods
   - Set a default payment method
   - View all invoices with full details

### Viewing Monthly Costs

Simply open **Settings → Payment** tab. The monthly cost breakdown will automatically show:
- Total amount you'll be billed
- Breakdown by service type
- Quantities and unit prices

This updates in real-time based on your current usage.

### Checking Invoices

**Quick View (Settings):**
- Settings → Payment tab
- Scroll to "Invoices" section
- See last 5 invoices

**Full View (Payment Page):**
- Settings → Payment tab
- Click "View All" or "Manage Payment Methods"
- Scroll to invoices section
- Click on any invoice to expand and see line items

## What If I Don't See Any Costs?

If the "Monthly Cost Breakdown" section doesn't appear, it means:
- You don't have any paid services active
- You're on a free plan or gratis license
- You have no charges for the current month

This is normal for:
- New accounts
- Users with only free-tier services
- CentCom users (local clusters are free)

## Troubleshooting

**404 Error on "Setup Payment" button?**
- This should now be fixed! The button goes to `/billing/payment`
- If you still see a 404, try refreshing the page

**Not seeing monthly costs?**
- Check if you have active paid clusters
- Verify you have licenses that require payment
- Monthly costs only show if you have billable services

**Payment method not showing?**
- Make sure you completed the Stripe checkout
- Refresh the settings page
- Check that Stripe customer was created in your profile

## Related Features

- **Clusters Tab**: See which clusters are costing you money
- **Licenses Tab**: View your license subscriptions
- **Billing Page**: Full payment management at `/billing/payment`

## Support

If you have questions about:
- Charges on your account
- Payment method issues
- Invoice disputes

Contact your system administrator or support team.


