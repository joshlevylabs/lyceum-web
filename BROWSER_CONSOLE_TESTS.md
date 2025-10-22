# Browser Console Tests for Local Cluster Phase 1

**How to Use:** Copy and paste these JavaScript snippets into your browser's DevTools console.

---

## Setup

### Step 1: Open Browser Console

1. Open any browser tab (Chrome, Firefox, Edge)
2. Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
3. Click the **Console** tab
4. You're ready to run tests!

---

## Test 1: Login and Get Access Token

Copy and paste this entire block into your console:

```javascript
// Configure your credentials here
const TEST_CONFIG = {
  email: 'admin@lyceum-analytics.com',
  password: 'YOUR_PASSWORD_HERE',  // ⚠️ REPLACE THIS
  licenseKey: 'PLUGIN-ENT-2025-HQ21CIBF',
  baseUrl: 'https://lyceum-sable.vercel.app'
};

// Test 1: Login
async function test1_login() {
  console.log('🔐 Test 1: Login to Lyceum...');

  const response = await fetch(`${TEST_CONFIG.baseUrl}/api/centcom/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: TEST_CONFIG.email,
      password: TEST_CONFIG.password,
      client_info: {
        version: '1.0.0',
        platform: 'Web Console Test'
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Login failed:', data);
    return null;
  }

  console.log('✅ Login successful!');
  console.log('User:', data.user.email);
  console.log('License Type:', data.user.license_type);
  console.log('Access Token (first 50 chars):', data.session.access_token.substring(0, 50) + '...');

  // Store token globally for next tests
  window.LYCEUM_TOKEN = data.session.access_token;

  console.log('\n✅ Token saved to window.LYCEUM_TOKEN');
  console.log('👉 Run test2_register() next\n');

  return data;
}

// Run Test 1
test1_login();
```

**Expected Output:**
```
✅ Login successful!
User: admin@lyceum-analytics.com
License Type: enterprise
Access Token (first 50 chars): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
✅ Token saved to window.LYCEUM_TOKEN
👉 Run test2_register() next
```

---

## Test 2: Register Local Cluster

After Test 1 succeeds, run this:

```javascript
async function test2_register() {
  console.log('📝 Test 2: Register Local Cluster...');

  if (!window.LYCEUM_TOKEN) {
    console.error('❌ No access token found. Run test1_login() first!');
    return;
  }

  const response = await fetch(`${TEST_CONFIG.baseUrl}/api/centcom/clusters/local/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.LYCEUM_TOKEN}`
    },
    body: JSON.stringify({
      machine_fingerprint: 'browser-test-' + Date.now(),
      license_key: TEST_CONFIG.licenseKey,
      cluster_name: 'Browser Console Test Cluster',
      installation_id: crypto.randomUUID(),
      centcom_version: '1.0.0-test',
      system_info: {
        os: navigator.platform.includes('Win') ? 'Windows' :
            navigator.platform.includes('Mac') ? 'macOS' : 'Linux',
        os_version: navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || 'Unknown',
        architecture: navigator.userAgent.includes('x64') ? 'x64' : 'x86',
        hostname: 'BROWSER-TEST-PC',
        cpu_cores: navigator.hardwareConcurrency || 4,
        memory_gb: navigator.deviceMemory || 8
      },
      clickhouse_version: '25.9.2'
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Registration failed:', response.status, data);
    return null;
  }

  console.log('✅ Cluster registered successfully!');
  console.log('Cluster ID:', data.cluster_id);
  console.log('Cluster Key:', data.cluster_key);
  console.log('Sync Interval:', data.sync_interval_seconds + 's');
  console.log('License Limits:');
  console.log('  - Max Storage:', data.license.max_storage_gb + 'GB');
  console.log('  - Max Queries:', data.license.max_monthly_queries.toLocaleString());
  console.log('  - Grace Days:', data.license.offline_grace_days);

  // Store sync token for next test
  window.LYCEUM_SYNC_TOKEN = data.sync_token;
  window.LYCEUM_CLUSTER_ID = data.cluster_id;

  console.log('\n✅ Sync token saved to window.LYCEUM_SYNC_TOKEN');
  console.log('✅ Cluster ID saved to window.LYCEUM_CLUSTER_ID');
  console.log('👉 Run test3_heartbeat() next\n');

  return data;
}

// Run Test 2
test2_register();
```

**Expected Output:**
```
✅ Cluster registered successfully!
Cluster ID: 12345678-1234-1234-1234-123456789abc
Cluster Key: LOCAL-0001
Sync Interval: 600s
License Limits:
  - Max Storage: 500GB
  - Max Queries: 10,000,000
  - Grace Days: 30
✅ Sync token saved to window.LYCEUM_SYNC_TOKEN
✅ Cluster ID saved to window.LYCEUM_CLUSTER_ID
👉 Run test3_heartbeat() next
```

---

## Test 3: Send Heartbeat

After Test 2 succeeds, run this:

```javascript
async function test3_heartbeat() {
  console.log('💓 Test 3: Send Heartbeat...');

  if (!window.LYCEUM_SYNC_TOKEN) {
    console.error('❌ No sync token found. Run test2_register() first!');
    return;
  }

  const response = await fetch(`${TEST_CONFIG.baseUrl}/api/centcom/clusters/local/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.LYCEUM_SYNC_TOKEN}`
    },
    body: JSON.stringify({
      status: {
        is_running: true,
        uptime_seconds: 3600,
        version: '25.9.2'
      },
      usage_metrics: {
        storage_used_gb: 2.5,
        storage_bytes: 2684354560,
        queries_this_month: 1500,
        project_count: 3,
        measurement_count: 50000,
        table_count: 12
      },
      last_sync_at: new Date().toISOString()
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Heartbeat failed:', response.status, data);
    return null;
  }

  console.log('✅ Heartbeat sent successfully!');
  console.log('Cluster Status:', data.cluster_status);
  console.log('Should Throttle:', data.should_throttle);
  console.log('Next Heartbeat In:', data.next_heartbeat_seconds + 's');

  if (data.warnings && data.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    data.warnings.forEach(w => {
      console.log(`  [${w.severity.toUpperCase()}] ${w.type}: ${w.message}`);
    });
  } else {
    console.log('✅ No warnings');
  }

  if (data.limits) {
    console.log('\nUsage:');
    console.log('  - Storage:', data.limits.storage_used_percentage.toFixed(2) + '%');
    console.log('  - Queries:', data.limits.queries_used_percentage.toFixed(2) + '%');
  }

  if (data.sync_token) {
    console.log('\n🔄 Sync token was renewed (saved to window.LYCEUM_SYNC_TOKEN)');
    window.LYCEUM_SYNC_TOKEN = data.sync_token;
  }

  console.log('\n👉 Run test4_discovery() next\n');

  return data;
}

// Run Test 3
test3_heartbeat();
```

**Expected Output:**
```
✅ Heartbeat sent successfully!
Cluster Status: healthy
Should Throttle: false
Next Heartbeat In: 600s
✅ No warnings
Usage:
  - Storage: 0.50%
  - Queries: 0.02%
👉 Run test4_discovery() next
```

---

## Test 4: Discover All Clusters

After Test 3 succeeds, run this:

```javascript
async function test4_discovery() {
  console.log('🔍 Test 4: Discover All Clusters...');

  if (!window.LYCEUM_TOKEN) {
    console.error('❌ No access token found. Run test1_login() first!');
    return;
  }

  const response = await fetch(`${TEST_CONFIG.baseUrl}/api/centcom/clusters/discover`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${window.LYCEUM_TOKEN}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Discovery failed:', response.status, data);
    return null;
  }

  console.log('✅ Discovery successful!');
  console.log('Total Clusters:', data.total);
  console.log('Breakdown:');
  console.log('  - Cloud:', data.breakdown.cloud);
  console.log('  - Local:', data.breakdown.local);

  console.log('\n📋 Clusters:');
  data.clusters.forEach((cluster, index) => {
    console.log(`\n${index + 1}. ${cluster.name} (${cluster.deployment_type})`);
    console.log('   ID:', cluster.id);
    console.log('   Key:', cluster.key);
    console.log('   Type:', cluster.type);

    if (cluster.deployment_type === 'local') {
      console.log('   Status:', cluster.status);
      console.log('   Machine:', cluster.machine_fingerprint);
      console.log('   Version:', cluster.clickhouse_version || 'N/A');
      if (cluster.usage) {
        console.log('   Storage:', cluster.usage.storage_used_gb + 'GB');
        console.log('   Queries:', cluster.usage.queries_this_month);
      }
    }
  });

  // Find our test cluster
  const testCluster = data.clusters.find(c => c.id === window.LYCEUM_CLUSTER_ID);
  if (testCluster) {
    console.log('\n✅ Found our test cluster in discovery!');
    console.log('   Name:', testCluster.name);
    console.log('   Status:', testCluster.status);
  } else {
    console.log('\n⚠️  Test cluster not found in discovery (may take a few seconds to appear)');
  }

  console.log('\n🎉 All tests complete!\n');

  return data;
}

// Run Test 4
test4_discovery();
```

**Expected Output:**
```
✅ Discovery successful!
Total Clusters: 2
Breakdown:
  - Cloud: 1
  - Local: 1

📋 Clusters:

1. Production Cluster (cloud)
   ID: abc-123-def-456
   Key: CK-PROD-001
   Type: managed

2. Browser Console Test Cluster (local)
   ID: 12345678-1234-1234-1234-123456789abc
   Key: LOCAL-0001
   Type: local
   Status: online
   Machine: browser-test-1729600000000
   Version: 25.9.2
   Storage: 2.5GB
   Queries: 1500

✅ Found our test cluster in discovery!
   Name: Browser Console Test Cluster
   Status: online

🎉 All tests complete!
```

---

## Running All Tests at Once

If you want to run all tests sequentially, paste this:

```javascript
// Master test runner
async function runAllTests() {
  console.log('🚀 Running all Phase 1 endpoint tests...\n');

  try {
    console.log('═══════════════════════════════════════');
    await test1_login();

    console.log('\n═══════════════════════════════════════');
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
    await test2_register();

    console.log('\n═══════════════════════════════════════');
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
    await test3_heartbeat();

    console.log('\n═══════════════════════════════════════');
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
    await test4_discovery();

    console.log('\n═══════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED! 🎉');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run all tests
runAllTests();
```

---

## Troubleshooting

### Error: "No access token found"
**Solution:** Run the tests in order. You must run `test1_login()` first.

### Error: 401 Unauthorized
**Solutions:**
- Check that you updated `TEST_CONFIG.password` with your real password
- Try running `test1_login()` again to get a fresh token
- Check that your user account exists and has the correct license

### Error: 403 Forbidden - "License does not support local clusters"
**Solution:** Run this SQL in Supabase to enable local clusters for your license:
```sql
UPDATE license_keys
SET allows_local_cluster = TRUE,
    local_cluster_limits = '{
      "max_storage_gb": 500,
      "max_monthly_queries": 10000000,
      "offline_grace_days": 30
    }'::jsonb
WHERE key_code = 'PLUGIN-ENT-2025-HQ21CIBF';
```

### Error: 500 Internal Server Error
**Solutions:**
- Check Vercel deployment logs
- Verify database migration was applied
- Check Supabase is accessible

### Error: Network/CORS Error
**Solutions:**
- Make sure you're testing on `lyceum-sable.vercel.app` or localhost
- Check that the Vercel deployment is live
- Try running tests from the actual Lyceum web app page

---

## Cleanup (Optional)

To remove your test cluster from the database:

```javascript
async function cleanup_deleteTestCluster() {
  console.log('🗑️  Cleaning up test cluster...');

  if (!window.LYCEUM_CLUSTER_ID) {
    console.log('No test cluster to clean up.');
    return;
  }

  // You'll need to implement a DELETE endpoint or do this via Supabase SQL Editor:
  console.log('Run this SQL in Supabase to delete test cluster:');
  console.log(`
    DELETE FROM local_cluster_usage
    WHERE cluster_id = '${window.LYCEUM_CLUSTER_ID}';
  `);
}
```

---

## Quick Reference

**Saved Variables:**
- `window.LYCEUM_TOKEN` - User access token (24 hour expiry)
- `window.LYCEUM_SYNC_TOKEN` - Cluster sync token (90 day expiry)
- `window.LYCEUM_CLUSTER_ID` - Your test cluster's UUID

**Functions:**
- `test1_login()` - Get access token
- `test2_register()` - Register local cluster
- `test3_heartbeat()` - Send heartbeat update
- `test4_discovery()` - Discover all clusters
- `runAllTests()` - Run all tests sequentially

**Re-run Tests:**
```javascript
// Re-run any test
test1_login()   // Get new token
test2_register() // Register another cluster
test3_heartbeat() // Send another heartbeat
test4_discovery() // Check current state
```

---

## Success Criteria

✅ **Phase 1 is working if:**
1. Login returns 200 with access token
2. Registration returns 201 with cluster_id and sync_token
3. Heartbeat returns 200 with cluster_status "healthy"
4. Discovery returns your test cluster with status "online"
5. Discovery shows breakdown: `{ cloud: X, local: 1 }`

---

**Ready to test!** Start with Test 1 above. 🚀
