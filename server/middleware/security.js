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
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Remove Express fingerprint
    res.removeHeader('X-Powered-By');

    // HSTS — force HTTPS for 1 year + includeSubDomains
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Content-Security-Policy
    // 'unsafe-inline' for style-src because HTML pages use inline <style> blocks
    // 'unsafe-inline' for script-src because HTML pages have inline <script> blocks
    // The SPA bundle is loaded from 'self'. External script/style sources limited to
    // self-hosted fonts (after P0-9 migration) and data: for SVG backgrounds.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' wss: ws:",
      "frame-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    next();
  };
}
