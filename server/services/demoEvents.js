/**
 * Demo Event Store
 *
 * JSONL-based log for demo generation, feedback, signup, and pageview events.
 * Used by the A/B test analytics and admin dashboard.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from '../config/index.js';

const DEMO_EVENTS_FILE = path.join(DATA_DIR, 'demo_events.jsonl');

async function ensureFile() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
  try { await fs.access(DEMO_EVENTS_FILE); } catch {
    await fs.writeFile(DEMO_EVENTS_FILE, '');
  }
}

/**
 * Append a demo event.
 *
 * @param {object} event
 * @param {string} event.type - 'generation' | 'feedback' | 'signup' | 'pageview'
 * @param {string} [event.generationId]
 * @param {string} [event.prompt]
 * @param {string} [event.modelUsed]
 * @param {boolean} [event.isCacheHit]
 * @param {boolean} [event.success]
 * @param {string} [event.variant]
 * @param {string} [event.visitorId]
 * @param {string} [event.ipHash]
 * @param {boolean} [event.thumbsUp]
 * @param {number} [event.promptsUsed]
 * @param {string} [event.device]
 * @param {string} [event.referrer]
 */
export async function logDemoEvent(event) {
  await ensureFile();
  const record = {
    id: `de_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  await fs.appendFile(DEMO_EVENTS_FILE, JSON.stringify(record) + '\n');
}

/**
 * Read demo events (for admin aggregation).
 * @param {object} [opts]
 * @param {number} [opts.sinceDays]
 * @returns {Promise<object[]>}
 */
export async function readDemoEvents(opts = {}) {
  try {
    await ensureFile();
    const content = await fs.readFile(DEMO_EVENTS_FILE, 'utf-8');
    let events = content.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    if (opts.sinceDays) {
      const cutoff = Date.now() - opts.sinceDays * 86400000;
      events = events.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    }
    return events;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
