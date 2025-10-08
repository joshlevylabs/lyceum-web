/**
 * Unified Resource-Based Pricing System
 * This replaces the inconsistent tier-based pricing with a consistent resource-based model
 */

export interface ClusterResources {
  node_count: number
  cpu_per_node: number
  memory_per_node: string  // e.g., "32GB"
  storage_per_node: string // e.g., "500GB"
}

export interface ResourcePricingRates {
  // Per hour rates
  cpu_per_hour: number      // $/vCPU/hour
  memory_per_hour: number   // $/GB/hour
  storage_per_month: number // $/GB/month (local NVMe storage)
  
  // Network and base costs
  cluster_base_fee: number  // Base cluster management fee per month
}

// Production pricing rates (adjust these based on your cloud provider costs)
export const PRICING_RATES: ResourcePricingRates = {
  cpu_per_hour: 0.05,        // $0.05/vCPU/hour
  memory_per_hour: 0.01,     // $0.01/GB/hour
  storage_per_month: 0.10,   // $0.10/GB/month for high-performance local NVMe
  cluster_base_fee: 10       // $10/month base management fee per cluster
}

/**
 * Calculate monthly cost based on cluster resources
 */
export function calculateResourceBasedCost(resources: ClusterResources): number {
  const hoursPerMonth = 24 * 30 // 720 hours
  
  // Parse memory and storage strings to numbers
  const memoryGB = parseInt(resources.memory_per_node.replace(/[^0-9]/g, '')) || 0
  const storageGB = parseInt(resources.storage_per_node.replace(/[^0-9]/g, '')) || 0
  
  // Calculate costs
  const cpuCost = resources.node_count * resources.cpu_per_node * PRICING_RATES.cpu_per_hour * hoursPerMonth
  const memoryCost = resources.node_count * memoryGB * PRICING_RATES.memory_per_hour * hoursPerMonth
  const storageCost = resources.node_count * storageGB * PRICING_RATES.storage_per_month
  const baseFee = PRICING_RATES.cluster_base_fee
  
  const totalCost = cpuCost + memoryCost + storageCost + baseFee
  
  return Math.round(totalCost * 100) / 100 // Round to 2 decimal places
}

/**
 * Get cost breakdown for display
 */
export function getCostBreakdown(resources: ClusterResources) {
  const hoursPerMonth = 24 * 30
  const memoryGB = parseInt(resources.memory_per_node.replace(/[^0-9]/g, '')) || 0
  const storageGB = parseInt(resources.storage_per_node.replace(/[^0-9]/g, '')) || 0
  
  const breakdown = {
    cpu: {
      units: resources.node_count * resources.cpu_per_node,
      rate: PRICING_RATES.cpu_per_hour,
      monthly_cost: resources.node_count * resources.cpu_per_node * PRICING_RATES.cpu_per_hour * hoursPerMonth,
      description: `${resources.node_count} nodes × ${resources.cpu_per_node} vCPU × $${PRICING_RATES.cpu_per_hour}/hour`
    },
    memory: {
      units: resources.node_count * memoryGB,
      rate: PRICING_RATES.memory_per_hour,
      monthly_cost: resources.node_count * memoryGB * PRICING_RATES.memory_per_hour * hoursPerMonth,
      description: `${resources.node_count} nodes × ${memoryGB}GB × $${PRICING_RATES.memory_per_hour}/hour`
    },
    storage: {
      units: resources.node_count * storageGB,
      rate: PRICING_RATES.storage_per_month,
      monthly_cost: resources.node_count * storageGB * PRICING_RATES.storage_per_month,
      description: `${resources.node_count} nodes × ${storageGB}GB × $${PRICING_RATES.storage_per_month}/month`
    },
    base_fee: {
      units: 1,
      rate: PRICING_RATES.cluster_base_fee,
      monthly_cost: PRICING_RATES.cluster_base_fee,
      description: 'Base cluster management and monitoring'
    }
  }
  
  const total = breakdown.cpu.monthly_cost + breakdown.memory.monthly_cost + 
               breakdown.storage.monthly_cost + breakdown.base_fee.monthly_cost
  
  return {
    ...breakdown,
    total: Math.round(total * 100) / 100
  }
}

/**
 * Convert cluster to simplified size category for compatibility
 */
export function getClusterSizeCategory(resources: ClusterResources): 'small' | 'medium' | 'large' {
  const totalCPU = resources.node_count * resources.cpu_per_node
  const memoryGB = parseInt(resources.memory_per_node.replace(/[^0-9]/g, '')) || 0
  const totalMemory = resources.node_count * memoryGB
  
  // Define size thresholds
  if (totalCPU <= 8 && totalMemory <= 32) return 'small'
  if (totalCPU <= 24 && totalMemory <= 128) return 'medium'
  return 'large'
}
