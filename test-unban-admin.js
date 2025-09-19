// Quick script to unban the admin user
// Run this with: node test-unban-admin.js

const fetch = require('node-fetch');

async function unbanAdmin() {
  try {
    console.log('Attempting to unban admin user...');
    
    const response = await fetch('http://localhost:3594/api/admin/users/unban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'josh@thelyceum.io'
      })
    });

    const result = await response.json();
    console.log('Unban result:', result);

    if (result.success) {
      console.log('✅ Admin user has been unbanned successfully!');
      console.log('You should now be able to log in.');
    } else {
      console.error('❌ Failed to unban user:', result.error);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

unbanAdmin();



