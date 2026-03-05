# Nova Moderation Spec — Gallery Report Button + Reporter User ID

**From:** Rowan Vale, Community & Moderation Lead  
**To:** Nova (Full-Stack Developer)  
**Date:** March 5, 2026  
**Reference:** `docs/MODERATION_POLICY_AUDIT.md` (Gaps 1 & 2)  
**Lumi alignment:** UX_AUDIT recommends "See something wrong?" on gallery cards; kid-friendly, discoverable.

**Handoff:** Audit complete. Spec ready for implementation. Lumi review requested on Section 4 (copy, placement, prominence) before build. Estimate: ~2–3 hrs total.

---

## Overview

Two P1 changes to close moderation tooling gaps:

1. **Gallery Report Button** — Add report access to gallery cards so users can report without opening the game.
2. **Reporter User ID** — Pass `reporterUserId` when the reporter is logged in, for abuse detection.

---

## Section 1: Gallery Report Button

### Placement

- **Where:** On each game card in `public/gallery.html` (both featured grid and all-games grid).
- **Location:** Bottom-right of `card-content`, adjacent to or below the stats row (views, likes). Do not obscure the primary "PRESS START" / play affordance.
- **Visual:** Small text link or icon+text. Example: `🚩 See something wrong?` — soft, kid-friendly per Lumi's UX_AUDIT.

### Interaction

1. **Click** — `event.stopPropagation()` and `event.preventDefault()` so the card link (`/play/{id}`) does not fire.
2. **Open modal** — Same structure as play page report modal: reason dropdown, Cancel, Submit.
3. **Submit** — `POST /api/report` with `{ projectId, reason }`. Same rate limit applies (5/IP/hour).

### Modal Copy (Kid-Friendly)

| Element | Copy |
|---------|------|
| Title | "See Something Wrong?" |
| Subtitle | "Why are you reporting this game?" |
| Reason options | (Same as play: inappropriate_content, personal_info, bullying, scary_content, other) |
| Labels | Use friendly labels: "Inappropriate content", "Shows personal info", "Bullying or mean", "Too scary", "Other" |
| Success | "Thank you! Our team will review this." |
| Error | "Couldn't submit. Please try again." |

### Technical Notes

- Gallery card is `<a href="/play/{id}">` — report control must be a child element with `onclick` that stops propagation.
- Modal can be inline in `gallery.html` or injected via JS (like play page).
- Reuse the same `VALID_REASONS` and modal structure as `play.html` for consistency.

### Files to Modify

- `public/gallery.html` — Add report button to `createCard()`, add report modal HTML/JS, `submitReport(projectId)`.

---

## Section 2: Reporter User ID

### Current Behavior

- `POST /api/report` accepts `{ projectId, reason }` from body.
- `createReport()` is called with `reporterUserId: null` (hardcoded in `report.js` line 59).

### Required Behavior

1. **Report API** — If request includes `Authorization: Bearer <token>`, resolve session and obtain `userId`. Pass `reporterUserId: userId` to `createReport()`. If no valid session, pass `null` (unchanged).
2. **Play page** — When submitting report, if `localStorage.getItem('authToken')` exists, add header: `Authorization: Bearer ${authToken}`.
3. **Gallery page** — When submitting report, if `localStorage.getItem('authToken')` exists, add header: `Authorization: Bearer ${authToken}`.

### API Contract

- Report route already uses `sessions.get(token)` elsewhere (e.g., in other routes). Use same session resolution.
- No change to request body. `reporterUserId` is derived server-side from session.

### Implementation Sketch

- **Refactor:** Convert `report.js` to factory `createReportRouter(sessions)` (like `projects.js`). In `server/index.js`: `app.use('/api/report', createReportRouter(sessions));`

```js
// In report.js, before createReport:
let reporterUserId = null;
const token = req.headers.authorization?.replace('Bearer ', '');
if (token && sessions) {
  const session = await sessions.get(token);
  if (session?.userId) reporterUserId = session.userId;
}
await createReport({ projectId, reason, reporterIp: ip, reporterUserId });
```

### Schema

- `moderation_reports.reporter_user_id` — already exists (nullable). No migration needed.

---

## Section 3: Acceptance Criteria

- [ ] Gallery cards show "See something wrong?" (or equivalent) control.
- [ ] Clicking it opens a reason modal; submitting creates a report; card link does not navigate.
- [ ] Report from gallery respects 5/IP/hour rate limit.
- [ ] When user is logged in (valid token in request), `reporter_user_id` is stored.
- [ ] When user is not logged in, `reporter_user_id` remains null.
- [ ] Play page report also passes auth header when user is logged in.

---

## Section 4: Lumi Review

Lumi, please confirm:

1. **Copy** — Is "See something wrong?" the right tone for gallery? Or prefer "Report this game" / "Something not right?"
2. **Placement** — Bottom-right of card content acceptable, or prefer different location?
3. **Prominence** — Should this be more prominent (e.g., always-visible) or subtle (e.g., on hover)?

Rowan will hand spec to Nova once Lumi aligns.

---

## Section 5: Out of Scope (This Spec)

- Same-project report count aggregation (P2) — separate ticket.
- Admin queue context enrichment — separate ticket.
- Report confirmation to reporter (P3) — backlog.
