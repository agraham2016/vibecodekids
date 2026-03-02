#!/usr/bin/env node

/**
 * Secret Rotation Helper
 *
 * Generates new secrets and prints updated .env values.
 * Run: node scripts/rotate-secrets.js [secret-name]
 *
 * Supported secrets:
 *   admin-secret     - ADMIN_SECRET (rotate quarterly)
 *   admin-token      - ADMIN_TOKEN_SECRET (rotate quarterly)
 *   all              - Generate all rotatable secrets
 *
 * After running, update your .env file and hosting provider env vars,
 * then restart the server. Existing sessions will be invalidated.
 *
 * ROTATION SCHEDULE:
 *   ADMIN_SECRET         - Every 90 days (quarterly) or on suspected compromise
 *   ADMIN_TOKEN_SECRET   - Every 90 days (quarterly)
 *   ANTHROPIC_API_KEY    - Every 90 days (via Anthropic console)
 *   XAI_API_KEY          - Every 90 days (via xAI console)
 *   STRIPE_SECRET_KEY    - Annually or on suspected compromise (via Stripe dashboard)
 *   RESEND_API_KEY       - Annually (via Resend dashboard)
 *   PERSPECTIVE_API_KEY  - Annually (via Google Cloud console)
 *
 * Third-party keys (Stripe, Anthropic, xAI, Resend) must be rotated
 * in their respective dashboards. This script only handles locally
 * generated secrets.
 */

import { randomBytes } from 'crypto';

const secretName = process.argv[2] || 'all';

function generate(name, bytes = 32) {
  const value = randomBytes(bytes).toString('hex');
  console.log(`\n${name}=${value}`);
  return value;
}

console.log('=== Vibe Code Kidz — Secret Rotation ===');
console.log('Generated at:', new Date().toISOString());
console.log('\nCopy the values below into your .env and hosting env vars:');

if (secretName === 'admin-secret' || secretName === 'all') {
  generate('ADMIN_SECRET');
}
if (secretName === 'admin-token' || secretName === 'all') {
  generate('ADMIN_TOKEN_SECRET');
}

console.log('\n---');
console.log('After updating, restart the server. Existing admin sessions will be invalidated.');
console.log('For third-party keys (Stripe, Anthropic, xAI, Resend), rotate via their dashboards.');
