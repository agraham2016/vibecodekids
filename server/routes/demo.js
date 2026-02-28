/**
 * Demo Generation Route — unauthenticated "Try It Now"
 *
 * POST /api/demo/generate — generate a game without login.
 * IP-based rate limit: 5 per 24h. Uses same AI pipeline + template cache.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { detectGameGenre, sanitizeOutput } from '../prompts/index.js';
import { filterContent } from '../middleware/contentFilter.js';
import {
  getTemplateCacheKey,
  getCachedTemplate,
  cacheTemplate,
} from '../services/ai.js';
import { generateOrIterateGame } from '../services/gameHandler.js';
import { logDemoEvent } from '../services/demoEvents.js';

const router = Router();

// ========== IP-BASED RATE LIMITING ==========

const DEMO_MAX = 5;
const DEMO_WINDOW_MS = 24 * 60 * 60 * 1000;
const demoLimits = new Map(); // Map<ip, { count, resetAt }>

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of demoLimits) {
    if (now > entry.resetAt) demoLimits.delete(ip);
  }
}, 60 * 60 * 1000);

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function checkDemoLimit(ip) {
  const now = Date.now();
  let entry = demoLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + DEMO_WINDOW_MS };
    demoLimits.set(ip, entry);
  }
  if (entry.count >= DEMO_MAX) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: DEMO_MAX - entry.count };
}

function isDefaultCode(code) {
  if (!code) return true;
  return code.includes('Vibe Code Studio') && code.includes('Tell me what you want to create');
}

// ========== DEMO GENERATE ==========

router.post('/generate', async (req, res) => {
  try {
    const { message, visitorId, variant } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return res.status(400).json({ error: 'Describe the game you want to make!' });
    }

    const ip = getClientIp(req);
    const limit = checkDemoLimit(ip);
    if (!limit.allowed) {
      return res.status(429).json({
        message: "You've used all 5 free demos for today! Create a free account to keep making games.",
        code: null,
        promptsRemaining: 0,
        gated: true,
      });
    }

    const contentCheck = filterContent(message, { source: 'demo' });
    if (contentCheck.blocked) {
      return res.json({ message: contentCheck.reason, code: null, promptsRemaining: limit.remaining });
    }

    const gameGenre = detectGameGenre(message);
    const generationId = `demo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Template cache check
    const cacheKey = getTemplateCacheKey(message, null);
    const cached = getCachedTemplate(cacheKey);
    if (cached) {
      cached.hits++;

      logDemoEvent({
        type: 'generation',
        generationId,
        prompt: message.slice(0, 200),
        modelUsed: 'claude',
        isCacheHit: true,
        success: true,
        variant: variant || null,
        visitorId: visitorId || null,
        ipHash: crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12),
      }).catch(() => {});

      return res.json({
        message: cached.message,
        code: cached.code,
        generationId,
        modelUsed: 'claude',
        isCacheHit: true,
        promptsRemaining: limit.remaining,
      });
    }

    // Full AI generation
    const result = await generateOrIterateGame({
      prompt: message,
      currentCode: null,
      mode: 'default',
      conversationHistory: [],
      gameConfig: null,
      image: null,
      userId: null,
      lastModelUsed: null,
      debugAttempt: 0,
    });

    // Cache for future hits
    if (result.code && !result.wasTruncated && cacheKey) {
      cacheTemplate(cacheKey, result.code, result.response);
    }

    logDemoEvent({
      type: 'generation',
      generationId,
      prompt: message.slice(0, 200),
      modelUsed: result.modelUsed || 'claude',
      isCacheHit: false,
      success: !!result.code,
      variant: variant || null,
      visitorId: visitorId || null,
      ipHash: crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12),
    }).catch(() => {});

    res.json({
      message: result.response,
      code: result.code,
      generationId,
      modelUsed: result.modelUsed,
      isCacheHit: false,
      promptsRemaining: limit.remaining,
    });

  } catch (error) {
    console.error('Demo generate error:', error.message || error);
    res.status(500).json({
      message: "Oops! Something went wrong. Try again in a moment.",
      code: null,
      promptsRemaining: null,
    });
  }
});

export default router;
