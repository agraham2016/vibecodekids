/**
 * Content Filter Middleware
 *
 * Blocks inappropriate content in user input.
 * Includes leet-speak normalization, Unicode confusable folding,
 * and regex-based pattern matching to resist bypass attempts.
 */

import { getContentFilter } from '../prompts/index.js';
import { recordBlocked } from '../services/contentFilterStats.js';

// Leet-speak and Unicode confusable normalization map
const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', '$': 's', '!': 'i', '+': 't',
  '\u00e0': 'a', '\u00e1': 'a', '\u00e2': 'a', '\u00e4': 'a',
  '\u00e8': 'e', '\u00e9': 'e', '\u00ea': 'e', '\u00eb': 'e',
  '\u00ec': 'i', '\u00ed': 'i', '\u00ee': 'i', '\u00ef': 'i',
  '\u00f2': 'o', '\u00f3': 'o', '\u00f4': 'o', '\u00f6': 'o',
  '\u00f9': 'u', '\u00fa': 'u', '\u00fb': 'u', '\u00fc': 'u',
};

/**
 * Normalize text: lowercase, strip separators between letters,
 * fold leet-speak and Unicode confusables to ASCII.
 */
function normalizeText(text) {
  let normalized = text.toLowerCase();
  // Replace leet/confusable characters
  normalized = normalized.replace(/./g, ch => LEET_MAP[ch] || ch);
  // Collapse repeated characters (e.g., "seeex" → "sex")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  // Strip separators commonly used to bypass filters: dots, dashes, underscores, spaces between single letters
  // e.g., "s.e.x" → "sex", "p-o-r-n" → "porn"
  normalized = normalized.replace(/(?<=\w)[.\-_*\s](?=\w)/g, '');
  return normalized;
}

// Regex patterns for harder-to-catch bypass attempts
const REGEX_BLOCKLIST = [
  /\bp\s*o\s*r\s*n/i,
  /\bn\s*u\s*d\s*e/i,
  /\bs\s*e\s*x\s*(?:u|y|i)/i,
  /\bk+\s*i+\s*l+\s*l+\s*m+\s*y+\s*s/i,
  /\bsu+i+ci+d/i,
  /\bsch+oo+l\s*sh+oo+t/i,
  /\bn+\s*a+\s*z+\s*i/i,
  /\bwh+i+te?\s*(?:sup|pow)/i,
];

// Prompt injection patterns — attempts to override system instructions
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(?:previous|above|prior)\s+(?:instructions?|rules?|prompts?)/i,
  /disregard\s+(all\s+)?(?:previous|above|prior)\s+(?:instructions?|rules?|prompts?)/i,
  /forget\s+(all\s+)?(?:previous|above|prior)\s+(?:instructions?|rules?)/i,
  /you\s+are\s+now\s+(?:a\s+)?(?:unrestricted|unfiltered|jailbroken|DAN|evil)/i,
  /(?:new|override|replace)\s+system\s+prompt/i,
  /system\s*:\s*you\s+are/i,
  /\[\s*system\s*\]/i,
  /act\s+as\s+(?:if\s+)?(?:you\s+have\s+)?no\s+(?:restrictions?|filters?|rules?|guidelines?)/i,
  /bypass\s+(?:content\s+)?(?:filter|safety|moderation|restriction)/i,
  /pretend\s+(?:you\s+)?(?:don'?t\s+have|there\s+are\s+no)\s+(?:rules?|filters?|restrictions?)/i,
  /\bDAN\s+mode\b/i,
  /developer\s+mode\s+(?:enabled|on|activated)/i,
  /do\s+anything\s+now/i,
];

export function filterContent(content, options = {}) {
  const blockedPatterns = getContentFilter();
  const rawLower = (content || '').toLowerCase();
  const normalized = normalizeText(content || '');

  // Check keyword list against both raw and normalized text
  for (const pattern of blockedPatterns) {
    if (rawLower.includes(pattern) || normalized.includes(pattern)) {
      if (options.source) {
        recordBlocked(options.source);
      }
      return {
        blocked: true,
        reason: "Let's keep our creations fun and friendly! Try asking about something else you'd like to build."
      };
    }
  }

  // Check regex patterns
  for (const re of REGEX_BLOCKLIST) {
    if (re.test(rawLower) || re.test(normalized)) {
      if (options.source) {
        recordBlocked(options.source);
      }
      return {
        blocked: true,
        reason: "Let's keep our creations fun and friendly! Try asking about something else you'd like to build."
      };
    }
  }

  // Check prompt injection attempts
  for (const re of INJECTION_PATTERNS) {
    if (re.test(content || '')) {
      if (options.source) {
        recordBlocked(options.source);
      }
      return {
        blocked: true,
        reason: "That kind of instruction isn't something I can work with. Try describing a game you'd like to build!",
        injectionAttempt: true,
      };
    }
  }

  return { blocked: false };
}
