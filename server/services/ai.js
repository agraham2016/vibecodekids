/**
 * AI Service (Optimized)
 * 
 * Handles all Claude API interactions with:
 * - Prompt caching (cache_control) for the static system prompt
 * - Streaming support for faster perceived response times
 * - Conversation history trimming to reduce token waste
 * - Token usage tracking and cost logging
 * - Retry logic with exponential backoff
 * - Truncation recovery (continuation requests)
 */

import Anthropic from '@anthropic-ai/sdk';
import { 
  ANTHROPIC_API_KEY, AI_MODEL, AI_BASE_TOKENS, AI_MAX_TOKENS, 
  AI_RETRY_COUNT, AI_RETRY_DELAY_MS 
} from '../config/index.js';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ========== TOKEN USAGE TRACKING ==========

const usageStats = {
  totalRequests: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalCostCents: 0,
  byUser: new Map(),
  startedAt: new Date().toISOString(),
};

// Claude Sonnet pricing (per million tokens)
const PRICING = {
  input: 3.00,       // $3.00 / 1M input tokens
  output: 15.00,     // $15.00 / 1M output tokens
  cacheWrite: 3.75,  // $3.75 / 1M tokens (cache write)
  cacheRead: 0.30,   // $0.30 / 1M tokens (cache hit)
};

function trackUsage(response, userId = null) {
  const usage = response.usage;
  if (!usage) return;

  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheCreation = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;

  // Calculate cost
  const regularInput = inputTokens - cacheCreation - cacheRead;
  const costCents = (
    (regularInput / 1_000_000) * PRICING.input * 100 +
    (outputTokens / 1_000_000) * PRICING.output * 100 +
    (cacheCreation / 1_000_000) * PRICING.cacheWrite * 100 +
    (cacheRead / 1_000_000) * PRICING.cacheRead * 100
  );

  usageStats.totalRequests++;
  usageStats.totalInputTokens += inputTokens;
  usageStats.totalOutputTokens += outputTokens;
  usageStats.totalCostCents += costCents;

  if (cacheRead > 0) usageStats.cacheHits++;
  if (cacheCreation > 0) usageStats.cacheMisses++;

  // Per-user tracking
  if (userId) {
    const userStats = usageStats.byUser.get(userId) || { requests: 0, inputTokens: 0, outputTokens: 0, costCents: 0 };
    userStats.requests++;
    userStats.inputTokens += inputTokens;
    userStats.outputTokens += outputTokens;
    userStats.costCents += costCents;
    usageStats.byUser.set(userId, userStats);
  }

  // Log summary
  const cacheStatus = cacheRead > 0 ? `CACHE HIT (${cacheRead} tokens cached)` : cacheCreation > 0 ? `CACHE WRITE (${cacheCreation} tokens)` : 'NO CACHE';
  console.log(`💰 AI Usage: ${inputTokens}in/${outputTokens}out | ${cacheStatus} | $${(costCents / 100).toFixed(4)} | Total: $${(usageStats.totalCostCents / 100).toFixed(4)}`);
}

/**
 * Get current usage statistics.
 */
export function getUsageStats() {
  return {
    ...usageStats,
    byUser: Object.fromEntries(usageStats.byUser),
    cacheHitRate: usageStats.totalRequests > 0 
      ? (usageStats.cacheHits / usageStats.totalRequests * 100).toFixed(1) + '%' 
      : '0%',
  };
}

// ========== MESSAGE FORMATTING ==========

/**
 * Format message content for Claude (with optional image).
 */
export function formatMessageContent(text, imageBase64) {
  if (!imageBase64) return text;

  const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return text;

  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: matches[1],
        data: matches[2]
      }
    },
    { type: 'text', text }
  ];
}

// ========== CONVERSATION HISTORY TRIMMING ==========

/**
 * Trim conversation history to stay within token budget.
 * Strategy: Keep the first message (original game description) + last N messages.
 * This preserves context about what the game IS while keeping recent edits.
 */
export function trimConversationHistory(messages, maxMessages = 10) {
  if (messages.length <= maxMessages) return messages;

  // Always keep: first user message + last (maxMessages - 1) messages
  const first = messages[0];
  const recent = messages.slice(-(maxMessages - 1));

  // Add a context bridge so the AI knows messages were trimmed
  const trimmed = [
    first,
    { 
      role: 'user', 
      content: '[Earlier conversation about building and modifying this game was trimmed for space. The current game code is provided in the system context.]' 
    },
    { role: 'assistant', content: 'Got it! I can see the current game. What would you like me to change? 🎮' },
    ...recent
  ];

  console.log(`✂️ Trimmed conversation: ${messages.length} → ${trimmed.length} messages`);
  return trimmed;
}

// ========== TOKEN CALCULATION ==========

/**
 * Calculate appropriate max_tokens based on existing code size.
 */
export function calculateMaxTokens(currentCode) {
  const codeLength = (currentCode || '').length;
  const estimatedTokensNeeded = Math.ceil(codeLength / 3) + 4096;
  const maxTokens = Math.min(Math.max(AI_BASE_TOKENS, estimatedTokensNeeded), AI_MAX_TOKENS);
  if (maxTokens > AI_BASE_TOKENS) {
    console.log(`📏 Code is ${codeLength} chars — increased max_tokens to ${maxTokens}`);
  }
  return maxTokens;
}

// ========== CLAUDE API CALLS ==========

/**
 * Build the system prompt blocks with cache_control for prompt caching.
 * 
 * Claude's prompt caching works by marking parts of the system prompt as cacheable.
 * The static parts (personality, rules, knowledge base) are cached.
 * The dynamic parts (current code, genre rules) are NOT cached.
 */
function buildSystemBlocks(staticPrompt, dynamicContext = '') {
  const blocks = [
    {
      type: 'text',
      text: staticPrompt,
      cache_control: { type: 'ephemeral' }
    }
  ];

  if (dynamicContext) {
    blocks.push({
      type: 'text',
      text: dynamicContext
    });
  }

  return blocks;
}

/**
 * Call Claude API with retry logic and prompt caching.
 * 
 * @param {string} staticPrompt - The cacheable portion of the system prompt
 * @param {string} dynamicContext - The per-request dynamic context (current code, genre rules)
 * @param {Array} messages - Conversation messages
 * @param {number} maxTokens - Max output tokens
 * @param {string|null} userId - For usage tracking
 */
export async function callClaude(staticPrompt, dynamicContext, messages, maxTokens, userId = null) {
  const systemBlocks = buildSystemBlocks(staticPrompt, dynamicContext);

  let response;
  for (let attempt = 1; attempt <= AI_RETRY_COUNT; attempt++) {
    try {
      response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: maxTokens,
        system: systemBlocks,
        messages
      });
      trackUsage(response, userId);
      return response;
    } catch (apiError) {
      console.error(`⚠️ Claude API attempt ${attempt}/${AI_RETRY_COUNT} failed:`, apiError.status, apiError.message);
      if (attempt === AI_RETRY_COUNT) {
        throw new Error(`Claude API failed after ${AI_RETRY_COUNT} attempts: ${apiError.status || ''} ${apiError.message || 'Unknown error'}`);
      }
      // Exponential backoff: 1s, 2s, 4s...
      await new Promise(r => setTimeout(r, AI_RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
    }
  }
}

/**
 * Call Claude with streaming for real-time response delivery.
 * Returns an async iterator of text chunks.
 * 
 * @param {string} staticPrompt - Cacheable system prompt
 * @param {string} dynamicContext - Per-request context
 * @param {Array} messages - Conversation messages
 * @param {number} maxTokens - Max output tokens
 * @param {string|null} userId - For usage tracking
 */
export async function callClaudeStreaming(staticPrompt, dynamicContext, messages, maxTokens, userId = null) {
  const systemBlocks = buildSystemBlocks(staticPrompt, dynamicContext);

  const stream = await anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages
  });

  return stream;
}

// ========== CODE EXTRACTION ==========

/**
 * Extract complete HTML code from AI response text.
 */
export function extractCode(text) {
  // 1) Markdown code block: ```html
  const codeBlockMatch = text.match(/```\s*html\s*\n([\s\S]*?)```/i);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    if (inner.includes('</html>')) return inner;
  }
  // 2) Any code block containing full HTML
  const blockRegex = /```\s*\w*\s*\n([\s\S]*?)```/gi;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(text)) !== null) {
    const inner = blockMatch[1].trim();
    if (inner.includes('<!DOCTYPE') && inner.includes('</html>')) {
      const extracted = inner.match(/<!DOCTYPE\s+html>[\s\S]*<\/html>/i);
      if (extracted && extracted[0].length > 100) return extracted[0];
    }
  }
  // 3) Raw HTML (no backticks)
  const htmlMatch = text.match(/<!DOCTYPE\s+html>[\s\S]*?<\/html>/i);
  if (htmlMatch) return htmlMatch[0];
  return null;
}

/**
 * Detect if response was truncated mid-code.
 */
export function isTruncated(text) {
  const hasPartialHtml = text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<script');
  const hasClosingHtml = text.includes('</html>');
  return hasPartialHtml && !hasClosingHtml;
}

/**
 * Extract partial code from a truncated response.
 */
export function extractPartialCode(text) {
  const match = text.match(/<!DOCTYPE\s+html>[\s\S]*/i) || text.match(/<html[\s\S]*/i);
  if (match) return match[0];
  const fenceMatch = text.match(/```\s*html\s*\n([\s\S]*)/i);
  if (fenceMatch) return fenceMatch[1];
  return null;
}

/**
 * Attempt to continue a truncated response by asking Claude to finish.
 */
export async function attemptContinuation(partialCode, userId = null) {
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      system: 'You were generating an HTML game and your response was cut off. Continue EXACTLY where you left off. Do NOT repeat any code that was already written. Do NOT add any explanation text - ONLY output the remaining code to complete the HTML document. The code must end with </html>. IMPORTANT: Make sure ALL features from the original game are still present in the remaining code.',
      messages: [{
        role: 'user',
        content: `Continue this HTML code. Pick up EXACTLY where it ends. Make sure all existing game features are preserved:\n\n${partialCode.slice(-3000)}`
      }]
    });

    trackUsage(response, userId);

    const continuationText = response.content[0].text;

    // Clean up continuation
    let cleanContinuation = continuationText
      .replace(/^```\s*\w*\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Stitch together
    const fullCode = partialCode + '\n' + cleanContinuation;

    if (fullCode.includes('</html>')) {
      const stitchedMatch = fullCode.match(/<!DOCTYPE\s+html>[\s\S]*<\/html>/i);
      if (stitchedMatch && stitchedMatch[0].length > 200) {
        console.log('✅ Continuation successful - stitched complete HTML (' + stitchedMatch[0].length + ' chars)');
        return stitchedMatch[0];
      }
    }

    console.log('⚠️ Continuation did not produce valid HTML');
    return null;
  } catch (err) {
    console.error('⚠️ Continuation request failed:', err.message);
    return null;
  }
}

// ========== TEMPLATE CACHE ==========

/**
 * Simple in-memory cache for common game templates.
 * When a user asks for a common game type with no modifications,
 * we can serve a cached template instead of burning AI tokens.
 * 
 * Cache entries expire after 24 hours.
 */
const templateCache = new Map();
const TEMPLATE_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Generate a cache key from the game request.
 * Only caches for brand-new games (no existing code, no conversation history).
 */
export function getTemplateCacheKey(message, gameConfig) {
  if (!gameConfig) return null; // Only cache survey-based games
  
  const key = [
    gameConfig.gameType,
    gameConfig.dimension || '2d',
    gameConfig.theme,
    gameConfig.visualStyle,
  ].join('|').toLowerCase();
  
  return key;
}

/**
 * Get a cached template if available and fresh.
 */
export function getCachedTemplate(key) {
  if (!key) return null;
  const entry = templateCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TEMPLATE_CACHE_TTL) {
    templateCache.delete(key);
    return null;
  }
  console.log(`📦 Template cache HIT: ${key}`);
  return entry;
}

/**
 * Store a generated game in the template cache.
 */
export function cacheTemplate(key, code, message) {
  if (!key || !code) return;
  templateCache.set(key, {
    code,
    message,
    timestamp: Date.now(),
    hits: 0,
  });
  console.log(`📦 Template cached: ${key} (${templateCache.size} total)`);
}
