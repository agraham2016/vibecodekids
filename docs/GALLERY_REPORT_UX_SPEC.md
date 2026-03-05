# Gallery Report Button — UX Spec (Lumi → Rowan → Nova)

**Author:** Lumi Rivers, Kid-First UX Designer  
**Date:** March 2026  
**Purpose:** UX alignment for P1 tooling gap — Report button on gallery cards. For Rowan to merge with reporter-user-ID spec and hand to Nova.

**Design rules applied:** Moderated-first, errors are recoverable, kid-comprehensible, no guilt-tripping.

---

## 1. Placement

### Gallery cards (`public/gallery.html`)

**Current structure:** Each card is `<a href="/play/${id}" class="game-card">` — the whole card navigates to play.

**Add:** A report affordance that:
- Does NOT navigate when clicked (use `event.preventDefault()` + `event.stopPropagation()`)
- Is visible but not dominant — kids shouldn't feel like reporting is the primary action
- Is discoverable — "See something wrong?" per UX_AUDIT recommendation
- Has a minimum 44px tap target for accessibility

**Recommended placement:** Bottom-right of `card-content` (below title, creator, stats), or as a subtle icon in the top-right of the card (alongside category badge). Prefer **bottom of card** so it doesn't compete with the Play overlay or category badge.

**Layout option A (preferred):** Small text link below the stats row:
```
[👁️ 123] [❤️ 5]
See something wrong? Tell us.
```
- Link opens report modal
- "Tell us" reinforces that a real person will see it (moderated-first)

**Layout option B:** Icon button in card corner (like play page) — 🚩 with tooltip "Report". More compact but less discoverable for kids who don't hover.

---

## 2. Modal Flow

**Reuse the play-page modal pattern** for consistency. Same structure, same API, same reasons. Only difference: we're in gallery context, so we have `projectId` from the card's `href` (extract from `/play/{id}`).

### Modal structure

```
┌─────────────────────────────────────┐
│  See something wrong?               │
│                                     │
│  Tell us what's off so a grown-up   │
│  can check it.                      │
│                                     │
│  What's the problem?                │
│  ┌─────────────────────────────┐   │
│  │ ▼ [Select a reason]         │   │
│  └─────────────────────────────┘   │
│                                     │
│        [Cancel]  [Tell a Grown-up]  │
│                                     │
│  (status message area, hidden)      │
└─────────────────────────────────────┘
```

**Escape key** closes modal. **Click outside** closes modal.

---

## 3. Microcopy (Kid-Friendly)

| Element | Copy | Rationale |
|---------|------|-----------|
| Modal heading | "See something wrong?" | Matches UX_AUDIT; inviting, not accusatory |
| Subheading | "Tell us what's off so a grown-up can check it." | Moderated-first: reinforces that a real person reviews |
| Reason label | "What's the problem?" | Simple, kid language |
| Cancel button | "Cancel" | Standard |
| Submit button | "Tell a Grown-up" | Reinforces the community rule; feels less punitive than "Submit" or "Report" |
| Success message | "Thanks! A grown-up will take a look." | Reassuring, matches play page intent |
| Error (rate limit) | "You've sent a few already. Try again in a bit!" | Recoverable — tells them what to do |
| Error (generic) | "Oops, that didn't go through. Try again?" | Friendly, recoverable |
| Error (network) | "Can't reach us right now. Check your internet and try again." | Same as ShareModal |
| Link/button label on card | "See something wrong? Tell us." | Discoverable, low-friction |

---

## 4. Reason Options (Match API)

Keep the same `reason` values as `report.js` (VALID_REASONS). Use kid-friendly labels in the UI:

| API value | Kid-facing label |
|-----------|-------------------|
| `inappropriate_content` | "Something that shouldn't be in a game" |
| `personal_info` | "Shows someone's name, school, or private stuff" |
| `bullying` | "Mean or bullying stuff" |
| `scary_content` | "Too scary for kids" |
| `other` | "Something else" |

---

## 5. Safety UX

| Rule | How it's met |
|------|--------------|
| **Moderated-first** | Copy says "a grown-up can check it" and "A grown-up will take a look" — kid knows it's reviewed by humans |
| **Errors are recoverable** | Rate limit and network errors tell the kid what to try (wait, check internet) |
| **No guilt-tripping** | Never say "Please report" or "Help keep the Arcade safe" — that pressures kids. "See something wrong?" is optional, low-pressure |
| **Real-name protection** | Not directly relevant to report flow, but reason "Shows someone's name..." reinforces that personal info is a reportable category |

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Focus trap | When modal opens, focus first focusable element (reason dropdown or Cancel) |
| Escape closes | `keydown` listener for Escape |
| `aria-label` on trigger | If it's a link: `aria-label="Report this game"`. If button: same |
| Modal `role="dialog"` | `aria-modal="true"`, `aria-labelledby` pointing to heading |
| Reason select | `aria-label="What's the problem?"` |
| Status message | `role="alert"` when error or success shown |
| 44px tap target | Ensure the "See something wrong?" link/button meets min size on mobile |

---

## 7. Technical Notes for Nova

- **Gallery context:** Card `href` is `/play/{projectId}`. Extract `projectId` when building the card or pass it to the report handler. The report modal needs `projectId` to call `POST /api/report`.
- **Reporter user ID:** When user is logged in, pass `reporterUserId` in the request body. Rowan will spec this separately; the UX of the modal doesn't change.
- **Shared modal logic:** Consider extracting the report modal HTML/JS into a reusable function or component used by both `gallery.html` and `play.html` to avoid drift. Same copy, same behavior.
- **Rate limit response:** API returns 429 with `{ error: "Too many reports. Try again later." }`. Replace with kid-friendly: "You've sent a few already. Try again in a bit!"

---

## 8. Play Page Alignment

The play page currently uses:
- Heading: "Report This Game"
- Submit: "Submit"
- Success: "Thank you! Our team will review this."

**Recommendation:** When Nova implements the gallery report button, **also update the play page** to use the same kid-friendly copy for consistency:
- Heading: "See something wrong?"
- Subheading: "Tell us what's off so a grown-up can check it."
- Submit: "Tell a Grown-up"
- Success: "Thanks! A grown-up will take a look."

This keeps the experience consistent wherever kids can report.

---

## 9. Open Questions for Rowan

1. **Reporter user ID:** When/where does the auth token come from on gallery? Gallery is a static page — is the user ever logged in there? If not, `reporterUserId` stays `null` for gallery reports. Confirm.
2. **Card structure:** The whole card is an `<a>`. Adding a clickable link/button inside requires `onclick` with `preventDefault` + `stopPropagation`. Nova will need to attach the handler correctly so report doesn't trigger navigation.

---

**Status:** Lumi UX spec complete. Ready for Rowan to merge with reporter-user-ID spec and hand to Nova.
