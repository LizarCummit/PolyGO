require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

const products = [
  {
    name: 'Pro Plan',
    description: 'Professional translation service with advanced features',
    price: 29.99,
    features: [
      '100 transcriptions per month',
      'Advanced analytics',
      'Priority support',
      'Up to 5 users',
      'Custom branding'
    ]
  },
  {
    name: 'Enterprise Plan',
    description: 'Enterprise-grade translation service with unlimited features',
    price: 99.99,
    features: [
      'Unlimited transcriptions',
      'Enterprise analytics',
      '24/7 support',
      'Unlimited users',
      'Custom branding',
      'API access',
      'Custom integrations'
    ]
  }
];

async function createProducts() {
  try {
    for (const product of products) {
      // Create the product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: {
          features: JSON.stringify(product.features)
        }
      });

      // Create the price for the product
      const price = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(product.price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        }
      });

      console.log(`Created product: ${product.name}`);
      console.log(`Product ID: ${stripeProduct.id}`);
      console.log(`Price ID: ${price.id}`);
      console.log('-------------------');
    }
  } catch (error) {
    console.error('Error creating products:', error);
  }
}

createProducts(); 