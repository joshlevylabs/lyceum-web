// API service for optimized clusters
const OPTIMIZED_CLUSTER_API = 'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves'

export interface OptimizedClusterTier {
  id: string
  name: string
  price: number
  curves: number
  storage: string
  features: string[]
  description: string
  popular?: boolean
  badge?: string
}

export const OPTIMIZED_TIERS: OptimizedClusterTier[] = [
  {
    id: 'micro',
    name: 'Micro',
    price: 10,
    curves: 100,
    storage: '1GB',
    description: 'Perfect for getting started and proof-of-concepts',
    badge: 'Best Value',
    features: [
      '100 curves/month',
      '1GB intelligent storage',
      'Serverless processing',
      'Basic analytics dashboard',
      'API access',
      'Community support'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    curves: 1000,
    storage: '10GB',
    description: 'Perfect for small teams and proof-of-concepts',
    features: [
      '1,000 curves/month',
      '10GB intelligent storage',
      'Priority processing',
      'Basic analytics dashboard',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional', 
    price: 149,
    curves: 10000,
    storage: '100GB',
    popular: true,
    description: 'Ideal for growing businesses with regular analytics needs',
    features: [
      '10,000 curves/month',
      '100GB intelligent storage',
      'Advanced analytics dashboard',
      'Automated batch processing',
      'Priority support (24h)',
      'Custom integrations'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 449,
    curves: 50000,
    storage: '1TB',
    description: 'Enterprise-grade for mission-critical analytics',
    features: [
      '50,000 curves/month',
      '1TB intelligent storage',
      'Real-time processing',
      'Custom batch schedules',
      'Dedicated support manager',
      '99.9% SLA guarantee',
      'Custom features'
    ]
  }
]

export class OptimizedClusterService {
  static async processCurves(customerId: string, curveCount: number): Promise<any> {
    const response = await fetch(OPTIMIZED_CLUSTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        curveCount
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }
  
  static async createOptimizedCluster(config: {
    name: string
    description: string
    tier: string
    customerId: string
  }): Promise<any> {
    // In a real implementation, this would create the cluster record in your database
    // For now, we'll simulate the creation and test the processing
    
    const tierConfig = OPTIMIZED_TIERS.find(t => t.id === config.tier)
    if (!tierConfig) {
      throw new Error('Invalid tier selected')
    }
    
    // Test the serverless function with a small batch
    const testResult = await this.processCurves(config.customerId, 1)
    
    // Return cluster configuration
    return {
      id: `opt-${Date.now()}`,
      name: config.name,
      description: config.description,
      cluster_type: 'analytics',
      status: 'active',
      region: 'us-central1',
      tier: config.tier,
      pricing_model: 'optimized',
      estimated_monthly_cost: tierConfig.price,
      optimized_config: {
        monthly_curves: tierConfig.curves,
        storage_limit: tierConfig.storage,
        processing_endpoint: OPTIMIZED_CLUSTER_API,
        tier_features: tierConfig.features
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      health_status: 'healthy',
      test_result: testResult
    }
  }
  
  static calculateSavings(price: number): string {
    const traditionalCost = 2000 // Traditional always-on cluster cost
    const savings = ((traditionalCost - price) / traditionalCost * 100).toFixed(0)
    return savings
  }
}



