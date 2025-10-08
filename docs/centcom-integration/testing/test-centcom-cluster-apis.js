/**
 * Test Script for CentCom Cluster Management APIs
 * Tests all 4 endpoints: license/verify, clusters/discover, usage/sync, connection/track
 */

const BASE_URL = 'http://localhost:3594/api/centcom'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function logTest(testName) {
  log(`\n🧪 TEST: ${testName}`, 'blue')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

// Test configuration
const TEST_CONFIG = {
  // Replace these with actual values from your database
  licenseKey: 'PLUGIN-ENT-2025-HQ21CIBF', // from license_keys.key_code
  machineFingerprint: 'test-machine-' + Date.now(),
  authToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6Iit2VzVWTU5OTjY4MnN0OTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tmZmlhcXNpaGxkZ3Fkd2Fnb29rLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyYzNkNDc0Ny04ZDY3LTQ1YWYtOTBmNS1iNWU5MDU4ZWMyNDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU5MzgyNTcwLCJpYXQiOjE3NTkzNzg5NzAsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJUaGUgTHljZXVtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ikpvc2h1YSBMZXZ5IiwiaW52aXRlZF9ieV9hZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwidXNlcl9uYW1lIjoibHljZXVtLWFkbWluIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTkzNzg5NzB9XSwic2Vzc2lvbl9pZCI6IjQ4OGFmYWNiLTY3Y2MtNDVjOC05NGEyLTE4MDcxNDI5YTNkMSIsImlzX2Fub255bW91cyI6ZmFsc2V9.qM8RJwulAGBLLoZ2kFhSguyP5oQFhhiGwCQLL5L7a2k', // Fresh token from josh@thelyceum.io
  testUserId: '2c3d4747-8d67-45af-90f5-b5e9058ec246' // Josh's user ID
}

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0
}

/**
 * Test 1: License Verification (No Auth Required)
 */
async function testLicenseVerification() {
  logSection('TEST 1: License Verification')
  testResults.total++
  
  logTest('POST /api/centcom/license/verify')
  
  try {
    const response = await fetch(`${BASE_URL}/license/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: TEST_CONFIG.licenseKey,
        machine_fingerprint: TEST_CONFIG.machineFingerprint
      })
    })
    
    const data = await response.json()
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red')
    log(`Response: ${JSON.stringify(data, null, 2)}`)
    
    if (response.ok && data.success) {
      logSuccess('License verification successful')
      
      // Validate response structure
      if (data.license && data.license.type && data.license.limits) {
        logSuccess('Response structure is valid')
        log(`  License Type: ${data.license.type}`)
        log(`  Allows Local Cluster: ${data.license.allows_local_cluster}`)
        log(`  Storage Limit: ${data.license.limits.max_storage_gb} GB`)
        log(`  Query Limit: ${data.license.limits.max_monthly_queries}`)
        log(`  Offline Grace: ${data.license.limits.offline_grace_days} days`)
        testResults.passed++
      } else {
        logWarning('Response structure incomplete')
        testResults.warnings++
      }
    } else {
      logError(`License verification failed: ${data.error || 'Unknown error'}`)
      testResults.failed++
      
      if (data.error?.includes('Invalid or inactive license')) {
        logWarning('Make sure TEST_CONFIG.licenseKey is a valid key_code from your license_keys table')
      }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    testResults.failed++
  }
}

/**
 * Test 2: Cluster Discovery (Auth Required)
 */
async function testClusterDiscovery() {
  logSection('TEST 2: Cluster Discovery')
  testResults.total++
  
  logTest('GET /api/centcom/clusters/discover')
  
  if (!TEST_CONFIG.authToken || TEST_CONFIG.authToken === 'YOUR_SUPABASE_JWT_TOKEN') {
    logWarning('Skipping - No auth token provided')
    logWarning('To test: Set TEST_CONFIG.authToken to a valid Supabase JWT')
    testResults.warnings++
    return
  }
  
  try {
    const response = await fetch(`${BASE_URL}/clusters/discover`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red')
    log(`Response: ${JSON.stringify(data, null, 2)}`)
    
    if (response.ok && data.success) {
      logSuccess('Cluster discovery successful')
      log(`  Total Clusters Found: ${data.total}`)
      
      if (data.clusters && Array.isArray(data.clusters)) {
        data.clusters.forEach((cluster, index) => {
          log(`  Cluster ${index + 1}:`)
          log(`    - Name: ${cluster.name}`)
          log(`    - Type: ${cluster.type}`)
          log(`    - Architecture: ${cluster.architecture}`)
          log(`    - Classification: ${cluster.classification}`)
          log(`    - Region: ${cluster.region}`)
          log(`    - Is Default: ${cluster.is_default}`)
        })
        testResults.passed++
      } else {
        logWarning('No clusters returned (may be expected if user has no clusters)')
        testResults.warnings++
      }
    } else {
      logError(`Cluster discovery failed: ${data.error || 'Unknown error'}`)
      testResults.failed++
      
      if (response.status === 401) {
        logWarning('Auth token may be invalid or expired')
      }
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    testResults.failed++
  }
}

/**
 * Test 3: Usage Sync (Auth Required)
 */
async function testUsageSync() {
  logSection('TEST 3: Usage Sync')
  testResults.total++
  
  logTest('POST /api/centcom/usage/sync')
  
  if (!TEST_CONFIG.authToken || TEST_CONFIG.authToken === 'YOUR_SUPABASE_JWT_TOKEN') {
    logWarning('Skipping - No auth token provided')
    testResults.warnings++
    return
  }
  
  try {
    const response = await fetch(`${BASE_URL}/usage/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        machine_fingerprint: TEST_CONFIG.machineFingerprint,
        storage_used_gb: 2.5,
        queries_this_month: 15000,
        clickhouse_version: '23.8.2.7',
        machine_info: {
          os: 'Windows 10',
          memory_gb: 16,
          cpu_cores: 8
        }
      })
    })
    
    const data = await response.json()
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red')
    log(`Response: ${JSON.stringify(data, null, 2)}`)
    
    if (response.ok && data.success) {
      logSuccess('Usage sync successful')
      
      if (data.usage) {
        log(`  Storage Used: ${data.usage.storage_used_gb} GB / ${data.usage.storage_limit_gb} GB`)
        log(`  Storage %: ${data.usage.percentage_used?.storage?.toFixed(2)}%`)
        log(`  Queries Used: ${data.usage.queries_this_month} / ${data.usage.query_limit}`)
        log(`  Queries %: ${data.usage.percentage_used?.queries?.toFixed(2)}%`)
        log(`  Should Throttle: ${data.should_throttle}`)
        
        if (data.warnings && data.warnings.length > 0) {
          logWarning(`Warnings: ${data.warnings.length}`)
          data.warnings.forEach(w => log(`    - ${w.message}`, 'yellow'))
        }
        
        testResults.passed++
      } else {
        logWarning('Usage data not returned')
        testResults.warnings++
      }
    } else {
      logError(`Usage sync failed: ${data.error || 'Unknown error'}`)
      testResults.failed++
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    testResults.failed++
  }
}

/**
 * Test 4: Connection Tracking (Auth Required)
 */
async function testConnectionTracking() {
  logSection('TEST 4: Connection Tracking')
  testResults.total++
  
  logTest('POST /api/centcom/connection/track')
  
  if (!TEST_CONFIG.authToken || TEST_CONFIG.authToken === 'YOUR_SUPABASE_JWT_TOKEN') {
    logWarning('Skipping - No auth token provided')
    testResults.warnings++
    return
  }
  
  // First, we need a cluster ID - try to get one from discovery
  let testClusterId = null
  
  try {
    const discoveryResponse = await fetch(`${BASE_URL}/clusters/discover`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    const discoveryData = await discoveryResponse.json()
    
    if (discoveryData.success && discoveryData.clusters && discoveryData.clusters.length > 0) {
      testClusterId = discoveryData.clusters[0].id
      log(`Using cluster ID from discovery: ${testClusterId}`)
    } else {
      logWarning('No clusters found - cannot test connection tracking')
      logWarning('Create a test cluster and assign it to the test user first')
      testResults.warnings++
      return
    }
  } catch (error) {
    logWarning(`Could not fetch clusters: ${error.message}`)
    testResults.warnings++
    return
  }
  
  try {
    const response = await fetch(`${BASE_URL}/connection/track`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cluster_id: testClusterId,
        connection_type: 'cloud',
        connection_name: 'Test Connection'
      })
    })
    
    const data = await response.json()
    
    log(`Status: ${response.status}`, response.ok ? 'green' : 'red')
    log(`Response: ${JSON.stringify(data, null, 2)}`)
    
    if (response.ok && data.success) {
      logSuccess('Connection tracking successful')
      
      if (data.connection) {
        log(`  Connection ID: ${data.connection.id}`)
        log(`  Cluster ID: ${data.connection.cluster_id}`)
        log(`  Connection Type: ${data.connection.connection_type}`)
        log(`  Is Default: ${data.connection.is_default}`)
        log(`  Last Connected: ${data.connection.last_connected_at}`)
        testResults.passed++
      } else {
        logWarning('Connection data not returned')
        testResults.warnings++
      }
    } else {
      logError(`Connection tracking failed: ${data.error || 'Unknown error'}`)
      testResults.failed++
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    testResults.failed++
  }
}

/**
 * Print test summary
 */
function printSummary() {
  logSection('TEST SUMMARY')
  
  log(`Total Tests: ${testResults.total}`)
  log(`Passed: ${testResults.passed}`, 'green')
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'reset')
  log(`Warnings: ${testResults.warnings}`, testResults.warnings > 0 ? 'yellow' : 'reset')
  
  const successRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(1)
    : 0
  
  log(`\nSuccess Rate: ${successRate}%`, successRate > 75 ? 'green' : 'yellow')
  
  if (testResults.failed === 0 && testResults.passed > 0) {
    log('\n🎉 All tests passed!', 'green')
  } else if (testResults.warnings > 0) {
    log('\n⚠️  Some tests skipped or have warnings', 'yellow')
    log('Review the output above for details', 'yellow')
  } else {
    log('\n❌ Some tests failed', 'red')
    log('Review the output above for details', 'red')
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n🚀 Starting CentCom Cluster API Tests...', 'cyan')
  log(`Base URL: ${BASE_URL}\n`)
  
  // Configuration check
  logSection('CONFIGURATION CHECK')
  log(`License Key: ${TEST_CONFIG.licenseKey === 'YOUR_TEST_LICENSE_KEY_CODE' ? '❌ NOT SET' : '✅ Set'}`)
  log(`Auth Token: ${TEST_CONFIG.authToken === 'YOUR_SUPABASE_JWT_TOKEN' ? '❌ NOT SET' : '✅ Set'}`)
  log(`Machine Fingerprint: ${TEST_CONFIG.machineFingerprint}`)
  
  if (TEST_CONFIG.licenseKey === 'YOUR_TEST_LICENSE_KEY_CODE') {
    logWarning('\n⚠️  Please set TEST_CONFIG.licenseKey to a valid key_code from your license_keys table')
  }
  
  if (TEST_CONFIG.authToken === 'YOUR_SUPABASE_JWT_TOKEN') {
    logWarning('⚠️  Please set TEST_CONFIG.authToken to a valid Supabase JWT token')
    logWarning('   You can get this from browser DevTools after logging in to Lyceum')
  }
  
  // Run tests
  await testLicenseVerification()
  await testClusterDiscovery()
  await testUsageSync()
  await testConnectionTracking()
  
  // Print summary
  printSummary()
}

// Run the tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})

