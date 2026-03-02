/**
 * AI Output Validator
 *
 * Scans AI-generated game code for dangerous patterns before returning to the client.
 * Game code runs in a sandboxed iframe (allow-scripts only, no allow-same-origin),
 * but we still want defense-in-depth.
 */

const DANGEROUS_PATTERNS = [
  // Data exfiltration from parent frame
  { pattern: /window\s*\.\s*(parent|top|opener)\b/gi, reason: 'parent frame access' },
  { pattern: /document\s*\.\s*cookie/gi, reason: 'cookie access' },
  { pattern: /localStorage|sessionStorage/gi, reason: 'storage access' },

  // External data exfil via fetch/XHR to non-CDN domains
  {
    pattern:
      /fetch\s*\(\s*(['"`])https?:\/\/(?!cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com)/gi,
    reason: 'external fetch',
  },
  { pattern: /new\s+XMLHttpRequest/gi, reason: 'XHR request' },
  { pattern: /navigator\s*\.\s*sendBeacon/gi, reason: 'sendBeacon' },

  // Dynamic script injection from external sources
  { pattern: /document\s*\.\s*createElement\s*\(\s*(['"`])script\1\s*\)/gi, reason: 'dynamic script creation' },
  {
    pattern: /\.src\s*=\s*(['"`])https?:\/\/(?!cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/gi,
    reason: 'external script source',
  },

  // Eval-like execution
  { pattern: /\beval\s*\(/gi, reason: 'eval()' },
  { pattern: /new\s+Function\s*\(/gi, reason: 'new Function()' },

  // Crypto mining indicators
  { pattern: /CoinHive|coinhive|cryptonight|minero/gi, reason: 'crypto miner' },

  // WebRTC / WebSocket to external (data exfil channel)
  { pattern: /new\s+WebSocket\s*\(\s*(['"`])wss?:\/\//gi, reason: 'external WebSocket' },
  { pattern: /RTCPeerConnection/gi, reason: 'WebRTC' },
];

const ALLOWLISTED_PATTERNS = [/Phaser\.Game/i, /THREE\./i, /requestAnimationFrame/i];

/**
 * Validate AI-generated code for dangerous patterns.
 * Returns { safe: boolean, violations: string[] }
 */
export function validateAIOutput(code) {
  if (!code || typeof code !== 'string') return { safe: true, violations: [] };

  const violations = [];

  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(code)) {
      violations.push(reason);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Sanitize AI-generated code by removing or neutralizing dangerous patterns.
 * Returns the cleaned code.
 */
export function sanitizeAIOutput(code) {
  if (!code || typeof code !== 'string') return code;

  let cleaned = code;

  // Remove window.parent/top/opener references
  cleaned = cleaned.replace(/window\s*\.\s*(parent|top|opener)\b/gi, '/* [blocked: $1 access] */ undefined');

  // Remove document.cookie
  cleaned = cleaned.replace(/document\s*\.\s*cookie/gi, '/* [blocked: cookie access] */ ""');

  // Remove eval
  cleaned = cleaned.replace(/\beval\s*\(/gi, '/* [blocked: eval] */ (function(){return "";})(');

  // Remove new Function
  cleaned = cleaned.replace(
    /new\s+Function\s*\(/gi,
    '/* [blocked: Function constructor] */ (function(){return function(){};})(',
  );

  return cleaned;
}
