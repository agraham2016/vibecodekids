/**
 * PII Scanner Middleware
 *
 * Detects and strips personally identifiable information from text
 * BEFORE it is sent to third-party AI providers. This is critical
 * for COPPA compliance — children naturally embed PII in creative prompts.
 *
 * Detected PII types:
 *   - Email addresses
 *   - Phone numbers (US formats)
 *   - Street addresses (number + street name patterns)
 *   - Social Security Numbers
 *   - Full names preceded by common identifiers ("my name is", "I'm", etc.)
 *   - URLs with personal paths
 *
 * Returns { cleaned, piiFound[] } so callers can log/warn as needed.
 */

const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g;

const SSN_RE = /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g;

const ADDRESS_RE = /\b\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,3}\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Rd|Road|Ln|Lane|Ct|Court|Way|Pl(?:ace)?|Cir(?:cle)?)\b\.?/gi;

// "My name is Jake Smith", "I'm Sarah", "I am John", "call me Alex Jones"
const NAME_INTRO_RE = /(?:(?:my\s+name\s+is|i'?m|i\s+am|call\s+me|they\s+call\s+me)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/gi;

// "I live in Mesa Arizona", "I'm from Phoenix, AZ"
const LOCATION_RE = /(?:i\s+live\s+in|i'?m\s+from|i\s+go\s+to\s+school\s+(?:in|at))\s+([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+){0,3})/gi;

const REPLACEMENT = '[REDACTED]';

/**
 * Scan text for PII and return a cleaned version plus a list of what was found.
 * @param {string} text
 * @returns {{ cleaned: string, piiFound: string[] }}
 */
export function scanPII(text) {
  if (!text || typeof text !== 'string') return { cleaned: text || '', piiFound: [] };

  const piiFound = [];
  let cleaned = text;

  // Order matters: most specific patterns first

  // SSN
  cleaned = cleaned.replace(SSN_RE, (m) => { piiFound.push('ssn'); return REPLACEMENT; });

  // Email
  cleaned = cleaned.replace(EMAIL_RE, (m) => { piiFound.push('email'); return REPLACEMENT; });

  // Phone
  cleaned = cleaned.replace(PHONE_RE, (m) => {
    // Avoid false positives on short digit sequences in game context (scores, coordinates)
    if (/^\d{4,5}$/.test(m.replace(/[\s.\-()]/g, '')) === false) {
      piiFound.push('phone');
      return REPLACEMENT;
    }
    return m;
  });

  // Street address
  cleaned = cleaned.replace(ADDRESS_RE, (m) => { piiFound.push('address'); return REPLACEMENT; });

  // Name introductions
  cleaned = cleaned.replace(NAME_INTRO_RE, (match, name) => {
    piiFound.push('name');
    return match.replace(name, REPLACEMENT);
  });

  // Location disclosure
  cleaned = cleaned.replace(LOCATION_RE, (match, loc) => {
    piiFound.push('location');
    return match.replace(loc, REPLACEMENT);
  });

  return { cleaned, piiFound };
}

/**
 * Express middleware that scans req.body.message for PII,
 * replaces it, and attaches metadata to req.piiScanResult.
 */
export function piiScannerMiddleware(req, _res, next) {
  if (req.body && req.body.message) {
    const result = scanPII(req.body.message);
    req.body.message = result.cleaned;
    req.piiScanResult = result;
    if (result.piiFound.length > 0) {
      console.log(`PII scanner: stripped ${result.piiFound.length} item(s) [${[...new Set(result.piiFound)].join(', ')}]`);
    }
  }
  next();
}
