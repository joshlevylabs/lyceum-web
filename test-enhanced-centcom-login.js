// Test script to verify enhanced CentCom login with license_type
// This simulates what CentCom should be sending with their enhanced client_info

const LYCEUM_API_URL = 'http://localhost:3594';

async function testEnhancedCentComLogin() {
  console.log('🧪 Testing Enhanced CentCom Login with License Type');
  console.log('===================================================');

  // Test the enhanced client_info that CentCom said they implemented
  const enhancedLoginData = {
    email: 'test@example.com',      // Update with real user email  
    password: 'test_password',      // Update with real password
    app_id: 'centcom',
    client_info: {
      version: '1.0.0',                        // ✅ Fixed version
      instance_id: 'centcom-desktop-' + Date.now(),
      user_agent: 'CentCom/1.0.0 (Windows NT 10.0; Win64; x64) Tauri/1.0.0',
      platform: 'Windows',
      build: '2024.12.001',
      license_type: 'enterprise',              // ✅ NEW: Enhanced license tracking
      app_name: 'centcom'                      // ✅ NEW: Clean app name
    }
  };

  try {
    console.log('🔐 Testing enhanced CentCom login...');
    console.log('📊 Enhanced Client Info:');
    console.log(JSON.stringify(enhancedLoginData.client_info, null, 2));

    const response = await fetch(`${LYCEUM_API_URL}/api/centcom/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': enhancedLoginData.client_info.user_agent
      },
      body: JSON.stringify(enhancedLoginData)
    });

    console.log('\n📥 Login Response:');
    console.log('Status:', response.status);

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Enhanced login successful!');
      
      const userId = responseData.user.id;
      console.log('User ID:', userId);

      // Wait for enhanced session creation
      console.log('\n⏳ Waiting for enhanced session creation...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check the enhanced session data
      console.log('\n🔍 Checking enhanced session data...');
      const sessionResponse = await fetch(`${LYCEUM_API_URL}/api/admin/users/${userId}/centcom-sessions`);
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        
        if (sessionData.latest_session) {
          const session = sessionData.latest_session;
          console.log('\n🎉 Enhanced Session Created:');
          console.log('─'.repeat(50));
          console.log('📱 App Version:', session.app_version);
          console.log('🎫 License Type:', session.license_type);
          console.log('🖥️  Platform:', session.platform);
          console.log('📍 Location:', `${session.city}, ${session.country}`);
          console.log('🌐 IP Address:', session.source_ip);
          console.log('⚡ Risk Score:', session.risk_score);
          console.log('🔧 Sync Source:', session.sync_source);
          
          // Verify the enhancements worked
          console.log('\n✨ Enhancement Verification:');
          if (session.license_type === 'enterprise') {
            console.log('✅ License type correctly set to: enterprise');
          } else {
            console.log('❌ License type incorrect:', session.license_type, '(expected: enterprise)');
          }
          
          if (session.app_version === '1.0.0') {
            console.log('✅ App version correctly set to: 1.0.0');
          } else {
            console.log('❌ App version incorrect:', session.app_version, '(expected: 1.0.0)');
          }
          
          if (session.city !== 'Unknown') {
            console.log('✅ Location resolved:', `${session.city}, ${session.country}`);
          } else {
            console.log('⚠️ Location not resolved (expected for localhost)');
          }
          
        } else {
          console.log('❌ No session found');
        }
      } else {
        console.log('❌ Failed to retrieve session data');
      }

    } else {
      const errorData = await response.json();
      console.log('❌ Login failed:', response.status);
      console.log('Error:', errorData.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function showCurrentSessionState() {
  console.log('\n📊 Current Session State Analysis');
  console.log('=================================');
  
  const TEST_USER_ID = '2c3d4747-8d67-45af-90f5-b5e9058ec246';
  
  try {
    const response = await fetch(`${LYCEUM_API_URL}/api/admin/users/${TEST_USER_ID}/centcom-sessions`);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`📈 Total sessions: ${data.total_count}`);
      
      if (data.latest_session) {
        const session = data.latest_session;
        console.log('\n🔍 Current Latest Session:');
        console.log('App Version:', session.app_version);
        console.log('License Type:', session.license_type);
        console.log('Location:', `${session.city}, ${session.country}`);
        console.log('Created:', new Date(session.created_at).toLocaleString());
        
        console.log('\n📋 Current Admin Panel Shows:');
        console.log(`App Version: "CentCom v${session.app_version}"`);
        
        if (session.license_type === 'enterprise') {
          console.log('License Badge: "🏢 Enterprise" (green)');
          console.log('✅ Should show: "CentCom v1.0.0 🏢 Enterprise"');
        } else if (session.license_type === 'trial') {
          console.log('License Badge: "trial" (gray)');
          console.log('⚠️ Currently shows: "CentCom v1.0.0 trial"');
        }
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Run the analysis and test
(async () => {
  await showCurrentSessionState();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Expected After CentCom Enhanced Login:');
  console.log('App Version: "CentCom v1.0.0 🏢 Enterprise"');
  console.log('License Type: "enterprise" (from client_info)');
  console.log('Location: "Local, Development" (IPv6 fixed)');
  console.log('='.repeat(60));
  
  console.log('\nNOTE: Update credentials in script to test actual login');
  console.log('After CentCom sends enhanced client_info, new sessions will use enterprise license');
  
  // Uncomment to test with real credentials:
  // await testEnhancedCentComLogin();
})();
