/**
 * Output Filter
 *
 * Scans AI-generated text and code for:
 *   1. PII that the model may have echoed or hallucinated
 *   2. Inappropriate content that bypassed the system prompt
 *   3. External resource requests that leak data (tracking pixels, beacons)
 *
 * Applied AFTER AI generation, BEFORE response is sent to the child.
 */

import { scanPII } from './piiScanner.js';
import { getContentFilter } from '../prompts/index.js';
import log from '../services/logger.js';

const MANIPULATION_PATTERNS = [
  // Isolation tactics
  /don'?t\s+tell\s+(your\s+)?(parents?|mom|dad|teacher|anyone)/i,
  /this\s+(is|can\s+be)\s+our\s+secret/i,
  /keep\s+this\s+(between|just)\s+(us|you\s+and\s+me)/i,
  /no\s+one\s+(else\s+)?(needs?|has)\s+to\s+know/i,
  // Guilt-tripping / emotional coercion
  /if\s+you\s+(really\s+)?(loved?|cared?|trusted?)\s+me/i,
  /you'?re\s+making\s+me\s+(sad|upset|angry|cry)/i,
  /after\s+everything\s+I('?ve)?\s+(done|did)\s+for\s+you/i,
  /you\s+owe\s+me/i,
  // Gaslighting
  /that\s+(never|didn'?t)\s+happen/i,
  /you'?re\s+(imagining|making)\s+(things|it)\s+up/i,
  /you'?re\s+(too|so)\s+sensitive/i,
  /no\s+one\s+(will\s+)?believe\s+you/i,
  // Fear-mongering
  /something\s+bad\s+will\s+happen\s+(if|unless)/i,
  /you'?ll\s+be\s+(all\s+)?alone\s+(if|unless|without)/i,
  // Parasocial escalation
  /I\s+(really\s+)?(love|need)\s+you/i,
  /you'?re\s+the\s+only\s+(one|person)\s+(who|that)\s+(understands?|gets?)\s+me/i,
  /I\s+can'?t\s+live\s+without\s+you/i,
  /we\s+have\s+a\s+special\s+(bond|connection|relationship)/i,
  // Identity deception
  /I'?m\s+(a\s+)?real\s+(person|human|kid|boy|girl)/i,
  /I\s+have\s+(real\s+)?feelings\s+(just\s+)?like\s+you/i,
];

/**
 * Scan AI output text (the friendly message portion) for PII and manipulation.
 * Returns cleaned text and any warnings.
 */
export function filterOutputText(text) {
  if (!text) return { text: text || '', warnings: [], flagged: false };
  const { cleaned } = scanPII(text);

  const warnings = [];
  for (const pattern of MANIPULATION_PATTERNS) {
    if (pattern.test(cleaned)) {
      const match = cleaned.match(pattern);
      warnings.push(`manipulation:${match?.[0] || 'unknown'}`);
      log.warn({ pattern: pattern.source, match: match?.[0] }, 'Manipulation pattern detected in AI output');
    }
  }

  return { text: cleaned, warnings, flagged: warnings.length > 0 };
}

/**
 * Scan AI-generated HTML/JS code for dangerous patterns.
 * Returns { code, warnings[] }.
 */
export function filterOutputCode(code) {
  if (!code || typeof code !== 'string') return { code, warnings: [] };

  const warnings = [];
  let filtered = code;

  // Strip any tracking/beacon URLs injected into code
  const trackingPatterns = [
    /new\s+Image\(\)\.src\s*=\s*['"][^'"]+['"]/gi,
    /navigator\.sendBeacon\s*\([^)]+\)/gi,
    /fetch\s*\(\s*['"]https?:\/\/(?!cdn\.|fonts\.|unpkg\.)[^'"]+['"]/gi,
  ];
  for (const pattern of trackingPatterns) {
    if (pattern.test(filtered)) {
      warnings.push('tracking_script');
      filtered = filtered.replace(pattern, '/* removed */');
    }
  }

  // Strip localStorage/sessionStorage usage (per GAME STATE rules — no persistence)
  const storagePatterns = [
    /localStorage\s*\.\s*(?:setItem|getItem|removeItem|clear)\s*\([^)]*\)/gi,
    /sessionStorage\s*\.\s*(?:setItem|getItem|removeItem|clear)\s*\([^)]*\)/gi,
  ];
  for (const pattern of storagePatterns) {
    if (pattern.test(filtered)) {
      warnings.push('storage_access');
      filtered = filtered.replace(pattern, '/* storage disabled */');
    }
  }

  // Check for content-filter keywords in visible text within the HTML.
  // If found, strip the offending terms from the code to prevent display.
  const blockedPatterns = getContentFilter();
  const textContent = extractVisibleText(filtered);
  const lowerText = textContent.toLowerCase();
  for (const pattern of blockedPatterns) {
    if (lowerText.includes(pattern)) {
      warnings.push(`blocked_content:${pattern}`);
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtered = filtered.replace(new RegExp(escaped, 'gi'), '***');
    }
  }

  const hasBlockedContent = warnings.some((w) => w.startsWith('blocked_content:'));
  return { code: filtered, warnings, blocked: hasBlockedContent };
}

/**
 * Extract visible text from HTML (strip tags and script/style blocks).
 * Used for content-checking the output.
 */
function extractVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
