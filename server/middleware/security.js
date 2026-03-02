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
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // 'unsafe-inline' is required: multiple HTML pages (gallery, play, admin)
    // use inline <script> blocks, and AI-generated games contain inline scripts
    // rendered via srcdoc iframes that inherit the parent CSP.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' wss: ws: https://api.stripe.com",
      "frame-src 'self' blob: https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    res.removeHeader('X-Powered-By');

    next();
  };
}
