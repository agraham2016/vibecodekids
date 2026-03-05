/**
 * Security Headers Middleware
 *
 * Lightweight helmet-style security headers without adding a dependency.
 * Protects against common web vulnerabilities.
 *
 * Uses nonce-based CSP when req.cspNonce is set (HTML pages).
 * Eliminates unsafe-inline for script-src and style-src.
 */

export function securityHeaders() {
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // /dev routes: use unsafe-inline (templates have inline script/style)
    const isDevRoute = (req.path || '').startsWith('/dev');
    const nonce = isDevRoute ? null : req.cspNonce;
    // script-src: nonce eliminates unsafe-inline (primary XSS vector)
    const scriptSrc = nonce
      ? `'self' 'nonce-${nonce}' https://js.stripe.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`
      : "'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com";
    // style-src: nonce for <style> blocks; keep unsafe-inline for style="" attributes (heavy use in gallery/admin)
    const styleSrc = nonce ? `'self' 'nonce-${nonce}' 'unsafe-inline'` : "'self' 'unsafe-inline'";

    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
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
