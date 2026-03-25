/**
 * Landing variant selection
 *
 * Default traffic uses variant "a" so the landing page stays consistent.
 * Controlled tests can still override with ?variant=a or ?variant=b and
 * that explicit choice is persisted in a cookie for follow-up visits.
 */

const OVERRIDE_COOKIE = 'vck_variant_override';
const VISITOR_COOKIE = 'vck_vid';
const COOKIE_DAYS = 30;

function setCookie(name: string, value: string, days: number) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export type Variant = 'a' | 'b';

/**
 * Get the assigned A/B variant for this visitor.
 * Priority: URL param > override cookie > default variant "a".
 */
export function getVariant(): Variant {
  const params = new URLSearchParams(window.location.search);
  const urlVariant = params.get('variant');
  if (urlVariant === 'a' || urlVariant === 'b') {
    setCookie(OVERRIDE_COOKIE, urlVariant, COOKIE_DAYS);
    return urlVariant;
  }

  const saved = getCookie(OVERRIDE_COOKIE);
  if (saved === 'a' || saved === 'b') return saved;

  return 'a';
}

/**
 * Get or create a stable visitor ID (UUID in a cookie).
 */
export function getVisitorId(): string {
  const existing = getCookie(VISITOR_COOKIE);
  if (existing) return existing;

  const id = crypto.randomUUID();
  setCookie(VISITOR_COOKIE, id, COOKIE_DAYS);
  return id;
}
