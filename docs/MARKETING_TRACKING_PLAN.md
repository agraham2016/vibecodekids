# Marketing Tracking Plan

**Owner:** Harper Lane (Growth Marketer)  
**Compliance Review:** Elias Vance (Compliance Lead) — **approval required before any pixel/SDK goes live**  
**Last Updated:** March 2026  
**Elias Review:** 2026-03-05 ✅

---

## TL;DR for Harper

| What | Approved? |
|------|-----------|
| First-party analytics (page_view, cta_click) on /, /esa, /contact, /gallery | ✅ Yes |
| Landing B `/api/demo/event` (visitorId, ipHash) | ✅ Yes |
| Third-party pixels on **/esa, /contact** | ✅ Yes |
| Third-party pixels on **/, /gallery** | ❌ No — child traffic |
| Retargeting from /esa, /contact | ✅ Yes |
| Retargeting from landing | ❌ No |

---

## Purpose

This document defines what marketing events we track, where we track them, and the child data boundary. It exists so Harper can measure campaign performance without violating COPPA or child privacy.

---

## Child Data Boundary — Non-Negotiable

| Rule | What It Means |
|------|---------------|
| **No child behavior tracking** | Zero pixels, SDKs, or third-party trackers in the child studio (post-login app). |
| **No child PII in ad systems** | Retargeting lists, ad audiences, and analytics must never include or link to child accounts. |
| **Stop before child account creation** | If Elias requires, tracking must stop before the AuthModal / signup flow. |
| **Elias approves all tracking** | No new event, pixel, or SDK without documented approval below. |

---

## Surface-by-Surface Approval Matrix

| Surface | URL/Route | Who Visits | Tracking Allowed? | Elias Approval |
|---------|-----------|------------|------------------|----------------|
| Landing (home) | `/` | Parents + kids (anon) | First-party only; no 3rd-party pixels | ✅ Approved (see checklist) |
| Landing B (Try It Now) | `/` (variant=b) | Parents + kids (anon) | First-party `/api/demo/event` only | ✅ Approved |
| ESA page | `/esa` | Parents only | Yes (parent-initiated) | ✅ Approved |
| Contact page | `/contact` | Parents + general | Yes (form completion) | ✅ Approved |
| Gallery/Arcade | `/gallery` | Parents + kids (public) | First-party only; no 3rd-party pixels | ✅ Approved (first-party), ❌ Not approved (pixels) |
| AuthModal / signup | Modal, `/api/auth/*` | Child + parent | **NO** | — |
| Studio (post-login) | App after login | Child | **NO** | — |
| Parent dashboard | `/parent-dashboard` | Parent only | Yes (parent-initiated) | ✅ Approved |

---

## Current Events (Implemented)

### Demo Events — Landing B Only

| Event | Trigger | Data Captured | Storage | Retention |
|-------|---------|---------------|---------|-----------|
| `pageview` | Landing B load | `visitorId`, `variant`, `referrer`, `device` | `demo_events.jsonl` | 90 days |
| `generation` | AI builds game (demo) | `visitorId`, `variant`, `prompt` (first 200 chars), `ipHash` | `demo_events.jsonl` | 90 days |
| `feedback` | Thumbs up/down | `visitorId`, `generationId`, `thumbsUp` | `demo_events.jsonl` | 90 days |
| `signup` | User hits signup gate (5 demos) | `visitorId`, `promptsUsed` | `demo_events.jsonl` | 90 days |

**Implementation:** `POST /api/demo/event` (server/routes/demoAnalytics.js), `server/services/demoEvents.js`  
**Notes:** No PII. `visitorId` is UUID in cookie; `ipHash` is SHA-256 hash truncated. Prompts are PII-scrubbed before storage.

### Landing A

Landing A has no demo flow and no `/api/demo/event` calls. No marketing events currently captured.

---

## Proposed Events (Elias Approved)

### Parent Marketing Surfaces — First-Party

| Event | Surface | Data | Purpose | Status |
|-------|---------|------|---------|--------|
| `page_view` | /, /esa, /contact, /gallery | URL, referrer, device, session ID | Funnel analytics | Approved |
| `cta_click` | Same | Button ID, section | Conversion optimization | Approved |
| `form_submit` | /contact | Form completion (no PII in event) | Lead tracking | Approved |
| `checkout_start` | Stripe redirect | Checkout session ID | Attribution | Approved |

### Third-Party Pixels (Google, Meta, TikTok)

| Pixel | Surface | Status | Notes |
|-------|---------|--------|-------|
| Google Ads | /esa, /contact | Approved | Parent-only surfaces |
| Google Ads | /, /gallery | **NOT approved** | Mixed/child traffic |
| Meta (FB/IG) | /esa, /contact | Approved | Parent-only surfaces |
| Meta (FB/IG) | /, /gallery | **NOT approved** | Mixed/child traffic |
| TikTok | /esa, /contact | Approved | Parent-only surfaces |
| TikTok | /, /gallery | **NOT approved** | Mixed/child traffic |

**Critical:** Pixels must never fire on AuthModal, signup flow, or any post-login Studio page. Pixels on landing (/) and gallery (/gallery) are **prohibited** — those surfaces receive child traffic.

---

## Elias Approval Checklist

**Harper → Elias:** Please review and mark each item. Harper will not deploy any new tracking until all applicable items are approved.

1. **Landing page (/) pre-AuthModal**  
   - [x] First-party analytics (page_view, cta_click) on landing page **before** user opens AuthModal — **APPROVED**  
   - *Rationale:* Anonymous visitors only. No child PII. Must stop before AuthModal opens. First-party data we control; no third-party SDK in this scope.

2. **Gallery (/gallery)**  
   - [x] First-party analytics (page_view, cta_click) — **APPROVED**  
   - [x] Third-party pixels (Google, Meta, TikTok) — **NOT APPROVED**  
   - *Rationale:* Gallery is visited by children (public page). Third-party pixels would capture child page views, violating the child data boundary. First-party events only.

3. **Landing B "Try It Now" — anonymous visitorId**  
   - [x] Current `/api/demo/event` logging (pageview, generation, feedback, signup) using `visitorId` (UUID cookie) and `ipHash` — **APPROVED**  
   - *Rationale:* No PII. visitorId is random UUID; ipHash is non-reversible. Prompts PII-scrubbed before storage. First-party, 90-day retention. Compliant.

4. **Third-party pixels (Google, Meta, TikTok)**  
   - [x] Pixels on **/esa and /contact only** — **APPROVED**  
   - [x] Pixels on **/ (landing)** — **NOT APPROVED**  
   - [x] Never on AuthModal/signup/Studio — **Confirmed**  
   - *Rationale:* Landing receives mixed child/parent traffic. We cannot distinguish at page load. Third-party pixels on landing would track children. ESA and contact are parent-initiated or parent-dominant; pixels allowed there.

5. **Retargeting**  
   - [x] Retargeting audiences from **/esa and /contact only** — **APPROVED**  
   - [x] Retargeting from **landing page (/) — NOT APPROVED**  
   - *Rationale:* Landing traffic includes children. Building retargeting audiences from landing would include children; serving targeted ads to them based on visit is not acceptable. ESA and contact audiences are parent-only.

---

**Elias approval:** E. Vance, Compliance Lead — 2026-03-05

---

## Data Flow Summary

```
Ad Click → Landing (/) → [TRACKING ZONE]
    ↓
CTA Click / Form Submit / Demo Event
    ↓
AuthModal Opens → [STOP TRACKING] ← Child data boundary
    ↓
Signup / Login → Studio
    ↓
[NO TRACKING] Child studio — zero marketing pixels
```

---

## Baseline Metrics

See `docs/MARKETING_METRICS.md` for funnel metrics, event-to-metric mapping, and weekly reporting template.

---

## Implementation & Strategy

| Doc | Path | Owner |
|-----|------|-------|
| Nova implementation spec | `docs/NOVA_TRACKING_SPEC.md` | Harper → Nova |
| Channel strategy | `docs/MARKETING_CHANNEL_STRATEGY.md` | Harper |

---

## References

| Doc | Path |
|-----|------|
| Marketing metrics | `docs/MARKETING_METRICS.md` |
| Harper rule file | `.cursor/rules/harper-growth-marketer.md` |
| Demo events service | `server/services/demoEvents.js` |
| Demo analytics route | `server/routes/demoAnalytics.js` |
| Data retention (90-day purge) | `server/services/dataRetention.js` |
| A/B variant + visitorId | `src/lib/abVariant.ts` |
