# Test All Centcom Endpoints

Copy and paste these test snippets into your browser console while logged into Centcom.

---

## Setup: Get Token

```javascript
// Run this first to get your token
const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
const token = session?.session?.session_token;
console.log('Token:', token ? '✅ Found' : '❌ Not found');
```

---

## Test 1: Session Update (Primary)

```javascript
fetch('http://localhost:3594/api/centcom/auth/session-update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: crypto.randomUUID(),
    version: '1.0.0',
    platform: navigator.platform,
    user_agent: navigator.userAgent,
    build: 'test-build',
    instance_id: 'test-instance'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Session Update:', data);
  if (data.success) {
    console.log('   ✓ Session updated successfully');
  } else {
    console.error('   ✗ Error:', data.error);
  }
})
.catch(err => console.error('❌ Request failed:', err));
```

**Expected**: `{success: true, message: 'Session updated successfully'}`

---

## Test 2: Dashboard Stats

```javascript
fetch('http://localhost:3594/api/user/dashboard/stats', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Dashboard Stats:', data);
  console.log('   • Data Clusters:', data.data_clusters);
  console.log('   • Test Projects:', data.test_projects);
  console.log('   • Plugin Licenses:', data.plugin_licenses);
  console.log('   • Total Sessions:', data.total_sessions);
  console.log('   • Active Users:', data.active_users);
  console.log('   • Measurements Today:', data.measurements_today);
  console.log('   • Measurements This Week:', data.measurements_this_week);
  console.log('   • Storage Used (GB):', data.storage_used_gb);
})
.catch(err => console.error('❌ Request failed:', err));
```

**Expected**: Object with 8 numeric fields

---

## Test 3: Session Sync (NOW WITH JWT!)

```javascript
fetch('http://localhost:3594/api/centcom/sessions/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_data: {
      session_id: crypto.randomUUID(),
      status: 'active',
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      duration_seconds: 120,
      location: {
        ip: '127.0.0.1',
        country: 'US',
        city: 'Development',
        timezone: 'America/Los_Angeles',
        formatted: 'Development, US'
      },
      device_info: {
        platform: navigator.platform,
        os_version: navigator.userAgent.match(/Windows NT [\d.]+/)?.[0] || 'Unknown',
        device_type: 'desktop',
        browser: 'CentCom Desktop',
        user_agent: navigator.userAgent,
        formatted: `${navigator.platform} / CentCom Desktop`
      },
      application_info: {
        app_name: 'centcom',
        app_version: '1.0.0',
        build_number: 'dev-build-001',
        license_type: 'enterprise'
      },
      security_info: {
        mfa_verified: false,
        risk_score: 0.1,
        risk_factors: [],
        authentication_method: 'jwt'
      }
    },
    sync_metadata: {
      sync_timestamp: new Date().toISOString(),
      sync_source: 'centcom_desktop_test',
      sync_version: '2.0_optimized',
      heartbeat_type: 'active_sync',
      last_sync_interval: 480000
    }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Session Sync:', data);
  if (data.success) {
    console.log('   ✓ Session synced:', data.action);
    console.log('   • Session ID:', data.session_id);
    console.log('   • External ID:', data.external_session_id);
  } else {
    console.error('   ✗ Error:', data.error);
  }
})
.catch(err => console.error('❌ Request failed:', err));
```

**Expected**: `{success: true, message: 'Session synced successfully', action: 'created' | 'updated'}`

---

## Test 4: Onboarding Sessions (NOW WITH JWT!)

```javascript
fetch('http://localhost:3594/api/user/onboarding/sessions', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Onboarding Sessions:', data);
  console.log('   • User ID:', data.user_id);
  console.log('   • Total Sessions:', data.summary?.total_sessions || 0);
  console.log('   • Upcoming:', data.summary?.upcoming_count || 0);
  console.log('   • Completed:', data.summary?.completed_count || 0);
  console.log('   • Cancelled:', data.summary?.cancelled_count || 0);
  console.log('   • Completion Rate:', data.summary?.completion_rate || 0, '%');
})
.catch(err => console.error('❌ Request failed:', err));
```

**Expected**: Object with `sessions`, `progress`, and `summary` fields

---

## Test 5: Admin Session Update (Fallback)

```javascript
fetch('http://localhost:3594/api/admin/sessions/update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: crypto.randomUUID(),
    version: '1.0.0',
    platform: navigator.platform
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Admin Session Update:', data);
  if (data.success) {
    console.log('   ✓ Admin session updated');
  } else {
    console.error('   ✗ Error:', data.error);
  }
})
.catch(err => console.error('❌ Request failed:', err));
```

**Expected**: Same as Test 1

---

## Run All Tests

```javascript
async function testAllEndpoints() {
  console.log('🧪 Testing All Centcom Endpoints with JWT Auth\n');

  const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
  const token = session?.session?.session_token;

  if (!token) {
    console.error('❌ Token not found in localStorage');
    return;
  }

  console.log('✅ Token found\n');

  const tests = [
    {
      name: 'Session Update',
      fn: () => fetch('http://localhost:3594/api/centcom/auth/session-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: crypto.randomUUID(),
          version: '1.0.0',
          platform: navigator.platform,
          user_agent: navigator.userAgent
        })
      })
    },
    {
      name: 'Dashboard Stats',
      fn: () => fetch('http://localhost:3594/api/user/dashboard/stats', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    },
    {
      name: 'Session Sync',
      fn: () => fetch('http://localhost:3594/api/centcom/sessions/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_data: {
            session_id: crypto.randomUUID(),
            status: 'active',
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            location: {
              ip: '127.0.0.1',
              country: 'US',
              city: 'Dev',
              timezone: 'UTC',
              formatted: 'Dev, US'
            },
            device_info: {
              platform: navigator.platform,
              device_type: 'desktop',
              browser: 'CentCom',
              user_agent: navigator.userAgent,
              formatted: 'Desktop'
            },
            application_info: {
              app_name: 'centcom',
              app_version: '1.0.0',
              license_type: 'enterprise'
            },
            security_info: {
              mfa_verified: false,
              risk_score: 0.1
            }
          },
          sync_metadata: {
            sync_timestamp: new Date().toISOString(),
            sync_source: 'test',
            sync_version: '2.0'
          }
        })
      })
    },
    {
      name: 'Onboarding Sessions',
      fn: () => fetch('http://localhost:3594/api/user/onboarding/sessions', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    }
  ];

  for (const test of tests) {
    console.log(`Testing ${test.name}...`);
    try {
      const response = await test.fn();
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ ${test.name}: PASSED`);
        console.log('   Response:', data);
      } else {
        console.error(`❌ ${test.name}: FAILED (${response.status})`);
        console.error('   Error:', data);
      }
    } catch (err) {
      console.error(`❌ ${test.name}: EXCEPTION`);
      console.error('   ', err);
    }
    console.log('');
  }

  console.log('🏁 All tests complete');
}

// Run all tests
testAllEndpoints();
```

---

## Troubleshooting

### Token Not Found
```javascript
// Check what's in localStorage
console.log('LocalStorage keys:', Object.keys(localStorage));

// Check if centcom session exists
const session = localStorage.getItem('centcom_lyceum_session');
console.log('Session exists:', !!session);

// Parse and inspect
if (session) {
  const parsed = JSON.parse(session);
  console.log('Session structure:', Object.keys(parsed));
  console.log('Has session.session?', !!parsed.session);
  console.log('Has session_token?', !!parsed.session?.session_token);
}
```

### Token Invalid
```javascript
// Decode token manually
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    console.log('Token payload:', payload);
    console.log('Issuer:', payload.iss);
    console.log('Audience:', payload.aud);
    console.log('Subject (user_id):', payload.sub);
    console.log('Expires:', new Date(payload.exp * 1000));
    console.log('Is expired?', Date.now() > payload.exp * 1000);

    return payload;
  } catch (e) {
    console.error('Failed to decode:', e);
    return null;
  }
}

const session = JSON.parse(localStorage.getItem('centcom_lyceum_session'));
const token = session?.session?.session_token;
decodeJWT(token);
```

### CORS Errors
```javascript
// Check if server is running
fetch('http://localhost:3594/api/health')
  .then(r => console.log('Server running:', r.ok))
  .catch(() => console.error('Server not responding'));
```

### 401 Unauthorized
- Token expired: Check `exp` claim in token
- Wrong issuer/audience: Should be `iss: "lyceum"`, `aud: "centcom"`
- Token malformed: Should have 3 parts separated by dots
- Server not restarted: Restart server to load new JWT auth code

---

## Expected Results Summary

| Endpoint | Method | Expected Status | Success Field |
|----------|--------|----------------|---------------|
| Session Update | POST | 200 | `success: true` |
| Dashboard Stats | GET | 200 | 8 numeric fields |
| Session Sync | POST | 200 | `success: true` |
| Onboarding Sessions | GET | 200 | `sessions` object |

All endpoints should return 401 if token is missing or invalid.
