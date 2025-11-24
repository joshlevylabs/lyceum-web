import Stripe from 'stripe';

// Determine which Stripe mode to use (test or live)
const stripeMode = process.env.STRIPE_MODE || 'test';
const isLiveMode = stripeMode === 'live';

// Select the appropriate secret key based on mode
const stripeSecretKey = isLiveMode
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY;

// Detailed logging for debugging
console.log('🔧 Stripe Configuration:', {
  mode: stripeMode,
  isLiveMode,
  hasSecretKey: !!stripeSecretKey,
  keyPrefix: stripeSecretKey?.substring(0, 12) || 'MISSING',
  keyLength: stripeSecretKey?.length || 0,
  expectedKeyType: isLiveMode ? 'sk_live_' : 'sk_test_',
  allEnvKeys: Object.keys(process.env).filter(key => key.includes('STRIPE')).sort(),
});

if (!stripeSecretKey) {
  const errorMsg =
    `❌ ${isLiveMode ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_SECRET_KEY'} is not defined in environment variables.\n` +
    `Current STRIPE_MODE: ${stripeMode}\n` +
    `Available STRIPE env vars: ${Object.keys(process.env).filter(key => key.includes('STRIPE')).join(', ')}\n` +
    `Please check your environment configuration.`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Validate the key format
const expectedPrefix = isLiveMode ? 'sk_live_' : 'sk_test_';
if (!stripeSecretKey.startsWith(expectedPrefix)) {
  const errorMsg =
    `❌ Invalid Stripe key format. Expected key to start with '${expectedPrefix}' but got '${stripeSecretKey.substring(0, 12)}...'\n` +
    `Current STRIPE_MODE: ${stripeMode}\n` +
    `Key length: ${stripeSecretKey.length} characters`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

console.log('✅ Stripe key validated successfully');

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

// Export mode information
export const STRIPE_MODE = stripeMode;
export const IS_LIVE_MODE = isLiveMode;

export { stripe };

// Stripe price IDs for different plans
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID as string, // $29/month
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID as string, // $99/month
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID as string, // $299/month
  byod: process.env.STRIPE_BYOD_PRICE_ID as string, // $10/month
};

// Helper function to create a checkout session
export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  clusterId,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
  clusterId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    metadata: {
      userId,
      clusterId: clusterId || '',
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    tax_id_collection: {
      enabled: true,
    },
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        userId,
        clusterId: clusterId || '',
      },
    },
  });

  return session;
}

// Helper function to create a billing portal session
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Helper function to get customer by email
export async function getCustomerByEmail(email: string) {
  console.log('💳 getCustomerByEmail - Searching for customer with email:', email)
  const customers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  console.log('💳 getCustomerByEmail - Stripe customers search result:', {
    customersFound: customers.data.length,
    customers: customers.data.map(c => ({
      id: c.id,
      email: c.email,
      name: c.name
    }))
  })

  const customer = customers.data[0] || null;
  console.log('💳 getCustomerByEmail - Returning customer:', customer ? { id: customer.id, email: customer.email } : null)
  return customer;
}

// Helper function to create customer
export async function createCustomer({
  email,
  name,
  userId,
}: {
  email: string;
  name?: string;
  userId: string;
}) {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  return customer;
}

// Helper function to get active subscriptions
export async function getActiveSubscriptions(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
  });

  return subscriptions.data;
}

// Helper function to cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

// Helper function to get subscription details
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

// Plan configurations
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    priceId: STRIPE_PRICE_IDS.starter,
    features: [
      'Up to 5 users',
      'Basic analytics cluster',
      '10GB data storage',
      'Email support',
      'Basic monitoring',
    ],
    maxUsers: 5,
    maxClusters: 1,
    storageGB: 10,
  },
  professional: {
    name: 'Professional',
    price: 99,
    priceId: STRIPE_PRICE_IDS.professional,
    features: [
      'Up to 25 users',
      'Multiple clusters',
      '100GB data storage',
      'Priority support',
      'Advanced monitoring',
      'API access',
    ],
    maxUsers: 25,
    maxClusters: 5,
    storageGB: 100,
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    priceId: STRIPE_PRICE_IDS.enterprise,
    features: [
      'Unlimited users',
      'Unlimited clusters',
      '1TB data storage',
      'Dedicated support',
      'Premium monitoring',
      'Full API access',
      'Custom integrations',
    ],
    maxUsers: -1, // unlimited
    maxClusters: -1, // unlimited
    storageGB: 1000,
  },
  byod: {
    name: 'Bring Your Own Database',
    price: 10,
    priceId: STRIPE_PRICE_IDS.byod,
    features: [
      'Connect existing database',
      'Basic monitoring',
      'Email support',
    ],
    maxUsers: -1, // unlimited (they manage their own)
    maxClusters: 1,
    storageGB: -1, // unlimited (they manage their own)
  },
};
