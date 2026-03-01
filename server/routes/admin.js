/**
 * Admin Routes
 * 
 * User management, project oversight, stats, tier management.
 * All routes are protected by requireAdmin middleware in index.js.
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../config/index.js';
import { readUser, writeUser, listUsers, deleteUser, listProjects, deleteProject } from '../services/storage.js';
import { getUsageStats } from '../services/ai.js';
import { getResponseCacheStats, clearResponseCache } from '../services/responseCache.js';
import { getModelPerformanceStats } from '../services/modelPerformance.js';
import { logAdminAction, readAuditLog } from '../services/adminAuditLog.js';
import { getContentFilterStats } from '../services/contentFilterStats.js';
import { readDemoEvents } from '../services/demoEvents.js';
import { listReports, resolveReport } from '../services/moderation.js';
import { runRetentionSweep } from '../services/dataRetention.js';

const router = Router();

function getAdminIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await listUsers();
    const safeUsers = users
      .map(({ passwordHash, parentEmail, ...rest }) => ({
        ...rest,
        hasParentEmail: !!parentEmail,
        parentEmailDomain: parentEmail ? parentEmail.split('@')[1] : null,
        suspendedAt: rest.suspendedAt || null,
        suspendReason: rest.suspendReason || null,
        suspendedUntil: rest.suspendedUntil || null,
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

    logAdminAction({ action: 'approve', targetId: id, details: { username: user.username }, ip: getAdminIp(req) }).catch(() => {});

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

    logAdminAction({ action: 'deny', targetId: id, details: { username: user.username }, ip: getAdminIp(req) }).catch(() => {});

    res.json({ success: true, message: 'User denied' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Deny user error:', error);
    res.status(500).json({ error: 'Could not deny user' });
  }
});

// Reset user password (for support when 13+ user has no recovery email)
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const user = await readUser(id);
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await writeUser(id, user);

    logAdminAction({ action: 'reset-password', targetId: id, details: { username: user.username }, ip: getAdminIp(req) }).catch(() => {});
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Could not reset password' });
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
    logAdminAction({ action: 'delete-project', targetId: id, ip: getAdminIp(req) }).catch(() => {});
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Project not found' });
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Could not delete project' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const deleteProjects = req.query.deleteProjects === 'true';

    if (deleteProjects) {
      try {
        const allProjects = await listProjects();
        const userProjects = allProjects.filter(p => p.userId === id || p.creatorId === id);
        for (const p of userProjects) {
          await deleteProject(p.id);
        }
      } catch { /* ignore if no projects */ }
    }

    await deleteUser(id);
    logAdminAction({ action: 'delete-user', targetId: id, details: { deleteProjects: !!deleteProjects }, ip: getAdminIp(req) }).catch(() => {});
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Could not delete user' });
  }
});

// Suspend user
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const { reason, duration } = req.body;
    if (!reason || typeof reason !== 'string') return res.status(400).json({ error: 'Reason is required' });

    const user = await readUser(id);
    user.status = 'suspended';
    user.suspendedAt = new Date().toISOString();
    user.suspendReason = reason;

    if (duration && duration !== 'indefinite') {
      const until = new Date();
      const hours = parseInt(duration, 10);
      if (!isNaN(hours) && hours > 0) {
        until.setHours(until.getHours() + hours);
        user.suspendedUntil = until.toISOString();
      } else {
        user.suspendedUntil = null;
      }
    } else {
      user.suspendedUntil = null;
    }

    await writeUser(id, user);
    logAdminAction({ action: 'suspend', targetId: id, details: { username: user.username, reason, duration }, ip: getAdminIp(req) }).catch(() => {});
    res.json({ success: true, message: 'User suspended' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Could not suspend user' });
  }
});

// Unsuspend user
router.post('/users/:id/unsuspend', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const user = await readUser(id);
    user.status = 'approved';
    user.suspendedAt = null;
    user.suspendReason = null;
    user.suspendedUntil = null;
    await writeUser(id, user);
    logAdminAction({ action: 'unsuspend', targetId: id, details: { username: user.username }, ip: getAdminIp(req) }).catch(() => {});

    res.json({ success: true, message: 'User unsuspended' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Unsuspend user error:', error);
    res.status(500).json({ error: 'Could not unsuspend user' });
  }
});

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    let totalUsers = 0, pendingUsers = 0, approvedUsers = 0, deniedUsers = 0, suspendedUsers = 0;

    try {
      const users = await listUsers();
      totalUsers = users.length;
      for (const user of users) {
        if (user.status === 'pending') pendingUsers++;
        else if (user.status === 'approved') approvedUsers++;
        else if (user.status === 'denied') deniedUsers++;
        else if (user.status === 'suspended') suspendedUsers++;
      }
    } catch { /* ignore */ }

    let totalProjects = 0;
    try {
      const projects = await listProjects();
      totalProjects = projects.length;
    } catch { /* ignore */ }

    res.json({ totalUsers, pendingUsers, approvedUsers, deniedUsers, suspendedUsers, totalProjects });
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
    if (!['free', 'creator', 'pro', 'tester'].includes(tier)) return res.status(400).json({ error: 'Invalid tier' });

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
    logAdminAction({ action: 'set-tier', targetId: id, details: { username: user.username, tier, months }, ip: getAdminIp(req) }).catch(() => {});

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

// Cache stats (response cache + pattern cache)
router.get('/cache-stats', (_req, res) => {
  try {
    const stats = getResponseCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({ error: 'Could not load cache stats' });
  }
});

// Clear response cache (for testing/debugging)
router.post('/cache-clear', (_req, res) => {
  try {
    clearResponseCache();
    logAdminAction({ action: 'cache-clear', ip: getAdminIp(req) }).catch(() => {});
    res.json({ success: true, message: 'Response cache cleared' });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Could not clear cache' });
  }
});

// Model performance (Claude vs Grok monitoring)
router.get('/model-performance', async (req, res) => {
  try {
    const periodDays = parseInt(req.query.periodDays || '7', 10) || 7;
    const stats = await getModelPerformanceStats({ periodDays });
    res.json(stats);
  } catch (error) {
    console.error('Model performance error:', error);
    res.status(500).json({ error: 'Failed to load model performance stats' });
  }
});

// Opt user out of AI improvement monitoring (COPPA)
router.post('/users/:id/opt-out-improvement', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid user ID' });

    const user = await readUser(id);
    user.improvementOptOut = true;
    await writeUser(id, user);
    logAdminAction({ action: 'opt-out-improvement', targetId: id, details: { username: user.username }, ip: getAdminIp(req) }).catch(() => {});

    res.json({ success: true, message: 'User opted out of AI improvement monitoring' });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'User not found' });
    console.error('Opt-out error:', error);
    res.status(500).json({ error: 'Failed to update opt-out status' });
  }
});

// Audit log (admin actions)
router.get('/audit-log', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const action = req.query.action || null;
    const entries = await readAuditLog({ limit, action });
    res.json({ entries });
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ error: 'Could not load audit log' });
  }
});

// System health (admin-only, returns full health check)
router.get('/health', async (req, res) => {
  try {
    const { USE_POSTGRES, ANTHROPIC_API_KEY, XAI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = await import('../config/index.js');
    const uptime = Math.round(process.uptime());

    const checks = {
      status: 'ok',
      uptime,
      storage: USE_POSTGRES ? 'postgres' : 'file',
      ai: !!ANTHROPIC_API_KEY,
      grok: !!XAI_API_KEY,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    if (USE_POSTGRES) {
      try {
        const { getPool } = await import('../services/db.js');
        const pool = getPool();
        const before = Date.now();
        await pool.query('SELECT 1 AS ok');
        checks.checks.database = { status: 'ok', latencyMs: Date.now() - before };
      } catch (err) {
        checks.checks.database = { status: 'error', error: err.message };
        checks.status = 'degraded';
      }
    } else {
      checks.checks.database = { status: 'skipped', reason: 'Using file storage' };
    }

    const mem = process.memoryUsage();
    checks.checks.memory = {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    };

    if (!STRIPE_SECRET_KEY) checks.checks.stripe = { status: 'missing' };
    else if (!STRIPE_WEBHOOK_SECRET) checks.checks.stripe = { status: 'partial', note: 'Webhook secret not set' };
    else checks.checks.stripe = { status: 'ok' };

    res.json(checks);
  } catch (error) {
    console.error('Admin health error:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Content filter stats
router.get('/content-filter-stats', (_req, res) => {
  try {
    const stats = getContentFilterStats();
    res.json(stats);
  } catch (error) {
    console.error('Content filter stats error:', error);
    res.status(500).json({ error: 'Could not load content filter stats' });
  }
});

// Rate limit stats (users currently rate limited)
router.get('/rate-limit-stats', async (req, res) => {
  try {
    const users = await listUsers();
    const now = Date.now();
    const rateLimited = users.filter(u => {
      const until = u.rateLimitedUntil ? new Date(u.rateLimitedUntil).getTime() : 0;
      return until > now;
    }).map(u => ({
      id: u.id,
      username: u.username,
      rateLimitedUntil: u.rateLimitedUntil,
      status: u.status,
    }));
    res.json({
      count: rateLimited.length,
      users: rateLimited.slice(0, 50),
    });
  } catch (error) {
    console.error('Rate limit stats error:', error);
    res.status(500).json({ error: 'Could not load rate limit stats' });
  }
});

// A/B test stats (Landing Page experiment)
router.get('/ab-stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10) || 30;
    const events = await readDemoEvents({ sinceDays: days });

    const stats = { a: { pageviews: 0, generations: 0, thumbsUp: 0, thumbsDown: 0, signups: 0, visitors: new Set() },
                    b: { pageviews: 0, generations: 0, thumbsUp: 0, thumbsDown: 0, signups: 0, visitors: new Set() } };

    const promptCounts = {};

    for (const e of events) {
      const v = e.variant === 'a' || e.variant === 'b' ? e.variant : 'b';
      const s = stats[v];
      const vid = e.visitorId || e.ipHash || 'unknown';

      if (e.type === 'pageview') { s.pageviews++; s.visitors.add(vid); }
      else if (e.type === 'generation') {
        s.generations++;
        s.visitors.add(vid);
        if (e.prompt) {
          const key = e.prompt.toLowerCase().trim().slice(0, 80);
          if (!promptCounts[key]) promptCounts[key] = { prompt: e.prompt.slice(0, 80), count: 0, thumbsUp: 0 };
          promptCounts[key].count++;
        }
      }
      else if (e.type === 'feedback') {
        if (e.thumbsUp === true) s.thumbsUp++;
        else s.thumbsDown++;
      }
      else if (e.type === 'signup') { s.signups++; }
    }

    // Attach thumbs-up data to prompts
    for (const e of events) {
      if (e.type === 'feedback' && e.thumbsUp && e.generationId) {
        const gen = events.find(g => g.type === 'generation' && g.generationId === e.generationId);
        if (gen?.prompt) {
          const key = gen.prompt.toLowerCase().trim().slice(0, 80);
          if (promptCounts[key]) promptCounts[key].thumbsUp++;
        }
      }
    }

    const topPrompts = Object.values(promptCounts).sort((a, b) => b.count - a.count).slice(0, 15);

    res.json({
      periodDays: days,
      variants: {
        a: { pageviews: stats.a.pageviews, uniqueVisitors: stats.a.visitors.size, generations: stats.a.generations,
             thumbsUp: stats.a.thumbsUp, thumbsDown: stats.a.thumbsDown, signups: stats.a.signups,
             conversionRate: stats.a.pageviews > 0 ? (stats.a.signups / stats.a.pageviews * 100).toFixed(1) + '%' : '0%' },
        b: { pageviews: stats.b.pageviews, uniqueVisitors: stats.b.visitors.size, generations: stats.b.generations,
             thumbsUp: stats.b.thumbsUp, thumbsDown: stats.b.thumbsDown, signups: stats.b.signups,
             conversionRate: stats.b.pageviews > 0 ? (stats.b.signups / stats.b.pageviews * 100).toFixed(1) + '%' : '0%' },
      },
      topPrompts,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error('AB stats error:', error);
    res.status(500).json({ error: 'Could not load A/B stats' });
  }
});

// Data retention — manual sweep trigger
router.post('/retention-sweep', async (req, res) => {
  try {
    const results = await runRetentionSweep();
    logAdminAction({ action: 'retention-sweep', details: results, ip: getAdminIp(req) }).catch(() => {});
    res.json({ success: true, results });
  } catch (error) {
    console.error('Retention sweep error:', error);
    res.status(500).json({ error: 'Retention sweep failed' });
  }
});

// Moderation queue
router.get('/moderation', async (req, res) => {
  try {
    const status = req.query.status || null;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const reports = await listReports({ status, limit });
    res.json({ reports, count: reports.length });
  } catch (error) {
    console.error('Moderation list error:', error);
    res.status(500).json({ error: 'Could not load reports' });
  }
});

router.post('/moderation/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;
    if (!['remove', 'dismiss'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "remove" or "dismiss"' });
    }

    await resolveReport(id, { action, note });

    if (action === 'remove') {
      const reports = await listReports({ status: 'actioned' });
      const report = reports.find(r => r.id === id);
      if (report?.projectId) {
        try { await deleteProject(report.projectId); } catch { /* may already be deleted */ }
      }
    }

    logAdminAction({ action: `moderation-${action}`, targetId: id, details: { note }, ip: getAdminIp(req) }).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    console.error('Moderation resolve error:', error);
    res.status(500).json({ error: 'Could not resolve report' });
  }
});

export default router;
