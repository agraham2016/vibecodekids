/**
 * Authentication Middleware
 *
 * Session validation, user extraction, and admin access control.
 */

import { readUser } from '../services/storage.js';
import { is2FAEnabled } from '../services/admin2FA.js';
import { verifyAdminToken } from '../routes/adminAuth.js';

const TOKEN_ROTATION_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

function getReqContext(req) {
  return {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Extract user from session token (non-blocking).
 * Attaches req.userId, req.session if valid token found.
 * Handles sliding token rotation every 4 hours.
 */
export function extractUser(sessions) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const session = await sessions.get(token, getReqContext(req));
      if (session) {
        req.userId = session.userId;
        req.session = session;
        req.authToken = token;

        // Bind IP/UA on first request if not yet set
        if (!session.boundIp) {
          session.boundIp = req.ip || req.connection?.remoteAddress;
          session.boundUserAgent = req.headers['user-agent'];
          sessions.set(token, session);
        }

        // Sliding token rotation
        const lastRotation = session.rotatedAt || session.createdAt || 0;
        if (Date.now() - lastRotation > TOKEN_ROTATION_INTERVAL_MS && sessions.rotate) {
          const newToken = sessions.rotate(token);
          if (newToken) {
            req.authToken = newToken;
            res.setHeader('X-New-Token', newToken);
          }
        }
      }
    }
    next();
  };
}

/**
 * Require a valid logged-in user.
 */
export function requireAuth(sessions) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const session = await sessions.get(token, getReqContext(req));
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    req.userId = session.userId;
    req.session = session;
    req.authToken = token;
    next();
  };
}

/**
 * Require admin access via admin 2FA token or isAdmin user flag.
 *
 * Static ADMIN_SECRET header auth was removed (security hardening —
 * static credentials can leak and bypass audit trails).
 */
export function requireAdmin(sessions) {
  return async (req, res, next) => {
    const bearerToken = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!bearerToken) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    // Path 1: Admin 2FA token (when 2FA is enabled)
    if (bearerToken.length > 50) {
      const twoFactorOn = await is2FAEnabled();
      if (twoFactorOn && verifyAdminToken(bearerToken)) {
        return next();
      }
    }

    // Path 2: Logged-in user with isAdmin flag
    const session = await sessions.get(bearerToken, getReqContext(req));
    if (session) {
      try {
        const user = await readUser(session.userId);
        if (user.isAdmin) {
          return next();
        }
      } catch {
        // Fall through to unauthorized
      }
    }

    return res.status(401).json({ error: 'Admin access required' });
  };
}
