# Legal Review Prep — Privacy & Terms

**Owner:** Elias Vance (Compliance Lead)  
**Purpose:** Brief for legal counsel when Atlas schedules privacy policy + terms review  
**FTC Revised COPPA Deadline:** April 22, 2026 (52 days out)  
**Last Updated:** March 17, 2026

---

## 1. Executive Summary

Vibe Code Kids is a kid-safe AI game creation platform serving children 6–18, with a parent portal and COPPA-compliant consent flow. We collect minimal data, require verifiable parental consent for under-13 users, and do not sell or share data for advertising. This document prepares counsel for review of our privacy policy and terms of service.

---

## 2. Documents for Review

| Document | Path | Focus |
|----------|------|-------|
| Privacy Policy | `public/privacy.html` | COPPA disclosures, data practices, vendor list, parental rights |
| Terms of Service | `public/terms.html` | Content rules, moderation, payment terms, AI disclosure |
| COPPA Self-Assessment | `docs/COPPA_SELF_ASSESSMENT.md` | 103-item compliance checklist; 81/103 YES |
| Privacy Gap Analysis | `docs/PRIVACY_POLICY_GAP_ANALYSIS.md` | Gaps addressed and remaining |

---

## 3. Data We Collect (Summary for Counsel)

| Data | From Whom | Purpose | Retention |
|------|-----------|---------|-----------|
| Username, display name | All users | Identity (pseudonymous) | Until deletion |
| Password hash (bcrypt) | All users | Authentication | Until deletion |
| Age bracket (not exact age) | All users | COPPA tier | Until deletion |
| Parent email | Under-13 only | Verifiable parental consent | Until deletion |
| Recovery email | 13+ optional | Password reset | Until deletion |
| Game projects (code) | All users | Core product | Until account deletion |
| Bug reports (description, limited chat/code snapshot, diagnostics) | Logged-in users | Support and troubleshooting | 90 days after resolved/dismissed |
| Session token | All users | Stay logged in | 24 hours |
| Demo events (visitorId, ipHash) | Anonymous | Internal analytics | 90 days |
| Moderation reports | All users | Safety | 90 days after resolved |

**We do NOT collect:** Real name, address, phone, photos, precise location, school/grade, or data for advertising.

---

## 4. Third-Party Data Sharing

| Vendor | Data Sent | Purpose |
|--------|-----------|---------|
| Anthropic (Claude) | PII-stripped prompts, base64 game screenshots | AI game generation |
| xAI (Grok) | PII-stripped prompts (13+ only; under-13 Claude-only) | AI game generation |
| OpenAI | PII-stripped prompts, base64 game screenshots | AI game generation |
| Anthropic / OpenAI | Limited sanitized bug-report summaries; for 13+ may include limited recent chat/code context; for under-13 uses reduced summary only | Internal bug triage before human review |
| Stripe | Username, displayName, tier, ageBracket (no password/emails) | Payment, parental verification |
| Resend | Recipient email, message body | Consent emails, password reset |
| Sentry | Error traces (auth/cookie headers scrubbed) | Error monitoring |

**We do not:** Sell data, use advertising networks, or employ third-party trackers.

---

## 5. FTC Revised COPPA Rule — Items for Counsel

### Implemented

- Age bracket only (no exact age)
- Verifiable parental consent (email + Stripe micro-charge)
- Parent rights: review, export, delete, revoke
- Privacy policy: persistent identifiers, session tokens, image/screenshot disclosure
- Two-tier system (Junior/Teen) disclosed

### Open for Legal Interpretation

| Item | FTC Requirement | Our Position | Counsel Decision Needed |
|------|-----------------|--------------|-------------------------|
| **Integral to service** | Parents may consent to collection without consenting to third-party disclosure, *except* when disclosure is "integral to the website or online service." | We send PII-stripped prompts to Anthropic, xAI, and OpenAI. AI generation *is* the product. Argument: disclosure is integral. | Confirm if our single consent flow satisfies, or if we need split consent (collection vs. AI third-party sharing). |
| **Consent email item (3)** | Consent email must specify that parent can consent to collection without third-party sharing. | We name vendors and purposes but do not include this sentence. | Draft language for consent email; approve before implementation. |
| **Image/screenshot** | Disclose when children's images are sent to third parties. | We disclose: "For some game iteration features, we may send a screenshot of the game to our AI provider..." Screenshots are game visuals, not photos of children. | Confirm disclosure adequacy. |

---

## 6. Key Compliance Safeguards

- **PII stripping:** All prompts scanned before AI transmission; names, emails, addresses, phone numbers removed.
- **Content filter:** Blocks inappropriate prompts and output; leet-speak bypass blocked.
- **Pre-publish scan:** Games scanned before public publishing; PII and dangerous patterns blocked.
- **Sandboxed iframes:** Published games cannot access parent page or cookies.
- **No tracking in child studio:** Zero marketing pixels, analytics, or SDKs after login.
- **Bug-report minimization:** Support reports store only a short note, up to 3 recent chat messages, a capped code excerpt, and basic diagnostics; descriptions/chat are scanned for PII before storage.
- **Under-13 bug triage reduction:** Reports from Junior accounts are flagged for extra compliance review and automated triage uses a reduced summary instead of the full code excerpt.
- **Parent Command Center:** Toggles for publish/multiplayer; export; delete; revoke.

---

## 7. Questions for Counsel

1. Does our "integral to service" argument for AI provider disclosure hold under the revised COPPA rule? Do we need a split consent flow?
2. Is our consent email disclosure sufficient, or must we add the explicit "you may consent to collection without third-party sharing" language?
3. Any state-law considerations (CA, CT, TX COPPA extensions; CA Age-Appropriate Design Code)?
4. Recommended timing for CARU or kidSAFE Safe Harbor enrollment post-launch?
5. Does enabling AI-assisted bug triage for under-13 support reports require a consent-version bump and re-consent for already-approved child accounts before rollout?

---

## 8. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-06 | Elias Vance | Initial legal review prep. Summary, data inventory, vendor list, FTC items, counsel questions. |
| 2026-03-17 | Nova | Added bug-report data inventory, AI-assisted bug-triage disclosure, and follow-up counsel question for under-13 rollout. |
