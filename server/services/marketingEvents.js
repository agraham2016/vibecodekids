/**
 * Marketing Event Store
 *
 * JSONL-based log for first-party marketing events (page_view, cta_click, form_submit, checkout_start).
 * Elias approved 2026-03-05. See docs/MARKETING_TRACKING_PLAN.md.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from '../config/index.js';

const MARKETING_EVENTS_FILE = path.join(DATA_DIR, 'marketing_events.jsonl');

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
  try {
    await fs.access(MARKETING_EVENTS_FILE);
  } catch {
    await fs.writeFile(MARKETING_EVENTS_FILE, '');
  }
}

const VALID_TYPES = new Set(['page_view', 'cta_click', 'form_submit', 'checkout_start']);

/** Disallow PII-like fields in event payload */
const PII_KEYS = new Set(['email', 'name', 'phone', 'address', 'ssn', 'child']);
function hasPII(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  return keys.some((k) => PII_KEYS.has(k));
}

/**
 * Append a marketing event.
 *
 * @param {object} event
 * @param {string} event.type - 'page_view' | 'cta_click' | 'form_submit' | 'checkout_start'
 * @param {string} [event.url]
 * @param {string} [event.referrer]
 * @param {string} [event.device]
 * @param {string} [event.sessionId]
 * @param {string} [event.section]
 * @param {string} [event.buttonId]
 * @param {string} [event.utm_source]
 * @param {string} [event.utm_medium]
 * @param {string} [event.utm_campaign]
 * @param {string} [event.utm_content]
 * @param {string} [event.tier] - for checkout_start
 */
export async function logMarketingEvent(event) {
  if (!event || !VALID_TYPES.has(event.type)) {
    throw new Error('Invalid event type');
  }
  if (hasPII(event)) {
    throw new Error('PII not allowed in marketing events');
  }

  await ensureFile();
  const record = {
    id: `me_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  await fs.appendFile(MARKETING_EVENTS_FILE, JSON.stringify(record) + '\n');
}
