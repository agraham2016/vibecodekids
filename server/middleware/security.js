/**
 * Security Headers Middleware
 * 
 * Lightweight helmet-style security headers without adding a dependency.
 * Protects against common web vulnerabilities.
 */

export function securityHeaders() {
  return (_req, res, next) => {
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Enable browser XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent exposing referrer to other sites
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict browser permissions (camera, mic, etc.)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

    // Remove Express fingerprint
    res.removeHeader('X-Powered-By');

    next();
  };
}
