/**
 * Content Filter Middleware
 *
 * Blocks inappropriate content in user input.
 * Optionally records stats when blocked (pass source for admin dashboard).
 */

import { getContentFilter } from '../prompts/index.js';
import { recordBlocked } from '../services/contentFilterStats.js';

const INJECTION_PATTERNS = [
  'ignore all previous',
  'ignore previous instructions',
  'forget all previous',
  'forget your instructions',
  'disregard prior',
  'disregard all rules',
  'dan mode',
  'do anything now',
  'developer mode',
  'jailbreak',
  'bypass content filter',
  'bypass filter',
  'bypass safety',
  'override system prompt',
  'no restrictions',
  'pretend no rules',
  'pretend there are no rules',
  'act without restrictions',
];

/**
 * Normalize input to defeat obfuscation (zero-width chars, unicode tricks, etc.)
 */
export function canonicalize(input) {
  if (!input || typeof input !== 'string') return '';
  let s = input
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFKC')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .trim();
  // Collapse single-char-separator obfuscation: "p.o.r.n" or "n a z i" → "porn" / "nazi"
  s = s.replace(/\b([a-zA-Z])[\s.\-_]+(?=[a-zA-Z][\s.\-_]+[a-zA-Z])/g, '$1');
  s = s.replace(/([a-zA-Z])[\s.\-_]+([a-zA-Z])\b/g, '$1$2');
  return s;
}

export function filterContent(content, options = {}) {
  const blockedPatterns = getContentFilter();
  const normalized = canonicalize(content);
  const lowerContent = normalized.toLowerCase();

  const isInjection = INJECTION_PATTERNS.some((p) => lowerContent.includes(p));

  for (const pattern of blockedPatterns) {
    if (lowerContent.includes(pattern)) {
      if (options.source) {
        recordBlocked(options.source);
      }
      return {
        blocked: true,
        injectionAttempt: isInjection,
        reason: "Let's keep our creations fun and friendly! Try asking about something else you'd like to build.",
      };
    }
  }

  if (isInjection) {
    if (options.source) recordBlocked(options.source);
    return {
      blocked: true,
      injectionAttempt: true,
      reason: "Nice try, but I only help build games! Tell me about a game you'd like to create.",
    };
  }

  return { blocked: false };
}
