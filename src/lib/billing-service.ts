import { stripe } from './stripe';
import * as dbOperations from './supabase-direct';
import { calculateFlexiblePricing, PRICING_CONFIG, type FlexibleBillingParams, type BillingLineItem } from './flexible-pricing';

// ====================================
// TYPES & INTERFACES
// ====================================

export interface BillingPeriod {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  period_label: string;
  status: 'active' | 'billed' | 'closed' | 'cancelled';
  total_amount_cents: number;
  currency: string;
  billed_at?: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  billing_period_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  stripe_invoice_id?: string;
  payment_method_last4?: string;
  payment_method_brand?: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_type: string;
  name: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  item_metadata?: any;
  line_order: number;
}

export interface UsageSnapshot {
  user_id: string;
  billing_period_id: string;
  licenses_breakdown: Record<string, number>;
  clusters_breakdown: Record<string, Record<string, number>>;
  additional_users: number;
  storage_overage_gb: number;
  estimated_monthly_cost_cents: number;
}

export interface UserUsageData {
  licenses: Array<{ type: 'basic' | 'professional' | 'enterprise'; quantity: number }>;
  clusters: Array<{ size: 'small' | 'medium' | 'large'; type: 'development' | 'production' | 'analytics'; quantity: number }>;
  additionalUsers: number;
  storageOverageGB: number;
}

// ====================================
// USAGE TRACKING SERVICE
// ====================================

export class UsageTrackingService {
  /**
   * Get current usage data for a user (includes licenses they're responsible for paying)
   */
  static async getCurrentUsage(userId: string): Promise<UserUsageData> {
    console.log('📊 Getting current usage for user:', userId);
    
    try {
      // Get licenses where user is responsible for payment
      // This includes both direct responsibility and fallback to assignment-based responsibility
      const { data: responsibleLicenses, error: licenseError } = await dbOperations.supabaseAdmin
        .from('licenses')
        .select('license_type, status, id')
        .eq('responsible_user_id', userId)
        .eq('status', 'active');

      // Also check license_keys table for responsible licenses
      const { data: responsibleLicenseKeys, error: licenseKeysError } = await dbOperations.supabaseAdmin
        .from('license_keys')
        .select('license_type, status, id')
        .eq('responsible_user_id', userId)
        .eq('status', 'active');

      if (licenseError) {
        console.error('❌ License query error:', licenseError);
      }

      if (licenseKeysError) {
        console.error('❌ License keys query error:', licenseKeysError);
      }

      // Get database clusters
      const { data: clusters, error: clusterError } = await dbOperations.supabaseAdmin
        .from('user_database_clusters')
        .select('cluster_type, status, storage_size_mb, cpu_cores, ram_mb')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (clusterError) {
        console.error('❌ Cluster query error:', clusterError);
      }

      // Get user resource usage
      const { data: resourceUsage, error: resourceError } = await dbOperations.supabaseAdmin
        .from('user_resource_usage')
        .select('storage_used_mb, storage_limit_mb')
        .eq('user_id', userId)
        .single();

      if (resourceError) {
        console.error('❌ Resource usage query error:', resourceError);
      }

      // Process licenses where user is responsible for payment
      const licenseCounts: Record<string, number> = { basic: 0, professional: 0, enterprise: 0, trial: 0, standard: 0 };
      
      // Count licenses from licenses table
      if (responsibleLicenses) {
        responsibleLicenses.forEach(license => {
          if (license?.status === 'active' && license?.license_type) {
            // Map license types to billing categories
            let billingType = license.license_type;
            if (billingType === 'trial' || billingType === 'standard') {
              billingType = 'basic'; // Map trial/standard to basic for billing
            }
            licenseCounts[billingType] = (licenseCounts[billingType] || 0) + 1;
          }
        });
      }
      
      // Count licenses from license_keys table
      if (responsibleLicenseKeys) {
        responsibleLicenseKeys.forEach(license => {
          if (license?.status === 'active' && license?.license_type) {
            // Map license types to billing categories
            let billingType = license.license_type;
            if (billingType === 'trial' || billingType === 'standard') {
              billingType = 'basic'; // Map trial/standard to basic for billing
            }
            licenseCounts[billingType] = (licenseCounts[billingType] || 0) + 1;
          }
        });
      }

      const licenses = Object.entries(licenseCounts)
        .filter(([_, count]) => count > 0)
        .map(([type, quantity]) => ({ 
          type: type as 'basic' | 'professional' | 'enterprise', 
          quantity 
        }));

      // Process clusters (simplified mapping for now)
      const clusterUsage: Array<{ size: 'small' | 'medium' | 'large'; type: 'development' | 'production' | 'analytics'; quantity: number }> = [];
      if (clusters) {
        const clusterCounts: Record<string, Record<string, number>> = {
          small: { development: 0, production: 0, analytics: 0 },
          medium: { development: 0, production: 0, analytics: 0 },
          large: { development: 0, production: 0, analytics: 0 }
        };

        clusters.forEach(cluster => {
          // Determine size based on resources (simplified logic)
          let size: 'small' | 'medium' | 'large' = 'small';
          if (cluster.cpu_cores >= 8 || cluster.ram_mb >= 16384) {
            size = 'large';
          } else if (cluster.cpu_cores >= 4 || cluster.ram_mb >= 8192) {
            size = 'medium';
          }

          // Map cluster type
          let type: 'development' | 'production' | 'analytics' = 'development';
          if (cluster.cluster_type === 'premium' || cluster.cluster_type === 'enterprise') {
            type = 'production';
          } else if (cluster.cluster_type === 'standard') {
            type = 'analytics';
          }

          clusterCounts[size][type] += 1;
        });

        // Convert to array format
        Object.entries(clusterCounts).forEach(([size, types]) => {
          Object.entries(types).forEach(([type, quantity]) => {
            if (quantity > 0) {
              clusterUsage.push({
                size: size as 'small' | 'medium' | 'large',
                type: type as 'development' | 'production' | 'analytics',
                quantity
              });
            }
          });
        });
      }

      // Calculate storage overage
      const storageUsedMB = resourceUsage?.storage_used_mb || 0;
      const storageLimitMB = resourceUsage?.storage_limit_mb || 1024; // 1GB default
      const storageOverageGB = Math.max(0, (storageUsedMB - storageLimitMB) / 1024);

      // Get additional users (simplified - assuming 1 base user)
      const additionalUsers = 0; // TODO: Implement actual user counting logic

      const usage: UserUsageData = {
        licenses,
        clusters: clusterUsage,
        additionalUsers,
        storageOverageGB
      };

      console.log('📊 Current usage calculated (responsible licenses only):', usage);
      return usage;

    } catch (error) {
      console.error('❌ Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Create a usage snapshot for billing
   */
  static async createUsageSnapshot(userId: string, billingPeriodId: string): Promise<UsageSnapshot> {
    console.log('📸 Creating usage snapshot for user:', userId, 'period:', billingPeriodId);

    const usage = await this.getCurrentUsage(userId);
    
    // Convert to pricing calculation
    const pricingParams: FlexibleBillingParams = {
      licenses: usage.licenses,
      clusters: usage.clusters,
      additionalUsers: usage.additionalUsers,
      storageOverageGB: usage.storageOverageGB
    };

    const { totalAmount } = calculateFlexiblePricing(pricingParams);

    // Create breakdown objects
    const licensesBreakdown: Record<string, number> = {};
    usage.licenses.forEach(license => {
      licensesBreakdown[license.type] = license.quantity;
    });

    const clustersBreakdown: Record<string, Record<string, number>> = {};
    usage.clusters.forEach(cluster => {
      if (!clustersBreakdown[cluster.size]) {
        clustersBreakdown[cluster.size] = {};
      }
      clustersBreakdown[cluster.size][cluster.type] = cluster.quantity;
    });

    const snapshot: UsageSnapshot = {
      user_id: userId,
      billing_period_id: billingPeriodId,
      licenses_breakdown: licensesBreakdown,
      clusters_breakdown: clustersBreakdown,
      additional_users: usage.additionalUsers,
      storage_overage_gb: usage.storageOverageGB,
      estimated_monthly_cost_cents: totalAmount
    };

    // Save to database
    const { data, error } = await dbOperations.supabaseAdmin
      .from('billing_usage_snapshots')
      .insert({
        user_id: userId,
        billing_period_id: billingPeriodId,
        snapshot_type: 'billing',
        licenses_breakdown: licensesBreakdown,
        clusters_breakdown: clustersBreakdown,
        additional_users: usage.additionalUsers,
        storage_overage_gb: usage.storageOverageGB,
        estimated_monthly_cost_cents: totalAmount,
        raw_usage_data: usage
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving usage snapshot:', error);
      throw error;
    }

    console.log('✅ Usage snapshot created:', data.id);
    return snapshot;
  }
}

// ====================================
// BILLING PERIOD SERVICE
// ====================================

export class BillingPeriodService {
  /**
   * Create a new billing period for a user
   */
  static async createBillingPeriod(userId: string, startDate: Date = new Date()): Promise<BillingPeriod> {
    console.log('📅 Creating billing period for user:', userId);

    // Calculate period dates (30-day periods)
    const periodStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 30); // 30-day billing cycle

    // Create period label
    const periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    const { data, error } = await dbOperations.supabaseAdmin
      .from('billing_periods')
      .insert({
        user_id: userId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        period_label: periodLabel,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating billing period:', error);
      throw error;
    }

    console.log('✅ Billing period created:', data.id);
    return data as BillingPeriod;
  }

  /**
   * Get active billing period for a user
   */
  static async getActiveBillingPeriod(userId: string): Promise<BillingPeriod | null> {
    const { data, error } = await dbOperations.supabaseAdmin
      .from('billing_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      console.error('❌ Error getting active billing period:', error);
      throw error;
    }

    return data as BillingPeriod | null;
  }

  /**
   * Close a billing period and prepare for invoicing
   */
  static async closeBillingPeriod(billingPeriodId: string): Promise<BillingPeriod> {
    console.log('🔒 Closing billing period:', billingPeriodId);

    const { data, error } = await dbOperations.supabaseAdmin
      .from('billing_periods')
      .update({
        status: 'billed',
        billed_at: new Date().toISOString()
      })
      .eq('id', billingPeriodId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error closing billing period:', error);
      throw error;
    }

    console.log('✅ Billing period closed:', data.id);
    return data as BillingPeriod;
  }
}

// ====================================
// INVOICE GENERATION SERVICE
// ====================================

export class InvoiceService {
  /**
   * Generate an invoice for a billing period
   */
  static async generateInvoice(billingPeriodId: string): Promise<Invoice> {
    console.log('🧾 Generating invoice for billing period:', billingPeriodId);

    // Get billing period
    const { data: billingPeriod, error: periodError } = await dbOperations.supabaseAdmin
      .from('billing_periods')
      .select('*')
      .eq('id', billingPeriodId)
      .single();

    if (periodError || !billingPeriod) {
      throw new Error(`Billing period not found: ${billingPeriodId}`);
    }

    // Get or create usage snapshot
    let usageSnapshot = await this.getUsageSnapshot(billingPeriodId);
    if (!usageSnapshot) {
      usageSnapshot = await UsageTrackingService.createUsageSnapshot(billingPeriod.user_id, billingPeriodId);
    }

    // Calculate pricing
    const pricingParams: FlexibleBillingParams = {
      licenses: Object.entries(usageSnapshot.licenses_breakdown).map(([type, quantity]) => ({
        type: type as 'basic' | 'professional' | 'enterprise',
        quantity
      })),
      clusters: this.convertClustersBreakdown(usageSnapshot.clusters_breakdown),
      additionalUsers: usageSnapshot.additional_users,
      storageOverageGB: usageSnapshot.storage_overage_gb
    };

    const { lineItems, totalAmount } = calculateFlexiblePricing(pricingParams);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(billingPeriod.user_id);

    // Calculate dates
    const invoiceDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days to pay

    // Create invoice
    const { data: invoice, error: invoiceError } = await dbOperations.supabaseAdmin
      .from('invoices')
      .insert({
        user_id: billingPeriod.user_id,
        billing_period_id: billingPeriodId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate.toISOString(),
        due_date: dueDate.toISOString(),
        status: 'draft',
        subtotal_cents: totalAmount,
        tax_cents: 0, // TODO: Add tax calculation
        total_cents: totalAmount,
        currency: 'USD'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Error creating invoice:', invoiceError);
      throw invoiceError;
    }

    // Create line items
    await this.createInvoiceLineItems(invoice.id, lineItems);

    console.log('✅ Invoice generated:', invoice.id, 'Number:', invoiceNumber);
    return invoice as Invoice;
  }

  /**
   * Create line items for an invoice
   */
  private static async createInvoiceLineItems(invoiceId: string, lineItems: BillingLineItem[]) {
    const lineItemsData = lineItems.map((item, index) => ({
      invoice_id: invoiceId,
      item_type: this.getItemType(item.name),
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unitPrice,
      total_price_cents: item.totalPrice,
      line_order: index + 1
    }));

    const { error } = await dbOperations.supabaseAdmin
      .from('invoice_line_items')
      .insert(lineItemsData);

    if (error) {
      console.error('❌ Error creating line items:', error);
      throw error;
    }

    console.log('✅ Line items created:', lineItemsData.length);
  }

  /**
   * Get usage snapshot for a billing period
   */
  private static async getUsageSnapshot(billingPeriodId: string): Promise<UsageSnapshot | null> {
    const { data, error } = await dbOperations.supabaseAdmin
      .from('billing_usage_snapshots')
      .select('*')
      .eq('billing_period_id', billingPeriodId)
      .eq('snapshot_type', 'billing')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error getting usage snapshot:', error);
      throw error;
    }

    return data as UsageSnapshot | null;
  }

  /**
   * Generate unique invoice number
   */
  private static async generateInvoiceNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get user profile for stable identifier
    const { data: profile } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const userCode = profile?.email?.split('@')[0]?.toUpperCase()?.slice(0, 8) || 'USER';
    
    // Get count of invoices for this user this month
    const startOfMonth = new Date(year, new Date().getMonth(), 1);
    const { count } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('invoice_date', startOfMonth.toISOString());

    const sequence = String((count || 0) + 1).padStart(3, '0');
    
    return `INV-${year}${month}-${sequence}-${userCode}`;
  }

  /**
   * Convert clusters breakdown to pricing format
   */
  private static convertClustersBreakdown(breakdown: Record<string, Record<string, number>>) {
    const clusters: Array<{ size: 'small' | 'medium' | 'large'; type: 'development' | 'production' | 'analytics'; quantity: number }> = [];
    
    Object.entries(breakdown).forEach(([size, types]) => {
      Object.entries(types).forEach(([type, quantity]) => {
        if (quantity > 0) {
          clusters.push({
            size: size as 'small' | 'medium' | 'large',
            type: type as 'development' | 'production' | 'analytics',
            quantity
          });
        }
      });
    });

    return clusters;
  }

  /**
   * Map line item name to item type
   */
  private static getItemType(name: string): string {
    if (name.includes('Platform')) return 'platform_fee';
    if (name.includes('License')) return 'license';
    if (name.includes('Cluster')) return 'cluster';
    if (name.includes('User')) return 'additional_users';
    if (name.includes('Storage')) return 'storage_overage';
    return 'other';
  }
}

// ====================================
// MAIN BILLING SERVICE
// ====================================

export class BillingService {
  /**
   * Process monthly billing for a user
   */
  static async processMonthlyBilling(userId: string): Promise<{ billingPeriod: BillingPeriod; invoice: Invoice }> {
    console.log('💰 Processing monthly billing for user:', userId);

    try {
      // Get or create current billing period
      let billingPeriod = await BillingPeriodService.getActiveBillingPeriod(userId);
      
      if (!billingPeriod) {
        billingPeriod = await BillingPeriodService.createBillingPeriod(userId);
      }

      // Check if period should be closed (past end date)
      const periodEnd = new Date(billingPeriod.period_end);
      const now = new Date();
      
      if (now >= periodEnd && billingPeriod.status === 'active') {
        // Close current period
        billingPeriod = await BillingPeriodService.closeBillingPeriod(billingPeriod.id);
        
        // Generate invoice
        const invoice = await InvoiceService.generateInvoice(billingPeriod.id);
        
        // Create next billing period
        const nextPeriod = await BillingPeriodService.createBillingPeriod(userId, periodEnd);
        
        console.log('✅ Monthly billing processed:', { billingPeriod: billingPeriod.id, invoice: invoice.id, nextPeriod: nextPeriod.id });
        
        return { billingPeriod, invoice };
      }

      throw new Error('Billing period not ready for processing');

    } catch (error) {
      console.error('❌ Error processing monthly billing:', error);
      throw error;
    }
  }

  /**
   * Get billing summary for a user
   */
  static async getBillingSummary(userId: string) {
    const [currentPeriod, recentInvoices, currentUsage] = await Promise.all([
      BillingPeriodService.getActiveBillingPeriod(userId),
      this.getRecentInvoices(userId, 12), // Last 12 months
      UsageTrackingService.getCurrentUsage(userId)
    ]);

    // Calculate current estimated cost
    const pricingParams: FlexibleBillingParams = {
      licenses: currentUsage.licenses,
      clusters: currentUsage.clusters,
      additionalUsers: currentUsage.additionalUsers,
      storageOverageGB: currentUsage.storageOverageGB
    };

    const { totalAmount: estimatedMonthlyCost } = calculateFlexiblePricing(pricingParams);

    return {
      currentPeriod,
      currentUsage,
      estimatedMonthlyCost,
      recentInvoices,
      totalOutstanding: recentInvoices
        .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.total_cents, 0)
    };
  }

  /**
   * Get recent invoices for a user
   */
  private static async getRecentInvoices(userId: string, limit: number = 12): Promise<Invoice[]> {
    const { data, error } = await dbOperations.supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error getting recent invoices:', error);
      throw error;
    }

    return data as Invoice[];
  }
}


