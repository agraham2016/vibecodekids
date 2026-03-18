/**
 * Feedback Route — Thumbs up/down on AI responses
 *
 * POST /api/feedback — Record user feedback for monitoring.
 */

import { Router } from 'express';
import { logFeedbackEvent } from '../services/eventStore.js';
import { logEngineOutcomeFeedback } from '../services/engineOutcomes.js';
import { readUser } from '../services/storage.js';

export default function createFeedbackRouter(sessions) {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const { sessionId, generationId, messageId, outcome, modelUsed, details } = req.body;

      if (!outcome || !['thumbsUp', 'thumbsDown'].includes(outcome)) {
        return res.status(400).json({ error: 'Invalid outcome. Use thumbsUp or thumbsDown.' });
      }

      let userId = null;
      let improvementOptOut = false;

      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const session = await sessions.get(token);
        if (session) {
          userId = session.userId;
          try {
            const user = await readUser(userId);
            improvementOptOut = !!user.improvementOptOut;
          } catch {
            /* user not found */
          }
        }
      }

      await logFeedbackEvent({
        sessionId: sessionId || null,
        generationId: generationId || null,
        messageId: messageId || null,
        outcome,
        modelUsed: modelUsed && ['claude', 'grok', 'openai'].includes(modelUsed) ? modelUsed : null,
        details: typeof details === 'string' ? details.slice(0, 500) : null,
        userId,
        improvementOptOut,
      });

      await logEngineOutcomeFeedback({
        sessionId: sessionId || null,
        generationId: generationId || null,
        messageId: messageId || null,
        outcome,
        modelUsed: modelUsed && ['claude', 'grok', 'openai'].includes(modelUsed) ? modelUsed : null,
        details: typeof details === 'string' ? details.slice(0, 500) : null,
        userId,
        improvementOptOut,
      });

      res.json({ ok: true });
    } catch (err) {
      console.error('Feedback error:', err);
      res.status(500).json({ error: 'Could not record feedback' });
    }
  });

  return router;
}
