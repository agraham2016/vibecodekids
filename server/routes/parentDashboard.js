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
import { readUser, writeUser } from '../services/storage.js';
import { getUserByParentToken, exportUserData, deleteUserData } from '../services/consent.js';

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

    console.log(`Parent toggled ${setting}=${enabled} for ${user.username}`);
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
    res.json({
      success: true,
      message: `Account anonymized and ${result.deletedProjects} project(s) deleted. This cannot be undone.`,
    });
  } catch (error) {
    console.error('Parent delete error:', error);
    res.status(500).json({ error: 'Could not delete data' });
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

    console.log(`Parent revoked consent for ${user.username}`);
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
