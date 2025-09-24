import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export interface SaaSSubscriptionTier {
  id: string;
  name: string;
  price: number;
  priceId: string; // Stripe price ID
  features: {
    clusters: number | 'unlimited';
    clusterSize: string[];
    storageLimit: string;
    dataRetention: string;
    projects: number | 'unlimited';
    teamMembers: number | 'unlimited';
    support: string;
    features?: string[];
  };
}

export const SUBSCRIPTION_TIERS: SaaSSubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    features: {
      clusters: 1,
      clusterSize: ['small'],
      storageLimit: '10GB',
      dataRetention: '30 days',
      projects: 5,
      teamMembers: 3,
      support: 'community'
    }
  },
  {
    id: 'professional',
    name: 'Professional', 
    price: 99,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
    features: {
      clusters: 3,
      clusterSize: ['small', 'medium'],
      storageLimit: '100GB',
      dataRetention: '90 days',
      projects: 25,
      teamMembers: 10,
      support: 'email',
      features: ['API access', 'advanced analytics']
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    features: {
      clusters: 'unlimited',
      clusterSize: ['small', 'medium', 'large'],
      storageLimit: '1TB',
      dataRetention: '365 days',
      projects: 'unlimited',
      teamMembers: 'unlimited',
      support: 'priority + phone',
      features: ['SSO', 'advanced security', 'custom integrations']
    }
  }
];

export const BYOD_CONNECTION_PRICE_ID = process.env.STRIPE_BYOD_PRICE_ID || 'price_byod';
export const BYOD_CONNECTION_PRICE = 10; // $10/month per connection

export interface CreateSubscriptionParams {
  customerId: string;
  tierName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  userId: string;
}

export class StripeService {
  /**
   * Create a new Stripe customer
   */
  async createCustomer({ email, name, userId }: CreateCustomerParams): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
          platform: 'lyceum_database_clusters'
        }
      });
      
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Create a subscription checkout session
   */
  async createSubscriptionCheckout({ 
    customerId, 
    tierName, 
    successUrl, 
    cancelUrl 
  }: CreateSubscriptionParams): Promise<Stripe.Checkout.Session> {
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierName);
    if (!tier) {
      throw new Error('Invalid subscription tier');
    }

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: tier.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          tierName,
          userId: customerId
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Create BYOD connection subscription
   */
  async createBYODSubscription(customerId: string, connectionCount: number = 1): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: BYOD_CONNECTION_PRICE_ID,
            quantity: connectionCount,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
        metadata: {
          type: 'byod_connection',
          connectionCount: connectionCount.toString()
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating BYOD subscription:', error);
      throw new Error('Failed to create BYOD subscription');
    }
  }

  /**
   * Get customer subscriptions
   */
  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
      });

      return subscriptions.data;
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw new Error('Failed to fetch subscriptions');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw new Error('Failed to fetch subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(customerId: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
      });

      return session;
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload: string, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get usage-based billing for overage
   */
  async createUsageRecord(subscriptionItemId: string, quantity: number): Promise<Stripe.UsageRecord> {
    try {
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
        quantity,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment',
      });

      return usageRecord;
    } catch (error) {
      console.error('Error creating usage record:', error);
      throw new Error('Failed to create usage record');
    }
  }
}

export const stripeService = new StripeService();

export default stripe;
