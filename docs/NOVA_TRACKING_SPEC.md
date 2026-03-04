# Marketing Tracking — Implementation Spec for Nova

**From:** Harper Lane (Growth Marketer)  
**To:** Nova (Full-Stack Developer)  
**Reference:** `docs/MARKETING_TRACKING_PLAN.md` (Elias approved 2026-03-05)

---

## Summary

Implement first-party marketing events (`page_view`, `cta_click`, `form_submit`) and add pixel placeholder/conditional includes on **/esa and /contact only**. All approved by Elias.

---

## Part 1: First-Party Events

### 1.1 New API Endpoint

**Route:** `POST /api/marketing/event`

**Accepts:**
```json
{
  "type": "page_view" | "cta_click" | "form_submit",
  "url": "/",
  "referrer": "https://google.com",
  "device": "mobile" | "desktop",
  "sessionId": "optional-uuid",
  "section": "hero | pricing | nav | ...",
  "buttonId": "nav-cta | btn-signup | ...",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "launch_q1"
}
```

**UTM params:** For `page_view`, capture `utm_source`, `utm_medium`, `utm_campaign` from `window.location.search` and include in payload. Enables attribution for landing campaigns (first-party only).

**Validation:**
- `type` required, must be one of: `page_view`, `cta_click`, `form_submit`
- `url` required for all; `section` for cta_click; `buttonId` for cta_click
- No PII. Reject if body contains email, name, phone, etc.

**Storage:** New file `marketing_events.jsonl` in DATA_DIR, same pattern as `demo_events.jsonl`. Records: `id`, `timestamp`, `type`, `url`, `referrer`, `device`, `sessionId`, `section`, `buttonId`, `ipHash`.

**Retention:** Same 90-day purge as demo events (add to `dataRetention.js`).

### 1.2 Surfaces to Instrument

| Surface | Type | File | When to Fire |
|---------|------|------|--------------|
| Landing (/) | page_view, cta_click | `LandingPage.tsx`, `LandingPageB.tsx` | On mount (page_view); on CTA click (cta_click) |
| ESA | page_view, cta_click | `public/esa.html` | On load; on CTA clicks (e.g., ClassWallet, plan buttons) |
| Contact | page_view, cta_click, form_submit | `public/contact.html` | On load; on CTA; on form submit success |
| Gallery | page_view, cta_click | `public/gallery.html` | On load; on "Play" / CTA clicks |

### 1.3 React (Landing Pages)

Create `src/lib/marketingEvents.ts`:

```ts
export function trackPageView(url: string, referrer?: string, device?: string): void
export function trackCtaClick(buttonId: string, section?: string): void
```

Calls `POST /api/marketing/event` with appropriate payload. Fire-and-forget (`fetch` with no await). Use `getVisitorId()` from `abVariant.ts` for sessionId if needed, or `crypto.randomUUID()` per session.

**LandingPage.tsx / LandingPageB.tsx:**
- `useEffect` on mount: `trackPageView(window.location.pathname || '/', document.referrer, /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop')`
- Wrap each CTA `onClick` to also call `trackCtaClick('btn-signup', 'hero')` etc. Use consistent `buttonId` and `section` values.

**CTA mapping (Landing A/B):**

| Element | buttonId | section |
|---------|----------|---------|
| Nav "Get Started Free" | nav-cta | nav |
| Hero "Get Started Free" | btn-signup | hero |
| "Try It Now" (B only) | btn-tryit | hero |
| Section CTA buttons | section-cta | section name |
| Pricing "Start Free Trial" | price-free-btn | pricing |
| Pricing "Get Started" (Creator) | price-creator-btn | pricing |
| Pricing "Get Started" (Pro) | price-pro-btn | pricing |
| Template cards | template-{genre} | templates |
| Scratch cards | scratch-{index} | scratch |

### 1.4 Static HTML (ESA, Contact, Gallery)

Add inline script (or small `marketing.js`) that:
1. On load: `fetch('/api/marketing/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'page_view', url: window.location.pathname, referrer: document.referrer, device: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop' }) })`
2. On CTA click: attach listeners or use `data-track-cta` attribute + delegated handler
3. Contact form: on submit success, fire `form_submit` (no PII in payload)

---

## Part 2: Third-Party Pixels (ESA, Contact Only)

### 2.1 Constraint

**Pixels allowed ONLY on:** `/esa`, `/contact`  
**Pixels prohibited on:** `/`, `/gallery`, AuthModal, signup, Studio

### 2.2 Implementation

Harper will provide pixel scripts (Google Ads, Meta, TikTok). Nova's job:

1. **Create** `public/scripts/pixels.js` (or similar) that conditionally loads pixel scripts only when `window.location.pathname` is `/esa` or `/contact`.
2. **Include** this script only in `public/esa.html` and `public/contact.html` — **NOT** in `index.html`, `gallery.html`, or any React entry.
3. **Structure:** Script checks pathname; if allowed, injects/dynamically loads pixel base scripts. Harper provides the actual pixel IDs and snippet code.

**Placeholder for now:** Add a comment block in esa.html and contact.html:

```html
<!-- PIXEL ZONE (Elias approved): Third-party pixels allowed on this page only.
     Nova: add conditional pixel loader when Harper provides scripts. -->
```

Do **not** add any third-party script URLs until Harper provides them. The structure/comment documents intent.

---

## Part 3: Data Retention

Add `purgeMarketingEvents()` to `server/services/dataRetention.js`, same pattern as `purgeDemoEvents()`. Purge `marketing_events.jsonl` records older than 90 days. Call from main retention sweep.

---

## Part 4: Checkout Start (Stripe) — DEFERRED

**Event:** `checkout_start` — fires when user clicks a button that redirects to Stripe Checkout.

**Status:** Deferred. UpgradeModal renders in Studio (post-login) context. Per Elias, no tracking in Studio. Confirm with Elias whether parent-initiated checkout (payment flow) is an exception before adding.

---

## File Checklist

| Task | File(s) |
|------|---------|
| New route | `server/routes/marketingAnalytics.js` |
| New service | `server/services/marketingEvents.js` (or extend demoEvents with new types) |
| Retention | `server/services/dataRetention.js` — add marketing events purge |
| Route registration | `server/index.js` |
| Client util | `src/lib/marketingEvents.ts` |
| Landing A | `src/components/LandingPage.tsx` |
| Landing B | `src/components/LandingPageB.tsx` |
| ESA | `public/esa.html` |
| Contact | `public/contact.html` |
| Gallery | `public/gallery.html` |
| Upgrade modal | `src/components/UpgradeModal.tsx` |

---

## Out of Scope (Do Not Implement)

- Third-party pixels on `/` or `/gallery`
- Any tracking in AuthModal, signup flow, or Studio
- Retargeting pixel configuration (Harper handles in ad platforms)
