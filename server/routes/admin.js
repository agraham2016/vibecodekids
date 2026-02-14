/**
 * Admin Routes
 * 
 * User management, project oversight, stats, tier management.
 * All routes are protected by requireAdmin middleware in index.js.
 */

import { Router } from 'express';
import { readUser, writeUser, listUsers, listProjects, deleteProject } from '../services/storage.js';
import { getUsageStats } from '../services/ai.js';

const router = Router();

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await listUsers();
    const safeUsers = users
      .map(({ passwordHash, parentEmail, ...rest }) => ({
        ...rest,
        // Show redacted parent email for admin awareness (COPPA)
        hasParentEmail: !!parentEmail,
        parentEmailDomain: parentEmail ? parentEmail.split('@')[1] : null,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(safeUsers);
  } catch (error) {
    if (error.code === 'ENOENT') return res.json([]);
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Could not load users' });
  }
});

// Approve user
router.post('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const user = await readUser(id);
    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    await writeUser(id, user);

    res.json({ success: true, message: 'User approved' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Could not approve user' });
  }
});

// Deny user
router.post('/users/:id/deny', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const user = await readUser(id);
    user.status = 'denied';
    user.deniedAt = new Date().toISOString();
    await writeUser(id, user);

    res.json({ success: true, message: 'User denied' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Deny user error:', error);
    res.status(500).json({ error: 'Could not deny user' });
  }
});

// Get all projects (admin view)
router.get('/projects', async (req, res) => {
  try {
    const allProjects = await listProjects();
    const projects = allProjects
      .map(p => ({
        id: p.id,
        title: p.title,
        creatorName: p.creatorName,
        category: p.category,
        isPublic: p.isPublic,
        createdAt: p.createdAt,
        views: p.views || 0,
        likes: p.likes || 0
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(projects);
  } catch (error) {
    if (error.code === 'ENOENT') return res.json([]);
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Could not load projects' });
  }
});

// Delete project
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-z0-9]{6}$/.test(id)) return res.status(400).json({ error: 'Invalid project ID' });

    await deleteProject(id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Could not delete project' });
  }
});

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    let totalUsers = 0, pendingUsers = 0, approvedUsers = 0, deniedUsers = 0;

    try {
      const users = await listUsers();
      totalUsers = users.length;
      for (const user of users) {
        if (user.status === 'pending') pendingUsers++;
        else if (user.status === 'approved') approvedUsers++;
        else if (user.status === 'denied') deniedUsers++;
      }
    } catch { /* ignore */ }

    let totalProjects = 0;
    try {
      const projects = await listProjects();
      totalProjects = projects.length;
    } catch { /* ignore */ }

    res.json({ totalUsers, pendingUsers, approvedUsers, deniedUsers, totalProjects });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Could not load stats' });
  }
});

// Set user tier (admin gifting/testing)
router.post('/users/:id/set-tier', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, months = 1 } = req.body;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });
    if (!['free', 'creator', 'pro'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });

    const user = await readUser(id);
    user.membershipTier = tier;

    if (tier !== 'free') {
      const expireDate = new Date();
      expireDate.setMonth(expireDate.getMonth() + months);
      user.membershipExpires = expireDate.toISOString();
    } else {
      user.membershipExpires = null;
    }

    await writeUser(id, user);

    res.json({
      success: true,
      message: `User upgraded to ${tier} for ${months} month(s)`,
      tier: user.membershipTier,
      expires: user.membershipExpires
    });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Set tier error:', error);
    res.status(500).json({ error: 'Could not update tier' });
  }
});

// AI usage stats
router.get('/ai-usage', (_req, res) => {
  try {
    const stats = getUsageStats();
    res.json(stats);
  } catch (error) {
    console.error('AI usage error:', error);
    res.status(500).json({ error: 'Could not load AI usage stats' });
  }
});

export default router;
