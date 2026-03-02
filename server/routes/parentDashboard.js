/**
 * Parent Command Center API Routes
 *
 * Authenticated via ?token= (parent dashboard token), NOT user session.
 * Parents receive this token in the consent-approval confirmation page.
 *
 * GET  /api/parent/dashboard?token=...         — child's account summary
 * POST /api/parent/dashboard/toggle            — toggle publishing / multiplayer
 * POST /api/parent/dashboard/delete            — request data deletion
 * POST /api/parent/dashboard/revoke            — revoke consent + deactivate
 * GET  /api/parent/dashboard/export?token=...  — download all child data as JSON
 */

import { Router } from 'express';
import { readUser, writeUser, listProjects, readProject, writeProject } from '../services/storage.js';
import { getUserByParentToken, exportUserData, deleteUserData } from '../services/consent.js';
import { logAdminAction } from '../services/adminAuditLog.js';

const router = Router();

async function authenticateParent(req, res) {
  const token = req.query.token || req.body?.token;
  if (!token) {
    res.status(401).json({ error: 'Parent dashboard token is required' });
    return null;
  }
  const user = await getUserByParentToken(token);
  if (!user) {
    res.status(404).json({ error: 'Invalid or expired parent token' });
    return null;
  }
  return user;
}

// GET dashboard summary
router.get('/', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    res.json({
      username: user.username,
      displayName: user.displayName,
      ageBracket: user.ageBracket,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      membershipTier: user.membershipTier,
      parentalConsentStatus: user.parentalConsentStatus,
      parentalConsentAt: user.parentalConsentAt,
      parentVerifiedMethod: user.parentVerifiedMethod || 'email_plus',
      consentPolicyVersion: user.consentPolicyVersion || null,
      publishingEnabled: user.publishingEnabled ?? false,
      multiplayerEnabled: user.multiplayerEnabled ?? false,
      projectCount: user.projectCount || 0,
      improvementOptOut: user.improvementOptOut ?? false,
    });
  } catch (error) {
    console.error('Parent dashboard error:', error);
    res.status(500).json({ error: 'Could not load dashboard' });
  }
});

// POST toggle settings
router.post('/toggle', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    const { setting, enabled } = req.body;
    const ALLOWED_TOGGLES = ['publishingEnabled', 'multiplayerEnabled', 'improvementOptOut'];

    if (!ALLOWED_TOGGLES.includes(setting)) {
      return res.status(400).json({ error: 'Invalid setting' });
    }

    user[setting] = Boolean(enabled);
    await writeUser(user.id, user);

    logAdminAction({ action: 'parent_toggle', targetId: user.id, details: { username: user.username, setting, enabled: Boolean(enabled) } }).catch(() => {});
    res.json({ success: true, [setting]: user[setting] });
  } catch (error) {
    console.error('Parent toggle error:', error);
    res.status(500).json({ error: 'Could not update setting' });
  }
});

// GET export child data
router.get('/export', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    const data = await exportUserData(user.id);
    logAdminAction({ action: 'parent_data_export', targetId: user.id, details: { username: user.username } }).catch(() => {});
    res.json(data);
  } catch (error) {
    console.error('Parent export error:', error);
    res.status(500).json({ error: 'Could not export data' });
  }
});

// POST delete all child data
router.post('/delete', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    const result = await deleteUserData(user.id);
    logAdminAction({ action: 'parent_data_deletion', targetId: user.id, details: { username: user.username, deletedProjects: result.deletedProjects } }).catch(() => {});
    res.json({
      success: true,
      message: `Account anonymized and ${result.deletedProjects} project(s) deleted. This cannot be undone.`,
    });
  } catch (error) {
    console.error('Parent delete error:', error);
    res.status(500).json({ error: 'Could not delete data' });
  }
});

// GET pending games awaiting parent approval
router.get('/pending-games', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    const allProjects = await listProjects();
    const pending = allProjects
      .filter(p => p.userId === user.id && p.pendingParentApproval)
      .map(p => ({ id: p.id, title: p.title, category: p.category, createdAt: p.createdAt }));

    res.json({ pendingGames: pending });
  } catch (error) {
    console.error('Pending games error:', error);
    res.status(500).json({ error: 'Could not load pending games' });
  }
});

// POST approve a pending game for publication
router.post('/approve-game', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const project = await readProject(projectId);
    if (project.userId !== user.id) {
      return res.status(403).json({ error: 'This game does not belong to your child' });
    }
    if (!project.pendingParentApproval) {
      return res.status(400).json({ error: 'This game is not awaiting approval' });
    }

    project.isPublic = true;
    project.pendingParentApproval = false;
    project.parentApprovedAt = new Date().toISOString();
    await writeProject(projectId, project);

    logAdminAction({ action: 'parent_approve_game', targetId: projectId, details: { username: user.username, title: project.title } }).catch(() => {});
    res.json({ success: true, message: 'Game approved and published!' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Game not found' });
    console.error('Approve game error:', error);
    res.status(500).json({ error: 'Could not approve game' });
  }
});

// POST deny a pending game (keep private)
router.post('/deny-game', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const project = await readProject(projectId);
    if (project.userId !== user.id) {
      return res.status(403).json({ error: 'This game does not belong to your child' });
    }

    project.isPublic = false;
    project.pendingParentApproval = false;
    await writeProject(projectId, project);

    logAdminAction({ action: 'parent_deny_game', targetId: projectId, details: { username: user.username, title: project.title } }).catch(() => {});
    res.json({ success: true, message: 'Game kept private.' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Game not found' });
    console.error('Deny game error:', error);
    res.status(500).json({ error: 'Could not process request' });
  }
});

// POST revoke consent (deactivate account without deleting data)
router.post('/revoke', async (req, res) => {
  try {
    const user = await authenticateParent(req, res);
    if (!user) return;

    user.parentalConsentStatus = 'revoked';
    user.status = 'suspended';
    user.publishingEnabled = false;
    user.multiplayerEnabled = false;
    await writeUser(user.id, user);

    logAdminAction({ action: 'consent_revoked', targetId: user.id, details: { username: user.username } }).catch(() => {});
    res.json({
      success: true,
      message: 'Consent revoked. Your child\'s account has been deactivated. Data is preserved but the account cannot be used until consent is re-granted.',
    });
  } catch (error) {
    console.error('Parent revoke error:', error);
    res.status(500).json({ error: 'Could not revoke consent' });
  }
});

export default router;
