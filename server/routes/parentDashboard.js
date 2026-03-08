/**
 * Parent Dashboard Routes
 *
 * Provides a parent-facing portal authenticated via email-token flow.
 * Parents can view their child's activity, request data export/deletion,
 * and revoke consent.
 */

import { Router } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { readUser, writeUser, listProjects } from '../services/storage.js';
import { exportUserData, deleteUserData, getUserByParentToken } from '../services/consent.js';
import { logAdminAction } from '../services/adminAuditLog.js';
import { SITE_NAME, SUPPORT_EMAIL, BASE_URL, STRIPE_SECRET_KEY, MEMBERSHIP_TIERS } from '../config/index.js';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const router = Router();

// In-memory parent session tokens (parentEmail -> { token, expiresAt })
const parentSessions = new Map();
const PARENT_SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// In-memory 6-digit verification codes (email -> { code, expiresAt, attempts })
const portalCodes = new Map();
const PORTAL_CODE_TTL = 15 * 60 * 1000; // 15 minutes
const PORTAL_CODE_MAX_ATTEMPTS = 5;

// Rate limit: max 3 code requests per email per hour
const codeRequestCounts = new Map();
const CODE_REQUEST_WINDOW = 60 * 60 * 1000; // 1 hour
const CODE_REQUEST_MAX = 3;

function generateParentToken() {
  return crypto.randomBytes(32).toString('hex');
}

function findChildrenByParentEmail(users, parentEmail) {
  return users.filter(
    (u) => u.parentEmail && u.parentEmail.toLowerCase() === parentEmail.toLowerCase() && u.status !== 'deleted',
  );
}

/**
 * POST /api/parent-dashboard/request-access
 * Send a magic link to the parent's email address.
 */
router.post('/request-access', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const token = generateParentToken();
  parentSessions.set(token, {
    email: normalizedEmail,
    expiresAt: Date.now() + PARENT_SESSION_TTL,
  });

  const dashboardUrl = `${BASE_URL}/api/parent-dashboard/auth?token=${token}`;

  try {
    const { Resend } = await import('resend');
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: `${SITE_NAME} <noreply@${new URL(BASE_URL).hostname}>`,
        to: normalizedEmail,
        subject: `${SITE_NAME} - Parent Dashboard Access`,
        html: `
          <h2>Parent Dashboard Access</h2>
          <p>Click the link below to access your parent dashboard. This link expires in 30 minutes.</p>
          <p><a href="${dashboardUrl}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Parent Dashboard</a></p>
          <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #666; font-size: 12px;">— ${SITE_NAME} Team (${SUPPORT_EMAIL})</p>
        `,
      });
    } else {
      console.log(`📧 [DEV] Parent dashboard link for ${normalizedEmail}: ${dashboardUrl}`);
    }
  } catch (err) {
    console.error('Failed to send parent dashboard email:', err.message);
  }

  // Always return success to avoid email enumeration
  res.json({ ok: true, message: 'If an account exists with that email, a dashboard link has been sent.' });
});

/**
 * POST /api/parent-dashboard/portal-request-code
 * Send a 6-digit verification code to a parent's email.
 */
router.post('/portal-request-code', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit: max N code requests per email per hour
  const now = Date.now();
  const reqLog = codeRequestCounts.get(normalizedEmail);
  if (reqLog && now - reqLog.windowStart < CODE_REQUEST_WINDOW && reqLog.count >= CODE_REQUEST_MAX) {
    return res.json({ ok: true, message: 'If an account exists with that email, a code has been sent.' });
  }
  if (!reqLog || now - reqLog.windowStart >= CODE_REQUEST_WINDOW) {
    codeRequestCounts.set(normalizedEmail, { windowStart: now, count: 1 });
  } else {
    reqLog.count++;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  portalCodes.set(normalizedEmail, { code, expiresAt: now + PORTAL_CODE_TTL, attempts: 0 });

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${SITE_NAME} <${SUPPORT_EMAIL}>`,
          to: [normalizedEmail],
          subject: `${SITE_NAME} - Parent Portal Access Code`,
          text: `Your Parent Portal verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\n- The ${SITE_NAME} Team`,
        }),
      });
    } else {
      console.log(`📧 [DEV] Parent portal code for ${normalizedEmail}: ${code}`);
    }
  } catch (err) {
    console.error('Failed to send portal code email:', err.message);
  }

  res.json({ ok: true, message: 'If an account exists with that email, a code has been sent.' });
});

/**
 * POST /api/parent-dashboard/portal-verify-code
 * Verify the 6-digit code and return a session token.
 */
router.post('/portal-verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const entry = portalCodes.get(normalizedEmail);

  if (!entry || Date.now() > entry.expiresAt) {
    portalCodes.delete(normalizedEmail);
    return res.status(401).json({ error: 'Code expired or not found. Please request a new one.' });
  }

  if (entry.attempts >= PORTAL_CODE_MAX_ATTEMPTS) {
    portalCodes.delete(normalizedEmail);
    return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
  }

  entry.attempts++;

  if (entry.code !== String(code).trim()) {
    return res
      .status(401)
      .json({ error: `Incorrect code. ${PORTAL_CODE_MAX_ATTEMPTS - entry.attempts} attempts remaining.` });
  }

  portalCodes.delete(normalizedEmail);

  // Create a parent session
  const sessionToken = generateParentToken();
  parentSessions.set(sessionToken, {
    email: normalizedEmail,
    expiresAt: Date.now() + PARENT_SESSION_TTL,
  });

  res.json({ ok: true, sessionToken });
});

/**
 * GET /api/parent-dashboard/auth?token=...
 * Validate the magic link token and redirect to the dashboard page.
 */
router.get('/auth', (req, res) => {
  const { token } = req.query;
  const session = parentSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    parentSessions.delete(token);
    return res
      .status(401)
      .send('<html><body><h2>Link expired or invalid.</h2><p>Please request a new dashboard link.</p></body></html>');
  }

  res.redirect(`/parent-dashboard?session=${token}`);
});

/**
 * GET /api/parent-dashboard/auth-token?token=...
 * Accept a parentDashboardToken (from consent/Stripe verification) and convert
 * it into a parent session for the dashboard.
 */
router.get('/auth-token', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('<html><body><h2>Missing token.</h2></body></html>');
  }

  try {
    const user = await getUserByParentToken(token);
    if (!user || !user.parentEmail) {
      return res
        .status(401)
        .send(
          '<html><body><h2>Invalid or expired token.</h2><p>Please request a new dashboard link.</p></body></html>',
        );
    }

    const sessionToken = generateParentToken();
    parentSessions.set(sessionToken, {
      email: user.parentEmail.toLowerCase(),
      expiresAt: Date.now() + PARENT_SESSION_TTL,
    });

    res.redirect(`/parent-dashboard?session=${sessionToken}`);
  } catch {
    res.status(500).send('<html><body><h2>Something went wrong.</h2><p>Please try again.</p></body></html>');
  }
});

/**
 * Middleware: validate parent session token from query or Authorization header
 */
function requireParentAuth(req, res, next) {
  const token = req.query.session || req.headers.authorization?.replace('Bearer ', '');
  const session = parentSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (token) parentSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please request a new dashboard link.' });
  }

  req.parentEmail = session.email;
  req.parentToken = token;
  next();
}

/**
 * GET /api/parent-dashboard/children
 * List all children associated with the parent's email.
 */
router.get('/children', requireParentAuth, async (req, res) => {
  try {
    const { listUsers } = await import('../services/storage.js');
    const users = await listUsers();
    const children = findChildrenByParentEmail(users, req.parentEmail);

    const childData = children.map((child) => {
      const tier = child.membershipTier || child.tier || 'free';
      const tierInfo = MEMBERSHIP_TIERS[tier] || MEMBERSHIP_TIERS.free;
      return {
        userId: child.id,
        username: child.username,
        displayName: child.displayName,
        ageBracket: child.ageBracket,
        createdAt: child.createdAt,
        lastLoginAt: child.lastLoginAt,
        tier,
        tierName: tierInfo.name || tier,
        tierPrice: tierInfo.price || 0,
        membershipExpires: child.membershipExpires || null,
        hasStripeSubscription: !!child.stripeCustomerId,
        consentStatus: child.parentalConsentStatus || child.consentStatus,
        consentDate: child.parentalConsentAt || null,
        consentVersion: child.consentPolicyVersion || null,
        publishingEnabled: !!child.publishingEnabled,
        multiplayerEnabled: !!child.multiplayerEnabled,
      };
    });

    res.json({ children: childData });
  } catch (err) {
    console.error('Parent dashboard - list children error:', err);
    res.status(500).json({ error: 'Failed to load children data' });
  }
});

/**
 * POST /api/parent-dashboard/child/:userId/toggle
 * Toggle publishing or multiplayer for a child account.
 */
router.post('/child/:userId/toggle', requireParentAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { setting } = req.body;

    if (!['publishingEnabled', 'multiplayerEnabled'].includes(setting)) {
      return res.status(400).json({ error: 'Invalid setting. Use publishingEnabled or multiplayerEnabled.' });
    }

    const user = await readUser(userId);
    if (!user.parentEmail || user.parentEmail.toLowerCase() !== req.parentEmail.toLowerCase()) {
      return res.status(403).json({ error: "You can only manage your own children's settings" });
    }

    user[setting] = !user[setting];
    await writeUser(userId, user);

    logAdminAction({
      action: 'parent_toggle',
      targetId: userId,
      details: { setting, newValue: user[setting], parentEmail: req.parentEmail },
    }).catch(() => {});

    res.json({ ok: true, [setting]: user[setting] });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Child not found' });
    console.error('Parent dashboard - toggle error:', err);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

/**
 * GET /api/parent-dashboard/child/:userId/activity
 * View a specific child's activity summary.
 */
router.get('/child/:userId/activity', requireParentAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await readUser(userId);

    if (!user.parentEmail || user.parentEmail.toLowerCase() !== req.parentEmail.toLowerCase()) {
      return res.status(403).json({ error: 'You can only view your own children' });
    }

    const allProjects = await listProjects();
    const childProjects = allProjects.filter((p) => p.userId === userId);

    res.json({
      username: user.username,
      displayName: user.displayName,
      lastLoginAt: user.lastLoginAt,
      projectCount: childProjects.length,
      projects: childProjects.slice(0, 20).map((p) => ({
        id: p.id,
        title: p.title,
        createdAt: p.createdAt,
        likes: p.likes || 0,
        isPublic: p.isPublic,
      })),
      generationCount: user.recentRequests?.length || 0,
    });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Child not found' });
    console.error('Parent dashboard - child activity error:', err);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

/**
 * POST /api/parent-dashboard/child/:userId/export
 * Request data export for a child.
 */
router.post('/child/:userId/export', requireParentAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await readUser(userId);

    if (!user.parentEmail || user.parentEmail.toLowerCase() !== req.parentEmail.toLowerCase()) {
      return res.status(403).json({ error: "You can only export your own children's data" });
    }

    const data = await exportUserData(userId);
    logAdminAction({ action: 'parent_data_export', targetId: userId, details: { parentEmail: req.parentEmail } }).catch(
      () => {},
    );
    res.json({ export: data });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Child not found' });
    console.error('Parent dashboard - export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * DELETE /api/parent-dashboard/child/:userId
 * Delete all data for a child (revoke consent).
 */
router.delete('/child/:userId', requireParentAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await readUser(userId);

    if (!user.parentEmail || user.parentEmail.toLowerCase() !== req.parentEmail.toLowerCase()) {
      return res.status(403).json({ error: "You can only delete your own children's data" });
    }

    const result = await deleteUserData(userId);
    logAdminAction({
      action: 'parent_data_deletion',
      targetId: userId,
      details: { parentEmail: req.parentEmail },
    }).catch(() => {});
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Child not found' });
    console.error('Parent dashboard - delete error:', err);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

/**
 * POST /api/parent-dashboard/child/:userId/manage-subscription
 * Open Stripe Customer Portal for a child's subscription.
 */
router.post('/child/:userId/manage-subscription', requireParentAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await readUser(userId);

    if (!user.parentEmail || user.parentEmail.toLowerCase() !== req.parentEmail.toLowerCase()) {
      return res.status(403).json({ error: "You can only manage your own children's subscriptions" });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found for this account' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${BASE_URL}/parent-dashboard?session=${req.parentToken}`,
    });

    logAdminAction({
      action: 'parent_manage_subscription',
      targetId: userId,
      details: { parentEmail: req.parentEmail },
    }).catch(() => {});

    res.json({ ok: true, url: portalSession.url });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Child not found' });
    console.error('Parent dashboard - manage subscription error:', err);
    res.status(500).json({ error: 'Could not open subscription management' });
  }
});

export default router;
