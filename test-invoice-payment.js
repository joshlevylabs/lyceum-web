/**
 * Manual test script to simulate webhook payment confirmation
 * This tests the invoice payment status update functionality
 */

// Test data - replace with actual invoice IDs from your system
const testInvoiceId = 'b81c342c-162e-4404-9771-e488ac982bd7'; // Your $210.55 invoice
const apiKey = 'your-secure-random-string-here';

async function testInvoicePayment() {
  console.log('🧪 Testing invoice payment status update...');
  
  try {
    const response = await fetch('http://localhost:3594/api/billing/invoices/' + testInvoiceId, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        status: 'paid',
        payment_date: new Date().toISOString(),
        stripe_payment_intent_id: 'pi_test_payment_intent',
        payment_method_last4: '4242',
        payment_method_brand: 'visa'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Invoice payment status updated:', result);
      console.log('🎯 Refresh your admin panel to see status change to "paid"');
    } else {
      const error = await response.text();
      console.error('❌ Failed to update invoice:', error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testInvoicePayment();
