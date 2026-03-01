/**
 * AI Generation Route (Dual-Model: Claude + Grok)
 * 
 * POST /api/generate - Generate or modify game code using dual AI models.
 * 
 * Supports:
 * - Mode-based routing (default/claude/grok/creative/debug/ask-other-buddy/critic)
 * - Response caching across BOTH models
 * - Template cache for brand-new games
 * - Auto-detection of creative/debug intent from prompt
 * - Token usage tracking per user per model
 * 
 * New request body fields:
 * - mode: 'default' | 'claude' | 'grok' | 'creative' | 'debug' | 'ask-other-buddy' | 'critic'
 * - lastModelUsed: 'claude' | 'grok' (for ask-other-buddy routing)
 * - debugAttempt: number (for debug escalation tracking)
 */

import { Router } from 'express';
import { detectGameGenre, sanitizeOutput } from '../prompts/index.js';
import { filterContent } from '../middleware/contentFilter.js';
import { piiScannerMiddleware } from '../middleware/piiScanner.js';
import { filterOutputText, filterOutputCode } from '../middleware/outputFilter.js';
import { checkRateLimits, checkTierLimits, incrementUsage, calculateUsageRemaining } from '../middleware/rateLimit.js';
import {
  getTemplateCacheKey,
  getCachedTemplate,
  cacheTemplate,
  isGrokAvailable,
} from '../services/ai.js';
import { generateOrIterateGame } from '../services/gameHandler.js';
import { logGenerateEvent } from '../services/eventStore.js';
import { readUser } from '../services/storage.js';
import { recordViolation } from '../services/discipline.js';

export default function createGenerateRouter(sessions) {
  const router = Router();

  /**
   * Check if the current code is the default/empty state.
   */
  function isDefaultCode(code) {
    if (!code) return true;
    return code.includes('Vibe Code Studio') && code.includes('Tell me what you want to create');
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
        mode = 'default',
        lastModelUsed = null,
        debugAttempt = 0,
        // ---- MONITORING FIELDS ----
        sessionId = null,
        startingModel = null,
      } = req.body;

      console.log(`🎮 Generate request: "${(message || '').slice(0, 80)}" | mode: ${mode} | model-hint: ${lastModelUsed || 'none'} | gameConfig: ${gameConfig ? gameConfig.gameType : 'none'} | hasCode: ${!!currentCode} | historyLen: ${conversationHistory.length}`);

      // Get user from session
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId = null;
      if (token) {
        const session = await sessions.get(token);
        if (session) userId = session.userId;
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
          waitSeconds: rateLimitCheck.waitSeconds
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
          reason: tierCheck.reason
        });
      }

      // Content filter
      const contentCheck = filterContent(message, { source: 'generate' });
      if (contentCheck.blocked) {
        const discipline = await recordViolation(userId);
        const msg = discipline.message
          ? `${contentCheck.reason}\n\n${discipline.message}`
          : contentCheck.reason;
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

          // Log event for monitoring (skip if opted out)
          let improvementOptOut = false;
          let ageBracket = null;
          if (userId) {
            try {
              const user = await readUser(userId);
              improvementOptOut = !!user.improvementOptOut;
              ageBracket = user.ageBracket || null;
            } catch { /* user not found */ }
          }
          logGenerateEvent({
            sessionId,
            startingModel,
            modelUsed: 'claude',
            mode,
            hasCode: !!cached.code,
            userId,
            ageBracket,
            improvementOptOut,
          }).catch((err) => console.error('Event log error:', err?.message));

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

      // ===== CALL THE DUAL-MODEL HANDLER =====
      const result = await generateOrIterateGame({
        prompt: message,
        currentCode,
        mode,
        conversationHistory,
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

      // Filter AI output for PII leakage and inappropriate content
      const cleanedMessage = filterOutputText(result.response);
      const { code: cleanedCode, warnings: outputWarnings } = filterOutputCode(result.code);
      if (outputWarnings.length > 0) {
        console.log(`Output filter warnings: ${outputWarnings.join(', ')}`);
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

      // Log event for AI monitoring (skip if opted out)
      let improvementOptOut = false;
      let ageBracket = null;
      if (userId) {
        try {
          const user = await readUser(userId);
          improvementOptOut = !!user.improvementOptOut;
          ageBracket = user.ageBracket || null;
        } catch { /* user not found */ }
      }
      logGenerateEvent({
        sessionId,
        startingModel,
        modelUsed: result.modelUsed,
        mode,
        hasCode: !!result.code,
        userId,
        ageBracket,
        improvementOptOut,
      }).catch((err) => console.error('Event log error:', err?.message));

      res.json(responsePayload);

    } catch (error) {
      console.error('API Error:', error.message || error);
      console.error('Stack:', error.stack);

      let friendlyMessage = "Oops! My brain got a little confused. 🤔 Can you try asking me again?";
      let statusCode = 500;

      const errMsg = (error.message || '').toLowerCase();
      if (errMsg.includes('rate') || errMsg.includes('429')) {
        friendlyMessage = "I'm a little busy right now! 🐢 Wait a moment and try again.";
        statusCode = 429;
      } else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
        friendlyMessage = "That took too long! 🕐 Try asking for something a bit simpler.";
      } else if (errMsg.includes('overloaded') || errMsg.includes('529')) {
        friendlyMessage = "The servers are super busy! 🚀 Try again in a minute.";
        statusCode = 503;
      } else if (errMsg.includes('xai') || errMsg.includes('grok')) {
        friendlyMessage = "VibeGrok is taking a nap! 😴 Let me switch to Professor Claude...";
        statusCode = 503;
      }

      res.status(statusCode).json({ 
        message: friendlyMessage, 
        code: null, 
        modelUsed: null, 
        isCacheHit: false 
      });
    }
  });

  return router;
}
