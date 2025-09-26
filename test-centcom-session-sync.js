// Test script to verify CentCom session sync with enhanced data
// This simulates what CentCom should send to the new sync endpoint

const LYCEUM_API_URL = 'http://localhost:3594';

async function testCentComSessionSync() {
  console.log('🔄 Testing CentCom Session Sync with Enhanced Data');
  console.log('==================================================');

  // Simulate the session data that CentCom is showing
  const centcomSessionData = {
    user_id: '2c3d4747-8d67-45af-90f5-b5e9058ec246',
    session_data: {
      session_id: '3e5632d96ce995f3e9f8f958a339b2ba76b14ac1d94779a14b70fb764ed4172d', // CentCom's actual session ID
      status: 'active',
      created_at: '2025-09-18T20:03:56.000Z',         // 1:03:56 PM
      last_activity: '2025-09-18T20:08:57.000Z',      // 1:08:57 PM (current)
      duration_seconds: 473,                          // 7m 53s
      location: {
        ip: '::1',
        country: 'Local',
        region: 'Development',
        city: 'Development',
        timezone: 'America/Los_Angeles',
        formatted: 'Local, Development'
      },
      device_info: {
        platform: 'windows',
        os_version: 'Windows 11',
        device_type: 'desktop',
        browser: 'CentCom Desktop (Tauri)',
        user_agent: 'CentCom/1.0.0 (Windows NT 10.0; Win64; x64) Tauri/1.5.0',
        formatted: 'Windows Desktop (CentCom Desktop Tauri)'
      },
      application_info: {
        app_name: 'centcom',
        app_version: '1.0.0',
        build_number: '20250918.1',
        license_type: 'enterprise'
      },
      security_info: {
        mfa_verified: false,
        risk_score: 0.1,                             // 10% -> will convert to 10
        risk_factors: ['localhost_access'],
        authentication_method: 'password'
      }
    },
    sync_metadata: {
      sync_timestamp: new Date().toISOString(),
      sync_source: 'centcom_periodic_sync',
      sync_version: '1.0'
    }
  };

  try {
    console.log('📊 Sending CentCom session sync data...');
    console.log('Session ID:', centcomSessionData.session_data.session_id);
    console.log('Status:', centcomSessionData.session_data.status);
    console.log('Last Activity:', centcomSessionData.session_data.last_activity);
    console.log('License Type:', centcomSessionData.session_data.application_info.license_type);

    const response = await fetch(`${LYCEUM_API_URL}/api/centcom/sessions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(centcomSessionData)
    });

    console.log('\n📥 Session Sync Response:');
    console.log('Status:', response.status);

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Session sync successful!');
      console.log('Response:', JSON.stringify(responseData, null, 2));

      // Wait for database to update
      console.log('\n⏳ Waiting for database update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check the updated session data
      console.log('\n🔍 Checking updated session in admin panel...');
      const sessionCheckResponse = await fetch(`${LYCEUM_API_URL}/api/admin/users/2c3d4747-8d67-45af-90f5-b5e9058ec246/centcom-sessions`);
      
      if (sessionCheckResponse.ok) {
        const sessionData = await sessionCheckResponse.json();
        
        if (sessionData.latest_session) {
          const session = sessionData.latest_session;
          console.log('\n🎉 Updated Session Data:');
          console.log('─'.repeat(50));
          console.log('🆔 Session ID (Lyceum):', session.centcom_session_id?.substring(0, 16) + '...');
          console.log('🆔 Session ID (CentCom):', session.external_session_id?.substring(0, 16) + '...');
          console.log('📱 App Version:', session.app_version);
          console.log('🎫 License Type:', session.license_type);
          console.log('🖥️  Platform:', session.platform);
          console.log('📍 Location:', `${session.city}, ${session.country}`);
          console.log('🕐 Created:', new Date(session.created_at).toLocaleString());
          console.log('🕐 Last Activity:', new Date(session.last_activity).toLocaleString());
          console.log('⚡ Risk Score:', session.risk_score + '%');
          console.log('📊 Status:', session.session_status);
          
          // Verify the sync worked
          console.log('\n✨ Sync Verification:');
          
          if (session.external_session_id === centcomSessionData.session_data.session_id) {
            console.log('✅ Session ID correlation: CORRECT');
          } else {
            console.log('❌ Session ID correlation: FAILED');
            console.log('  Expected:', centcomSessionData.session_data.session_id);
            console.log('  Got:', session.external_session_id);
          }
          
          if (session.license_type === 'enterprise') {
            console.log('✅ License type: CORRECT (enterprise)');
          } else {
            console.log('❌ License type: INCORRECT (' + session.license_type + ')');
          }
          
          const expectedActivity = new Date(centcomSessionData.session_data.last_activity).getTime();
          const actualActivity = new Date(session.last_activity).getTime();
          if (Math.abs(expectedActivity - actualActivity) < 5000) { // Within 5 seconds
            console.log('✅ Last activity sync: CORRECT');
          } else {
            console.log('❌ Last activity sync: INCORRECT');
            console.log('  Expected:', new Date(expectedActivity).toLocaleString());
            console.log('  Got:', new Date(actualActivity).toLocaleString());
          }
          
          if (session.risk_score === 10) {
            console.log('✅ Risk score conversion: CORRECT (10%)');
          } else {
            console.log('❌ Risk score conversion: INCORRECT (' + session.risk_score + '%)');
          }
          
        } else {
          console.log('❌ No session found after sync');
        }
      } else {
        console.log('❌ Failed to retrieve updated session data');
      }

    } else {
      const errorData = await response.json();
      console.log('❌ Session sync failed:', response.status);
      console.log('Error:', errorData.error);
      
      if (errorData.setup_required) {
        console.log('\n🔧 Setup Required:');
        console.log('Run these SQL scripts in Supabase SQL Editor:');
        console.log('1. complete-centcom-setup.sql');
        console.log('2. add-external-session-id.sql');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function showCurrentState() {
  console.log('\n📊 Current Session State Before Sync');
  console.log('====================================');
  
  try {
    const response = await fetch(`${LYCEUM_API_URL}/api/admin/users/2c3d4747-8d67-45af-90f5-b5e9058ec246/centcom-sessions`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.latest_session) {
        const session = data.latest_session;
        console.log('Current Session:');
        console.log('  Session ID (Lyceum):', session.centcom_session_id?.substring(0, 16) + '...');
        console.log('  Session ID (CentCom):', session.external_session_id || 'Not set');
        console.log('  License Type:', session.license_type);
        console.log('  Last Activity:', new Date(session.last_activity).toLocaleString());
        console.log('  Status:', session.session_status);
        console.log('  Risk Score:', session.risk_score + '%');
      } else {
        console.log('No current session found');
      }
    }
  } catch (error) {
    console.log('Error checking current state:', error.message);
  }
}

// Run the test
(async () => {
  await showCurrentState();
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Testing Enhanced CentCom Session Sync');
  console.log('This simulates what CentCom should send for real-time updates');
  console.log('='.repeat(60));
  
  await testCentComSessionSync();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 Next Steps for CentCom Team:');
  console.log('1. Implement periodic calls to /api/centcom/sessions/sync');
  console.log('2. Send session updates every 30 seconds');
  console.log('3. Include all session data fields shown above');
  console.log('4. Use this exact JSON structure for requests');
  console.log('='.repeat(60));
})();


