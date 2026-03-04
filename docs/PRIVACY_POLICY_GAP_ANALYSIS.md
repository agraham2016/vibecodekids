# Privacy Policy Gap Analysis

**Owner:** Elias Vance (Compliance Lead)  
**Date:** March 5, 2026  
**Reference:** `public/privacy.html`, `docs/DEFENSIBLE_ARCHITECTURE_BLUEPRINT.md` Section H

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Addressed (policy accurate) | 12 |
| ⚠️ Minor gap (low risk) | 2 |
| ❌ Gap requiring update | 2 |

---

## ✅ Addressed (Verified)

| Blueprint Item | Current Status |
|----------------|----------------|
| Two-tier (Junior/Teen) explanation | Present in COPPA section; "Junior Feature Restrictions" lists Discord, multiplayer, publishing |
| Discord 13+ only | "Discord community links — hidden entirely for Junior accounts" |
| Stripe micro-charge disclosure | "credit card micro-charge ($0.50, immediately refunded) or by email confirmation" |
| "We share limited data with service providers" | "We share limited data with trusted service providers solely to operate our platform" |
| Third-party providers named | Anthropic, xAI, Stripe, Resend, Sentry |
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

**Current state:** Policy does not mention session tokens.

**Proposed addition** (for "What We Collect" or new subsection):

> **Session identifiers:** When you log in, we create a temporary session token so you can stay logged in. This token expires within 24 hours and is used only to recognize your account during your visit. We do not use session data to contact you or track you across other websites.

**Action:** Nova to add; Elias to review.

---

### 2. Multiplayer Chat Disclosure

**Current policy:** "Multiplayer communication is restricted to preset, kid-safe phrases only" and FAQ: "Free-text chat is not available."

**Implementation:** Server accepts free-text chat; runs through `filterContent()` and `moderateText()` (content filter + ML moderation). Preset phrases exist for the phrase picker, but free-text is also allowed when it passes filters.

**Options:**
- **A)** Update policy: "Multiplayer chat is filtered for safety. Kids can use preset phrases or type messages that are checked for appropriateness before being sent."
- **B)** Restrict server to whitelist-only (match current policy).

**Recommendation:** Option A — policy should match implementation. The current policy overstates restriction.

**Action:** Draft language for Atlas approval.

---

## ❌ Gaps Requiring Update (Before FTC April 22)

### 3. Image/Screenshot Data

**FTC requirement:** Disclose when children's images or screenshots are sent to third parties.

**Current state:** We send base64 game screenshots to Claude for iteration (gameHandler.js, ai.js `formatMessageContent`). Not disclosed in privacy policy.

**Action:** Add to privacy policy (AI providers section):
> "For some game iteration features, we may send a screenshot of the game to our AI provider to improve the result. Screenshots are stripped of any personal information before transmission."

---

### 4. Consent Email — Opt-Out of Third-Party Disclosure (FTC Revised COPPA)

**Requirement:** Consent email must specify that parent can consent to collection without consenting to third-party sharing (except when integral to service).

**Current state:** Consent email names vendors and purposes but does not include: "You may consent to our collecting your child's information without agreeing to our sharing it with third parties, except where that sharing is necessary to provide the service."

**Action:** Draft updated consent email language. Hand to Nova for `server/services/consent.js`. Legal review recommended.

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
