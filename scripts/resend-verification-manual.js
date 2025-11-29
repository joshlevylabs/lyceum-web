#!/usr/bin/env node

/**
 * Manual Verification Email Sender
 *
 * Use this script to manually send a verification email to a specific user
 * when the web UI resend isn't working or accessible.
 *
 * Usage:
 *   node scripts/resend-verification-manual.js customer@example.com "Customer Name"
 */

const fetch = require('node-fetch');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thelyceum.io';

async function resendVerificationEmail(email, userName) {
  try {
    console.log('Sending verification email to:', email);
    console.log('User name:', userName);

    const response = await fetch(`${SITE_URL}/api/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        userName: userName
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to send verification email');
      console.error('Status:', response.status);
      console.error('Error:', result.error);
      process.exit(1);
    }

    console.log('✅ Verification email sent successfully!');
    console.log('Email ID:', result.emailId);
    console.log('\nNext steps:');
    console.log('1. Ask customer to check inbox and spam folder');
    console.log('2. Link expires in 24 hours');
    console.log('3. Monitor Resend dashboard for delivery status');

  } catch (error) {
    console.error('❌ Exception:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: node scripts/resend-verification-manual.js <email> [userName]');
  console.error('Example: node scripts/resend-verification-manual.js customer@example.com "John Doe"');
  process.exit(1);
}

const email = args[0];
const userName = args[1] || email.split('@')[0];

resendVerificationEmail(email, userName);
