/**
 * Admin 2FA (TOTP) service
 *
 * Stores TOTP secret in data/admin_2fa.json. When enabled, admin login
 * requires password + 6-digit code from Google Authenticator.
 */

import { promises as fs } from 'fs';
import path from 'path';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { DATA_DIR } from '../config/index.js';

const ADMIN_2FA_FILE = path.join(DATA_DIR, 'admin_2fa.json');

/**
 * Read admin 2FA config. Returns { secret, enabled } or null if not set.
 */
export async function readAdmin2FA() {
  try {
    const raw = await fs.readFile(ADMIN_2FA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return { secret: null, enabled: false };
    throw err;
  }
}

/**
 * Write admin 2FA config.
 */
async function writeAdmin2FA(config) {
  await fs.mkdir(path.dirname(ADMIN_2FA_FILE), { recursive: true });
  await fs.writeFile(ADMIN_2FA_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Check if 2FA is enabled for admin.
 */
export async function is2FAEnabled() {
  const cfg = await readAdmin2FA();
  return !!cfg.enabled && !!cfg.secret;
}

/**
 * Generate new TOTP secret and return otpauth URL + QR code data URL.
 * Does not persist — caller must call confirm2FASetup after user verifies.
 */
export async function generate2FASecret() {
  const secret = speakeasy.generateSecret({
    name: 'Vibe Code Studio Admin',
    length: 20,
  });
  const otpauthUrl = secret.otpauth_url;
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200 });
  return { secret: secret.base32, otpauthUrl, qrDataUrl };
}

/**
 * Verify TOTP code against a secret. Allows ±1 time step for clock drift.
 */
export function verifyTOTP(secret, token) {
  if (!secret || !token || typeof token !== 'string') return false;
  const code = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
}

/**
 * Confirm 2FA setup: verify code against pending secret, then persist.
 */
export async function confirm2FASetup(secret, token) {
  if (!verifyTOTP(secret, token)) return false;
  await writeAdmin2FA({ secret, enabled: true });
  return true;
}

/**
 * Disable 2FA (admin must be authenticated).
 */
export async function disable2FA() {
  await writeAdmin2FA({ secret: null, enabled: false });
}
