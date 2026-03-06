/**
 * Security Headers Middleware
 *
 * Lightweight helmet-style security headers without adding a dependency.
 * Protects against common web vulnerabilities.
 *
 * Uses nonce-based CSP when req.cspNonce is set (HTML pages).
 * script-src: nonce (no unsafe-inline). style-src: unsafe-inline (AI games need inline styles).
 */

export function securityHeaders() {
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

    // /dev routes: use unsafe-inline (templates have inline script/style)
    const isDevRoute = (req.path || '').startsWith('/dev');
    const nonce = isDevRoute ? null : req.cspNonce;
    // script-src: nonce eliminates unsafe-inline (primary XSS vector)
    const scriptSrc = nonce
      ? `'self' 'nonce-${nonce}' https://js.stripe.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`
      : "'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com";
    // style-src: use 'unsafe-inline' only (no nonce). Per CSP spec, nonce+unsafe-inline ignores
    // unsafe-inline, blocking style="" attributes. AI-generated games (Phaser, etc.) rely on
    // inline styles—without this, preview iframe shows blank white screen.
    const styleSrc = "'self' 'unsafe-inline'";

    // Request origin for connect-src: srcdoc iframe games load assets via XHR; they inherit CSP
    // and need our origin allowed (sandbox gives iframe opaque origin so 'self' differs).
    const scheme = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3001';
    const requestOrigin = `${scheme}://${host}`;

    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
      "font-src 'self' data:",
      `img-src 'self' ${requestOrigin} data: blob:`,
      `connect-src 'self' ${requestOrigin} wss: ws: https://api.stripe.com`,
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
