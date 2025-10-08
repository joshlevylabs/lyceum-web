/**
 * Phase 3 E2E Testing - Quick Test Runner
 * 
 * Purpose: Automated testing helper for Phase 3 E2E tests
 * Usage: node phase3-quick-test-runner.js
 * 
 * This script helps validate API integrations and data flows
 * for end-to-end testing scenarios.
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3594',
  apiPath: '/api/centcom',
  testLicenseKey: 'PLUGIN-ENT-2025-HQ21CIBF',
  testUserId: '2c3d4747-8d67-45af-90f5-b5e9058ec246',
  authToken: '', // Set this from browser localStorage
  machineFingerprint: 'phase3-test-' + Date.now()
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null, authRequired = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.baseUrl + CONFIG.apiPath + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authRequired) {
      if (!CONFIG.authToken) {
        reject(new Error('AUTH_TOKEN_REQUIRED: Set CONFIG.authToken first!'));
        return;
      }
      options.headers['Authorization'] = `Bearer ${CONFIG.authToken}`;
    }

    const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test Results Tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  results.total++;
  if (passed) results.passed++;
  else results.failed++;
  
  results.tests.push({ name, passed, details });
  
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) log(`   ${details}`, 'gray');
}

// === TEST SCENARIOS ===

async function testScenario1_LicenseVerification() {
  log('\n━━━ Scenario 1: License Verification ━━━', 'cyan');
  
  try {
    const { status, data } = await makeRequest('POST', '/license/verify', {
      license_key: CONFIG.testLicenseKey,
      machine_fingerprint: CONFIG.machineFingerprint
    });

    recordTest('License verification API responds', status === 200, `Status: ${status}`);
    recordTest('License validation succeeds', data.success === true);
    recordTest('License type correct', data.license?.type === 'enterprise');
    recordTest('Local cluster allowed', data.license?.allows_local_cluster === true);
    recordTest('Limits included', data.license?.limits !== undefined);
    recordTest('Usage data included', data.usage !== undefined);
  } catch (error) {
    recordTest('License verification', false, error.message);
  }
}

async function testScenario2_ClusterDiscovery() {
  log('\n━━━ Scenario 2: Cluster Discovery ━━━', 'cyan');
  
  if (!CONFIG.authToken) {
    log('⚠️  Skipping: AUTH_TOKEN required. Set CONFIG.authToken first.', 'yellow');
    results.warnings++;
    return;
  }

  try {
    const { status, data } = await makeRequest('GET', '/clusters/discover', null, true);

    recordTest('Cluster discovery API responds', status === 200, `Status: ${status}`);
    recordTest('Cluster discovery succeeds', data.success === true);
    recordTest('Clusters array present', Array.isArray(data.clusters));
    recordTest('At least 1 cluster found', data.clusters?.length > 0, `Found: ${data.clusters?.length || 0}`);
    
    if (data.clusters?.length > 0) {
      const cluster = data.clusters[0];
      recordTest('Cluster has ID', cluster.id !== undefined);
      recordTest('Cluster has name', cluster.name !== undefined);
      recordTest('Cluster has connection info', cluster.connection_info !== undefined);
    }
  } catch (error) {
    recordTest('Cluster discovery', false, error.message);
  }
}

async function testScenario3_UsageSync() {
  log('\n━━━ Scenario 3: Usage Sync ━━━', 'cyan');
  
  if (!CONFIG.authToken) {
    log('⚠️  Skipping: AUTH_TOKEN required. Set CONFIG.authToken first.', 'yellow');
    results.warnings++;
    return;
  }

  try {
    const { status, data } = await makeRequest('POST', '/usage/sync', {
      machine_fingerprint: CONFIG.machineFingerprint,
      storage_used_gb: 5.0,
      queries_this_month: 25000,
      clickhouse_version: '24.1.0',
      machine_info: {
        os: 'Test OS',
        memory_gb: 16,
        cpu_cores: 8
      }
    }, true);

    recordTest('Usage sync API responds', status === 200, `Status: ${status}`);
    recordTest('Usage sync succeeds', data.success === true);
    recordTest('Usage limits returned', data.usage !== undefined);
    recordTest('Percentage calculated', data.usage?.percentage_used !== undefined);
    recordTest('Throttle status included', data.should_throttle !== undefined);
  } catch (error) {
    recordTest('Usage sync', false, error.message);
  }
}

async function testScenario4_ConnectionTracking() {
  log('\n━━━ Scenario 4: Connection Tracking ━━━', 'cyan');
  
  if (!CONFIG.authToken) {
    log('⚠️  Skipping: AUTH_TOKEN required. Set CONFIG.authToken first.', 'yellow');
    results.warnings++;
    return;
  }

  // First discover clusters to get a cluster ID
  try {
    const { data: discoveryData } = await makeRequest('GET', '/clusters/discover', null, true);
    
    if (!discoveryData.clusters || discoveryData.clusters.length === 0) {
      log('⚠️  No clusters found for connection tracking test', 'yellow');
      results.warnings++;
      return;
    }

    const clusterId = discoveryData.clusters[0].id;

    const { status, data } = await makeRequest('POST', '/connection/track', {
      cluster_id: clusterId,
      connection_type: 'cloud',
      connection_name: 'Phase 3 Test Connection',
      event_type: 'connect',
      set_as_default: false
    }, true);

    recordTest('Connection tracking API responds', status === 200, `Status: ${status}`);
    recordTest('Connection tracking succeeds', data.success === true);
    recordTest('Connection record created', data.connection?.id !== undefined);
    recordTest('Connection details correct', data.connection?.cluster_id === clusterId);
  } catch (error) {
    recordTest('Connection tracking', false, error.message);
  }
}

async function testDataIntegrity() {
  log('\n━━━ Data Integrity Checks ━━━', 'cyan');
  
  // Multiple rapid requests to test race conditions
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest('POST', '/license/verify', {
        license_key: CONFIG.testLicenseKey,
        machine_fingerprint: `rapid-test-${i}-${Date.now()}`
      }));
    }

    const responses = await Promise.all(promises);
    const allSuccessful = responses.every(r => r.status === 200);
    
    recordTest('Handles concurrent requests', allSuccessful, `${responses.filter(r => r.status === 200).length}/5 succeeded`);
  } catch (error) {
    recordTest('Concurrent request handling', false, error.message);
  }
}

async function testErrorHandling() {
  log('\n━━━ Error Handling ━━━', 'cyan');
  
  // Test invalid license
  try {
    const { status, data } = await makeRequest('POST', '/license/verify', {
      license_key: 'INVALID-LICENSE-KEY',
      machine_fingerprint: CONFIG.machineFingerprint
    });

    recordTest('Invalid license handled', status === 404 || status === 400, `Status: ${status}`);
    recordTest('Error message present', data.error !== undefined);
  } catch (error) {
    recordTest('Invalid license error handling', false, error.message);
  }

  // Test missing parameters
  try {
    const { status, data } = await makeRequest('POST', '/license/verify', {});

    recordTest('Missing parameters handled', status === 400, `Status: ${status}`);
    recordTest('Validation error message', data.error !== undefined);
  } catch (error) {
    recordTest('Missing parameters handling', false, error.message);
  }
}

function printSummary() {
  log('\n' + '='.repeat(60), 'cyan');
  log('PHASE 3 TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\nTotal Tests: ${results.total}`);
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Warnings: ${results.warnings}`, 'yellow');
  
  const successRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');
  
  if (results.failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.tests.filter(t => !t.passed).forEach(t => {
      log(`   • ${t.name}`, 'red');
      if (t.details) log(`     ${t.details}`, 'gray');
    });
  }

  if (results.warnings > 0) {
    log('\n⚠️  Set AUTH_TOKEN to run authenticated tests:', 'yellow');
    log(`   CONFIG.authToken = 'your-jwt-token-here'`, 'gray');
  }

  log('\n' + '='.repeat(60), 'cyan');
  
  if (results.failed === 0 && results.warnings === 0) {
    log('🎉 ALL TESTS PASSED! Ready for Phase 3 E2E testing!', 'green');
  } else if (results.failed === 0) {
    log('✅ Core tests passed! Set AUTH_TOKEN for full validation.', 'yellow');
  } else {
    log('❌ Some tests failed. Review errors above.', 'red');
  }
}

// === MAIN EXECUTION ===

async function runAllTests() {
  log('\n🚀 Phase 3 E2E Testing - Quick Test Runner', 'cyan');
  log('Testing Lyceum APIs for CentCom integration\n', 'gray');
  
  log(`Configuration:`, 'blue');
  log(`  Base URL: ${CONFIG.baseUrl}`, 'gray');
  log(`  Test License: ${CONFIG.testLicenseKey}`, 'gray');
  log(`  Auth Token: ${CONFIG.authToken ? '✅ Set' : '❌ Not set'}`, CONFIG.authToken ? 'green' : 'yellow');
  
  // Run test scenarios
  await testScenario1_LicenseVerification();
  await testScenario2_ClusterDiscovery();
  await testScenario3_UsageSync();
  await testScenario4_ConnectionTracking();
  await testDataIntegrity();
  await testErrorHandling();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Check for auth token in arguments
if (process.argv[2]) {
  CONFIG.authToken = process.argv[2];
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});




