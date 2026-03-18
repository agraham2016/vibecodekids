/**
 * Bug Reports Route
 *
 * Logged-in users can submit a bug report from the studio. The server stores
 * a sanitized snapshot and adds AI-assisted triage metadata for admin review.
 */

import { Router } from 'express';
import { scanPII } from '../middleware/piiScanner.js';
import { ageGate } from '../middleware/ageGate.js';
import log from '../services/logger.js';
import { readUser } from '../services/storage.js';
import { createBugReport, updateBugReportTriage } from '../services/bugReports.js';
import { triageBugReport } from '../services/bugReportTriage.js';

const DESCRIPTION_MAX_CHARS = 500;
const CODE_SNAPSHOT_MAX_CHARS = 20000;
const CODE_HEAD_CHARS = 12000;
const CODE_TAIL_CHARS = 8000;
const CHAT_MESSAGE_MAX_CHARS = 1200;
const CHAT_MESSAGES_MAX = 3;
const DATA_URI_RE = /data:[^;]+;base64,[A-Za-z0-9+/=]+/g;

function sanitizeFreeText(value, maxChars = DESCRIPTION_MAX_CHARS) {
  const trimmed = String(value || '')
    .trim()
    .slice(0, maxChars);
  const { cleaned, piiFound } = scanPII(trimmed);
  return { text: cleaned, piiFound };
}

function buildCodeSnapshot(code) {
  if (!code || typeof code !== 'string') return null;

  const withoutDataUris = code.replace(DATA_URI_RE, '[DATA_URI_REDACTED]');
  const { cleaned, piiFound } = scanPII(withoutDataUris);
  const originalLength = cleaned.length;
  let excerpt = cleaned;
  let truncated = false;

  if (cleaned.length > CODE_SNAPSHOT_MAX_CHARS) {
    truncated = true;
    excerpt = `${cleaned.slice(0, CODE_HEAD_CHARS)}\n\n/* [SNIPPED ${cleaned.length - CODE_SNAPSHOT_MAX_CHARS} chars] */\n\n${cleaned.slice(-CODE_TAIL_CHARS)}`;
  }

  return {
    excerpt,
    originalLength,
    truncated,
    piiFound: [...new Set(piiFound)],
  };
}

function buildConversationSnapshot(conversationHistory) {
  if (!Array.isArray(conversationHistory)) return [];

  return conversationHistory.slice(-CHAT_MESSAGES_MAX).map((entry) => {
    const { text, piiFound } = sanitizeFreeText(entry?.content || '', CHAT_MESSAGE_MAX_CHARS);
    return {
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      content: text,
      timestamp: entry?.timestamp || null,
      modelUsed: entry?.modelUsed || null,
      piiFound: [...new Set(piiFound)],
    };
  });
}

export default function createBugReportsRouter(sessions) {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Please log in to report a bug.' });
      }

      const session = await sessions.get(token);
      if (!session) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }

      const user = await readUser(session.userId);
      if (user.status !== 'approved') {
        return res.status(403).json({ error: 'Your account is not active right now.' });
      }
      const supportAccess = ageGate(user, 'support');
      if (!supportAccess.allowed) {
        return res.status(403).json({ error: supportAccess.reason });
      }

      const {
        description,
        currentCode,
        conversationHistory = [],
        projectId = null,
        projectName = null,
        sessionId = null,
        appSurface = 'studio',
        environment = {},
      } = req.body || {};

      const sanitizedDescription = sanitizeFreeText(description, DESCRIPTION_MAX_CHARS);
      if (!sanitizedDescription.text || sanitizedDescription.text.length < 8) {
        return res.status(400).json({ error: 'Tell us a little more about what went wrong.' });
      }

      const conversationSnapshot = buildConversationSnapshot(conversationHistory);
      const codeSnapshot = buildCodeSnapshot(currentCode);
      const requiresParentReview = user.ageBracket === 'under13';
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';

      const report = await createBugReport({
        reporterUserId: user.id,
        reporterUsername: user.username,
        reporterAgeBracket: user.ageBracket || null,
        reporterIp: clientIp,
        requestId: req.id || null,
        projectId: typeof projectId === 'string' ? projectId.slice(0, 50) : null,
        projectName: typeof projectName === 'string' ? projectName.slice(0, 120) : null,
        sessionId: typeof sessionId === 'string' ? sessionId.slice(0, 120) : null,
        description: sanitizedDescription.text,
        requiresParentReview,
        codeSnapshot,
        conversationSnapshot,
        environmentSnapshot: {
          appSurface: String(appSurface || 'studio').slice(0, 40),
          route: typeof environment?.route === 'string' ? environment.route.slice(0, 120) : null,
          viewport: environment?.viewport || null,
          language: typeof environment?.language === 'string' ? environment.language.slice(0, 40) : null,
          lastModelUsed: typeof environment?.lastModelUsed === 'string' ? environment.lastModelUsed.slice(0, 20) : null,
          debugInfo: environment?.debugInfo || null,
          userAgent: req.headers['user-agent'] || null,
          descriptionPiiFound: [...new Set(sanitizedDescription.piiFound)],
        },
      });

      const triage = await triageBugReport(report);
      await updateBugReportTriage(report.id, triage);

      log.info(
        {
          reqId: req.id,
          userId: user.id,
          reportId: report.id,
          triageCategory: triage.triageCategory,
          requiresParentReview,
        },
        'Bug report submitted',
      );

      return res.json({
        ok: true,
        reportId: report.id,
        triageCategory: triage.triageCategory,
      });
    } catch (err) {
      log.error({ err, reqId: req.id, userId: req.userId }, 'Bug report submission failed');
      return res.status(500).json({ error: 'Could not submit bug report right now.' });
    }
  });

  return router;
}
