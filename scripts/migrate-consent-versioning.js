#!/usr/bin/env node
/**
 * Consent Versioning Schema Migration
 *
 * Adds consent_policy_version column to parental_consents and users tables.
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Run: node scripts/migrate-consent-versioning.js
 * Requires: DATABASE_URL
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

  const pg = await import('pg');
  const pool = new pg.default.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await pool.query('ALTER TABLE parental_consents ADD COLUMN IF NOT EXISTS consent_policy_version TEXT');
    console.log('✓ parental_consents.consent_policy_version');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_policy_version TEXT');
    console.log('✓ users.consent_policy_version');
    console.log('Migration complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
