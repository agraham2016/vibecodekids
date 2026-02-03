/**
 * Migration Script: Add Membership Fields to Existing Users
 * 
 * Run this script to add the new membership fields to all existing user files.
 * Usage: node scripts/migrate-users.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_DIR = path.join(__dirname, '..', 'data', 'users');

async function migrateUsers() {
  console.log('🚀 Starting user migration...\n');
  
  try {
    const files = await fs.readdir(USERS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} user files to migrate.\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const file of jsonFiles) {
      const filePath = path.join(USERS_DIR, file);
      
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const user = JSON.parse(data);
        
        // Check if already migrated
        if (user.membershipTier !== undefined) {
          console.log(`⏭️  Skipping ${user.username} (already migrated)`);
          skipped++;
          continue;
        }
        
        // Add new membership fields
        const now = new Date();
        const updatedUser = {
          ...user,
          // Membership tier
          membershipTier: 'free',
          membershipExpires: null,
          
          // Monthly counters
          gamesCreatedThisMonth: 0,
          aiCoversUsedThisMonth: 0,
          aiSpritesUsedThisMonth: 0,
          monthlyResetDate: now.toISOString(),
          
          // Daily counters
          promptsToday: 0,
          playsToday: 0,
          dailyResetDate: now.toISOString(),
          
          // Rate limiting
          recentRequests: [],
          rateLimitedUntil: null,
          
          // Upgrade prompt tracking
          hasSeenUpgradePrompt: false,
          lastLoginAt: user.lastLoginAt || null
        };
        
        // Write updated user
        await fs.writeFile(filePath, JSON.stringify(updatedUser, null, 2));
        
        console.log(`✅ Migrated ${user.username}`);
        migrated++;
        
      } catch (err) {
        console.error(`❌ Error migrating ${file}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors}`);
    console.log('='.repeat(50));
    
    if (migrated > 0) {
      console.log('\n🎉 Migration complete! All users now have membership fields.');
    }
    
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('📁 No users directory found. Nothing to migrate.');
    } else {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    }
  }
}

// Run migration
migrateUsers();
