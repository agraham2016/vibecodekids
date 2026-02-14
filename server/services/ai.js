/**
 * AI Service
 * 
 * Handles all Claude API interactions: generation, retry logic,
 * truncation recovery, and code extraction.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, AI_MODEL, AI_BASE_TOKENS, AI_MAX_TOKENS, AI_RETRY_COUNT, AI_RETRY_DELAY_MS } from '../config/index.js';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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

/**
 * Call Claude API with retry logic.
 */
export async function callClaude(systemPrompt, messages, maxTokens) {
  let response;
  for (let attempt = 1; attempt <= AI_RETRY_COUNT; attempt++) {
    try {
      response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages
      });
      return response;
    } catch (apiError) {
      console.error(`⚠️ Claude API attempt ${attempt}/${AI_RETRY_COUNT} failed:`, apiError.status, apiError.message);
      if (attempt === AI_RETRY_COUNT) {
        throw new Error(`Claude API failed after ${AI_RETRY_COUNT} attempts: ${apiError.status || ''} ${apiError.message || 'Unknown error'}`);
      }
      await new Promise(r => setTimeout(r, AI_RETRY_DELAY_MS));
    }
  }
}

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
export async function attemptContinuation(partialCode) {
  try {
    const continuationResponse = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      system: 'You were generating an HTML game and your response was cut off. Continue EXACTLY where you left off. Do NOT repeat any code that was already written. Do NOT add any explanation text - ONLY output the remaining code to complete the HTML document. The code must end with </html>. IMPORTANT: Make sure ALL features from the original game are still present in the remaining code.',
      messages: [{
        role: 'user',
        content: `Continue this HTML code. Pick up EXACTLY where it ends. Make sure all existing game features are preserved:\n\n${partialCode.slice(-3000)}`
      }]
    });

    const continuationText = continuationResponse.content[0].text;

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
