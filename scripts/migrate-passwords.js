/**
 * Password Migration Script
 * 
 * This script does two things for every user file in data/users/:
 * 1. If passwordPlain exists AND passwordHash is a legacy SHA-256 hash (64 hex chars),
 *    re-hash the password with bcrypt and update passwordHash.
 * 2. Remove the passwordPlain field entirely.
 * 
 * Run once: node scripts/migrate-passwords.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_DIR = process.env.DATA_DIR 
  ? path.join(process.env.DATA_DIR, 'users')
  : path.join(__dirname, '..', 'data', 'users');

const BCRYPT_ROUNDS = 10;

async function migrate() {
  console.log('=== Password Migration Script ===');
  console.log(`Users directory: ${USERS_DIR}`);
  
  let files;
  try {
    files = await fs.readdir(USERS_DIR);
  } catch (err) {
    console.error('Could not read users directory:', err.message);
    process.exit(1);
  }

  const jsonFiles = files.filter(f => f.endsWith('.json'));
  console.log(`Found ${jsonFiles.length} user file(s)\n`);

  let migrated = 0;
  let cleaned = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(USERS_DIR, file);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const user = JSON.parse(data);
      let changed = false;

      // Check if passwordHash is a legacy SHA-256 hash (64 hex characters)
      const isLegacySHA256 = user.passwordHash && /^[a-f0-9]{64}$/i.test(user.passwordHash);

      if (isLegacySHA256 && user.passwordPlain) {
        // Re-hash with bcrypt using the plaintext password
        console.log(`  [REHASH] ${user.username}: SHA-256 -> bcrypt`);
        user.passwordHash = bcrypt.hashSync(user.passwordPlain, BCRYPT_ROUNDS);
        changed = true;
        migrated++;
      } else if (isLegacySHA256 && !user.passwordPlain) {
        // Legacy hash but no plaintext available -- user will need a password reset
        console.log(`  [WARNING] ${user.username}: SHA-256 hash but no plaintext -- user must reset password`);
      }

      // Remove passwordPlain regardless
      if ('passwordPlain' in user) {
        console.log(`  [CLEAN] ${user.username}: removing passwordPlain`);
        delete user.passwordPlain;
        changed = true;
        cleaned++;
      }

      if (changed) {
        await fs.writeFile(filePath, JSON.stringify(user, null, 2));
      } else {
        skipped++;
      }

    } catch (err) {
      console.error(`  [ERROR] ${file}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`  Rehashed to bcrypt: ${migrated}`);
  console.log(`  Plaintext removed:  ${cleaned}`);
  console.log(`  Already clean:      ${skipped}`);
  console.log(`  Errors:             ${errors}`);
}

migrate();
