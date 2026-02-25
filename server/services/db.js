/**
 * Postgres Storage Service
 * 
 * Same interface as storage.js but backed by PostgreSQL.
 * Activated when DATABASE_URL is set in environment.
 */

import pg from 'pg';
import { DATABASE_URL } from '../config/index.js';

const { Pool } = pg;

let pool = null;

/**
 * Get or create the connection pool.
 */
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('⚠️ Unexpected Postgres pool error:', err.message);
    });
  }
  return pool;
}

/**
 * Run the schema SQL to initialize tables.
 */
export async function initDatabase() {
  const db = getPool();
  const { promises: fs } = await import('fs');
  const { fileURLToPath } = await import('url');
  const path = await import('path');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

  const schema = await fs.readFile(schemaPath, 'utf-8');
  await db.query(schema);
  console.log('📦 Database schema initialized');
}

// ========== HELPER: Map DB row to app-format user object ==========

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    status: row.status,
    isAdmin: row.is_admin,
    createdAt: row.created_at?.toISOString(),
    approvedAt: row.approved_at?.toISOString() || null,
    deniedAt: row.denied_at?.toISOString() || null,
    membershipTier: row.membership_tier,
    membershipExpires: row.membership_expires?.toISOString() || null,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    gamesCreatedThisMonth: row.games_created_month,
    aiCoversUsedThisMonth: row.ai_covers_used_month,
    aiSpritesUsedThisMonth: row.ai_sprites_used_month,
    monthlyResetDate: row.monthly_reset_date?.toISOString() || null,
    promptsToday: row.prompts_today,
    playsToday: row.plays_today,
    dailyResetDate: row.daily_reset_date?.toISOString() || null,
    rateLimitedUntil: row.rate_limited_until?.toISOString() || null,
    hasSeenUpgradePrompt: row.has_seen_upgrade_prompt,
    projectCount: row.project_count,
    lastLoginAt: row.last_login_at?.toISOString() || null,
    // COPPA fields
    ageBracket: row.age_bracket || 'unknown',
    parentEmail: row.parent_email || null,
    recoveryEmail: row.recovery_email || null,
    parentalConsentStatus: row.parental_consent_status || 'not_required',
    parentalConsentAt: row.parental_consent_at?.toISOString() || null,
    dataDeletionRequested: row.data_deletion_requested || false,
    dataDeletionAt: row.data_deletion_at?.toISOString() || null,
    privacyAcceptedAt: row.privacy_accepted_at?.toISOString() || null,
    // ESA / ClassWallet fields
    paymentMethod: row.payment_method || 'stripe',
    classwalletOrderId: row.classwallet_order_id || null,
    esaBillingPeriod: row.esa_billing_period || null,
    // Rate limit requests are stored in a separate table for Postgres
    recentRequests: [],
  };
}

function userToRow(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    password_hash: user.passwordHash,
    status: user.status || 'pending',
    is_admin: user.isAdmin || false,
    membership_tier: user.membershipTier || 'free',
    membership_expires: user.membershipExpires || null,
    stripe_customer_id: user.stripeCustomerId || null,
    stripe_subscription_id: user.stripeSubscriptionId || null,
    games_created_month: user.gamesCreatedThisMonth || 0,
    ai_covers_used_month: user.aiCoversUsedThisMonth || 0,
    ai_sprites_used_month: user.aiSpritesUsedThisMonth || 0,
    monthly_reset_date: user.monthlyResetDate || null,
    prompts_today: user.promptsToday || 0,
    plays_today: user.playsToday || 0,
    daily_reset_date: user.dailyResetDate || null,
    rate_limited_until: user.rateLimitedUntil || null,
    has_seen_upgrade_prompt: user.hasSeenUpgradePrompt || false,
    project_count: user.projectCount || 0,
    // COPPA fields
    age_bracket: user.ageBracket || 'unknown',
    parent_email: user.parentEmail || null,
    recovery_email: user.recoveryEmail || null,
    parental_consent_status: user.parentalConsentStatus || 'not_required',
    parental_consent_at: user.parentalConsentAt || null,
    data_deletion_requested: user.dataDeletionRequested || false,
    data_deletion_at: user.dataDeletionAt || null,
    privacy_accepted_at: user.privacyAcceptedAt || null,
    approved_at: user.approvedAt || null,
    denied_at: user.deniedAt || null,
    created_at: user.createdAt || new Date().toISOString(),
    last_login_at: user.lastLoginAt || null,
    // ESA / ClassWallet fields
    payment_method: user.paymentMethod || 'stripe',
    classwallet_order_id: user.classwalletOrderId || null,
    esa_billing_period: user.esaBillingPeriod || null,
  };
}

// ========== HELPER: Map DB row to app-format project object ==========

function rowToProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    code: row.code,
    creatorName: row.creator_name,
    category: row.category,
    isPublic: row.is_public,
    isDraft: row.is_draft,
    multiplayer: row.multiplayer,
    views: row.views,
    likes: row.likes,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString(),
    // Versions loaded separately
    versions: [],
  };
}

// ========== USER OPERATIONS ==========

export async function readUser(userId) {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) {
    const err = new Error(`User not found: ${userId}`);
    err.code = 'ENOENT';
    throw err;
  }
  return rowToUser(rows[0]);
}

export async function writeUser(userId, userData) {
  const db = getPool();
  const r = userToRow(userData);

  await db.query(`
    INSERT INTO users (
      id, username, display_name, password_hash, status, is_admin,
      membership_tier, membership_expires, stripe_customer_id, stripe_subscription_id,
      games_created_month, ai_covers_used_month, ai_sprites_used_month,
      monthly_reset_date, prompts_today, plays_today, daily_reset_date,
      rate_limited_until, has_seen_upgrade_prompt, project_count,
      age_bracket, parent_email, recovery_email, parental_consent_status, parental_consent_at,
      data_deletion_requested, data_deletion_at, privacy_accepted_at,
      approved_at, denied_at, created_at, last_login_at,
      payment_method, classwallet_order_id, esa_billing_period
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19, $20,
      $21, $22, $23, $24, $25,
      $26, $27, $28,
      $29, $30, $31, $32,
      $33, $34, $35
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      password_hash = EXCLUDED.password_hash,
      status = EXCLUDED.status,
      is_admin = EXCLUDED.is_admin,
      membership_tier = EXCLUDED.membership_tier,
      membership_expires = EXCLUDED.membership_expires,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      games_created_month = EXCLUDED.games_created_month,
      ai_covers_used_month = EXCLUDED.ai_covers_used_month,
      ai_sprites_used_month = EXCLUDED.ai_sprites_used_month,
      monthly_reset_date = EXCLUDED.monthly_reset_date,
      prompts_today = EXCLUDED.prompts_today,
      plays_today = EXCLUDED.plays_today,
      daily_reset_date = EXCLUDED.daily_reset_date,
      rate_limited_until = EXCLUDED.rate_limited_until,
      has_seen_upgrade_prompt = EXCLUDED.has_seen_upgrade_prompt,
      project_count = EXCLUDED.project_count,
      age_bracket = EXCLUDED.age_bracket,
      parent_email = EXCLUDED.parent_email,
      recovery_email = EXCLUDED.recovery_email,
      parental_consent_status = EXCLUDED.parental_consent_status,
      parental_consent_at = EXCLUDED.parental_consent_at,
      data_deletion_requested = EXCLUDED.data_deletion_requested,
      data_deletion_at = EXCLUDED.data_deletion_at,
      privacy_accepted_at = EXCLUDED.privacy_accepted_at,
      approved_at = EXCLUDED.approved_at,
      denied_at = EXCLUDED.denied_at,
      last_login_at = EXCLUDED.last_login_at,
      payment_method = EXCLUDED.payment_method,
      classwallet_order_id = EXCLUDED.classwallet_order_id,
      esa_billing_period = EXCLUDED.esa_billing_period
  `, [
    r.id, r.username, r.display_name, r.password_hash, r.status, r.is_admin,
    r.membership_tier, r.membership_expires, r.stripe_customer_id, r.stripe_subscription_id,
    r.games_created_month, r.ai_covers_used_month, r.ai_sprites_used_month,
    r.monthly_reset_date, r.prompts_today, r.plays_today, r.daily_reset_date,
    r.rate_limited_until, r.has_seen_upgrade_prompt, r.project_count,
    r.age_bracket, r.parent_email, r.recovery_email, r.parental_consent_status, r.parental_consent_at,
    r.data_deletion_requested, r.data_deletion_at, r.privacy_accepted_at,
    r.approved_at, r.denied_at, r.created_at, r.last_login_at,
    r.payment_method, r.classwallet_order_id, r.esa_billing_period
  ]);
}

export async function userExists(userId) {
  const db = getPool();
  const { rows } = await db.query('SELECT 1 FROM users WHERE id = $1', [userId]);
  return rows.length > 0;
}

export async function listUsers() {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(rowToUser);
}

export async function findUserBySubscriptionId(subscriptionId) {
  const db = getPool();
  const { rows } = await db.query(
    'SELECT * FROM users WHERE stripe_subscription_id = $1 LIMIT 1',
    [subscriptionId]
  );
  if (rows.length === 0) return null;
  return rowToUser(rows[0]);
}

// ========== PROJECT OPERATIONS ==========

export async function readProject(projectId) {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (rows.length === 0) {
    const err = new Error(`Project not found: ${projectId}`);
    err.code = 'ENOENT';
    throw err;
  }

  const project = rowToProject(rows[0]);

  // Load versions
  const versionsResult = await db.query(
    'SELECT version_id, code, title, auto_save, saved_at FROM project_versions WHERE project_id = $1 ORDER BY saved_at ASC',
    [projectId]
  );
  project.versions = versionsResult.rows.map(v => ({
    versionId: v.version_id,
    code: v.code,
    title: v.title,
    autoSave: v.auto_save,
    savedAt: v.saved_at?.toISOString(),
  }));

  return project;
}

export async function writeProject(projectId, projectData) {
  const db = getPool();

  await db.query(`
    INSERT INTO projects (
      id, user_id, title, code, creator_name, category,
      is_public, is_draft, multiplayer, views, likes,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      code = EXCLUDED.code,
      creator_name = EXCLUDED.creator_name,
      category = EXCLUDED.category,
      is_public = EXCLUDED.is_public,
      is_draft = EXCLUDED.is_draft,
      multiplayer = EXCLUDED.multiplayer,
      views = EXCLUDED.views,
      likes = EXCLUDED.likes,
      updated_at = EXCLUDED.updated_at
  `, [
    projectId,
    projectData.userId || null,
    projectData.title,
    projectData.code,
    projectData.creatorName || 'Anonymous',
    projectData.category || 'other',
    projectData.isPublic || false,
    projectData.isDraft || false,
    projectData.multiplayer || false,
    projectData.views || 0,
    projectData.likes || 0,
    projectData.createdAt || new Date().toISOString(),
    projectData.updatedAt || new Date().toISOString(),
  ]);

  // Sync versions: delete existing and re-insert
  // (Simple approach -- fine for <=20 versions per project)
  if (projectData.versions && projectData.versions.length > 0) {
    await db.query('DELETE FROM project_versions WHERE project_id = $1', [projectId]);

    for (const v of projectData.versions) {
      await db.query(
        'INSERT INTO project_versions (project_id, version_id, code, title, auto_save, saved_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [projectId, v.versionId, v.code, v.title || null, v.autoSave || false, v.savedAt || new Date().toISOString()]
      );
    }
  }
}

export async function deleteProject(projectId) {
  const db = getPool();
  const { rowCount } = await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
  if (rowCount === 0) {
    const err = new Error(`Project not found: ${projectId}`);
    err.code = 'ENOENT';
    throw err;
  }
}

export async function listProjects() {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
  return rows.map(rowToProject);
}

// ========== ESA ORDER OPERATIONS ==========

export async function createEsaOrder({ orderRef, userId, tier, billingPeriod, amountCents }) {
  const db = getPool();
  await db.query(
    `INSERT INTO esa_orders (order_ref, user_id, tier, billing_period, amount_cents)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderRef, userId, tier, billingPeriod, amountCents]
  );
}

export async function getEsaOrder(orderRef) {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM esa_orders WHERE order_ref = $1', [orderRef]);
  return rows[0] || null;
}

export async function updateEsaOrderStatus(orderRef, status, extra = {}) {
  const db = getPool();
  const sets = ['status = $2'];
  const vals = [orderRef, status];
  let idx = 3;
  if (status === 'confirmed') { sets.push(`confirmed_at = $${idx++}`); vals.push(new Date().toISOString()); }
  if (status === 'paid')      { sets.push(`paid_at = $${idx++}`);      vals.push(new Date().toISOString()); }
  if (extra.classwalletTxn)   { sets.push(`classwallet_txn = $${idx++}`); vals.push(extra.classwalletTxn); }
  await db.query(`UPDATE esa_orders SET ${sets.join(', ')} WHERE order_ref = $1`, vals);
}

export async function listEsaOrders(statusFilter) {
  const db = getPool();
  let query = 'SELECT * FROM esa_orders ORDER BY created_at DESC';
  const vals = [];
  if (statusFilter) {
    query = 'SELECT * FROM esa_orders WHERE status = $1 ORDER BY created_at DESC';
    vals.push(statusFilter);
  }
  const { rows } = await db.query(query, vals);
  return rows;
}

// ========== ESA WAITLIST OPERATIONS ==========

export async function addEsaWaitlist(email) {
  const db = getPool();
  await db.query(
    'INSERT INTO esa_waitlist (email) VALUES ($1) ON CONFLICT DO NOTHING',
    [email]
  );
}

export async function listEsaWaitlist() {
  const db = getPool();
  const { rows } = await db.query('SELECT * FROM esa_waitlist ORDER BY created_at DESC');
  return rows;
}

export async function countEsaWaitlist() {
  const db = getPool();
  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM esa_waitlist');
  return rows[0].count;
}

// ========== DATA DIRECTORY SETUP (no-op for Postgres) ==========

export async function ensureDataDirs() {
  // Postgres doesn't need data directories.
  // Instead, ensure the schema is applied.
  await initDatabase();
}
