import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const results = []
    
    // Method 1: Create super admin user directly in admin_users table (bypassing user_profiles)
    try {
      const adminUser = {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'admin@lyceum.app',
        username: 'superadmin',
        full_name: 'Super Administrator',
        role: 'super_admin',
        permissions: [
          'user_management',
          'license_management', 
          'cluster_management',
          'system_admin',
          'full_access'
        ],
        is_active: true
      }
      
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .upsert([adminUser])
        .select()
      
      if (adminError) {
        results.push({
          step: 'Create admin in admin_users table',
          success: false,
          error: adminError.message,
          details: adminError
        })
      } else {
        results.push({
          step: 'Create admin in admin_users table',
          success: true,
          data: adminData,
          message: 'Super admin user created successfully'
        })
      }
      
    } catch (err) {
      results.push({
        step: 'Create admin in admin_users table',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Method 2: Create some sample license keys
    try {
      const sampleLicenses = [
        {
          id: 'l0000000-0000-0000-0000-000000000001',
          key_code: 'LYC-ENT-2024-SAMPLE01',
          license_type: 'enterprise',
          status: 'active',
          max_users: 100,
          max_projects: 1000,
          max_storage_gb: 500,
          features: ['analytics_studio', 'collaboration', 'api_access', 'priority_support', 'custom_branding'],
          expires_at: '2024-12-31T23:59:59Z',
          created_by: 'a0000000-0000-0000-0000-000000000001',
          usage_stats: {}
        },
        {
          id: 'l0000000-0000-0000-0000-000000000002',
          key_code: 'LYC-PRO-2024-SAMPLE02',
          license_type: 'professional',
          status: 'active',
          max_users: 25,
          max_projects: 100,
          max_storage_gb: 100,
          features: ['analytics_studio', 'collaboration', 'api_access'],
          expires_at: '2024-12-31T23:59:59Z',
          created_by: 'a0000000-0000-0000-0000-000000000001',
          usage_stats: {}
        }
      ]
      
      const { data: licenseData, error: licenseError } = await supabase
        .from('license_keys')
        .upsert(sampleLicenses)
        .select()
      
      if (licenseError) {
        results.push({
          step: 'Create sample license keys',
          success: false,
          error: licenseError.message,
          details: licenseError
        })
      } else {
        results.push({
          step: 'Create sample license keys',
          success: true,
          data: licenseData,
          message: `Created ${licenseData?.length || 0} sample license keys`
        })
      }
      
    } catch (err) {
      results.push({
        step: 'Create sample license keys',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Method 3: Create sample database cluster
    try {
      const sampleCluster = {
        id: 'c0000000-0000-0000-0000-000000000001',
        name: 'Production Primary',
        description: 'Main production database cluster',
        cluster_type: 'production',
        status: 'active',
        region: 'us-east-1',
        instance_size: 'large',
        max_connections: 500,
        storage_gb: 1000,
        backup_enabled: true,
        monitoring_enabled: true,
        assigned_users: [],
        configuration: {
          ssl_enabled: true,
          backup_schedule: 'daily',
          monitoring_interval: 300
        },
        metrics: {
          cpu_usage: 45,
          memory_usage: 52,
          storage_usage: 30,
          active_connections: 156,
          queries_per_second: 890
        },
        created_by: 'a0000000-0000-0000-0000-000000000001',
        last_health_check: new Date().toISOString()
      }
      
      const { data: clusterData, error: clusterError } = await supabase
        .from('database_clusters')
        .upsert([sampleCluster])
        .select()
      
      if (clusterError) {
        results.push({
          step: 'Create sample database cluster',
          success: false,
          error: clusterError.message,
          details: clusterError
        })
      } else {
        results.push({
          step: 'Create sample database cluster',
          success: true,
          data: clusterData,
          message: 'Sample database cluster created'
        })
      }
      
    } catch (err) {
      results.push({
        step: 'Create sample database cluster',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    // Method 4: Initialize platform metrics
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      
      const initialMetrics = {
        metric_date: today,
        total_users: 0,
        active_users: 0,
        new_signups: 0,
        total_projects: 0,
        total_sessions: 0,
        storage_used_gb: 0,
        license_utilization: {
          trial: 0,
          standard: 0,
          professional: 0,
          enterprise: 0
        },
        cluster_performance: {
          average_cpu: 0,
          average_memory: 0,
          total_queries: 0
        }
      }
      
      const { data: metricsData, error: metricsError } = await supabase
        .from('platform_metrics')
        .upsert([initialMetrics])
        .select()
      
      if (metricsError) {
        results.push({
          step: 'Initialize platform metrics',
          success: false,
          error: metricsError.message,
          details: metricsError
        })
      } else {
        results.push({
          step: 'Initialize platform metrics',
          success: true,
          data: metricsData,
          message: 'Platform metrics initialized'
        })
      }
      
    } catch (err) {
      results.push({
        step: 'Initialize platform metrics',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
    
    const successCount = results.filter(r => r.success).length
    const totalSteps = results.length
    const allSuccessful = successCount === totalSteps
    
    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful 
        ? 'Admin user and sample data created successfully!' 
        : 'Some steps failed - check results for details',
      results,
      summary: {
        successfulSteps: successCount,
        totalSteps,
        completionRate: Math.round((successCount / totalSteps) * 100)
      },
      adminUser: {
        email: 'admin@lyceum.app',
        username: 'superadmin',
        role: 'super_admin',
        id: 'a0000000-0000-0000-0000-000000000001'
      }
    }, { 
      status: allSuccessful ? 200 : 207 // 207 = Multi-Status (partial success)
    })
    
  } catch (error) {
    console.error('Admin user creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create admin user', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

