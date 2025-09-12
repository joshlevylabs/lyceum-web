import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const results = []
    
    // Step 1: Create plugins table
    try {
      const pluginsTableSQL = `
        CREATE TABLE IF NOT EXISTS license_plugins (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          plugin_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL DEFAULT 'measurement' CHECK (category IN ('measurement', 'analysis', 'integration', 'visualization', 'other')),
          version TEXT DEFAULT '1.0.0',
          vendor TEXT,
          price_tier TEXT DEFAULT 'standard' CHECK (price_tier IN ('free', 'standard', 'premium', 'enterprise')),
          requires_plugins TEXT[] DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          configuration_schema JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
      
      const { data, error } = await supabase
        .from('license_plugins')
        .select('count', { count: 'exact', head: true })
      
      if (error && error.message.includes('does not exist')) {
        // Table doesn't exist, try to create it using direct insertion method
        const createResult = await fetch('/api/admin/create-table-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tableName: 'license_plugins',
            sql: pluginsTableSQL 
          })
        })
        
        if (createResult.ok) {
          results.push({
            step: 'Create license_plugins table',
            success: true,
            message: 'Table created successfully'
          })
        } else {
          results.push({
            step: 'Create license_plugins table',
            success: false,
            error: 'Failed to create table via direct method'
          })
        }
      } else {
        results.push({
          step: 'Create license_plugins table',
          success: true,
          message: 'Table already exists'
        })
      }
    } catch (err) {
      results.push({
        step: 'Create license_plugins table',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }

    // Step 2: Add new columns to license_keys table
    try {
      const addColumnsSQL = `
        -- Add time-based licensing columns
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS time_limit_type TEXT DEFAULT 'unlimited' CHECK (time_limit_type IN ('trial_30', 'trial_custom', 'unlimited', 'fixed_period'));
        
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS custom_trial_days INTEGER;
        
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS trial_extended_by UUID REFERENCES admin_users(id);
        
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS trial_extension_reason TEXT;
        
        -- Add plugin-based licensing columns
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS enabled_plugins TEXT[] DEFAULT '{}';
        
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS plugin_permissions JSONB DEFAULT '{}';
        
        -- Add user access type columns
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS allowed_user_types TEXT[] DEFAULT '{"engineer", "operator"}';
        
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('basic', 'standard', 'advanced', 'full'));
        
        -- Add configuration and restrictions
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS restrictions JSONB DEFAULT '{}';
        
        ALTER TABLE license_keys 
        ADD COLUMN IF NOT EXISTS license_config JSONB DEFAULT '{}';
      `
      
      // Try to add columns by direct method since RPC might not work
      const alterResult = await fetch('/api/admin/execute-sql-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: addColumnsSQL })
      })
      
      if (alterResult.ok) {
        results.push({
          step: 'Add new license columns',
          success: true,
          message: 'License schema updated successfully'
        })
      } else {
        results.push({
          step: 'Add new license columns',  
          success: false,
          error: 'Failed to update license schema'
        })
      }
    } catch (err) {
      results.push({
        step: 'Add new license columns',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }

    // Step 3: Insert default plugins
    try {
      const defaultPlugins = [
        {
          plugin_id: 'klippel_qc',
          name: 'Klippel QC',
          description: 'Quality Control measurements and analysis for loudspeakers',
          category: 'measurement',
          vendor: 'Klippel',
          price_tier: 'premium',
          configuration_schema: {
            max_measurements: { type: 'number', default: 1000 },
            export_formats: { type: 'array', default: ['pdf', 'csv'] }
          }
        },
        {
          plugin_id: 'apx500',
          name: 'APx500 Integration',
          description: 'Audio Precision APx500 measurement system integration',
          category: 'measurement',
          vendor: 'Audio Precision',
          price_tier: 'enterprise',
          configuration_schema: {
            max_channels: { type: 'number', default: 8 },
            sample_rates: { type: 'array', default: [48000, 96000, 192000] }
          }
        },
        {
          plugin_id: 'advanced_analytics',
          name: 'Advanced Analytics',
          description: 'Machine learning and predictive analytics tools',
          category: 'analysis',
          vendor: 'Lyceum',
          price_tier: 'premium',
          configuration_schema: {
            ml_models: { type: 'number', default: 5 },
            batch_processing: { type: 'boolean', default: true }
          }
        },
        {
          plugin_id: 'data_export',
          name: 'Data Export Plus',
          description: 'Enhanced data export with custom formats',
          category: 'integration',
          vendor: 'Lyceum',
          price_tier: 'standard',
          configuration_schema: {
            export_formats: { type: 'array', default: ['xlsx', 'csv', 'json', 'xml'] },
            auto_backup: { type: 'boolean', default: false }
          }
        },
        {
          plugin_id: 'real_time_collaboration',
          name: 'Real-time Collaboration',
          description: 'Enhanced team collaboration features',
          category: 'other',
          vendor: 'Lyceum',
          price_tier: 'standard',
          configuration_schema: {
            max_collaborators: { type: 'number', default: 10 },
            live_chat: { type: 'boolean', default: true }
          }
        },
        {
          plugin_id: 'custom_dashboards',
          name: 'Custom Dashboards',
          description: 'Create custom visualization dashboards',
          category: 'visualization',
          vendor: 'Lyceum',
          price_tier: 'premium',
          configuration_schema: {
            max_dashboards: { type: 'number', default: 20 },
            custom_widgets: { type: 'boolean', default: true }
          }
        }
      ]
      
      const { data: pluginData, error: pluginError } = await supabase
        .from('license_plugins')
        .upsert(defaultPlugins, { onConflict: 'plugin_id' })
        .select()
      
      if (pluginError) {
        results.push({
          step: 'Insert default plugins',
          success: false,
          error: pluginError.message
        })
      } else {
        results.push({
          step: 'Insert default plugins',
          success: true,
          message: `Inserted ${defaultPlugins.length} default plugins`,
          data: pluginData
        })
      }
    } catch (err) {
      results.push({
        step: 'Insert default plugins',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }

    // Step 4: Update existing license keys with new fields
    try {
      const { data: existingLicenses, error: fetchError } = await supabase
        .from('license_keys')
        .select('id, license_type')
      
      if (!fetchError && existingLicenses) {
        for (const license of existingLicenses) {
          const updateData: any = {
            time_limit_type: license.license_type === 'trial' ? 'trial_30' : 'unlimited',
            enabled_plugins: license.license_type === 'enterprise' 
              ? ['klippel_qc', 'apx500', 'advanced_analytics', 'data_export', 'real_time_collaboration', 'custom_dashboards']
              : license.license_type === 'professional'
              ? ['advanced_analytics', 'data_export', 'real_time_collaboration', 'custom_dashboards']
              : license.license_type === 'standard'
              ? ['data_export', 'real_time_collaboration'] 
              : [],
            allowed_user_types: ['engineer', 'operator', 'analyst'],
            access_level: license.license_type === 'enterprise' ? 'full' : 
                         license.license_type === 'professional' ? 'advanced' :
                         license.license_type === 'standard' ? 'standard' : 'basic'
          }
          
          await supabase
            .from('license_keys')
            .update(updateData)
            .eq('id', license.id)
        }
        
        results.push({
          step: 'Update existing licenses',
          success: true,
          message: `Updated ${existingLicenses.length} existing licenses`
        })
      }
    } catch (err) {
      results.push({
        step: 'Update existing licenses',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }

    const successCount = results.filter(r => r.success).length
    const totalSteps = results.length
    
    return NextResponse.json({
      success: successCount === totalSteps,
      message: successCount === totalSteps 
        ? 'License schema updated successfully!' 
        : 'Some steps failed during schema update',
      results,
      summary: {
        successfulSteps: successCount,
        totalSteps,
        completionRate: Math.round((successCount / totalSteps) * 100)
      }
    })
    
  } catch (error) {
    console.error('License schema update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update license schema', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

