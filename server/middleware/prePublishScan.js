/**
 * Pre-Publish Scan
 *
 * Scans game HTML/JS code before it's made public:
 * 1. Content filter on visible text
 * 2. PII scanner on visible text
 * 3. Dangerous pattern detection (external requests, tracking, storage)
 */

import { filterContent } from './contentFilter.js';
import { scanPII } from './piiScanner.js';

function extractVisibleText(html) {
  if (!html) return '';
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function extractStringLiterals(code) {
  if (!code) return '';
  const strings = [];
  const re = /(?:'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)")/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    strings.push(m[1] || m[2] || '');
  }
  return strings.join(' ');
}

const DANGEROUS_PATTERNS = [
  { pattern: /new\s+XMLHttpRequest|fetch\s*\(/gi, label: 'external_request' },
  { pattern: /navigator\.sendBeacon/gi, label: 'tracking_beacon' },
  { pattern: /localStorage|sessionStorage/gi, label: 'browser_storage' },
  { pattern: /<img[^>]+src\s*=\s*["']https?:\/\//gi, label: 'external_image' },
  { pattern: /\.src\s*=\s*['"]https?:\/\//gi, label: 'external_resource' },
  { pattern: /document\.cookie/gi, label: 'cookie_access' },
];

/**
 * Scan game code before publishing. Returns { safe, warnings[] }.
 * `safe` is false only for hard blockers (content filter match).
 */
export function prePublishScan(code) {
  const warnings = [];
  let safe = true;

  if (!code) return { safe: true, warnings: [] };

  const visibleText = extractVisibleText(code);
  const stringLiterals = extractStringLiterals(code);
  const combinedText = visibleText + ' ' + stringLiterals;

  const contentResult = filterContent(combinedText, { source: 'publish_scan' });
  if (contentResult.blocked) {
    safe = false;
    warnings.push('inappropriate_content');
  }

  const piiResult = scanPII(combinedText);
  if (piiResult.piiFound.length > 0) {
    safe = false;
    warnings.push(`pii_detected:${piiResult.piiFound.join(',')}`);
  }

  for (const { pattern, label } of DANGEROUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(code)) {
      safe = false;
      warnings.push(label);
    }
  }

  return { safe, warnings };
}
