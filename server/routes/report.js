/**
 * Public Report Route
 *
 * POST /api/report — any visitor can report a published game.
 * Rate-limited to 5 reports per IP per hour.
 */

import { Router } from 'express';
import { createReport } from '../services/moderation.js';

const router = Router();

const ipCounts = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateOk(ip) {
  const now = Date.now();
  let entry = ipCounts.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    ipCounts.set(ip, entry);
  }
  entry.count++;
  return entry.count <= MAX_PER_WINDOW;
}

const VALID_REASONS = [
  'inappropriate_content',
  'personal_info',
  'bullying',
  'scary_content',
  'other',
];

router.post('/', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
    if (!rateOk(ip)) return res.status(429).json({ error: 'Too many reports. Try again later.' });

    const { projectId, reason } = req.body;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required' });
    }
    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason', validReasons: VALID_REASONS });
    }

    await createReport({ projectId, reason, reporterIp: ip, reporterUserId: null });
    res.json({ ok: true, message: 'Thank you for reporting. Our team will review this.' });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Could not submit report' });
  }
});

export default router;
