/**
 * Admin auth routes — login, 2FA verification, setup
 *
 * These routes run BEFORE requireAdmin so we can handle two-step login.
 * POST /api/admin/auth/login, /verify-2fa, /setup-2fa, /confirm-2fa
 * GET  /api/admin/auth/status
 */

import { Router } from 'express';
import crypto from 'crypto';
import { ADMIN_SECRET } from '../config/index.js';
import {
  is2FAEnabled,
  readAdmin2FA,
  generate2FASecret,
  verifyTOTP,
  confirm2FASetup,
  disable2FA,
} from '../services/admin2FA.js';

const router = Router();
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || ADMIN_SECRET || 'fallback-admin-token-secret';
const ADMIN_TOKEN_EXPIRY_HOURS = 8;

function createAdminToken() {
  const payload = JSON.stringify({ admin: true, exp: Date.now() + ADMIN_TOKEN_EXPIRY_HOURS * 3600 * 1000 });
  const sig = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

function verifyAdminToken(token) {
  if (!token) return false;
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const expected = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(JSON.stringify({ admin: payload.admin, exp: payload.exp })).digest('base64url');
    if (sig !== expected) return false;
    if (payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Middleware: require x-admin-key OR valid admin token (for setup/disable when already logged in with 2FA) */
function requireAdminKeyOrToken(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (ADMIN_SECRET && key === ADMIN_SECRET) return next();
  const bearer = req.headers.authorization?.replace('Bearer ', '').trim();
  if (bearer && bearer.length > 50 && verifyAdminToken(bearer)) return next();
  return res.status(401).json({ error: 'Invalid admin key' });
}

/** GET /api/admin/auth/status — public, returns whether 2FA is enabled */
router.get('/auth/status', async (_req, res) => {
  try {
    const enabled = await is2FAEnabled();
    res.json({ twoFactorEnabled: enabled });
  } catch (err) {
    console.error('Admin 2FA status error:', err);
    res.status(500).json({ error: 'Could not check 2FA status' });
  }
});

/** POST /api/admin/auth/login — validates admin key, returns ok or needs2FA */
router.post('/auth/login', async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  try {
    const enabled = await is2FAEnabled();
    if (enabled) {
      return res.json({ needs2FA: true });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** POST /api/admin/auth/verify-2fa — validates admin key + TOTP code, returns token */
router.post('/auth/verify-2fa', async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  const code = req.body?.code;
  if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }
  try {
    const cfg = await readAdmin2FA();
    if (!cfg.enabled || !cfg.secret) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }
    if (!(await verifyTOTP(cfg.secret, code))) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }
    const token = createAdminToken();
    res.json({ ok: true, token });
  } catch (err) {
    console.error('Admin 2FA verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/** POST /api/admin/auth/setup-2fa — requires admin key only, returns secret for manual entry */
router.post('/auth/setup-2fa', requireAdminKeyOrToken, async (_req, res) => {
  try {
    const enabled = await is2FAEnabled();
    if (enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }
    const { secret, otpauthUrl } = await generate2FASecret();
    res.json({ secret, otpauthUrl });
  } catch (err) {
    console.error('Admin 2FA setup error:', err);
    res.status(500).json({ error: 'Could not generate 2FA secret' });
  }
});

/** POST /api/admin/auth/confirm-2fa — requires admin key + code, enables 2FA */
router.post('/auth/confirm-2fa', requireAdminKeyOrToken, async (req, res) => {
  const { secret, code } = req.body || {};
  if (!secret || !code) {
    return res.status(400).json({ error: 'Secret and code are required' });
  }
  try {
    const ok = await confirm2FASetup(secret, code);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid code. Add the secret to your app and try again.' });
    }
    res.json({ ok: true, message: '2FA enabled. Future logins will require your authenticator app.' });
  } catch (err) {
    console.error('Admin 2FA confirm error:', err);
    res.status(500).json({ error: 'Could not enable 2FA' });
  }
});

/** POST /api/admin/auth/disable-2fa — requires admin key + code, disables 2FA */
router.post('/auth/disable-2fa', requireAdminKeyOrToken, async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Code is required to disable 2FA' });
  }
  try {
    const cfg = await readAdmin2FA();
    if (!cfg.enabled || !cfg.secret) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }
    if (!(await verifyTOTP(cfg.secret, code))) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    await disable2FA();
    res.json({ ok: true, message: '2FA disabled.' });
  } catch (err) {
    console.error('Admin 2FA disable error:', err);
    res.status(500).json({ error: 'Could not disable 2FA' });
  }
});

export default router;
export { verifyAdminToken };
