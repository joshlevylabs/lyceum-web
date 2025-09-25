// Client-safe Stripe constants (no server-side Stripe initialization)

// Plan configurations for the frontend
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_1SB0X8LXAQw5VHo2mY43cSL7',
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || 'price_1SB0XPLXAQw5VHo2RWq504Wb',
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || 'price_1SB0XlLXAQw5VHo2HdexQDmi',
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_BYOD_PRICE_ID || 'price_1SB0YeLXAQw5VHo2nfmewITO',
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

// Client-safe pricing info
export const STRIPE_PLANS_INFO = {
  starter: {
    name: 'Starter',
    price: '$29',
    period: 'month',
    description: 'Perfect for small teams and testing',
    popular: false,
  },
  professional: {
    name: 'Professional',
    price: '$99',
    period: 'month',
    description: 'For growing teams and production workloads',
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: '$299',
    period: 'month',
    description: 'For large organizations',
    popular: false,
  },
  byod: {
    name: 'BYOD',
    price: '$10',
    period: 'month',
    description: 'Bring Your Own Database',
    popular: false,
  },
};
