/**
 * Parental Consent Service
 * 
 * Handles COPPA-compliant parental consent flow:
 * - Generate consent tokens and send to parent email
 * - Verify consent tokens
 * - Track consent status per user
 * 
 * Email delivery is abstracted behind sendConsentEmail().
 * Currently logs to console; replace with real email provider (SendGrid, SES, etc.)
 */

import { randomBytes } from 'crypto';
import { 
  CONSENT_TOKEN_EXPIRY_MS, 
  BASE_URL, 
  SITE_NAME, 
  SUPPORT_EMAIL,
  COPPA_AGE_THRESHOLD 
} from '../config/index.js';
import { readUser, writeUser } from './storage.js';

// ========== CONSENT TOKEN STORE ==========
// File-based for now, Postgres table available when DATABASE_URL is set.
// This simple in-memory + file approach works for low volume.

import { promises as fs } from 'fs';
import path from 'path';
import { DATA_DIR, USE_POSTGRES } from '../config/index.js';

const CONSENT_FILE = path.join(DATA_DIR, 'consents.json');

let consentTokens = new Map();

async function loadConsents() {
  if (USE_POSTGRES) return; // Postgres uses the parental_consents table
  try {
    const data = await fs.readFile(CONSENT_FILE, 'utf-8');
    const entries = JSON.parse(data);
    consentTokens = new Map(entries);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not load consents:', err.message);
  }
}

async function saveConsents() {
  if (USE_POSTGRES) return;
  try {
    await fs.writeFile(CONSENT_FILE, JSON.stringify(Array.from(consentTokens.entries()), null, 2));
  } catch (err) {
    console.error('Could not save consents:', err.message);
  }
}

// Load on import
await loadConsents();

// ========== AGE BRACKET HELPERS ==========

export function getAgeBracket(age) {
  if (typeof age !== 'number' || age < 0) return 'unknown';
  if (age < COPPA_AGE_THRESHOLD) return 'under13';
  if (age < 18) return '13to17';
  return '18plus';
}

export function requiresParentalConsent(ageBracket) {
  return ageBracket === 'under13';
}

// ========== TOKEN GENERATION ==========

function generateConsentToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Create a consent request for a child user.
 * Returns the token (for verification URL construction).
 */
export async function createConsentRequest(userId, parentEmail, action = 'consent') {
  const token = generateConsentToken();
  const now = Date.now();
  const expiresAt = now + CONSENT_TOKEN_EXPIRY_MS;

  const consent = {
    token,
    userId,
    parentEmail,
    action,
    status: 'pending',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    respondedAt: null,
  };

  if (USE_POSTGRES) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    await pool.query(`
      INSERT INTO parental_consents (token, user_id, parent_email, action, status, created_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [token, userId, parentEmail, action, 'pending', consent.createdAt, consent.expiresAt]);
  } else {
    consentTokens.set(token, consent);
    await saveConsents();
  }

  return token;
}

/**
 * Look up a consent request by token.
 */
export async function getConsentByToken(token) {
  if (USE_POSTGRES) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM parental_consents WHERE token = $1',
      [token]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      token: r.token,
      userId: r.user_id,
      parentEmail: r.parent_email,
      action: r.action,
      status: r.status,
      createdAt: r.created_at?.toISOString(),
      expiresAt: r.expires_at?.toISOString(),
      respondedAt: r.responded_at?.toISOString() || null,
    };
  } else {
    return consentTokens.get(token) || null;
  }
}

/**
 * Mark a consent request as granted or denied.
 * @param {string} verificationMethod - 'email_plus' or 'stripe_micro'
 */
export async function resolveConsent(token, granted, verificationMethod = 'email_plus') {
  const status = granted ? 'granted' : 'denied';
  const now = new Date().toISOString();

  if (USE_POSTGRES) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    await pool.query(
      'UPDATE parental_consents SET status = $1, responded_at = $2 WHERE token = $3',
      [status, now, token]
    );
  } else {
    const consent = consentTokens.get(token);
    if (consent) {
      consent.status = status;
      consent.respondedAt = now;
      consent.verificationMethod = verificationMethod;
      await saveConsents();
    }
  }
}

/**
 * Generate a parent dashboard access token for a given user.
 * This token is emailed to the parent and gives them access to the
 * Parent Command Center for their child's account.
 */
export async function createParentDashboardToken(userId) {
  const token = randomBytes(32).toString('hex');
  const user = await readUser(userId);
  user.parentDashboardToken = token;
  await writeUser(userId, user);
  return token;
}

/**
 * Look up a user by their parent dashboard token.
 */
export async function getUserByParentToken(token) {
  if (!token) return null;
  if (USE_POSTGRES) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE parent_dashboard_token = $1',
      [token]
    );
    if (rows.length === 0) return null;
    return readUser(rows[0].id);
  } else {
    const { listUsers } = await import('./storage.js');
    const users = await listUsers();
    return users.find(u => u.parentDashboardToken === token) || null;
  }
}

// ========== CONSENT EMAIL ==========

/**
 * Send parental consent email.
 * 
 * TODO: Replace console.log with real email provider (SendGrid, SES, Resend, etc.)
 * For now, logs the consent URL so you can manually verify during development.
 */
export async function sendConsentEmail(parentEmail, childUsername, token, action = 'consent') {
  const consentUrl = `${BASE_URL}/api/parent/verify?token=${token}&action=grant`;
  const denyUrl = `${BASE_URL}/api/parent/verify?token=${token}&action=deny`;

  const subject = action === 'consent'
    ? `${SITE_NAME}: Your child wants to create an account`
    : action === 'data_access'
      ? `${SITE_NAME}: Data access request for your child's account`
      : `${SITE_NAME}: Data deletion request for your child's account`;

  const body = action === 'consent' 
    ? `
Hi there!

Your child (username: ${childUsername}) wants to create an account on ${SITE_NAME},
a kid-friendly game creation platform where kids ages 7-18 build games with AI.

Under COPPA (Children's Online Privacy Protection Act), we need your permission
before your child (under ${COPPA_AGE_THRESHOLD}) can use our platform.

WHAT WE COLLECT:
- Username and display name (no real names required)
- Age bracket (under 13 / 13-17 / 18+) — we do NOT store the exact age
- Games they create on the platform
- Basic anonymized usage data

THIRD-PARTY SERVICE PROVIDERS:
- AI Generation: Your child's game-creation prompts are sent to Anthropic (Claude)
  and/or xAI (Grok) to generate game code. We strip personal information from
  prompts before transmission. These providers process data under contract and
  do not use children's data for their own training.
- Email: We use Resend to deliver this email and other transactional messages.
- Payments: If you upgrade, Stripe processes payment. We do not send your child's
  information to Stripe.

WHAT WE DO NOT COLLECT:
- Real name, home address, or phone number
- Precise location or GPS data
- Photos, videos, or audio recordings

YOUR RIGHTS AS A PARENT:
After approving, you will receive a link to the Parent Command Center where you can:
- Review all data collected about your child
- Toggle public game publishing ON or OFF (default: OFF)
- Toggle multiplayer features ON or OFF (default: OFF)
- Request deletion of all your child's data
- Revoke consent and deactivate the account

To APPROVE your child's account:
${consentUrl}

To DENY this request:
${denyUrl}

This link expires in 72 hours.

If you didn't expect this email, you can safely ignore it.

Questions? Contact us at ${SUPPORT_EMAIL}
Privacy Policy: ${BASE_URL}/privacy

- The ${SITE_NAME} Team
`
    : `
Hi there!

A request has been made regarding your child's account (username: ${childUsername}) 
on ${SITE_NAME}.

Action requested: ${action === 'data_access' ? 'View all stored data' : 'Delete all stored data'}

To APPROVE this request:
${consentUrl}

To DENY this request:
${denyUrl}

This link expires in 72 hours.

Questions? Contact us at ${SUPPORT_EMAIL}

- The ${SITE_NAME} Team
`;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (RESEND_API_KEY) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${SITE_NAME} <${SUPPORT_EMAIL}>`,
          to: [parentEmail],
          subject,
          text: body,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.error('📧 Email delivery failed:', resp.status, errBody);
      } else {
        console.log('Consent email sent successfully');
      }
    } catch (err) {
      console.error('📧 Email delivery error:', err.message);
    }
  } else {
    console.log('═══════════════════════════════════════════');
    console.log(`📧 CONSENT EMAIL (RESEND_API_KEY not set — logging only)`);
    console.log('   To: [redacted]');
    console.log(`   Subject: ${subject}`);
    console.log(`   Approve: ${consentUrl}`);
    console.log(`   Deny:    ${denyUrl}`);
    console.log('═══════════════════════════════════════════');
  }

  return { sent: !!RESEND_API_KEY, to: parentEmail, consentUrl, denyUrl };
}

// ========== PASSWORD RESET EMAIL ==========

/**
 * Send password reset email.
 * Used for under-13 (to parent) and 13+ (to recovery email).
 */
export async function sendPasswordResetEmail(to, username, token) {
  const resetUrl = `${BASE_URL}/forgot-password/reset?token=${token}`;
  const subject = `${SITE_NAME}: Reset your password`;
  const body = `
Hi there!

Someone requested a password reset for the account "${username}" on ${SITE_NAME}.

To set a new password, click here:
${resetUrl}

This link expires in 1 hour.

If you didn't request this, you can safely ignore this email. Your password will not be changed.

Questions? Contact us at ${SUPPORT_EMAIL}

- The ${SITE_NAME} Team
`;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (RESEND_API_KEY) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${SITE_NAME} <${SUPPORT_EMAIL}>`,
          to: [to],
          subject,
          text: body,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.error('📧 Password reset email failed:', resp.status, errBody);
      } else {
        console.log(`📧 Password reset email sent to ${to}`);
      }
    } catch (err) {
      console.error('📧 Password reset email error:', err.message);
    }
  } else {
    console.log('═══════════════════════════════════════════');
    console.log(`📧 PASSWORD RESET EMAIL (RESEND_API_KEY not set — logging only)`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Reset URL: ${resetUrl}`);
    console.log('═══════════════════════════════════════════');
  }

  return { sent: !!RESEND_API_KEY, to, resetUrl };
}

// ========== USER DATA EXPORT (COPPA Right to Access) ==========

/**
 * Export all data associated with a child user.
 * Parents have the right to review data collected about their child.
 */
export async function exportUserData(userId) {
  const { listProjects } = await import('./storage.js');
  
  const user = await readUser(userId);
  const allProjects = await listProjects();
  const userProjects = allProjects.filter(p => p.userId === userId);

  // Strip sensitive fields
  const { passwordHash, recentRequests, rateLimitedUntil, ...safeUser } = user;

  return {
    exportedAt: new Date().toISOString(),
    user: safeUser,
    projects: userProjects.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      isPublic: p.isPublic,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      // Code included for full transparency
      codeLength: p.code?.length || 0,
    })),
    projectCount: userProjects.length,
  };
}

// ========== USER DATA DELETION (COPPA Right to Delete) ==========

/**
 * Delete all data associated with a child user.
 * Parents have the right to request deletion of their child's data.
 */
export async function deleteUserData(userId) {
  const { listProjects, deleteProject } = await import('./storage.js');
  
  // Delete all user projects
  const allProjects = await listProjects();
  const userProjects = allProjects.filter(p => p.userId === userId);
  
  let deletedProjects = 0;
  for (const project of userProjects) {
    try {
      await deleteProject(project.id);
      deletedProjects++;
    } catch (err) {
      console.error(`Could not delete project ${project.id}:`, err.message);
    }
  }

  // Mark user as deleted (anonymize rather than hard-delete to prevent re-registration issues)
  const user = await readUser(userId);
  user.status = 'deleted';
  user.displayName = 'Deleted User';
  user.passwordHash = 'DELETED';
  user.parentEmail = null;
  user.dataDeletionRequested = true;
  user.dataDeletionAt = new Date().toISOString();
  user.recentRequests = [];
  await writeUser(userId, user);

  return { deletedProjects, userAnonymized: true };
}
