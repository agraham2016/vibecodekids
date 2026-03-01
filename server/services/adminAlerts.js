/**
 * Admin Alerting Service
 *
 * Monitors for spikes in:
 * - Content filter blocks
 * - Moderation reports
 * - User suspensions
 *
 * Sends email alerts to admin when thresholds are crossed.
 * Falls back to console logging if email is not configured.
 */

import { SUPPORT_EMAIL, SITE_NAME } from '../config/index.js';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // Don't re-alert for 4 hours

const counters = {
  contentBlocks: [],
  reports: [],
  suspensions: [],
};

const THRESHOLDS = {
  contentBlocks: 20,  // 20 blocks/hour → something unusual
  reports: 5,         // 5 reports/hour → targeted abuse or real problem
  suspensions: 3,     // 3 auto-suspensions/hour → possible attack
};

let lastAlertSent = {};

function pruneOld(arr) {
  const cutoff = Date.now() - WINDOW_MS;
  while (arr.length > 0 && arr[0] < cutoff) arr.shift();
}

export function trackContentBlock() {
  counters.contentBlocks.push(Date.now());
  pruneOld(counters.contentBlocks);
  checkThreshold('contentBlocks', 'Content filter blocks');
}

export function trackReport() {
  counters.reports.push(Date.now());
  pruneOld(counters.reports);
  checkThreshold('reports', 'User reports submitted');
}

export function trackSuspension() {
  counters.suspensions.push(Date.now());
  pruneOld(counters.suspensions);
  checkThreshold('suspensions', 'Automatic user suspensions');
}

function checkThreshold(key, label) {
  pruneOld(counters[key]);
  const count = counters[key].length;
  const threshold = THRESHOLDS[key];

  if (count >= threshold) {
    const now = Date.now();
    if (lastAlertSent[key] && now - lastAlertSent[key] < ALERT_COOLDOWN_MS) return;
    lastAlertSent[key] = now;
    sendAlert(label, count, threshold);
  }
}

async function sendAlert(label, count, threshold) {
  const message = `[${SITE_NAME} ALERT] ${label}: ${count} in the last hour (threshold: ${threshold})`;
  console.warn(`ADMIN ALERT: ${message}`);

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${SITE_NAME} Alerts <${SUPPORT_EMAIL}>`,
        to: [SUPPORT_EMAIL],
        subject: `[ALERT] ${label} spike detected`,
        text: `${message}\n\nTimestamp: ${new Date().toISOString()}\n\nReview the admin dashboard: ${process.env.BASE_URL || 'https://vibecodekidz.org'}/admin\n\nThis is an automated safety alert.`,
      }),
    });
  } catch (err) {
    console.error('Alert email failed:', err.message);
  }
}

export function getAlertStatus() {
  pruneOld(counters.contentBlocks);
  pruneOld(counters.reports);
  pruneOld(counters.suspensions);
  return {
    contentBlocksLastHour: counters.contentBlocks.length,
    reportsLastHour: counters.reports.length,
    suspensionsLastHour: counters.suspensions.length,
    thresholds: THRESHOLDS,
    lastAlerts: Object.fromEntries(
      Object.entries(lastAlertSent).map(([k, v]) => [k, new Date(v).toISOString()])
    ),
  };
}
