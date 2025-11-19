import { stripe } from './stripe';

// Pricing configuration for flexible billing
export const PRICING_CONFIG = {
  // Base platform fee
  basePlatformFee: 0, // $0/month - no base fee

  // License pricing (per license per month)
  licenses: {
    basic: 5,       // $5/month per basic license
    standard: 10,   // $10/month per standard license
    professional: 15, // $15/month per professional license
    enterprise: 25,   // $25/month per enterprise license
    gratis: 0,      // $0/month per gratis license (free)
  },

  // Note: Cluster pricing is now calculated dynamically based on actual resources
  // This config is kept for backward compatibility but not used for new calculations

  // User pricing (per additional user per month)
  additionalUsers: 3, // $3/month per user beyond base allocation

  // Storage overage (per GB per month)
  storageOverage: 0.10, // $0.10/GB/month over limit
};

export interface BillingLineItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice: number; // in cents
}

export interface CouponDiscount {
  couponId: string;
  couponCode: string;
  couponName: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  discountAmountCents: number;
  originalAmountCents: number;
  finalAmountCents: number;
}

export interface FlexibleBillingParams {
  userId: string;
  licenses: {
    type: keyof typeof PRICING_CONFIG.licenses;
    quantity: number;
  }[];
  clusters: {
    size: keyof typeof PRICING_CONFIG.clusters;
    type: keyof typeof PRICING_CONFIG.clusters.small;
    quantity: number;
  }[];
  additionalUsers: number;
  storageOverageGB: number;
  metadata?: Record<string, string>;
}

/**
 * Calculate flexible pricing based on actual usage
 */
export function calculateFlexiblePricing(params: FlexibleBillingParams): {
  lineItems: BillingLineItem[];
  totalAmount: number; // in cents
  summary: string;
} {
  const lineItems: BillingLineItem[] = [];

  // Base platform fee (only add if non-zero)
  if (PRICING_CONFIG.basePlatformFee > 0) {
    lineItems.push({
      name: 'Platform Base Fee',
      description: 'Base platform access and support',
      quantity: 1,
      unitPrice: PRICING_CONFIG.basePlatformFee * 100,
      totalPrice: PRICING_CONFIG.basePlatformFee * 100,
    });
  }

  // License fees (skip gratis licenses as they're free)
  params.licenses.forEach(license => {
    if (license.type === 'gratis') return; // Skip gratis licenses
    
    const unitPrice = PRICING_CONFIG.licenses[license.type] * 100;
    lineItems.push({
      name: `${license.type.charAt(0).toUpperCase() + license.type.slice(1)} Licenses`,
      description: `${license.quantity} ${license.type} license${license.quantity > 1 ? 's' : ''}`,
      quantity: license.quantity,
      unitPrice,
      totalPrice: unitPrice * license.quantity,
    });
  });

  // Cluster fees (now using actual resource-based pricing)
  params.clusters.forEach(cluster => {
    // For billing integration, we need the actual monthly cost from the cluster
    // This should be passed as cluster.monthly_cost from the resource calculation
    const unitPrice = (cluster.monthly_cost || 0) * 100; // Convert to cents
    lineItems.push({
      name: `${cluster.size.charAt(0).toUpperCase() + cluster.size.slice(1)} ${cluster.type} Cluster${cluster.quantity > 1 ? 's' : ''}`,
      description: `${cluster.quantity} ${cluster.size} ${cluster.type} cluster${cluster.quantity > 1 ? 's' : ''} (${cluster.resources || 'custom config'})`,
      quantity: cluster.quantity,
      unitPrice,
      totalPrice: unitPrice * cluster.quantity,
    });
  });

  // Additional users
  if (params.additionalUsers > 0) {
    const unitPrice = PRICING_CONFIG.additionalUsers * 100;
    lineItems.push({
      name: 'Additional Users',
      description: `${params.additionalUsers} additional user${params.additionalUsers > 1 ? 's' : ''} beyond base allocation`,
      quantity: params.additionalUsers,
      unitPrice,
      totalPrice: unitPrice * params.additionalUsers,
    });
  }

  // Storage overage
  if (params.storageOverageGB > 0) {
    const unitPrice = Math.round(PRICING_CONFIG.storageOverage * 100);
    lineItems.push({
      name: 'Storage Overage',
      description: `${params.storageOverageGB}GB over included storage`,
      quantity: params.storageOverageGB,
      unitPrice,
      totalPrice: unitPrice * params.storageOverageGB,
    });
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const summary = `${lineItems.length} items, Total: $${(totalAmount / 100).toFixed(2)}/month`;

  return { lineItems, totalAmount, summary };
}

/**
 * Apply coupon discount to billing amount
 * @param originalAmountCents - Original billing amount in cents
 * @param coupon - Coupon details from database
 * @returns Discount information including final amount
 */
export function applyCouponDiscount(
  originalAmountCents: number,
  coupon: {
    id: string;
    code: string;
    name: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
  }
): CouponDiscount {
  let discountAmountCents: number;

  if (coupon.discount_type === 'percentage') {
    // Calculate percentage discount
    discountAmountCents = Math.round((originalAmountCents * coupon.discount_value) / 100);
  } else {
    // Fixed amount discount (convert dollars to cents)
    discountAmountCents = Math.round(coupon.discount_value * 100);
  }

  // Ensure discount doesn't exceed original amount
  if (discountAmountCents > originalAmountCents) {
    discountAmountCents = originalAmountCents;
  }

  const finalAmountCents = originalAmountCents - discountAmountCents;

  return {
    couponId: coupon.id,
    couponCode: coupon.code,
    couponName: coupon.name,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    discountAmountCents,
    originalAmountCents,
    finalAmountCents,
  };
}

/**
 * Calculate flexible pricing with optional coupon discount
 */
export function calculateFlexiblePricingWithDiscount(params: FlexibleBillingParams & {
  coupon?: {
    id: string;
    code: string;
    name: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
  };
}): {
  lineItems: BillingLineItem[];
  subtotalAmount: number;
  discount?: CouponDiscount;
  totalAmount: number;
  summary: string;
} {
  // Calculate base pricing
  const basePricing = calculateFlexiblePricing(params);
  const subtotalAmount = basePricing.totalAmount;

  // Apply coupon if provided
  let discount: CouponDiscount | undefined;
  let finalTotal = subtotalAmount;

  if (params.coupon) {
    discount = applyCouponDiscount(subtotalAmount, params.coupon);
    finalTotal = discount.finalAmountCents;

    // Add discount as a line item (negative amount)
    basePricing.lineItems.push({
      name: `Discount: ${params.coupon.code}`,
      description: params.coupon.discount_type === 'percentage'
        ? `${params.coupon.discount_value}% off - ${params.coupon.name}`
        : `$${params.coupon.discount_value.toFixed(2)} off - ${params.coupon.name}`,
      quantity: 1,
      unitPrice: -discount.discountAmountCents,
      totalPrice: -discount.discountAmountCents,
    });
  }

  const summary = discount
    ? `${basePricing.lineItems.length} items, Subtotal: $${(subtotalAmount / 100).toFixed(2)}, Discount: -$${(discount.discountAmountCents / 100).toFixed(2)}, Total: $${(finalTotal / 100).toFixed(2)}/month`
    : basePricing.summary;

  return {
    lineItems: basePricing.lineItems,
    subtotalAmount,
    discount,
    totalAmount: finalTotal,
    summary,
  };
}

/**
 * Create a flexible Stripe checkout session with dynamic pricing
 */
export async function createFlexibleCheckoutSession({
  billingParams,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  billingParams: FlexibleBillingParams;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { lineItems } = calculateFlexiblePricing(billingParams);

  // Convert our line items to Stripe format
  const stripeLineItems = lineItems.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name,
        description: item.description,
      },
      unit_amount: item.unitPrice,
      recurring: {
        interval: 'month' as const,
      },
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    customer_email: customerEmail,
    metadata: {
      userId: billingParams.userId,
      billingType: 'flexible',
      ...billingParams.metadata,
    },
    line_items: stripeLineItems,
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    subscription_data: {
      metadata: {
        userId: billingParams.userId,
        billingType: 'flexible',
      },
    },
  });

  return session;
}

/**
 * Get current usage for a user to calculate billing
 * NOTE: This function is dynamically imported to avoid circular dependencies
 */
export async function getCurrentUsage(userId: string) {
  try {
    // Import the UsageTrackingService to get actual usage data
    const { UsageTrackingService } = await import('./billing-service');
    const usage = await UsageTrackingService.getCurrentUsage(userId);

    return {
      licenses: usage.licenses,
      clusters: usage.clusters,
      additionalUsers: usage.additionalUsers,
      storageOverageGB: usage.storageOverageGB,
    };
  } catch (error) {
    console.error('❌ Error fetching current usage, returning empty usage:', error);
    // Return empty usage as fallback (no charges)
    return {
      licenses: [],
      clusters: [],
      additionalUsers: 0,
      storageOverageGB: 0,
    };
  }
}

/**
 * Create a billing preview for a user
 */
export async function createBillingPreview(userId: string) {
  const usage = await getCurrentUsage(userId);
  const billing = calculateFlexiblePricing({
    userId,
    ...usage,
  });

  return {
    lineItems: billing.lineItems,
    totalAmount: billing.totalAmount,
    summary: billing.summary,
    monthlyTotal: `$${(billing.totalAmount / 100).toFixed(2)}`,
  };
}
