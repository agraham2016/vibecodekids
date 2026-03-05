/**
 * Injects CSP nonce into HTML for script and style tags.
 * Enables nonce-based CSP without unsafe-inline.
 *
 * Also adds <meta name="csp-nonce"> so client JS (e.g. play.html srcdoc)
 * can read and inject nonce into AI-generated game HTML.
 */

export function injectNonce(html, nonce) {
  if (!nonce || typeof nonce !== 'string') return html;

  const escaped = nonce.replace(/[\\"<>]/g, (c) => {
    if (c === '"') return '\\"';
    if (c === '\\') return '\\\\';
    return c;
  });

  // Add nonce to <script> and <style> tags (space after nonce for proper attribute separation)
  html = html.replace(/<script(?=\s|>)/gi, () => `<script nonce="${escaped}" `);
  html = html.replace(/<style(?=\s|>)/gi, () => `<style nonce="${escaped}" `);

  // Add meta tag for play.html client to read nonce for srcdoc injection
  if (!/name=["']csp-nonce["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => m + `<meta name="csp-nonce" content="${escaped}">`);
  }

  return html;
}
