#!/usr/bin/env node
/**
 * Flag Stale Consents — Re-Consent Script
 *
 * When CONSENT_POLICY_VERSION is changed in config, run this script to:
 * 1. Identify under-13 users with granted consent but outdated policy version
 * 2. Set parental_consent_status to 'pending'
 * 3. Create new consent requests and send emails to parents
 *
 * Per Elias spec: docs/CONSENT_VERSIONING_REQUIREMENTS.md
 * Run: node scripts/flag-stale-consents.js
 *
 * Requires: DATABASE_URL, RESEND_API_KEY (for email)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in .env');
    process.exit(1);
  }

  const { CONSENT_POLICY_VERSION: currentVersion } = await import('../server/config/index.js');

  const pg = await import('pg');
  const pool = new pg.default.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {

    const { rows: stale } = await pool.query(
      `
      SELECT id, username, display_name, parent_email
      FROM users
      WHERE age_bracket = 'under13'
        AND parental_consent_status = 'granted'
        AND parent_email IS NOT NULL
        AND (consent_policy_version IS NULL OR consent_policy_version != $1)
      `,
      [currentVersion],
    );

    if (stale.length === 0) {
      console.log('No stale consents found. All under-13 users have current policy version.');
      return;
    }

    console.log(`Found ${stale.length} user(s) with stale consent. Current version: ${currentVersion}`);

    const { createConsentRequest, sendConsentEmail } = await import('../server/services/consent.js');

    const { readUser, writeUser } = await import('../server/services/storage.js');

    for (const u of stale) {
      try {
        const user = await readUser(u.id);
        user.parentalConsentStatus = 'pending';
        user.status = 'pending';
        await writeUser(u.id, user);
        const token = await createConsentRequest(u.id, u.parent_email, 'consent');
        await sendConsentEmail(u.parent_email, u.username, token, 'consent');
        console.log(`  ✓ ${u.username}: flagged, re-consent email sent to parent`);
      } catch (err) {
        console.error(`  ✗ ${u.username}: ${err.message}`);
      }
    }

    console.log('Done.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
