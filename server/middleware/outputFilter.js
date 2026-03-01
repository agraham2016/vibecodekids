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

/**
 * Scan AI output text (the friendly message portion) for PII.
 * Returns cleaned text.
 */
export function filterOutputText(text) {
  if (!text) return text;
  const { cleaned } = scanPII(text);
  return cleaned;
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

  return { code: filtered, warnings };
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
