#!/usr/bin/env node

/**
 * Billing System Test Script
 * 
 * This script helps test the billing system end-to-end
 * Usage: node test-billing-system.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3594';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const USER_TOKEN = process.env.USER_TOKEN || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

console.log('🧪 Billing System Test Script');
console.log('==============================\n');

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`📡 ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      return { success: true, data, status: response.status };
    } else {
      console.log(`❌ Error (${response.status}): ${data.error || 'Unknown error'}`);
      return { success: false, error: data.error, status: response.status };
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testStep(stepName, testFn) {
  console.log(`\n🔍 ${stepName}`);
  console.log('-'.repeat(50));
  
  try {
    const result = await testFn();
    if (result.success !== false) {
      console.log(`✅ ${stepName} - PASSED\n`);
      return true;
    } else {
      console.log(`❌ ${stepName} - FAILED\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${stepName} - ERROR: ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  let passed = 0;
  let total = 0;

  // Test 1: Setup billing system
  total++;
  if (await testStep('Step 1: Initialize Billing System', async () => {
    if (!ADMIN_TOKEN) {
      console.log('⚠️  ADMIN_TOKEN not set, skipping setup');
      return { success: true };
    }
    
    return await makeRequest('/api/billing/setup', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
  })) passed++;

  // Test 2: Check system status
  total++;
  if (await testStep('Step 2: Check System Status', async () => {
    if (!ADMIN_TOKEN) {
      console.log('⚠️  ADMIN_TOKEN not set, skipping status check');
      return { success: true };
    }
    
    const result = await makeRequest('/api/billing/setup', {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    
    if (result.success && result.data.system_ready) {
      console.log('📋 All billing tables are ready');
      console.log(`👥 Users: ${result.data.stats?.total_users || 0}`);
      console.log(`📊 Active periods: ${result.data.stats?.active_billing_periods || 0}`);
    }
    
    return result;
  })) passed++;

  // Test 3: Get current usage
  total++;
  if (await testStep('Step 3: Check Current Usage', async () => {
    if (!USER_TOKEN) {
      console.log('⚠️  USER_TOKEN not set, skipping usage check');
      return { success: true };
    }
    
    const result = await makeRequest('/api/billing/usage?include_estimate=true', {
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    });
    
    if (result.success) {
      const usage = result.data.usage;
      const cost = result.data.estimated_monthly_cost;
      
      console.log(`📄 Licenses: ${usage.licenses?.length || 0} types`);
      console.log(`🖥️  Clusters: ${usage.clusters?.length || 0} types`);
      console.log(`👥 Additional users: ${usage.additionalUsers || 0}`);
      console.log(`💰 Estimated cost: $${cost ? (cost.total_cents / 100).toFixed(2) : '0.00'}`);
    }
    
    return result;
  })) passed++;

  // Test 4: Get billing summary
  total++;
  if (await testStep('Step 4: Get Billing Summary', async () => {
    if (!USER_TOKEN) {
      console.log('⚠️  USER_TOKEN not set, skipping billing summary');
      return { success: true };
    }
    
    const result = await makeRequest('/api/billing/process-monthly', {
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    });
    
    if (result.success) {
      console.log(`📊 Current period: ${result.data.currentPeriod?.period_label || 'N/A'}`);
      console.log(`📋 Recent invoices: ${result.data.recentInvoices?.length || 0}`);
      console.log(`💸 Outstanding: $${(result.data.totalOutstanding || 0) / 100}`);
    }
    
    return result;
  })) passed++;

  // Test 5: List invoices
  total++;
  if (await testStep('Step 5: List User Invoices', async () => {
    if (!USER_TOKEN) {
      console.log('⚠️  USER_TOKEN not set, skipping invoice list');
      return { success: true };
    }
    
    const result = await makeRequest('/api/billing/invoices?limit=5', {
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` }
    });
    
    if (result.success) {
      const invoices = result.data.invoices || [];
      console.log(`📋 Found ${invoices.length} invoices`);
      
      invoices.forEach((inv, i) => {
        console.log(`  ${i + 1}. ${inv.invoice_number} - $${inv.total_dollars} (${inv.status})`);
      });
    }
    
    return result;
  })) passed++;

  // Test 6: Test automation endpoint
  total++;
  if (await testStep('Step 6: Test Automation Endpoint', async () => {
    if (!CRON_SECRET) {
      console.log('⚠️  CRON_SECRET not set, skipping automation test');
      return { success: true };
    }
    
    const result = await makeRequest('/api/billing/automated-billing', {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    
    if (result.success) {
      console.log(`✅ Processed: ${result.data.results?.processed || 0} users`);
      console.log(`📋 Generated: ${result.data.results?.invoices_generated || 0} invoices`);
      console.log(`💰 Total amount: $${(result.data.results?.total_amount_cents || 0) / 100}`);
    }
    
    return result;
  })) passed++;

  // Test 7: Check automation logs
  total++;
  if (await testStep('Step 7: Check Automation Logs', async () => {
    if (!CRON_SECRET) {
      console.log('⚠️  CRON_SECRET not set, skipping logs check');
      return { success: true };
    }
    
    const result = await makeRequest('/api/billing/automated-billing?limit=10', {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    
    if (result.success) {
      const logs = result.data.logs || [];
      const stats = result.data.stats || {};
      
      console.log(`📊 Last 24h total: ${stats.last_24h_total || 0} events`);
      console.log(`✅ Success: ${stats.last_24h_success || 0}`);
      console.log(`❌ Errors: ${stats.last_24h_errors || 0}`);
      console.log(`📋 Recent logs: ${logs.length} entries`);
    }
    
    return result;
  })) passed++;

  // Results
  console.log('\n🎯 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Your billing system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Set up Stripe webhooks (see STRIPE_WEBHOOK_SETUP_GUIDE.md)');
  console.log('2. Test payment processing with Stripe test cards');
  console.log('3. Verify webhook events are received');
  console.log('4. Test the billing dashboard UI');
  
  return { passed, total, success: passed === total };
}

// Environment check
console.log('🔧 Environment Check:');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🔑 Admin Token: ${ADMIN_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`👤 User Token: ${USER_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`⏰ Cron Secret: ${CRON_SECRET ? '✅ Set' : '❌ Not set'}`);

if (!ADMIN_TOKEN && !USER_TOKEN && !CRON_SECRET) {
  console.log('\n⚠️  No tokens set! Set environment variables to run full tests:');
  console.log('export ADMIN_TOKEN="your-admin-jwt-token"');
  console.log('export USER_TOKEN="your-user-jwt-token"');
  console.log('export CRON_SECRET="your-cron-secret"');
  console.log('\nRunning limited tests...\n');
}

// Run the tests
runTests().catch(console.error);


