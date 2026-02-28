/**
 * Admin 2FA (Email OTP) service
 *
 * When enabled, admin login requires password + 6-digit code sent to admin email.
 * Uses Resend (same as consent/password-reset) for delivery.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomInt } from 'crypto';
import { DATA_DIR, SITE_NAME, SUPPORT_EMAIL } from '../config/index.js';

const ADMIN_2FA_FILE = path.join(DATA_DIR, 'admin_2fa.json');
const ADMIN_2FA_EMAIL = process.env.ADMIN_2FA_EMAIL || SUPPORT_EMAIL;
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Read admin 2FA config. Returns { enabled, email, pendingCode?, pendingExpiresAt? }.
 */
export async function readAdmin2FA() {
  try {
    const raw = await fs.readFile(ADMIN_2FA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return { enabled: false, email: ADMIN_2FA_EMAIL };
    throw err;
  }
}

async function writeAdmin2FA(config) {
  await fs.mkdir(path.dirname(ADMIN_2FA_FILE), { recursive: true });
  await fs.writeFile(ADMIN_2FA_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Check if 2FA is enabled for admin.
 */
export async function is2FAEnabled() {
  const cfg = await readAdmin2FA();
  return !!cfg.enabled;
}

/**
 * Get the admin 2FA email address.
 */
export function getAdmin2FAEmail() {
  return ADMIN_2FA_EMAIL;
}

/**
 * Generate a 6-digit code, store it with expiry, and send to email.
 * Used for both login step 2 and setup confirmation.
 */
export async function send2FACode() {
  let cfg = await readAdmin2FA();
  // Migrate from old TOTP format: remove secret so we use email flow
  if (cfg.secret) {
    cfg = { enabled: cfg.enabled, email: ADMIN_2FA_EMAIL };
    await writeAdmin2FA(cfg);
  }
  const email = cfg.email || ADMIN_2FA_EMAIL;
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS).toISOString();

  const updated = { ...cfg, pendingCode: code, pendingExpiresAt: expiresAt };
  await writeAdmin2FA(updated);

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const subject = `${SITE_NAME}: Your admin verification code`;
  const body = `
Your admin portal verification code is:

  ${code}

This code expires in 10 minutes.

If you didn't request this, someone may have entered your admin password. Change your ADMIN_SECRET if you're concerned.

- The ${SITE_NAME} Team
`;

  if (RESEND_API_KEY) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${SITE_NAME} <${SUPPORT_EMAIL}>`,
          to: [email],
          subject,
          text: body,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.error('📧 Admin 2FA email failed:', resp.status, errBody);
        return { sent: false };
      }
      console.log(`📧 Admin 2FA code sent to ${email}`);
      return { sent: true, email };
    } catch (err) {
      console.error('📧 Admin 2FA email error:', err.message);
      return { sent: false };
    }
  }
  console.log('═══════════════════════════════════════════');
  console.log(`📧 ADMIN 2FA CODE (RESEND_API_KEY not set — logging only)`);
  console.log(`   To: ${email}`);
  console.log(`   Code: ${code}`);
  console.log('═══════════════════════════════════════════');
  return { sent: false, email };
}

/**
 * Verify the code against the stored pending code. Clears pending if valid.
 */
export async function verifyEmailCode(code) {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(trimmed)) return false;

  const cfg = await readAdmin2FA();
  const { pendingCode, pendingExpiresAt } = cfg;
  if (!pendingCode || !pendingExpiresAt) return false;
  if (new Date(pendingExpiresAt) < new Date()) {
    await writeAdmin2FA({ ...cfg, pendingCode: null, pendingExpiresAt: null });
    return false;
  }
  if (pendingCode !== trimmed) return false;

  await writeAdmin2FA({ ...cfg, pendingCode: null, pendingExpiresAt: null });
  return true;
}

/**
 * Confirm 2FA setup: verify pending code, then enable 2FA.
 */
export async function confirm2FASetup(code) {
  const valid = await verifyEmailCode(code);
  if (!valid) return false;
  const cfg = await readAdmin2FA();
  await writeAdmin2FA({ ...cfg, enabled: true, email: ADMIN_2FA_EMAIL });
  return true;
}

/**
 * Disable 2FA (admin must be authenticated).
 */
export async function disable2FA() {
  const cfg = await readAdmin2FA();
  await writeAdmin2FA({ enabled: false, email: null, pendingCode: null, pendingExpiresAt: null });
}
