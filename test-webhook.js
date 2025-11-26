/**
 * Stripe Webhook Testing Script
 *
 * This script sends a mock checkout.session.completed event to your local webhook endpoint.
 *
 * Usage:
 *   1. Start your Next.js dev server: npm run dev
 *   2. Run this script: node test-webhook.js
 *
 * IMPORTANT: This requires temporarily disabling signature verification in webhook route.
 * See STRIPE_WEBHOOK_TESTING.md for full instructions.
 */

const fetch = require('node:fetch');

// Mock checkout session completed event
const mockEvent = {
  id: 'evt_test_webhook',
  object: 'event',
  type: 'checkout.session.completed',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'cs_test_mock_session_' + Date.now(),
      object: 'checkout.session',
      amount_total: 0, // Free trial
      currency: 'usd',
      customer: 'cus_test_mock_customer',
      mode: 'subscription',
      payment_status: 'paid',
      status: 'complete',
      subscription: 'sub_test_mock_subscription',
      payment_intent: 'pi_test_mock_payment',
      metadata: {
        userId: 'YOUR_USER_ID_HERE', // Replace with actual user ID
        product_type: 'native_app',
        subscription_type: 'trial'
      },
      success_url: 'http://localhost:3000/native-app/checkout-success?session_id={CHECKOUT_SESSION_ID}',
      url: null
    }
  }
};

async function testWebhook() {
  console.log('🧪 Testing Stripe Webhook Endpoint\n');
  console.log('📋 Mock Event:', JSON.stringify(mockEvent, null, 2));
  console.log('\n🚀 Sending POST request to http://localhost:3000/api/stripe/webhook\n');

  try {
    const response = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No stripe-signature header - this will trigger test mode
      },
      body: JSON.stringify(mockEvent)
    });

    const statusCode = response.status;
    const responseData = await response.json();

    console.log('📥 Response Status:', statusCode);
    console.log('📥 Response Body:', JSON.stringify(responseData, null, 2));

    if (statusCode === 200) {
      console.log('\n✅ SUCCESS: Webhook endpoint responded with 200');
      console.log('\n📝 Next Steps:');
      console.log('   1. Check your Next.js terminal for processing logs');
      console.log('   2. Verify subscription was created in database');
      console.log('   3. Verify license was generated');
      console.log('   4. Check for any error messages in logs');
    } else if (statusCode === 400 && responseData.error === 'Invalid signature') {
      console.log('\n⚠️  SIGNATURE VERIFICATION FAILED');
      console.log('   This is expected if you haven\'t disabled signature verification for testing.');
      console.log('   See STRIPE_WEBHOOK_TESTING.md Method 3 for instructions.');
    } else {
      console.log('\n❌ FAILED: Unexpected response');
      console.log('   Check your webhook route for errors');
    }

  } catch (error) {
    console.error('❌ ERROR: Failed to send request');
    console.error('   Details:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Is your Next.js dev server running? (npm run dev)');
    console.log('   2. Is it running on http://localhost:3000?');
    console.log('   3. Check for any firewall blocking localhost connections');
  }
}

// Check if user has updated the userId
if (mockEvent.data.object.metadata.userId === 'YOUR_USER_ID_HERE') {
  console.log('⚠️  WARNING: Please update YOUR_USER_ID_HERE in test-webhook.js with a real user ID\n');
  console.log('To find a user ID:');
  console.log('   1. Go to Supabase dashboard');
  console.log('   2. Open SQL Editor');
  console.log('   3. Run: SELECT id, email FROM auth.users LIMIT 5;');
  console.log('   4. Copy a user ID and update mockEvent.data.object.metadata.userId\n');

  // Ask user if they want to continue anyway
  console.log('Continuing anyway with mock user ID...\n');
}

// Run the test
testWebhook();
