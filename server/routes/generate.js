/**
 * AI Generation Route (Tri-Model: Claude + Grok + OpenAI)
 *
 * POST /api/generate - Generate or modify game code using tri-model AI system.
 *
 * Supports:
 * - Mode-based routing (default/claude/grok/openai/creative/debug/ask-other-buddy/critic)
 * - Response caching across ALL models
 * - Template cache for brand-new games
 * - Auto-detection of creative/debug intent from prompt
 * - Token usage tracking per user per model
 *
 * Request body fields:
 * - mode: 'default' | 'claude' | 'grok' | 'openai' | 'creative' | 'debug' | 'ask-other-buddy' | 'critic'
 * - lastModelUsed: 'claude' | 'grok' | 'openai' (for ask-other-buddy routing)
 * - debugAttempt: number (for debug escalation tracking)
 */

import { Router } from 'express';
import { detectGameGenre } from '../prompts/index.js';
import { filterContent } from '../middleware/contentFilter.js';
import { piiScannerMiddleware, scanPII } from '../middleware/piiScanner.js';
import { filterOutputText, filterOutputCode } from '../middleware/outputFilter.js';
import log from '../services/logger.js';
import { checkRateLimits, checkTierLimits, incrementUsage, calculateUsageRemaining } from '../middleware/rateLimit.js';
import {
  getTemplateCacheKey,
  getCachedTemplate,
  cacheTemplate,
  isGrokAvailable,
  isClaudeAvailable,
  isOpenAIAvailable,
} from '../services/ai.js';
import { generateOrIterateGame } from '../services/gameHandler.js';
import { logGenerateEvent } from '../services/eventStore.js';
import { readUser } from '../services/storage.js';
import { recordViolation } from '../services/discipline.js';
import { checkAbuse } from '../services/abuseDetection.js';
import { ageGate } from '../middleware/ageGate.js';

export default function createGenerateRouter(sessions) {
  const router = Router();

  /**
   * Check if the current code is the default/empty state.
   */
  function isDefaultCode(code) {
    if (!code) return true;
    return (
      code.includes('Vibe Code Studio') &&
      (code.includes('Tell me what you want to create') || code.includes('Your game will appear here'))
    );
  }

  router.post('/', piiScannerMiddleware, async (req, res) => {
    try {
      const {
        message,
        image,
        currentCode,
        conversationHistory = [],
        gameConfig = null,
        // ---- DUAL-MODEL FIELDS ----
        mode: requestedMode = 'default',
        lastModelUsed = null,
        debugAttempt = 0,
        // ---- MONITORING FIELDS ----
        sessionId = null,
        startingModel = null,
      } = req.body;
      let mode = requestedMode;

      console.log(
        `🎮 Generate request: "${(message || '').slice(0, 80)}" | mode: ${mode} | model-hint: ${lastModelUsed || 'none'} | gameConfig: ${gameConfig ? gameConfig.gameType : 'none'} | hasCode: ${!!currentCode} | historyLen: ${conversationHistory.length}`,
      );

      if (!isClaudeAvailable() && !isGrokAvailable() && !isOpenAIAvailable()) {
        return res.status(503).json({
          message:
            'AI features are not available — no AI API keys are configured. Please set ANTHROPIC_API_KEY in .env.',
          code: null,
          modelUsed: null,
          isCacheHit: false,
        });
      }

      // IP-level abuse detection for unauthenticated burst generation
      const genIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
      const abuseCheck = checkAbuse(genIp, 'generate');
      if (!abuseCheck.allowed) {
        return res.status(429).json({
          message: 'Too many requests. Please slow down and try again in a few minutes.',
          code: null,
          modelUsed: null,
          isCacheHit: false,
        });
      }

      // Get user from session
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId = null;
      if (token) {
        const session = await sessions.get(token);
        if (session) userId = session.userId;
      }

      // Block suspended/deleted users and enforce consent for under-13
      let userAgeBracket = null;
      if (userId) {
        try {
          const user = await readUser(userId);
          userAgeBracket = user.ageBracket || null;
          if (user.status === 'suspended' || user.status === 'deleted' || user.status === 'denied') {
            return res.status(403).json({
              message: 'Your account is not active. Please contact support.',
              code: null,
              modelUsed: null,
              isCacheHit: false,
            });
          }
          const consentCheck = ageGate(user, 'generate');
          if (!consentCheck.allowed) {
            return res
              .status(403)
              .json({ message: consentCheck.reason, code: null, modelUsed: null, isCacheHit: false });
          }
        } catch {
          /* user not found — allow anonymous */
        }
      }

      // KORA safety: under-13 users are restricted to Claude only
      // Grok scores 18-29% on KORA child safety (Feb 2026) vs Claude 70-76%
      if (userAgeBracket === 'under13') {
        const grokModes = ['grok', 'creative', 'critic'];
        const wouldRouteToGrok = grokModes.includes(mode) || (mode === 'ask-other-buddy' && lastModelUsed === 'claude');
        if (wouldRouteToGrok) {
          log.info({ userId, originalMode: mode }, 'Under-13 Grok restriction: routing to Claude');
          mode = 'claude';
        }
      }

      // Check rate limits
      const rateLimitCheck = await checkRateLimits(userId);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          message: rateLimitCheck.message,
          code: null,
          modelUsed: null,
          isCacheHit: false,
          rateLimited: true,
          waitSeconds: rateLimitCheck.waitSeconds,
        });
      }

      // Check tier limits
      const tierCheck = await checkTierLimits(userId, 'generate');
      if (!tierCheck.allowed) {
        return res.status(403).json({
          message: tierCheck.message,
          code: null,
          modelUsed: null,
          isCacheHit: false,
          upgradeRequired: tierCheck.upgradeRequired,
          reason: tierCheck.reason,
        });
      }

      // Content filter
      const contentCheck = filterContent(message, { source: 'generate' });
      if (contentCheck.blocked) {
        const discipline = await recordViolation(userId);
        const msg = discipline.message ? `${contentCheck.reason}\n\n${discipline.message}` : contentCheck.reason;
        return res.json({ message: msg, code: null, modelUsed: null, isCacheHit: false });
      }

      // Genre detection (still useful for template cache)
      let gameGenre = null;
      if (gameConfig && gameConfig.gameType) {
        gameGenre = gameConfig.gameType;
      } else if (!currentCode || isDefaultCode(currentCode)) {
        gameGenre = detectGameGenre(message);
      }
      if (gameGenre) console.log(`🎮 Detected game genre: ${gameGenre}`);

      // ===== TEMPLATE CACHE CHECK (for brand-new survey-based games) =====
      const isNewGame = !currentCode || isDefaultCode(currentCode);
      const hasNoHistory = conversationHistory.length === 0;

      if (isNewGame && hasNoHistory && !image && mode === 'default') {
        const cacheKey = getTemplateCacheKey(message, gameConfig);
        const cached = getCachedTemplate(cacheKey);
        if (cached) {
          cached.hits++;
          await incrementUsage(userId, 'generate');
          const usage = userId ? calculateUsageRemaining(tierCheck.user) : null;

          // Log event for monitoring (skip under-13 and opted-out users for COPPA)
          let improvementOptOut = false;
          let ageBracket = null;
          if (userId) {
            try {
              const user = await readUser(userId);
              improvementOptOut = !!user.improvementOptOut;
              ageBracket = user.ageBracket || null;
              if (ageBracket === 'under13') improvementOptOut = true;
            } catch {
              /* user not found */
            }
          }
          if (!improvementOptOut) {
            logGenerateEvent({
              sessionId,
              startingModel,
              modelUsed: 'claude',
              mode,
              hasCode: !!cached.code,
              userId: ageBracket === 'under13' ? null : userId,
              ageBracket,
              improvementOptOut,
            }).catch((err) => console.error('Event log error:', err?.message));
          }

          return res.json({
            message: cached.message,
            code: cached.code,
            usage,
            modelUsed: 'claude',
            isCacheHit: true,
            cached: true,
          });
        }
      }

      // Re-scan conversation history for PII before sending to AI
      const cleanedHistory = conversationHistory.map((msg) => {
        if (msg.content && typeof msg.content === 'string') {
          const { cleaned } = scanPII(msg.content);
          return { ...msg, content: cleaned };
        }
        return msg;
      });

      // ===== CALL THE DUAL-MODEL HANDLER =====
      const result = await generateOrIterateGame({
        prompt: message,
        currentCode,
        mode,
        conversationHistory: cleanedHistory,
        gameConfig,
        image,
        userId,
        lastModelUsed,
        debugAttempt,
      });

      // Increment usage
      await incrementUsage(userId, 'generate');

      // ===== TEMPLATE CACHE (store new games for future hits) =====
      if (isNewGame && hasNoHistory && result.code && !result.wasTruncated) {
        const cacheKey = getTemplateCacheKey(message, gameConfig);
        if (cacheKey) {
          cacheTemplate(cacheKey, result.code, result.response);
        }
      }

      // Filter AI output for PII leakage, manipulation, and inappropriate content
      const { text: cleanedMessage, warnings: textWarnings, flagged: textFlagged } = filterOutputText(result.response);
      const { code: cleanedCode, warnings: outputWarnings, blocked: codeBlocked } = filterOutputCode(result.code);
      const allWarnings = [...textWarnings, ...outputWarnings];
      if (allWarnings.length > 0) {
        log.warn({ userId, warnings: allWarnings }, 'Output filter warnings');
      }
      if (codeBlocked || textFlagged) {
        log.error({ userId, prompt: message?.slice(0, 80) }, 'BLOCKED AI output');
        return res.json({
          message:
            "Hmm, that didn't come out right! Let me try a different approach. Can you describe your game again?",
          code: null,
          usage: userId ? calculateUsageRemaining(tierCheck.user) : null,
          modelUsed: result.modelUsed,
          blocked: true,
        });
      }

      // Build final response
      const usage = userId ? calculateUsageRemaining(tierCheck.user) : null;

      const responsePayload = {
        message: cleanedMessage,
        code: cleanedCode,
        usage,
        modelUsed: result.modelUsed,
        isCacheHit: result.isCacheHit,
        grokAvailable: isGrokAvailable(),
        openaiAvailable: isOpenAIAvailable(),
      };

      // Include alternate response for critic/side-by-side modes
      if (result.alternateResponse) {
        responsePayload.alternateResponse = result.alternateResponse;
      }

      // Include debug info if in debug mode
      if (result.debugInfo) {
        responsePayload.debugInfo = result.debugInfo;
      }

      // Include reference sources for debugging (what code was injected)
      if (result.referenceSources && result.referenceSources.length > 0) {
        responsePayload.referenceSources = result.referenceSources;
      }

      // Log event for AI monitoring (skip under-13 and opted-out users for COPPA)
      let improvementOptOut = false;
      let ageBracket = null;
      if (userId) {
        try {
          const user = await readUser(userId);
          improvementOptOut = !!user.improvementOptOut;
          ageBracket = user.ageBracket || null;
          if (ageBracket === 'under13') improvementOptOut = true;
        } catch {
          /* user not found */
        }
      }
      if (!improvementOptOut) {
        logGenerateEvent({
          sessionId,
          startingModel,
          modelUsed: result.modelUsed,
          mode,
          hasCode: !!result.code,
          userId: ageBracket === 'under13' ? null : userId,
          ageBracket,
          improvementOptOut,
        }).catch((err) => console.error('Event log error:', err?.message));
      }

      res.json(responsePayload);
    } catch (error) {
      console.error('API Error:', error.message || error);
      console.error('Stack:', error.stack);

      let friendlyMessage = 'Oops! My brain got a little confused. 🤔 Can you try asking me again?';
      let statusCode = 500;

      const errMsg = (error.message || '').toLowerCase();
      if (errMsg.includes('anthropic_api_key') || errMsg.includes('not configured')) {
        friendlyMessage = 'The AI service is not configured yet. Please ask an admin to set the ANTHROPIC_API_KEY.';
        statusCode = 503;
      } else if (errMsg.includes('authentication') || errMsg.includes('invalid x-api-key') || errMsg.includes('401')) {
        friendlyMessage = 'The AI service key seems to be invalid. Please check the ANTHROPIC_API_KEY configuration.';
        statusCode = 503;
      } else if (errMsg.includes('rate') || errMsg.includes('429')) {
        friendlyMessage = "I'm a little busy right now! 🐢 Wait a moment and try again.";
        statusCode = 429;
      } else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
        friendlyMessage = 'That took too long! 🕐 Try asking for something a bit simpler.';
      } else if (errMsg.includes('overloaded') || errMsg.includes('529')) {
        friendlyMessage = 'The servers are super busy! 🚀 Try again in a minute.';
        statusCode = 503;
      } else if (errMsg.includes('xai') || errMsg.includes('grok')) {
        friendlyMessage = 'VibeGrok is taking a nap! 😴 Let me switch to Professor Claude...';
        statusCode = 503;
      } else if (errMsg.includes('openai') && !errMsg.includes('anthropic')) {
        friendlyMessage = 'Coach GPT is catching their breath! 🏆 Let me switch to another buddy...';
        statusCode = 503;
      }

      res.status(statusCode).json({
        message: friendlyMessage,
        code: null,
        modelUsed: null,
        isCacheHit: false,
      });
    }
  });

  return router;
}
