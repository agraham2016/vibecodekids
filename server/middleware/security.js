/**
 * Security Headers Middleware
 * 
 * Lightweight helmet-style security headers without adding a dependency.
 * Protects against common web vulnerabilities.
 */

export function securityHeaders() {
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '));

    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    res.removeHeader('X-Powered-By');

    next();
  };
}
