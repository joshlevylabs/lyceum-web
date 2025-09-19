// Test script to simulate CentCom session sync
// This script tests the POST /api/admin/users/{userId}/centcom-sessions endpoint

const TEST_USER_ID = '2c3d4747-8d67-45af-90f5-b5e9058ec246'; // From console logs
const LYCEUM_API_URL = 'http://localhost:3594';

async function testCentComSessionSync() {
  console.log('🔄 Testing CentCom Session Sync API...');

  // Generate a unique session ID
  const sessionId = `centcom-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  const sessionData = {
    session_data: {
      centcom_session_id: sessionId,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      source_ip: '192.168.1.100',
      user_agent: 'CentCom/2.1.0 (Windows NT 10.0; Win64; x64) Test Script',
      mfa_verified: false,
      risk_score: 10,
      session_status: 'active',
      location: {
        country: 'United States',
        city: 'New York',
        timezone: 'America/New_York'
      },
      device_info: {
        platform: 'Windows',
        device_type: 'desktop',
        browser: 'Tauri WebView'
      },
      application_info: {
        app_name: 'CentCom',
        app_version: '2.1.0',
        build_number: '2024.12.001-test',
        license_type: 'professional'
      }
    },
    sync_metadata: {
      sync_timestamp: new Date().toISOString(),
      sync_source: 'centcom_session_manager',
      sync_version: '1.0'
    }
  };

  try {
    console.log('📤 Sending session sync request...');
    console.log('Session ID:', sessionId);
    console.log('User ID:', TEST_USER_ID);

    const response = await fetch(`${LYCEUM_API_URL}/api/admin/users/${TEST_USER_ID}/centcom-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-testing', // This should work even with fake token for testing
        'X-Client-App': 'CentCom',
        'X-Client-Version': '2.1.0',
        'X-Session-Source': 'centcom_app'
      },
      body: JSON.stringify(sessionData)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('📥 Response data:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ Session sync successful!');
      
      // Now test the GET endpoint
      console.log('\n🔄 Testing GET endpoint...');
      const getResponse = await fetch(`${LYCEUM_API_URL}/api/admin/users/${TEST_USER_ID}/centcom-sessions`);
      
      console.log('📥 GET Response status:', getResponse.status);
      const getData = await getResponse.json();
      console.log('📥 GET Response data:', JSON.stringify(getData, null, 2));
      
      if (getResponse.ok) {
        console.log('✅ GET endpoint works!');
        console.log('📊 Found', getData.total_count || 0, 'total sessions');
        if (getData.latest_session) {
          console.log('🕐 Latest session:', getData.latest_session.centcom_session_id);
          console.log('📍 Status:', getData.latest_session.connection_status);
        }
      } else {
        console.log('❌ GET endpoint failed');
      }
      
    } else {
      console.log('❌ Session sync failed');
    }

  } catch (error) {
    console.error('❌ Error testing session sync:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testSessionUpdate() {
  console.log('\n🔄 Testing session activity update...');
  
  // Update activity for an existing session
  const sessionData = {
    session_data: {
      centcom_session_id: 'centcom-test-existing-session',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      last_activity: new Date().toISOString(), // Now
      source_ip: '192.168.1.100',
      user_agent: 'CentCom/2.1.0 (Windows NT 10.0; Win64; x64) Test Update',
      session_status: 'active',
      location: {
        country: 'United States',
        city: 'New York',
        timezone: 'America/New_York'
      },
      device_info: {
        platform: 'Windows',
        device_type: 'desktop',
        browser: 'Tauri WebView'
      },
      application_info: {
        app_name: 'CentCom',
        app_version: '2.1.0',
        license_type: 'professional'
      }
    }
  };

  try {
    const response = await fetch(`${LYCEUM_API_URL}/api/admin/users/${TEST_USER_ID}/centcom-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-testing',
        'X-Client-App': 'CentCom',
        'X-Client-Version': '2.1.0'
      },
      body: JSON.stringify(sessionData)
    });

    const responseData = await response.json();
    console.log('📥 Update response:', response.status, responseData.message);
    
  } catch (error) {
    console.error('❌ Update test failed:', error.message);
  }
}

// Run the tests
(async () => {
  console.log('🧪 CentCom Session Sync API Test Suite');
  console.log('=====================================');
  
  await testCentComSessionSync();
  await testSessionUpdate();
  
  console.log('\n✨ Test suite completed!');
  console.log('Now check the admin panel at: http://localhost:3594/admin/users/' + TEST_USER_ID + '/profile');
  console.log('Navigate to the Sessions tab to see the "Last CentCom Login" section.');
})();
