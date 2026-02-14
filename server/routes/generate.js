/**
 * AI Generation Route
 * 
 * POST /api/generate - Generate or modify game code from a prompt.
 */

import { Router } from 'express';
import { getSystemPrompt, detectGameGenre, sanitizeOutput } from '../prompts/index.js';
import { filterContent } from '../middleware/contentFilter.js';
import { checkRateLimits, checkTierLimits, incrementUsage, calculateUsageRemaining } from '../middleware/rateLimit.js';
import {
  formatMessageContent,
  calculateMaxTokens,
  callClaude,
  extractCode,
  isTruncated,
  extractPartialCode,
  attemptContinuation
} from '../services/ai.js';

export default function createGenerateRouter(sessions) {
  const router = Router();

  /**
   * Check if the current code is the default/empty state.
   */
  function isDefaultCode(code) {
    if (!code) return true;
    return code.includes('Vibe Code Studio') && code.includes('Tell me what you want to create');
  }

  router.post('/', async (req, res) => {
    try {
      const { message, image, currentCode, conversationHistory = [], gameConfig = null } = req.body;
      console.log(`🎮 Generate request: "${(message || '').slice(0, 80)}" | gameConfig: ${gameConfig ? gameConfig.gameType : 'none'} | hasCode: ${!!currentCode} | historyLen: ${conversationHistory.length}`);

      // Get user from session
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId = null;
      if (token) {
        const session = sessions.get(token);
        if (session) userId = session.userId;
      }

      // Check rate limits
      const rateLimitCheck = await checkRateLimits(userId);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          message: rateLimitCheck.message,
          code: null,
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
          upgradeRequired: tierCheck.upgradeRequired,
          reason: tierCheck.reason
        });
      }

      // Content filter
      const contentCheck = filterContent(message);
      if (contentCheck.blocked) {
        return res.json({ message: contentCheck.reason, code: null });
      }

      // Genre detection
      let gameGenre = null;
      let codeToUse = currentCode;

      if (gameConfig && gameConfig.gameType) {
        gameGenre = gameConfig.gameType;
      } else if (!currentCode || isDefaultCode(currentCode)) {
        gameGenre = detectGameGenre(message);
      }

      if (gameGenre) console.log(`🎮 Detected game genre: ${gameGenre}`);

      // Build system prompt
      const systemPrompt = getSystemPrompt(codeToUse, gameConfig, gameGenre);

      // Format messages
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: formatMessageContent(msg.content, msg.image)
        })),
        { role: 'user', content: formatMessageContent(message, image) }
      ];

      console.log(`📝 System prompt: ${systemPrompt.length} chars | Messages: ${messages.length} | Genre: ${gameGenre || 'none'}`);

      // Calculate tokens
      const maxTokens = calculateMaxTokens(codeToUse);

      // Call Claude
      const response = await callClaude(systemPrompt, messages, maxTokens);

      // Increment usage
      await incrementUsage(userId, 'generate');

      // Extract response
      let assistantMessage = response.content[0].text;
      let code = extractCode(assistantMessage);
      let wasCodeTruncated = false;

      // Handle truncation
      if (!code && isTruncated(assistantMessage)) {
        console.log('⚠️ Response truncated - attempting continuation...');
        const partialCode = extractPartialCode(assistantMessage);

        if (partialCode) {
          code = await attemptContinuation(partialCode);
          if (!code) wasCodeTruncated = true;
        } else {
          wasCodeTruncated = true;
        }
      } else if (!code) {
        console.log('⚠️ No code block found in AI response');
      }

      // Sanitize output
      let cleanMessage = sanitizeOutput(assistantMessage);
      if (wasCodeTruncated) {
        cleanMessage = "That game got really big! 😅 Let me try a simpler approach — ask me to add one feature at a time, like 'add a speed powerup' instead of multiple things at once! 🎮";
      }

      // Usage info
      const usage = userId ? calculateUsageRemaining(tierCheck.user) : null;

      res.json({ message: cleanMessage, code, usage });

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
      }

      res.status(statusCode).json({ message: friendlyMessage, code: null });
    }
  });

  return router;
}
