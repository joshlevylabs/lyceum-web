import { dbOperations } from './supabase-direct';
import { stripeService, SUBSCRIPTION_TIERS, SaaSSubscriptionTier } from './stripe-integration';
import Stripe from 'stripe';

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  tier_name: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface UsageMetrics {
  clusters_used: number;
  storage_used_gb: number;
  projects_used: number;
  team_members_used: number;
  byod_connections_used: number;
  api_requests_used: number;
}

export interface SubscriptionLimits {
  clusters_limit: number;
  storage_limit_gb: number;
  projects_limit: number;
  team_members_limit: number;
  data_retention_days: number;
  api_requests_limit: number;
}

export class SubscriptionManager {
  /**
   * Create a new subscription for a user
   */
  async createSubscription(
    userId: string, 
    email: string, 
    name: string, 
    tierName: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkoutUrl: string }> {
    try {
      // Create or get Stripe customer
      let stripeCustomerId = await this.getStripeCustomerId(userId);
      
      if (!stripeCustomerId) {
        const customer = await stripeService.createCustomer({
          email,
          name,
          userId
        });
        stripeCustomerId = customer.id;
        
        // Store customer ID in database
        await this.storeStripeCustomerId(userId, stripeCustomerId);
      }

      // Create checkout session
      const session = await stripeService.createSubscriptionCheckout({
        customerId: stripeCustomerId,
        tierName,
        successUrl,
        cancelUrl
      });

      return { checkoutUrl: session.url! };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Handle successful subscription creation from webhook
   */
  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customer = await stripeService.stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.userId;
      
      if (!userId) {
        throw new Error('User ID not found in customer metadata');
      }

      // Determine tier from price ID
      const priceId = subscription.items.data[0]?.price.id;
      const tier = SUBSCRIPTION_TIERS.find(t => t.priceId === priceId);
      
      if (!tier) {
        throw new Error('Unknown subscription tier');
      }

      // Store subscription in database
      await dbOperations.supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          tier_name: tier.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        });

      // Update user permissions based on tier
      await this.updateUserPermissions(userId, tier);

    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await dbOperations.supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  /**
   * Get subscription tier details
   */
  getTierDetails(tierName: string): SaaSSubscriptionTier | null {
    return SUBSCRIPTION_TIERS.find(tier => tier.id === tierName) || null;
  }

  /**
   * Calculate subscription limits based on tier
   */
  getSubscriptionLimits(tierName: string): SubscriptionLimits {
    const tier = this.getTierDetails(tierName);
    
    if (!tier) {
      // Default to starter limits for unknown tiers
      return {
        clusters_limit: 1,
        storage_limit_gb: 10,
        projects_limit: 5,
        team_members_limit: 3,
        data_retention_days: 30,
        api_requests_limit: 1000
      };
    }

    return {
      clusters_limit: typeof tier.features.clusters === 'number' ? tier.features.clusters : 999,
      storage_limit_gb: parseInt(tier.features.storageLimit.replace('GB', '').replace('TB', '000')),
      projects_limit: typeof tier.features.projects === 'number' ? tier.features.projects : 999,
      team_members_limit: typeof tier.features.teamMembers === 'number' ? tier.features.teamMembers : 999,
      data_retention_days: parseInt(tier.features.dataRetention.replace(' days', '')),
      api_requests_limit: tier.id === 'starter' ? 1000 : tier.id === 'professional' ? 10000 : 100000
    };
  }

  /**
   * Get current usage metrics for a user
   */
  async getUsageMetrics(userId: string): Promise<UsageMetrics> {
    try {
      // Get cluster count
      const { data: clusters } = await dbOperations.supabaseAdmin
        .from('database_clusters')
        .select('id, storage_gb')
        .eq('owner_id', userId);

      // Get project count
      const { data: projects } = await dbOperations.supabaseAdmin
        .from('cluster_projects')
        .select('id')
        .in('cluster_id', clusters?.map(c => c.id) || []);

      // Get team member count (unique across all clusters)
      const { data: teamMembers } = await dbOperations.supabaseAdmin
        .from('cluster_team_access')
        .select('user_id')
        .in('cluster_id', clusters?.map(c => c.id) || []);

      const uniqueTeamMembers = new Set(teamMembers?.map(tm => tm.user_id) || []);

      // Calculate storage usage
      const storageUsed = clusters?.reduce((total, cluster) => total + (cluster.storage_gb || 0), 0) || 0;

      return {
        clusters_used: clusters?.length || 0,
        storage_used_gb: storageUsed,
        projects_used: projects?.length || 0,
        team_members_used: uniqueTeamMembers.size,
        byod_connections_used: 0, // TODO: Implement BYOD connection counting
        api_requests_used: 0 // TODO: Implement API request tracking
      };
    } catch (error) {
      console.error('Error fetching usage metrics:', error);
      return {
        clusters_used: 0,
        storage_used_gb: 0,
        projects_used: 0,
        team_members_used: 0,
        byod_connections_used: 0,
        api_requests_used: 0
      };
    }
  }

  /**
   * Check if user has exceeded their subscription limits
   */
  async checkUsageLimits(userId: string): Promise<{
    withinLimits: boolean;
    violations: string[];
    usage: UsageMetrics;
    limits: SubscriptionLimits;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const tierName = subscription?.tier_name || 'starter';
      
      const usage = await this.getUsageMetrics(userId);
      const limits = this.getSubscriptionLimits(tierName);
      
      const violations: string[] = [];
      
      if (usage.clusters_used > limits.clusters_limit) {
        violations.push(`Clusters: ${usage.clusters_used}/${limits.clusters_limit}`);
      }
      if (usage.storage_used_gb > limits.storage_limit_gb) {
        violations.push(`Storage: ${usage.storage_used_gb}GB/${limits.storage_limit_gb}GB`);
      }
      if (usage.projects_used > limits.projects_limit) {
        violations.push(`Projects: ${usage.projects_used}/${limits.projects_limit}`);
      }
      if (usage.team_members_used > limits.team_members_limit) {
        violations.push(`Team Members: ${usage.team_members_used}/${limits.team_members_limit}`);
      }

      return {
        withinLimits: violations.length === 0,
        violations,
        usage,
        limits
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      throw error;
    }
  }

  /**
   * Upgrade/downgrade subscription
   */
  async changeSubscriptionTier(userId: string, newTierName: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const newTier = this.getTierDetails(newTierName);
      if (!newTier) {
        throw new Error('Invalid tier name');
      }

      // Update subscription in Stripe
      await stripeService.updateSubscription(subscription.stripe_subscription_id, newTier.priceId);

      // Update in database
      await dbOperations.supabaseAdmin
        .from('user_subscriptions')
        .update({
          tier_name: newTierName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // Update permissions
      await this.updateUserPermissions(userId, newTier);

    } catch (error) {
      console.error('Error changing subscription tier:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel in Stripe
      await stripeService.cancelSubscription(subscription.stripe_subscription_id);

      // Update status in database
      await dbOperations.supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getStripeCustomerId(userId: string): Promise<string | null> {
    const { data } = await dbOperations.supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    return data?.stripe_customer_id || null;
  }

  private async storeStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await dbOperations.supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  private async updateUserPermissions(userId: string, tier: SaaSSubscriptionTier): Promise<void> {
    // Update user permissions based on tier
    // This could involve updating user roles, feature flags, etc.
    console.log(`Updating permissions for user ${userId} to ${tier.name} tier`);
    
    // TODO: Implement permission updates based on tier features
    // For example:
    // - Enable/disable API access
    // - Set feature flags for advanced analytics
    // - Update role permissions
  }
}

export const subscriptionManager = new SubscriptionManager();
