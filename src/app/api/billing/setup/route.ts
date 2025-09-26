import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Setup billing system database tables and initial data
 * POST /api/billing/setup
 * 
 * This endpoint initializes the billing system by:
 * 1. Creating database tables
 * 2. Setting up initial billing periods for existing users
 * 3. Migrating any existing payment data
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Billing setup - Starting initialization');
    
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    // Admin only
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const results = {
      tablesCreated: false,
      billingPeriodsCreated: 0,
      usersProcessed: 0,
      errors: []
    };

    try {
      // Step 1: Create database tables
      console.log('📋 Creating billing database tables...');
      
      // Read and execute the SQL setup file
      const sqlPath = join(process.cwd(), 'database-setup-monthly-billing.sql');
      const setupSQL = readFileSync(sqlPath, 'utf8');
      
      // Split SQL into individual statements and execute
      const statements = setupSQL.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await dbOperations.supabaseAdmin.rpc('execute_sql', { 
            sql_statement: statement.trim() + ';' 
          });
          
          if (error && !error.message.includes('already exists')) {
            console.error('❌ SQL Error:', error);
            results.errors.push(`SQL Error: ${error.message}`);
          }
        }
      }
      
      results.tablesCreated = true;
      console.log('✅ Database tables created successfully');

    } catch (error: any) {
      console.error('❌ Error creating tables:', error);
      results.errors.push(`Table creation error: ${error.message}`);
    }

    try {
      // Step 2: Initialize billing periods for existing users
      console.log('👥 Initializing billing periods for existing users...');
      
      const { data: users, error: usersError } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('id, email, created_at')
        .eq('is_active', true);

      if (usersError) {
        throw new Error(`Failed to get users: ${usersError.message}`);
      }

      if (users && users.length > 0) {
        const { BillingPeriodService } = await import('@/lib/billing-service');
        
        for (const user of users) {
          try {
            // Check if user already has a billing period
            const { data: existingPeriod } = await dbOperations.supabaseAdmin
              .from('billing_periods')
              .select('id')
              .eq('user_id', user.id)
              .limit(1)
              .single();

            if (!existingPeriod) {
              // Create billing period starting from user creation date or now
              const startDate = new Date(Math.max(
                new Date(user.created_at).getTime(),
                Date.now() - (30 * 24 * 60 * 60 * 1000) // Max 30 days ago
              ));
              
              await BillingPeriodService.createBillingPeriod(user.id, startDate);
              results.billingPeriodsCreated++;
              console.log(`✅ Created billing period for ${user.email}`);
            }

            results.usersProcessed++;

          } catch (error: any) {
            console.error(`❌ Error processing user ${user.email}:`, error);
            results.errors.push(`User ${user.email}: ${error.message}`);
          }
        }
      }

    } catch (error: any) {
      console.error('❌ Error initializing billing periods:', error);
      results.errors.push(`Billing period initialization error: ${error.message}`);
    }

    try {
      // Step 3: Log setup completion
      await dbOperations.supabaseAdmin
        .from('billing_automation_log')
        .insert({
          event_type: 'billing_system_setup',
          event_status: results.errors.length > 0 ? 'warning' : 'success',
          trigger_type: 'manual',
          processor: `admin_${user.id}`,
          event_data: results,
          error_message: results.errors.length > 0 ? results.errors.join('; ') : null
        });

    } catch (error) {
      console.error('❌ Error logging setup event:', error);
    }

    console.log('🎉 Billing setup completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Billing system setup completed',
      data: results
    });

  } catch (error: any) {
    console.error('🔧 Billing setup - Fatal error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Billing setup failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get billing system status and health check
 * GET /api/billing/setup
 */
export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success || !user) {
      return response;
    }

    // Admin only
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('🔍 Checking billing system status...');

    const status = {
      tables: {
        billing_periods: false,
        invoices: false,
        invoice_line_items: false,
        billing_usage_snapshots: false,
        billing_automation_log: false
      },
      stats: {
        total_users: 0,
        users_with_billing_periods: 0,
        total_invoices: 0,
        total_revenue_cents: 0,
        active_billing_periods: 0
      },
      recent_activity: []
    };

    // Check table existence
    const tableNames = Object.keys(status.tables);
    for (const tableName of tableNames) {
      try {
        const { error } = await dbOperations.supabaseAdmin
          .from(tableName)
          .select('id')
          .limit(1)
          .single();
        
        status.tables[tableName as keyof typeof status.tables] = error?.code !== 'PGRST205'; // Table not found
      } catch (error) {
        status.tables[tableName as keyof typeof status.tables] = false;
      }
    }

    // Get statistics
    try {
      // Total users
      const { count: userCount } = await dbOperations.supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      status.stats.total_users = userCount || 0;

      // Users with billing periods
      const { count: billingUserCount } = await dbOperations.supabaseAdmin
        .from('billing_periods')
        .select('user_id', { count: 'exact', head: true });
      status.stats.users_with_billing_periods = billingUserCount || 0;

      // Total invoices
      const { count: invoiceCount } = await dbOperations.supabaseAdmin
        .from('invoices')
        .select('*', { count: 'exact', head: true });
      status.stats.total_invoices = invoiceCount || 0;

      // Total revenue
      const { data: revenueData } = await dbOperations.supabaseAdmin
        .from('invoices')
        .select('total_cents')
        .eq('status', 'paid');
      
      status.stats.total_revenue_cents = revenueData?.reduce((sum, inv) => sum + inv.total_cents, 0) || 0;

      // Active billing periods
      const { count: activePeriodsCount } = await dbOperations.supabaseAdmin
        .from('billing_periods')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      status.stats.active_billing_periods = activePeriodsCount || 0;

      // Recent activity
      const { data: recentActivity } = await dbOperations.supabaseAdmin
        .from('billing_automation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      status.recent_activity = recentActivity || [];

    } catch (error) {
      console.error('❌ Error getting billing statistics:', error);
    }

    return NextResponse.json({
      success: true,
      data: status,
      system_ready: Object.values(status.tables).every(exists => exists)
    });

  } catch (error: any) {
    console.error('🔍 Billing status check - Error:', error);
    return NextResponse.json(
      { error: 'Failed to check billing status', details: error.message },
      { status: 500 }
    );
  }
}


