/**
 * Event Store — AI Monitoring
 *
 * Persists generate events for model performance analysis.
 * Uses JSONL file storage. Events are anonymized (userIdHash only).
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from '../config/index.js';

const EVENTS_FILE = path.join(DATA_DIR, 'generate_events.jsonl');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback_events.jsonl');

/**
 * Ensure events file and data directory exist.
 */
async function ensureEventsFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Dir exists
  }
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, '');
  }
}

/**
 * Hash userId for anonymized tracking (no PII stored).
 */
function hashUserId(userId) {
  if (!userId) return null;
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

/**
 * Log a generate event. Call after successful generation.
 *
 * @param {object} event
 * @param {string} [event.sessionId]
 * @param {string} [event.startingModel] - 'claude' | 'grok'
 * @param {string} event.modelUsed - 'claude' | 'grok'
 * @param {string} event.mode
 * @param {boolean} event.hasCode
 * @param {string|null} [event.userId]
 * @param {string} [event.ageBracket]
 * @param {boolean} [event.improvementOptOut]
 */
export async function logGenerateEvent(event) {
  if (event.improvementOptOut) return;

  await ensureEventsFile();

  const record = {
    id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    sessionId: event.sessionId || null,
    startingModel: event.startingModel || null,
    modelUsed: event.modelUsed || null,
    mode: event.mode || 'default',
    hasCode: !!event.hasCode,
    userIdHash: hashUserId(event.userId),
    ageBracket: event.ageBracket || null,
  };

  await fs.appendFile(EVENTS_FILE, JSON.stringify(record) + '\n');
}

/**
 * Read events from file. For aggregation use.
 *
 * @param {object} [opts]
 * @param {number} [opts.sinceDays] - Only events in last N days
 * @returns {Promise<object[]>}
 */
export async function readEvents(opts = {}) {
  try {
    await ensureEventsFile();
    const content = await fs.readFile(EVENTS_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    let events = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (opts.sinceDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - opts.sinceDays);
      const cutoffMs = cutoff.getTime();
      events = events.filter((e) => new Date(e.timestamp).getTime() >= cutoffMs);
    }

    return events;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Ensure feedback file exists.
 */
async function ensureFeedbackFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    /* dir exists */
  }
  try {
    await fs.access(FEEDBACK_FILE);
  } catch {
    await fs.writeFile(FEEDBACK_FILE, '');
  }
}

/**
 * Log user feedback (thumbs up/down) on an AI response.
 *
 * @param {object} opts
 * @param {string} opts.sessionId
 * @param {string} opts.messageId
 * @param {string} opts.outcome - 'thumbsUp' | 'thumbsDown'
 * @param {string} [opts.modelUsed] - 'claude' | 'grok'
 * @param {string} [opts.details] - optional "what was wrong" for thumbs down
 * @param {string|null} [opts.userId]
 * @param {boolean} [opts.improvementOptOut]
 */
export async function logFeedbackEvent(opts) {
  if (opts.improvementOptOut) return;

  await ensureFeedbackFile();

  const record = {
    id: `fb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    sessionId: opts.sessionId || null,
    messageId: opts.messageId || null,
    outcome: opts.outcome || null,
    modelUsed: opts.modelUsed || null,
    details: opts.details || null,
    userIdHash: hashUserId(opts.userId),
  };

  await fs.appendFile(FEEDBACK_FILE, JSON.stringify(record) + '\n');
}

/**
 * Read feedback events for aggregation.
 *
 * @param {object} [opts]
 * @param {number} [opts.sinceDays]
 * @returns {Promise<object[]>}
 */
export async function readFeedbackEvents(opts = {}) {
  try {
    await ensureFeedbackFile();
    const content = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    let events = content.trim().split('\n').filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (opts.sinceDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - opts.sinceDays);
      const cutoffMs = cutoff.getTime();
      events = events.filter((e) => new Date(e.timestamp).getTime() >= cutoffMs);
    }

    return events;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
