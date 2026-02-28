/**
 * Demo Analytics Routes
 *
 * POST /api/demo/event — log a demo event (generation, feedback, signup, pageview)
 */

import { Router } from 'express';
import crypto from 'crypto';
import { logDemoEvent } from '../services/demoEvents.js';

const router = Router();

const VALID_TYPES = new Set(['generation', 'feedback', 'signup', 'pageview']);

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

router.post('/event', async (req, res) => {
  try {
    const { type, ...rest } = req.body || {};
    if (!type || !VALID_TYPES.has(type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);

    await logDemoEvent({ type, ipHash, ...rest });
    res.json({ ok: true });
  } catch (err) {
    console.error('Demo event log error:', err.message);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

export default router;
