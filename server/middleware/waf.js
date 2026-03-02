/**
 * Application-Level WAF (Web Application Firewall)
 *
 * Lightweight request inspection layer that blocks common attack patterns
 * before they reach application logic. For production, layer this with
 * Cloudflare (free tier) or AWS WAF for DDoS and bot mitigation.
 *
 * Cloudflare setup guide: https://developers.cloudflare.com/fundamentals/
 */

const BLOCKED_PATTERNS = [
  // SQL injection
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i,
  /('|"|;)\s*(--)?\s*(OR|AND)\s+\d+\s*=\s*\d+/i,

  // Path traversal
  /\.\.[/\\]{1,}/,

  // Script injection in URL
  /<script[^>]*>/i,
  /javascript:\s*/i,

  // Command injection
  /[;&|`$]\s*(cat|ls|pwd|whoami|id|wget|curl|nc|bash|sh|cmd)\b/i,

  // Common scanner signatures
  /wp-admin|wp-login|phpinfo|\.php\?/i,
  /\/etc\/passwd|\/proc\/self/i,
];

const BLOCKED_USER_AGENTS = [/sqlmap/i, /nikto/i, /nessus/i, /masscan/i, /gobuster/i, /dirbuster/i];

export function wafMiddleware() {
  return (req, res, next) => {
    const url = decodeURIComponent(req.originalUrl || req.url || '');
    const ua = req.headers['user-agent'] || '';

    for (const pattern of BLOCKED_USER_AGENTS) {
      if (pattern.test(ua)) {
        return res.status(403).end();
      }
    }

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(url)) {
        console.warn(`🛡️ WAF blocked request: ${req.method} ${req.originalUrl} (pattern match)`);
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // Check query params for injection
    const queryString = req.originalUrl?.split('?')[1] || '';
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(queryString)) {
        console.warn(`🛡️ WAF blocked query: ${req.method} ${req.originalUrl} (query pattern match)`);
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    next();
  };
}
