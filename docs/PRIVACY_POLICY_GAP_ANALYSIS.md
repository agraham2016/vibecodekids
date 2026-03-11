# Privacy Policy Gap Analysis

**Owner:** Elias Vance (Compliance Lead)  
**Date:** March 5, 2026  
**Reference:** `public/privacy.html`, `docs/DEFENSIBLE_ARCHITECTURE_BLUEPRINT.md` Section H

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Addressed (policy accurate) | 15 |
| ⏸️ Deferred (legal review) | 1 |

*Items 1–3 implemented in privacy.html March 6, 2026. Item 4 (consent email opt-out) deferred per Elias marching orders until attorney sign-off.*

---

## ✅ Addressed (Verified)

| Blueprint Item | Current Status |
|----------------|----------------|
| Two-tier (Junior/Teen) explanation | Present in COPPA section; "Junior Feature Restrictions" lists Discord, multiplayer, publishing |
| Discord 13+ only | "Discord community links — hidden entirely for Junior accounts" |
| Stripe micro-charge disclosure | "credit card micro-charge ($0.50, immediately refunded) or by email confirmation" |
| "We share limited data with service providers" | "We share limited data with trusted service providers solely to operate our platform" |
| Third-party providers named | Anthropic, xAI, OpenAI, Stripe, Resend, Sentry |
| Data retention (90d events, 30d deleted) | Listed; also 12mo inactive Junior purge, 48h deletion |
| Parental rights | Review, delete, revoke, toggle, export |
| Parent Command Center | Described |
| Cookie/tracking disclosure | "No advertising, no analytics trackers" |
| PII stripping before AI | "automatically scanned and stripped" |
| AI providers do not train | "Neither Anthropic nor xAI train their models on our users' data" |
| Stripe no PII | "We send only username, display name, membership tier, age bracket... no passwords, parent email, recovery email" |

---

## ⚠️ Minor Gaps (Document for Atlas)

### 1. Persistent Identifiers (FTC Revised COPPA — April 2026)

**Requirement:** Privacy policy must disclose which internal operations use persistent identifiers (e.g., session tokens) and how we ensure they are not used to contact individuals.

**Status:** ✅ **Implemented** (March 6, 2026). "Session identifiers:" subsection in "What We Collect" — 24h token, used only for account recognition, not for contact or cross-site tracking. Elias spot-check verified 2026-03-06.

---

### 2. Multiplayer Chat Disclosure

**Status:** ✅ **Implemented** (March 6, 2026). Policy now states: "Multiplayer chat is filtered for safety. Kids can choose from preset phrases (e.g., 'Good game!') or type messages that are automatically checked for appropriateness before being sent. Inappropriate messages are blocked." Matches `multiplayer.js` — `filterContent()` + `moderateText()`. Elias spot-check verified 2026-03-06.

---

## ❌ Gaps Requiring Update (Before FTC April 22)

### 3. Image/Screenshot Data

**Status:** ✅ **Implemented** (March 6, 2026). AI providers section now includes: "For some game iteration features, we may send a screenshot of the game to our AI provider to improve the result. Screenshots are stripped of any personal information before transmission." Matches `ai.js` `formatMessageContent` + `gameHandler.js` image param. Elias spot-check verified 2026-03-06.

---

### 4. Consent Email — Opt-Out of Third-Party Disclosure (FTC Revised COPPA)

**Requirement:** Consent email must specify that parent can consent to collection without consenting to third-party sharing (except when integral to service).

**Status:** ⏸️ **Deferred**. Consent email names vendors and purposes but lacks item (3). Per Elias marching orders: draft if asked; do not implement without attorney sign-off. Will address during legal review.

---

## Draft Language for Atlas Review

### Persistent Identifiers (Item 1)
```
Session identifiers: When you log in, we create a temporary session token (stored for up to 24 hours) so you can stay logged in without re-entering your password. This identifier is used only to recognize your account during your visit. We do not use it to contact you or track you across other websites.
```

### Multiplayer Chat (Item 2)
```
Multiplayer chat is filtered for safety. Kids can choose from preset phrases (e.g., "Good game!") or type messages that are automatically checked for appropriateness before being sent. Inappropriate messages are blocked.
```

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-05 | Elias Vance | Initial gap analysis. 12 items verified, 2 minor gaps, 2 action items. |
| 2026-03-06 | Elias Vance | Spot-check: items 1–3 implemented in privacy.html. Marked implemented. Item 4 deferred per legal review. |
