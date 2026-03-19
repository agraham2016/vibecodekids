/**
 * Marketing Analytics Routes
 *
 * POST /api/marketing/event — log first-party marketing event (Elias approved 2026-03-05)
 * Types: page_view, cta_click, form_submit, checkout_start
 */

import { Router } from 'express';
import crypto from 'crypto';
import { logMarketingEvent } from '../services/marketingEvents.js';

const router = Router();

const VALID_TYPES = new Set(['page_view', 'cta_click', 'form_submit', 'checkout_start']);

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

    const payload = {
      type,
      ipHash,
      url: rest.url || '/',
      referrer: rest.referrer || null,
      device: rest.device || null,
      sessionId: rest.sessionId || null,
      section: rest.section || null,
      buttonId: rest.buttonId || null,
      utm_source: rest.utm_source || null,
      utm_medium: rest.utm_medium || null,
      utm_campaign: rest.utm_campaign || null,
      utm_content: rest.utm_content || null,
      tier: rest.tier || null,
    };

    await logMarketingEvent(payload);
    res.json({ ok: true });
  } catch (err) {
    if (err.message?.includes('PII') || err.message?.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Marketing event log error:', err.message);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

export default router;
