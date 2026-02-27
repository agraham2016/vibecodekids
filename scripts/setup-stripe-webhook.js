/**
 * Create Stripe Webhook Endpoint
 *
 * Creates a webhook for customer.subscription.updated and customer.subscription.deleted.
 * Updates .env with the signing secret.
 *
 * Run: node scripts/setup-stripe-webhook.js
 */

import 'dotenv/config';
import Stripe from 'stripe';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.BASE_URL || 'https://vibecodekidz.org';

if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY not set in .env');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const webhookUrl = `${BASE_URL}/api/stripe/webhook`;

async function main() {
  console.log('🔗 Creating Stripe webhook endpoint...');
  console.log('   URL:', webhookUrl);
  console.log('   Events: customer.subscription.updated, customer.subscription.deleted\n');

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: ['customer.subscription.updated', 'customer.subscription.deleted'],
    description: 'VibeCode Kidz - subscription updates',
  });

  const secret = endpoint.secret;
  if (!secret) {
    console.error('❌ No secret returned from Stripe');
    process.exit(1);
  }

  console.log('✅ Webhook created:', endpoint.id);

  let envContent = readFileSync(envPath, 'utf8');
  if (envContent.includes('STRIPE_WEBHOOK_SECRET=')) {
    envContent = envContent.replace(
      /STRIPE_WEBHOOK_SECRET=.*/,
      `STRIPE_WEBHOOK_SECRET=${secret}`
    );
  } else {
    envContent += `\nSTRIPE_WEBHOOK_SECRET=${secret}\n`;
  }
  writeFileSync(envPath, envContent);

  console.log('✅ Updated .env with STRIPE_WEBHOOK_SECRET');
  console.log('\n⚠️  Add STRIPE_WEBHOOK_SECRET to your hosting env vars (Vercel, Railway, etc.)');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  if (err.code === 'url_invalid') {
    console.error('   Make sure BASE_URL in .env is correct and your site is reachable.');
  }
  process.exit(1);
});
