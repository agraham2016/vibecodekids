/**
 * Injects CSP nonce into HTML string for use in srcdoc iframes.
 * The parent document's nonce-based CSP applies to srcdoc; script/style tags need the nonce.
 * Reads nonce from meta tag or #root data attribute (server injects both).
 */
export function injectNonceIntoCode(code: string): string {
  const nonce =
    document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.getAttribute('content') ??
    document.getElementById('root')?.getAttribute('data-csp-nonce');
  if (!nonce) return code;
  const esc = nonce.replace(/[\\"]/g, '\\$&');
  // Match <script and <style (including type="module", defer, src="...", etc.)
  let result = code.replace(/<script(?=[\s>])/gi, () => `<script nonce="${esc}" `);
  result = result.replace(/<style(?=[\s>])/gi, () => `<style nonce="${esc}" `);
  return result;
}
