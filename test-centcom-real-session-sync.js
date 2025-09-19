// Test script to sync CentCom's actual real session data to Lyceum
// This uses the EXACT data from CentCom's native application

const LYCEUM_API_URL = 'http://localhost:3594';

async function syncCentComRealSession() {
  console.log('🔄 Syncing CentCom REAL Session Data to Lyceum');
  console.log('===============================================');

  // This is the EXACT session data from CentCom's native application
  const realCentComSessionData = {
    user_id: '2c3d4747-8d67-45af-90f5-b5e9058ec246',
    session_data: {
      session_id: 'c25744bac907f25a26824a522b96c7f4c4cd871aeaf14c200ea77521495ee831', // CentCom's real session ID
      status: 'active',                                    // CentCom shows "Active"
      created_at: '2025-09-18T22:09:30.000Z',             // 3:09:30 PM (actual start time)
      last_activity: '2025-09-18T22:29:30.000Z',          // 3:29:30 PM (current activity)
      duration_seconds: 1201,                             // 20m 1s
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
        app_version: '1.0.0',                             // Real CentCom version
        build_number: '20250918.1',
        license_type: 'enterprise'                        // Real license type
      },
      security_info: {
        mfa_verified: false,
        risk_score: 0.1,                                  // 10% (CentCom's actual risk score)
        risk_factors: ['localhost_access'],
        authentication_method: 'password'
      }
    },
    sync_metadata: {
      sync_timestamp: new Date().toISOString(),
      sync_source: 'centcom_real_session_sync',          // Indicates this is real sync
      sync_version: '2.0_optimized',                     // Use optimized heartbeat
      last_sync_interval: 1200000,                       // 20 minutes since last sync
      heartbeat_type: 'active_sync'
    }
  };

  console.log('📊 Syncing Real CentCom Session:');
  console.log('  CentCom Session ID:', realCentComSessionData.session_data.session_id);
  console.log('  Status:', realCentComSessionData.session_data.status);
  console.log('  Started:', realCentComSessionData.session_data.created_at);
  console.log('  Last Activity:', realCentComSessionData.session_data.last_activity);
  console.log('  License Type:', realCentComSessionData.session_data.application_info.license_type);
  console.log('  Risk Score:', realCentComSessionData.session_data.security_info.risk_score * 100 + '%');

  try {
    const response = await fetch(`${LYCEUM_API_URL}/api/centcom/sessions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(realCentComSessionData)
    });

    console.log('\n📥 Sync Response:');
    console.log('Status:', response.status);

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Real session sync successful!');
      console.log('Response:', JSON.stringify(responseData, null, 2));

      // Wait for database to update
      console.log('\n⏳ Waiting for database update...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify the sync worked
      await verifyRealSessionSync();
      
    } else {
      const errorData = await response.json();
      console.log('❌ Real session sync failed:', response.status);
      console.log('Error:', errorData.error);
      
      if (response.status === 500) {
        console.log('\n🔧 Possible Issues:');
        console.log('1. Database columns missing (run fix-heartbeat-schema-corrected.sql)');
        console.log('2. Session sync endpoint not working');
        console.log('3. Database connection issues');
      }
    }

  } catch (error) {
    console.error('❌ Sync request failed:', error.message);
  }
}

async function verifyRealSessionSync() {
  console.log('\n🔍 Verifying Real Session Sync in Lyceum Admin Panel');
  console.log('====================================================');
  
  try {
    // Note: This endpoint might not work from Node.js due to CORS/auth
    // But we can try to test it
    const response = await fetch(`${LYCEUM_API_URL}/api/admin/users/2c3d4747-8d67-45af-90f5-b5e9058ec246/centcom-sessions`);
    
    if (response.ok) {
      const sessionData = await response.json();
      
      if (sessionData.latest_session) {
        const session = sessionData.latest_session;
        console.log('📊 Lyceum Now Shows:');
        console.log('─'.repeat(50));
        console.log('🆔 Session ID (Lyceum):', session.centcom_session_id?.substring(0, 16) + '...');
        console.log('🆔 Session ID (CentCom):', session.external_session_id?.substring(0, 16) + '...');
        console.log('📱 App Version:', session.app_version);
        console.log('🎫 License Type:', session.license_type);
        console.log('📊 Status:', session.session_status);
        console.log('🕐 Last Activity:', new Date(session.last_activity).toLocaleString());
        console.log('⚡ Risk Score:', session.risk_score + '%');
        console.log('🔄 Heartbeat Type:', session.heartbeat_type || 'Legacy');
        console.log('📞 Sync Source:', session.sync_source || 'Unknown');
        
        console.log('\n✨ Verification Results:');
        
        // Check if CentCom session ID matches
        if (session.external_session_id === 'c25744bac907f25a26824a522b96c7f4c4cd871aeaf14c200ea77521495ee831') {
          console.log('✅ Session ID Correlation: PERFECT MATCH');
        } else {
          console.log('❌ Session ID Correlation: NOT MATCHED');
          console.log('  Expected: c25744bac907f25a26824a522b96c7f4c4cd871aeaf14c200ea77521495ee831');
          console.log('  Got:', session.external_session_id || 'null');
        }
        
        // Check license type
        if (session.license_type === 'enterprise') {
          console.log('✅ License Type: CORRECT (enterprise)');
        } else {
          console.log('❌ License Type: INCORRECT (' + session.license_type + ', expected: enterprise)');
        }
        
        // Check activity time
        const expectedActivity = new Date('2025-09-18T22:29:30.000Z').getTime();
        const actualActivity = new Date(session.last_activity).getTime();
        if (Math.abs(expectedActivity - actualActivity) < 60000) { // Within 1 minute
          console.log('✅ Activity Time: CORRECT (real-time)');
        } else {
          console.log('❌ Activity Time: NOT UPDATED');
          console.log('  Expected: 3:29:30 PM');
          console.log('  Got:', new Date(actualActivity).toLocaleTimeString());
        }
        
        // Check risk score
        if (session.risk_score === 10) {
          console.log('✅ Risk Score: CORRECT (10%)');
        } else {
          console.log('❌ Risk Score: INCORRECT (' + session.risk_score + '%, expected: 10%)');
        }
        
        // Check status
        if (session.session_status === 'active') {
          console.log('✅ Status: CORRECT (active)');
        } else {
          console.log('❌ Status: INCORRECT (' + session.session_status + ', expected: active)');
        }
        
      } else {
        console.log('❌ No session found in Lyceum after sync');
      }
    } else {
      console.log('⚠️ Could not verify sync (API endpoint issue)');
      console.log('Status:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Verification failed:', error.message);
    console.log('This is expected if running from Node.js due to CORS/auth requirements');
  }
}

async function showCentComImplementationNeeds() {
  console.log('\n📋 What CentCom Team Needs to Implement');
  console.log('========================================');
  
  console.log('🔄 CentCom needs to send this EXACT payload to Lyceum:');
  console.log('');
  console.log('POST http://localhost:3594/api/centcom/sessions/sync');
  console.log('Content-Type: application/json');
  console.log('');
  console.log(JSON.stringify({
    "user_id": "2c3d4747-8d67-45af-90f5-b5e9058ec246",
    "session_data": {
      "session_id": "c25744bac907f25a26824a522b96c7f4c4cd871aeaf14c200ea77521495ee831",
      "status": "active",
      "created_at": "2025-09-18T22:09:30.000Z",
      "last_activity": "2025-09-18T22:29:30.000Z", // Update this in real-time
      "application_info": {
        "app_version": "1.0.0",
        "license_type": "enterprise"
      },
      "security_info": {
        "risk_score": 0.1  // 10%
      },
      "location": {
        "country": "Local",
        "city": "Development"
      },
      "device_info": {
        "platform": "windows",
        "device_type": "desktop",
        "browser": "CentCom Desktop (Tauri)"
      }
    },
    "sync_metadata": {
      "sync_timestamp": "[current timestamp]",
      "sync_source": "centcom_optimized_active_sync",
      "heartbeat_type": "active_sync"
    }
  }, null, 2));
  
  console.log('\n⚡ Frequency:');
  console.log('• Every 8 minutes when user is active');
  console.log('• Every 24 hours when user is idle');  
  console.log('• Immediately on status changes');
  
  console.log('\n🎯 Expected Result:');
  console.log('Lyceum admin panel will show:');
  console.log('• Status: 🟢 Active');
  console.log('• Session ID: c25744bac907... (CentCom\'s real ID)');
  console.log('• Last Activity: [Real-time updates]'); 
  console.log('• License Type: 🏢 Enterprise');
  console.log('• Risk Score: 10% (🟢 Low)');
}

// Run the real session sync test
(async () => {
  await showCentComImplementationNeeds();
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Testing Real CentCom Session Sync');
  console.log('This will sync CentCom\'s actual session data to Lyceum');
  console.log('='.repeat(60));
  
  await syncCentComRealSession();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary:');
  console.log('If sync is successful, refresh the Lyceum admin panel');
  console.log('You should see the REAL CentCom session data');
  console.log('='.repeat(60));
})();
