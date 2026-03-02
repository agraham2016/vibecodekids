/**
 * Content Filter Middleware
 *
 * Blocks inappropriate content in user input.
 * Optionally records stats when blocked (pass source for admin dashboard).
 */

import { getContentFilter } from '../prompts/index.js';
import { recordBlocked } from '../services/contentFilterStats.js';

/**
 * Normalize input to defeat obfuscation (zero-width chars, unicode tricks, etc.)
 */
export function canonicalize(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFKC')
    .replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .trim();
}

export function filterContent(content, options = {}) {
  const blockedPatterns = getContentFilter();
  const normalized = canonicalize(content);
  const lowerContent = normalized.toLowerCase();

  for (const pattern of blockedPatterns) {
    if (lowerContent.includes(pattern)) {
      if (options.source) {
        recordBlocked(options.source);
      }
      return {
        blocked: true,
        reason: "Let's keep our creations fun and friendly! Try asking about something else you'd like to build."
      };
    }
  }

  return { blocked: false };
}
