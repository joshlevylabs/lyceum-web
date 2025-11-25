// Check specific user's licenses
const fetch = require('node-fetch');

async function checkUser() {
  try {
    const response = await fetch('http://localhost:3594/api/admin/users/list');
    const data = await response.json();

    const user = data.users?.find(u => u.email === 'farbisimo@gmail.com');

    if (!user) {
      console.log('User farbisimo@gmail.com not found');
      return;
    }

    console.log('\n=== USER INFO ===');
    console.log('Email:', user.email);
    console.log('ID:', user.id);
    console.log('Full Name:', user.full_name);

    // Get licenses for this user
    const licensesResponse = await fetch(`http://localhost:3594/api/admin/users/${user.id}/licenses`);
    const licensesData = await licensesResponse.json();

    console.log('\n=== LICENSES ===');
    console.log('Total licenses:', licensesData.licenses?.length || 0);
    licensesData.licenses?.forEach(license => {
      console.log(`\n  License: ${license.key_code}`);
      console.log(`    Type: ${license.license_type}`);
      console.log(`    Status: ${license.status}`);
      console.log(`    Created: ${license.created_at}`);
    });

    // Get onboarding bookings
    console.log('\n=== CHECKING ONBOARDING BOOKINGS ===');
    const bookingsResponse = await fetch('http://localhost:3594/api/onboarding/my-bookings', {
      headers: {
        'Cookie': `sb-access-token=FAKE_TOKEN_FOR_DEBUG`
      }
    });

    console.log('Bookings API status:', bookingsResponse.status);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
