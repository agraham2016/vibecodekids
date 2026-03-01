/**
 * Moderation Service
 *
 * Manages user-submitted reports (e.g., "this game has bad content")
 * and provides a queue for admin review.
 *
 * Storage: JSONL file (append-only) or Postgres when available.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { DATA_DIR, USE_POSTGRES } from '../config/index.js';
import { trackReport } from './adminAlerts.js';

const REPORTS_FILE = path.join(DATA_DIR, 'reports.jsonl');

export async function createReport({ projectId, reason, reporterIp, reporterUserId }) {
  const report = {
    id: `rpt_${randomBytes(8).toString('hex')}`,
    projectId,
    reason: (reason || '').slice(0, 500),
    reporterUserId: reporterUserId || null,
    reporterIpHash: reporterIp
      ? (await import('crypto')).createHash('sha256').update(reporterIp).digest('hex').slice(0, 12)
      : null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewAction: null,
    reviewNote: null,
  };

  trackReport();

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      await pool.query(
        `INSERT INTO moderation_reports (id, project_id, reason, reporter_user_id, reporter_ip_hash, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [report.id, report.projectId, report.reason, report.reporterUserId, report.reporterIpHash, report.status, report.createdAt]
      );
    } catch (err) {
      console.error('Moderation report DB error:', err.message);
      await appendReportFile(report);
    }
  } else {
    await appendReportFile(report);
  }

  return report;
}

async function appendReportFile(report) {
  try {
    await fs.appendFile(REPORTS_FILE, JSON.stringify(report) + '\n');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(REPORTS_FILE), { recursive: true });
      await fs.appendFile(REPORTS_FILE, JSON.stringify(report) + '\n');
    } else {
      console.error('Could not write report file:', err.message);
    }
  }
}

export async function listReports({ status, limit = 50 } = {}) {
  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      let query = 'SELECT * FROM moderation_reports';
      const params = [];
      if (status) { query += ' WHERE status = $1'; params.push(status); }
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);
      const { rows } = await pool.query(query, params);
      return rows.map(r => ({
        id: r.id, projectId: r.project_id, reason: r.reason,
        reporterUserId: r.reporter_user_id, status: r.status,
        createdAt: r.created_at, reviewedAt: r.reviewed_at,
        reviewAction: r.review_action, reviewNote: r.review_note,
      }));
    } catch { /* fall through */ }
  }

  try {
    const data = await fs.readFile(REPORTS_FILE, 'utf-8');
    let reports = data.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    if (status) reports = reports.filter(r => r.status === status);
    return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function resolveReport(reportId, { action, note }) {
  const now = new Date().toISOString();

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      await pool.query(
        'UPDATE moderation_reports SET status=$1, review_action=$2, review_note=$3, reviewed_at=$4 WHERE id=$5',
        [action === 'remove' ? 'actioned' : 'dismissed', action, (note || '').slice(0, 500), now, reportId]
      );
      return true;
    } catch { /* fall through to file */ }
  }

  try {
    const data = await fs.readFile(REPORTS_FILE, 'utf-8');
    const lines = data.trim().split('\n');
    const updated = lines.map(line => {
      try {
        const r = JSON.parse(line);
        if (r.id === reportId) {
          r.status = action === 'remove' ? 'actioned' : 'dismissed';
          r.reviewAction = action;
          r.reviewNote = (note || '').slice(0, 500);
          r.reviewedAt = now;
        }
        return JSON.stringify(r);
      } catch { return line; }
    });
    await fs.writeFile(REPORTS_FILE, updated.join('\n') + '\n');
    return true;
  } catch {
    return false;
  }
}
