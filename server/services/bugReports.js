/**
 * Bug Reports Service
 *
 * Stores in-app bug reports for admin diagnosis. Supports both Postgres
 * and file-based JSONL storage so it matches the rest of the platform.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR, USE_POSTGRES } from '../config/index.js';
import { hashIp } from '../utils/ipHash.js';

const BUG_REPORTS_FILE = path.join(DATA_DIR, 'bug_reports.jsonl');

function mapBugReportRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    reporterUserId: row.reporter_user_id || null,
    reporterUsername: row.reporter_username || null,
    reporterAgeBracket: row.reporter_age_bracket || null,
    reporterIpHash: row.reporter_ip_hash || null,
    requestId: row.request_id || null,
    projectId: row.project_id || null,
    projectName: row.project_name || null,
    sessionId: row.session_id || null,
    description: row.description || '',
    status: row.status || 'pending',
    requiresParentReview: row.requires_parent_review ?? false,
    codeSnapshot: row.code_snapshot || null,
    conversationSnapshot: row.conversation_snapshot || [],
    environmentSnapshot: row.environment_snapshot || null,
    triageCategory: row.triage_category || null,
    triageTags: row.triage_tags || [],
    triageSummary: row.triage_summary || null,
    triageExplanation: row.triage_explanation || null,
    triageNextStep: row.triage_next_step || null,
    triageConfidence: row.triage_confidence || null,
    triageModel: row.triage_model || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    triagedAt: row.triaged_at?.toISOString?.() || row.triaged_at || null,
    reviewedAt: row.reviewed_at?.toISOString?.() || row.reviewed_at || null,
    reviewAction: row.review_action || null,
    reviewNote: row.review_note || null,
    userNotificationSeenAt: row.user_notification_seen_at?.toISOString?.() || row.user_notification_seen_at || null,
  };
}

function summarizeBugReport(report) {
  return {
    id: report.id,
    reporterUserId: report.reporterUserId,
    reporterUsername: report.reporterUsername,
    reporterAgeBracket: report.reporterAgeBracket,
    requestId: report.requestId,
    projectId: report.projectId,
    projectName: report.projectName,
    sessionId: report.sessionId,
    description: report.description,
    status: report.status,
    requiresParentReview: !!report.requiresParentReview,
    triageCategory: report.triageCategory,
    triageTags: report.triageTags || [],
    triageSummary: report.triageSummary,
    triageConfidence: report.triageConfidence,
    triageModel: report.triageModel,
    createdAt: report.createdAt,
    triagedAt: report.triagedAt,
    reviewedAt: report.reviewedAt,
    reviewAction: report.reviewAction,
    userNotificationSeenAt: report.userNotificationSeenAt,
  };
}

function createBugReportId() {
  return `bug_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

async function ensureBugReportsFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(BUG_REPORTS_FILE);
  } catch {
    await fs.writeFile(BUG_REPORTS_FILE, '');
  }
}

async function readFileBugReports() {
  await ensureBugReportsFile();
  const content = await fs.readFile(BUG_REPORTS_FILE, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function writeFileBugReports(reports) {
  await ensureBugReportsFile();
  const payload = reports.map((report) => JSON.stringify(report)).join('\n');
  await fs.writeFile(BUG_REPORTS_FILE, payload + (payload ? '\n' : ''));
}

export async function createBugReport({
  reporterUserId,
  reporterUsername,
  reporterAgeBracket,
  reporterIp,
  requestId,
  projectId,
  projectName,
  sessionId,
  description,
  requiresParentReview = false,
  codeSnapshot,
  conversationSnapshot,
  environmentSnapshot,
}) {
  const report = {
    id: createBugReportId(),
    reporterUserId: reporterUserId || null,
    reporterUsername: reporterUsername || null,
    reporterAgeBracket: reporterAgeBracket || null,
    reporterIpHash: reporterIp ? hashIp(reporterIp) : null,
    requestId: requestId || null,
    projectId: projectId || null,
    projectName: projectName || null,
    sessionId: sessionId || null,
    description: description || '',
    status: 'pending',
    requiresParentReview: !!requiresParentReview,
    codeSnapshot: codeSnapshot || null,
    conversationSnapshot: Array.isArray(conversationSnapshot) ? conversationSnapshot : [],
    environmentSnapshot: environmentSnapshot || null,
    triageCategory: null,
    triageTags: [],
    triageSummary: null,
    triageExplanation: null,
    triageNextStep: null,
    triageConfidence: null,
    triageModel: null,
    createdAt: new Date().toISOString(),
    triagedAt: null,
    reviewedAt: null,
    reviewAction: null,
    reviewNote: null,
    userNotificationSeenAt: null,
  };

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      await pool.query(
        `INSERT INTO bug_reports (
          id, reporter_user_id, reporter_username, reporter_age_bracket, reporter_ip_hash, request_id,
          project_id, project_name, session_id, description, status, requires_parent_review,
          code_snapshot, conversation_snapshot, environment_snapshot,
          triage_category, triage_tags, triage_summary, triage_explanation, triage_next_step,
          triage_confidence, triage_model, created_at, triaged_at, reviewed_at, review_action, review_note
         , user_notification_seen_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,
          $13,$14,$15,
          $16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28
        )`,
        [
          report.id,
          report.reporterUserId,
          report.reporterUsername,
          report.reporterAgeBracket,
          report.reporterIpHash,
          report.requestId,
          report.projectId,
          report.projectName,
          report.sessionId,
          report.description,
          report.status,
          report.requiresParentReview,
          JSON.stringify(report.codeSnapshot),
          JSON.stringify(report.conversationSnapshot),
          JSON.stringify(report.environmentSnapshot),
          report.triageCategory,
          report.triageTags,
          report.triageSummary,
          report.triageExplanation,
          report.triageNextStep,
          report.triageConfidence,
          report.triageModel,
          report.createdAt,
          report.triagedAt,
          report.reviewedAt,
          report.reviewAction,
          report.reviewNote,
          report.userNotificationSeenAt,
        ],
      );
      return report;
    } catch {
      // Fall through to file storage.
    }
  }

  const reports = await readFileBugReports();
  reports.push(report);
  await writeFileBugReports(reports);
  return report;
}

export async function updateBugReportTriage(
  reportId,
  { triageCategory, triageTags = [], triageSummary, triageExplanation, triageNextStep, triageConfidence, triageModel },
) {
  const triagedAt = new Date().toISOString();

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rowCount } = await pool.query(
        `UPDATE bug_reports
         SET triage_category = $1,
             triage_tags = $2,
             triage_summary = $3,
             triage_explanation = $4,
             triage_next_step = $5,
             triage_confidence = $6,
             triage_model = $7,
             triaged_at = $8
         WHERE id = $9`,
        [
          triageCategory || null,
          triageTags,
          triageSummary || null,
          triageExplanation || null,
          triageNextStep || null,
          triageConfidence || null,
          triageModel || null,
          triagedAt,
          reportId,
        ],
      );
      if (rowCount === 0) {
        const err = new Error(`Bug report not found: ${reportId}`);
        err.code = 'ENOENT';
        throw err;
      }
      return true;
    } catch (err) {
      if (err?.code === 'ENOENT') throw err;
      // Fall through to file storage.
    }
  }

  const reports = await readFileBugReports();
  let found = false;
  const updated = reports.map((report) =>
    report.id === reportId
      ? ((found = true),
        {
          ...report,
          triageCategory: triageCategory || null,
          triageTags,
          triageSummary: triageSummary || null,
          triageExplanation: triageExplanation || null,
          triageNextStep: triageNextStep || null,
          triageConfidence: triageConfidence || null,
          triageModel: triageModel || null,
          triagedAt,
        })
      : report,
  );
  if (!found) {
    const err = new Error(`Bug report not found: ${reportId}`);
    err.code = 'ENOENT';
    throw err;
  }
  await writeFileBugReports(updated);
  return true;
}

export async function listBugReports({ status = null, limit = 100 } = {}) {
  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const params = [];
      let query = `
        SELECT id, reporter_user_id, reporter_username, reporter_age_bracket, request_id,
               project_id, project_name, session_id, description, status, requires_parent_review,
               triage_category, triage_tags, triage_summary, triage_confidence, triage_model,
               created_at, triaged_at, reviewed_at, review_action
        FROM bug_reports
      `;
      if (status) {
        params.push(status);
        query += ` WHERE status = $${params.length}`;
      }
      params.push(limit);
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      const { rows } = await pool.query(query, params);
      return rows.map((row) => summarizeBugReport(mapBugReportRow(row)));
    } catch {
      // Fall through to file storage.
    }
  }

  const reports = await readFileBugReports();
  let filtered = reports;
  if (status) {
    filtered = filtered.filter((report) => report.status === status);
  }
  return filtered
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(summarizeBugReport);
}

export async function getBugReport(reportId) {
  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rows } = await pool.query('SELECT * FROM bug_reports WHERE id = $1 LIMIT 1', [reportId]);
      if (rows.length === 0) {
        const err = new Error(`Bug report not found: ${reportId}`);
        err.code = 'ENOENT';
        throw err;
      }
      return mapBugReportRow(rows[0]);
    } catch (err) {
      if (err?.code === 'ENOENT') throw err;
      // Fall through to file storage.
    }
  }

  const reports = await readFileBugReports();
  const report = reports.find((entry) => entry.id === reportId);
  if (!report) {
    const err = new Error(`Bug report not found: ${reportId}`);
    err.code = 'ENOENT';
    throw err;
  }
  return report;
}

export async function resolveBugReport(reportId, { status, reviewAction, reviewNote }) {
  const reviewedAt = new Date().toISOString();
  const shouldNotifyUser = status === 'resolved' || status === 'dismissed';

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rowCount } = await pool.query(
        `UPDATE bug_reports
         SET status = $1,
             reviewed_at = $2,
             review_action = $3,
             review_note = $4,
             user_notification_seen_at = $5
         WHERE id = $6`,
        [
          status,
          reviewedAt,
          reviewAction || null,
          (reviewNote || '').slice(0, 2000) || null,
          shouldNotifyUser ? null : reviewedAt,
          reportId,
        ],
      );
      if (rowCount === 0) {
        const err = new Error(`Bug report not found: ${reportId}`);
        err.code = 'ENOENT';
        throw err;
      }
      return true;
    } catch (err) {
      if (err?.code === 'ENOENT') throw err;
      // Fall through to file storage.
    }
  }

  const reports = await readFileBugReports();
  let found = false;
  const updated = reports.map((report) =>
    report.id === reportId
      ? ((found = true),
        {
          ...report,
          status,
          reviewedAt,
          reviewAction: reviewAction || null,
          reviewNote: (reviewNote || '').slice(0, 2000) || null,
          userNotificationSeenAt: shouldNotifyUser ? null : reviewedAt,
        })
      : report,
  );
  if (!found) {
    const err = new Error(`Bug report not found: ${reportId}`);
    err.code = 'ENOENT';
    throw err;
  }
  await writeFileBugReports(updated);
  return true;
}

export async function listPendingBugReportNotifications(reporterUserId, limit = 5) {
  if (!reporterUserId) return [];

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT id, project_name, description, status, reviewed_at, review_note
         FROM bug_reports
         WHERE reporter_user_id = $1
           AND status IN ('resolved', 'dismissed')
           AND reviewed_at IS NOT NULL
           AND user_notification_seen_at IS NULL
         ORDER BY reviewed_at ASC
         LIMIT $2`,
        [reporterUserId, limit],
      );
      return rows.map((row) => ({
        id: row.id,
        projectName: row.project_name || null,
        description: row.description || '',
        status: row.status || 'resolved',
        reviewedAt: row.reviewed_at?.toISOString?.() || row.reviewed_at || null,
        reviewNote: row.review_note || null,
      }));
    } catch {
      // Fall through to file storage.
    }
  }

  const reports = await readFileBugReports();
  return reports
    .filter(
      (report) =>
        report.reporterUserId === reporterUserId &&
        (report.status === 'resolved' || report.status === 'dismissed') &&
        report.reviewedAt &&
        !report.userNotificationSeenAt,
    )
    .sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime())
    .slice(0, limit)
    .map((report) => ({
      id: report.id,
      projectName: report.projectName || null,
      description: report.description || '',
      status: report.status || 'resolved',
      reviewedAt: report.reviewedAt || null,
      reviewNote: report.reviewNote || null,
    }));
}

export async function acknowledgeBugReportNotification(reportId, reporterUserId) {
  const seenAt = new Date().toISOString();

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rowCount } = await pool.query(
        `UPDATE bug_reports
         SET user_notification_seen_at = $1
         WHERE id = $2
           AND reporter_user_id = $3`,
        [seenAt, reportId, reporterUserId],
      );
      if (rowCount === 0) {
        const err = new Error(`Bug report not found: ${reportId}`);
        err.code = 'ENOENT';
        throw err;
      }
      return true;
    } catch (err) {
      if (err?.code === 'ENOENT') throw err;
      // Fall through to file storage.
    }
  }

  const reports = await readFileBugReports();
  let found = false;
  const updated = reports.map((report) =>
    report.id === reportId && report.reporterUserId === reporterUserId
      ? ((found = true),
        {
          ...report,
          userNotificationSeenAt: seenAt,
        })
      : report,
  );
  if (!found) {
    const err = new Error(`Bug report not found: ${reportId}`);
    err.code = 'ENOENT';
    throw err;
  }
  await writeFileBugReports(updated);
  return true;
}

export async function purgeResolvedBugReports(cutoffIso) {
  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rowCount } = await pool.query(
        "DELETE FROM bug_reports WHERE status IN ('resolved', 'dismissed') AND reviewed_at < $1",
        [cutoffIso],
      );
      return rowCount || 0;
    } catch {
      // Fall through to file storage.
    }
  }

  try {
    const reports = await readFileBugReports();
    const kept = reports.filter((report) => {
      const isResolved = report.status === 'resolved' || report.status === 'dismissed';
      const isOld = report.reviewedAt && report.reviewedAt < cutoffIso;
      return !(isResolved && isOld);
    });
    const removed = reports.length - kept.length;
    if (removed > 0) {
      await writeFileBugReports(kept);
    }
    return removed;
  } catch {
    return 0;
  }
}
