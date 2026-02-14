/**
 * Authentication Middleware
 * 
 * Session validation, user extraction, and admin access control.
 */

import { ADMIN_SECRET } from '../config/index.js';
import { readUser } from '../services/storage.js';

/**
 * Extract user from session token (non-blocking).
 * Attaches req.userId, req.session if valid token found.
 */
export function extractUser(sessions) {
  return (req, _res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const session = sessions.get(token);
      if (session) {
        req.userId = session.userId;
        req.session = session;
        req.authToken = token;
      }
    }
    next();
  };
}

/**
 * Require a valid logged-in user.
 */
export function requireAuth(sessions) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const session = sessions.get(token);
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
 * Require admin access via ADMIN_SECRET header or isAdmin user flag.
 */
export function requireAdmin(sessions) {
  return async (req, res, next) => {
    // Method 1: Admin secret header
    const adminKey = req.headers['x-admin-key'];
    if (ADMIN_SECRET && adminKey === ADMIN_SECRET) {
      return next();
    }

    // Method 2: Logged-in user with isAdmin flag
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const session = sessions.get(token);
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
    }

    return res.status(401).json({ error: 'Admin access required' });
  };
}
