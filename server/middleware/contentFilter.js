/**
 * Content Filter Middleware
 *
 * Blocks inappropriate content in user input.
 * Optionally records stats when blocked (pass source for admin dashboard).
 */

import { getContentFilter } from '../prompts/index.js';
import { recordBlocked } from '../services/contentFilterStats.js';

export function filterContent(content, options = {}) {
  const blockedPatterns = getContentFilter();
  const lowerContent = (content || '').toLowerCase();

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
