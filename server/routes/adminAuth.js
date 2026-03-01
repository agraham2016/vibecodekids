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
  send2FACode,
  verifyEmailCode,
  confirm2FASetup,
  disable2FA,
  getAdmin2FAEmail,
} from '../services/admin2FA.js';

const router = Router();
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || ADMIN_SECRET;
if (!ADMIN_TOKEN_SECRET) {
  console.error('FATAL: ADMIN_TOKEN_SECRET or ADMIN_SECRET must be set. Admin auth disabled.');
}
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

/** GET /api/admin/auth/status — public, returns whether 2FA is enabled and email */
router.get('/auth/status', async (_req, res) => {
  try {
    const enabled = await is2FAEnabled();
    const email = getAdmin2FAEmail();
    res.json({ twoFactorEnabled: enabled, email });
  } catch (err) {
    console.error('Admin 2FA status error:', err);
    res.status(500).json({ error: 'Could not check 2FA status' });
  }
});

/** POST /api/admin/auth/login — validates admin key, sends code if 2FA enabled, returns ok or needs2FA */
router.post('/auth/login', async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  try {
    const enabled = await is2FAEnabled();
    if (enabled) {
      const { sent } = await send2FACode();
      return res.json({
        needs2FA: true,
        email: getAdmin2FAEmail(),
        emailSent: sent,
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** POST /api/admin/auth/verify-2fa — validates admin key + email code, returns token */
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
    if (!cfg.enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }
    if (!(await verifyEmailCode(code))) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }
    const token = createAdminToken();
    res.json({ ok: true, token });
  } catch (err) {
    console.error('Admin 2FA verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/** POST /api/admin/auth/setup-2fa — sends code to admin email to confirm setup */
router.post('/auth/setup-2fa', requireAdminKeyOrToken, async (_req, res) => {
  try {
    const enabled = await is2FAEnabled();
    if (enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }
    const { sent, email } = await send2FACode();
    res.json({ ok: true, email, emailSent: sent });
  } catch (err) {
    console.error('Admin 2FA setup error:', err);
    let msg;
    if (err.code === 'EACCES' || err.code === 'EROFS') {
      msg = 'Cannot write config (read-only filesystem). Set DATA_DIR to a writable path, e.g. /tmp/data';
    } else if (err.code === 'ENOENT') {
      msg = 'Data directory not found. Set DATA_DIR in your .env to a writable path.';
    } else {
      msg = `Could not send verification code: ${err.message || String(err)}`;
    }
    res.status(500).json({ error: msg });
  }
});

/** POST /api/admin/auth/confirm-2fa — verifies code and enables 2FA */
router.post('/auth/confirm-2fa', requireAdminKeyOrToken, async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }
  try {
    const ok = await confirm2FASetup(code);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid or expired code. Check your email and try again.' });
    }
    res.json({ ok: true, message: '2FA enabled. Future logins will require a code from your email.' });
  } catch (err) {
    console.error('Admin 2FA confirm error:', err);
    res.status(500).json({ error: 'Could not enable 2FA' });
  }
});

/** POST /api/admin/auth/disable-2fa — disables 2FA (no code required when already authenticated) */
router.post('/auth/disable-2fa', requireAdminKeyOrToken, async (_req, res) => {
  try {
    const cfg = await readAdmin2FA();
    if (!cfg.enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
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
