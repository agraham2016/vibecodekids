/**
 * Stripe Products & Prices Setup
 *
 * Creates Creator ($13/mo) and Pro ($21/mo) products in your Stripe account.
 * Run: node scripts/setup-stripe-products.js
 *
 * Requires STRIPE_SECRET_KEY in .env
 */

import 'dotenv/config';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY not set in .env. Add your secret key first.');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function createOrGetProduct(name, description, priceCents, interval = 'month') {
  const products = await stripe.products.list({ limit: 100 });
  const existing = products.data.find((p) => p.name === name);

  if (existing) {
    const prices = await stripe.prices.list({ product: existing.id, active: true });
    const price = prices.data.find((p) => p.unit_amount === priceCents && p.recurring?.interval === interval);
    if (price) {
      return { product: existing, price };
    }
  }

  const product = existing || (await stripe.products.create({ name, description }));
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: priceCents,
    currency: 'usd',
    recurring: { interval },
  });
  return { product, price };
}

async function main() {
  console.log('🎮 Setting up VibeCode Kidz Stripe products...\n');

  const desc =
    'AI-powered game coding platform for kids ages 7–18. Build real games by describing them in plain English.';

  const creator = await createOrGetProduct(
    'VibeCode Kidz Creator',
    desc,
    1300,
    'month'
  );
  const pro = await createOrGetProduct(
    'VibeCode Kidz Pro',
    desc,
    2100,
    'month'
  );

  console.log('✅ Products created/found:');
  console.log('   Creator:', creator.price.id, '($13/month)');
  console.log('   Pro:', pro.price.id, '($21/month)\n');

  console.log('📋 Add these to your .env file:');
  console.log('');
  console.log(`STRIPE_CREATOR_PRICE_ID=${creator.price.id}`);
  console.log(`STRIPE_PRO_PRICE_ID=${pro.price.id}`);
  console.log('');
  console.log('Then set up your webhook at https://dashboard.stripe.com/webhooks');
  console.log('  URL: https://vibecodekidz.org/api/stripe/webhook');
  console.log('  Events: customer.subscription.updated, customer.subscription.deleted');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
