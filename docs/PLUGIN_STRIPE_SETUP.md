# Plugin Store - Stripe Setup Guide

This document outlines the required Stripe products and prices that need to be created for the new plugins in the Lyceum plugin store.

## Overview

All plugins share the same pricing structure:
- **Price**: $49.00/month per user
- **Trial**: 30-day free trial (payment info required)
- **Billing**: Monthly subscription

## Required Stripe Products & Prices

Create the following products in your Stripe Dashboard (https://dashboard.stripe.com/products):

### 1. Preen PSU Plugin
- **Product Name**: Lyceum Plugin - Preen PSU
- **Description**: Preen programmable power supply control and monitoring
- **Price**: $49.00/month (recurring)
- **Environment Variable**: `STRIPE_PLUGIN_PREEN_PSU_PRICE_ID`

### 2. Keysight DAQ Plugin
- **Product Name**: Lyceum Plugin - Keysight DAQ
- **Description**: Data acquisition from Keysight instruments
- **Price**: $49.00/month (recurring)
- **Environment Variable**: `STRIPE_PLUGIN_KEYSIGHT_DAQ_PRICE_ID`

### 3. Kwikwai K110 Plugin
- **Product Name**: Lyceum Plugin - Kwikwai K110
- **Description**: HDMI test and measurement integration
- **Price**: $49.00/month (recurring)
- **Environment Variable**: `STRIPE_PLUGIN_KWIKWAI_PRICE_ID`

### 4. GRL PD Plugin (Granite River Labs)
- **Product Name**: Lyceum Plugin - GRL PD
- **Description**: USB Power Delivery compliance testing
- **Price**: $49.00/month (recurring)
- **Environment Variable**: `STRIPE_PLUGIN_GRL_PD_PRICE_ID`

### 5. Sifos PoE Plugin
- **Product Name**: Lyceum Plugin - Sifos PoE
- **Description**: Power over Ethernet test automation
- **Price**: $49.00/month (recurring)
- **Environment Variable**: `STRIPE_PLUGIN_SIFOS_POE_PRICE_ID`

### 6. Time Machines Grandmaster Plugin
- **Product Name**: Lyceum Plugin - Time Machines Grandmaster
- **Description**: GPS-synchronized precision timing and synchronization
- **Price**: $49.00/month (recurring)
- **Environment Variable**: `STRIPE_PLUGIN_TIME_MACHINES_PRICE_ID`

## Environment Variables

Add the following to your `.env.local` file after creating the Stripe products:

```bash
# Plugin Stripe Price IDs (Monthly Subscription)
# Existing plugins
STRIPE_PLUGIN_APX500_PRICE_ID=price_xxx
STRIPE_PLUGIN_KLIPPEL_QC_PRICE_ID=price_xxx

# New plugins
STRIPE_PLUGIN_PREEN_PSU_PRICE_ID=price_xxx
STRIPE_PLUGIN_KEYSIGHT_DAQ_PRICE_ID=price_xxx
STRIPE_PLUGIN_KWIKWAI_PRICE_ID=price_xxx
STRIPE_PLUGIN_GRL_PD_PRICE_ID=price_xxx
STRIPE_PLUGIN_SIFOS_POE_PRICE_ID=price_xxx
STRIPE_PLUGIN_TIME_MACHINES_PRICE_ID=price_xxx
```

## Setup Steps

1. **Create Products in Stripe Dashboard**
   - Go to https://dashboard.stripe.com/products
   - Click "Add product"
   - Enter the product name and description
   - Add a recurring price of $49.00/month
   - Save and copy the Price ID (starts with `price_`)

2. **Add Environment Variables**
   - Open your `.env.local` file
   - Add the Price IDs for each plugin as shown above

3. **Run Database Migration**
   - Execute the SQL migration to add the plugins to the database:
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or run manually in Supabase SQL Editor:
   # Copy contents from supabase/migrations/20251222_add_new_plugins.sql
   ```

4. **Publish Plugins in Admin**
   - Go to /admin/plugins in your application
   - Review each plugin's details
   - Click "Publish" to make them available in the store

## Plugin Slug to Plugin Type Mapping

| Plugin Display Name | Slug | Plugin Type (API) |
|-------------------|------|-------------------|
| Preen PSU | preen-psu | preen_psu |
| Keysight DAQ | keysight-daq | keysight_daq |
| Kwikwai K110 | kwikwai-k110 | kwikwai |
| GRL PD | granite-river-labs-pd | grl_pd |
| Sifos PoE | sifos-poe | sifos_poe |
| Time Machines | time-machines-grandmaster | time_machines |

## Webhook Configuration

Ensure your Stripe webhook is configured to handle these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

The webhook endpoint should be: `{YOUR_DOMAIN}/api/stripe/webhook`

## Testing

To test in Stripe Test Mode:
1. Use test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Any billing address

## Troubleshooting

If plugins don't appear in the store:
1. Check that `is_published = true` in the database
2. Verify the user has a valid authentication session
3. Check browser console for API errors

If trials don't work:
1. Verify the Stripe Price ID is correct in environment variables
2. Check that the price is set up as a recurring subscription in Stripe
3. Ensure the Stripe webhook is receiving events
