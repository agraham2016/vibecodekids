/**
 * Content Filter Middleware
 * 
 * Blocks inappropriate content in user input.
 */

import { getContentFilter } from '../prompts/index.js';

export function filterContent(content) {
  const blockedPatterns = getContentFilter();
  const lowerContent = content.toLowerCase();

  for (const pattern of blockedPatterns) {
    if (lowerContent.includes(pattern)) {
      return {
        blocked: true,
        reason: "Let's keep our creations fun and friendly! Try asking about something else you'd like to build."
      };
    }
  }

  return { blocked: false };
}
