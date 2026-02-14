/**
 * JSON File → PostgreSQL Migration Script
 * 
 * Reads all users and projects from the data/ JSON files
 * and inserts them into a Postgres database.
 * 
 * Prerequisites:
 *   1. Set DATABASE_URL in your .env file
 *   2. Run the schema first: psql $DATABASE_URL -f server/db/schema.sql
 *      (or this script will attempt to apply it automatically)
 * 
 * Usage:
 *   node scripts/migrate-to-postgres.js
 * 
 * Flags:
 *   --dry-run    Show what would be migrated without writing
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const DRY_RUN = process.argv.includes('--dry-run');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in environment or .env file');
  console.error('   Set it to your Neon/Railway/Supabase connection string.');
  process.exit(1);
}

// Dynamic import to avoid loading pg when not needed
const pg = await import('pg');
const { Pool } = pg.default;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function applySchema() {
  const schemaPath = path.join(__dirname, '..', 'server', 'db', 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf-8');
  await pool.query(schema);
  console.log('📦 Schema applied successfully');
}

async function readJsonFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    const items = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const data = await fs.readFile(path.join(dir, file), 'utf-8');
        items.push(JSON.parse(data));
      } catch (err) {
        console.warn(`  ⚠️ Skipping ${file}: ${err.message}`);
      }
    }
    return items;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`  📁 Directory not found: ${dir}`);
      return [];
    }
    throw err;
  }
}

async function migrateUsers(users) {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const u of users) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY] Would migrate user: ${u.username} (${u.id})`);
        inserted++;
        continue;
      }

      const result = await pool.query(`
        INSERT INTO users (
          id, username, display_name, password_hash, status, is_admin,
          membership_tier, membership_expires, stripe_customer_id, stripe_subscription_id,
          games_created_month, ai_covers_used_month, ai_sprites_used_month,
          monthly_reset_date, prompts_today, plays_today, daily_reset_date,
          rate_limited_until, has_seen_upgrade_prompt, project_count,
          approved_at, denied_at, created_at, last_login_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23, $24
        )
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          display_name = EXCLUDED.display_name,
          password_hash = EXCLUDED.password_hash,
          status = EXCLUDED.status,
          is_admin = EXCLUDED.is_admin,
          membership_tier = EXCLUDED.membership_tier
        RETURNING (xmax = 0) AS is_insert
      `, [
        u.id,
        u.username,
        u.displayName || u.username,
        u.passwordHash,
        u.status || 'pending',
        u.isAdmin || false,
        u.membershipTier || 'free',
        u.membershipExpires || null,
        u.stripeCustomerId || null,
        u.stripeSubscriptionId || null,
        u.gamesCreatedThisMonth || 0,
        u.aiCoversUsedThisMonth || 0,
        u.aiSpritesUsedThisMonth || 0,
        u.monthlyResetDate || null,
        u.promptsToday || 0,
        u.playsToday || 0,
        u.dailyResetDate || null,
        u.rateLimitedUntil || null,
        u.hasSeenUpgradePrompt || false,
        u.projectCount || 0,
        u.approvedAt || null,
        u.deniedAt || null,
        u.createdAt || new Date().toISOString(),
        u.lastLoginAt || null,
      ]);

      if (result.rows[0].is_insert) {
        inserted++;
        console.log(`  ✅ Inserted user: ${u.username}`);
      } else {
        updated++;
        console.log(`  🔄 Updated user: ${u.username}`);
      }
    } catch (err) {
      console.error(`  ❌ Error migrating user ${u.username}: ${err.message}`);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

async function migrateProjects(projects) {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const p of projects) {
    try {
      if (DRY_RUN) {
        console.log(`  [DRY] Would migrate project: ${p.title} (${p.id})`);
        inserted++;
        continue;
      }

      const result = await pool.query(`
        INSERT INTO projects (
          id, user_id, title, code, creator_name, category,
          is_public, is_draft, multiplayer, views, likes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          code = EXCLUDED.code,
          updated_at = EXCLUDED.updated_at
        RETURNING (xmax = 0) AS is_insert
      `, [
        p.id,
        p.userId || null,
        p.title || 'Untitled',
        p.code || '',
        p.creatorName || 'Anonymous',
        p.category || 'other',
        p.isPublic || false,
        p.isDraft || false,
        p.multiplayer || false,
        p.views || 0,
        p.likes || 0,
        p.createdAt || new Date().toISOString(),
        p.updatedAt || p.createdAt || new Date().toISOString(),
      ]);

      if (result.rows[0].is_insert) {
        inserted++;
        console.log(`  ✅ Inserted project: ${p.title} (${p.id})`);
      } else {
        updated++;
        console.log(`  🔄 Updated project: ${p.title} (${p.id})`);
      }

      // Migrate versions
      if (p.versions && p.versions.length > 0) {
        await pool.query('DELETE FROM project_versions WHERE project_id = $1', [p.id]);
        for (const v of p.versions) {
          await pool.query(
            'INSERT INTO project_versions (project_id, version_id, code, title, auto_save, saved_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [p.id, v.versionId, v.code, v.title || null, v.autoSave || false, v.savedAt || new Date().toISOString()]
          );
        }
        console.log(`    📋 Migrated ${p.versions.length} version(s) for ${p.id}`);
      }
    } catch (err) {
      console.error(`  ❌ Error migrating project ${p.id}: ${err.message}`);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

async function migrate() {
  console.log('═══════════════════════════════════════════');
  console.log('  JSON → PostgreSQL Migration');
  console.log('═══════════════════════════════════════════');
  if (DRY_RUN) console.log('  ⚠️  DRY RUN - no changes will be made\n');

  // Step 1: Apply schema
  console.log('\n📦 Step 1: Applying database schema...');
  if (!DRY_RUN) {
    await applySchema();
  } else {
    console.log('  [DRY] Would apply schema');
  }

  // Step 2: Read JSON files
  console.log('\n📁 Step 2: Reading JSON data files...');
  const users = await readJsonFiles(USERS_DIR);
  const projects = await readJsonFiles(PROJECTS_DIR);
  console.log(`  Found ${users.length} user(s) and ${projects.length} project(s)`);

  // Step 3: Migrate users
  console.log('\n👤 Step 3: Migrating users...');
  const userStats = await migrateUsers(users);
  console.log(`  Summary: ${userStats.inserted} inserted, ${userStats.updated} updated, ${userStats.errors} errors`);

  // Step 4: Migrate projects
  console.log('\n🎮 Step 4: Migrating projects...');
  const projectStats = await migrateProjects(projects);
  console.log(`  Summary: ${projectStats.inserted} inserted, ${projectStats.updated} updated, ${projectStats.errors} errors`);

  // Step 5: Verify
  if (!DRY_RUN) {
    console.log('\n✅ Step 5: Verification...');
    const { rows: [userCount] } = await pool.query('SELECT COUNT(*) FROM users');
    const { rows: [projectCount] } = await pool.query('SELECT COUNT(*) FROM projects');
    console.log(`  Database now has: ${userCount.count} users, ${projectCount.count} projects`);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Migration complete!');
  if (!DRY_RUN) {
    console.log('  Set DATABASE_URL in your .env and restart the server.');
    console.log('  The server will automatically use Postgres.');
  }
  console.log('═══════════════════════════════════════════\n');

  await pool.end();
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err);
  pool.end();
  process.exit(1);
});
