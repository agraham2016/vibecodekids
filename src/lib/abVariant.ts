/**
 * A/B Test Variant Assignment
 *
 * Assigns visitors to variant "a" (current landing) or "b" (try-it-now landing).
 * Persisted in a cookie so each visitor always sees the same variant.
 * Override with ?variant=a or ?variant=b in the URL.
 */

const COOKIE_NAME = 'vck_variant'
const VISITOR_COOKIE = 'vck_vid'
const COOKIE_DAYS = 30

function setCookie(name: string, value: string, days: number) {
  const d = new Date()
  d.setTime(d.getTime() + days * 86400000)
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export type Variant = 'a' | 'b'

/**
 * Get the assigned A/B variant for this visitor.
 * Priority: URL param > cookie > random 50/50.
 */
export function getVariant(): Variant {
  const params = new URLSearchParams(window.location.search)
  const urlVariant = params.get('variant')
  if (urlVariant === 'a' || urlVariant === 'b') {
    setCookie(COOKIE_NAME, urlVariant, COOKIE_DAYS)
    return urlVariant
  }

  const saved = getCookie(COOKIE_NAME)
  if (saved === 'a' || saved === 'b') return saved

  const assigned: Variant = Math.random() < 0.5 ? 'a' : 'b'
  setCookie(COOKIE_NAME, assigned, COOKIE_DAYS)
  return assigned
}

/**
 * Get or create a stable visitor ID (UUID in a cookie).
 */
export function getVisitorId(): string {
  const existing = getCookie(VISITOR_COOKIE)
  if (existing) return existing

  const id = crypto.randomUUID()
  setCookie(VISITOR_COOKIE, id, COOKIE_DAYS)
  return id
}
