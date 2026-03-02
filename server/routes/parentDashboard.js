/**
 * Parent Dashboard Routes
 *
 * Provides a parent-facing portal authenticated via email-token flow.
 * Parents can view their child's activity, request data export/deletion,
 * and revoke consent.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { readUser, writeUser, listProjects, readProject, writeProject } from '../services/storage.js';
import { exportUserData, deleteUserData, sendConsentEmail } from '../services/consent.js';
import { logAdminAction } from '../services/adminAuditLog.js';
import { SITE_NAME, SUPPORT_EMAIL, BASE_URL } from '../config/index.js';

const router = Router();

// In-memory parent session tokens (parentEmail -> { token, expiresAt })
const parentSessions = new Map();
const PARENT_SESSION_TTL = 30 * 60 * 1000; // 30 minutes

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

  // Set a cookie-like header with the session token for subsequent API calls
  res.redirect(`/parent-dashboard.html?session=${token}`);
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

    const childData = children.map((child) => ({
      userId: child.id,
      username: child.username,
      displayName: child.displayName,
      ageBracket: child.ageBracket,
      createdAt: child.createdAt,
      lastLoginAt: child.lastLoginAt,
      tier: child.tier || 'free',
      consentStatus: child.consentStatus,
    }));

    res.json({ children: childData });
  } catch (err) {
    console.error('Parent dashboard - list children error:', err);
    res.status(500).json({ error: 'Failed to load children data' });
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

export default router;
