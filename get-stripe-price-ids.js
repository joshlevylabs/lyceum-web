// Run this script to get your Stripe Price IDs
// node get-stripe-price-ids.js

const stripe = require('stripe')('replacewstripesecretkey');

async function getPriceIds() {
  try {
    console.log('🔍 Getting your Stripe Price IDs...\n');
    
    const products = await stripe.products.list({ limit: 10 });
    
    for (const product of products.data) {
      console.log(`📦 Product: ${product.name} (${product.id})`);
      
      const prices = await stripe.prices.list({ product: product.id });
      
      if (prices.data.length > 0) {
        prices.data.forEach(price => {
          const amount = price.unit_amount / 100;
          const interval = price.recurring?.interval || 'one-time';
          console.log(`   💰 Price: $${amount}/${interval} → ID: ${price.id}`);
        });
      } else {
        console.log('   ❌ No prices found for this product');
      }
      console.log('');
    }
    
    console.log('✅ Copy the Price IDs (price_...) to your .env.local file!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getPriceIds();
