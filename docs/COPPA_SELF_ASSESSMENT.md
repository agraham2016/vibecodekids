# VibeCodeKidz — COPPA Self-Assessment Checklist

**Version:** 1.0  
**Last Updated:** February 28, 2026  
**Review Frequency:** Quarterly (March, June, September, December)  
**Owner:** VibeCodeKidz Operations

---

## Instructions

Complete this checklist at least quarterly. For each item, mark the current status:

- **YES** — Compliant, verified
- **PARTIAL** — In progress or partially implemented
- **NO** — Not yet addressed
- **N/A** — Not applicable

Record the reviewer name, date, and any notes. Retain all completed checklists for at least 3 years (FTC audit lookback period).

---

## Assessment Record

| Field | Value |
|-------|-------|
| **Review Date** | _________________ |
| **Reviewer** | _________________ |
| **Next Review Due** | _________________ |

---

## Section 1: Age-Gating & Data Collection

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Age is collected at registration and stored as a bracket (under-13, 13-17, 18+), not exact age | | |
| 1.2 | Users identified as under-13 trigger the parental consent flow before the account becomes active | | |
| 1.3 | No personal information is collected from children before parental consent is obtained | | |
| 1.4 | The only PII collected from children is: username, display name, and parent email (for consent) | | |
| 1.5 | Real names, home addresses, phone numbers, and photos are NOT collected | | |
| 1.6 | The age threshold for consent is set to 13 (COPPA standard) | | |

---

## Section 2: Parental Consent (VPC)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Verifiable Parental Consent is required before activating under-13 accounts | | |
| 2.2 | High-reliability VPC method is available (Stripe micro-charge with immediate refund) | | |
| 2.3 | Email-based consent ("email plus") is available as a secondary option | | |
| 2.4 | Consent email clearly discloses: what data is collected, how it is used, and which third parties process it | | |
| 2.5 | Consent email lists all third-party service providers by name (Anthropic, xAI, Stripe, Resend) | | |
| 2.6 | Consent email explains parental rights (review, delete, revoke, toggle features) | | |
| 2.7 | Consent links expire within 72 hours | | |
| 2.8 | Parents can deny consent via a link in the email | | |
| 2.9 | Parent Command Center is accessible via a unique dashboard token (no login required for parent) | | |

---

## Section 3: Parental Rights & Controls

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Parents can review all data collected about their child via the Parent Command Center | | |
| 3.2 | Parents can export their child's data (username, projects, settings) | | |
| 3.3 | Parents can request deletion of all their child's data | | |
| 3.4 | Parents can revoke consent and deactivate the account | | |
| 3.5 | Public game publishing defaults to OFF for under-13 users | | |
| 3.6 | Multiplayer features default to OFF for under-13 users | | |
| 3.7 | Parents can toggle publishing and multiplayer on/off via the dashboard | | |
| 3.8 | All parental control toggles are enforced server-side (not just client-side) | | |

---

## Section 4: Data Minimization & Retention

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Only the minimum necessary data is collected for the platform to function | | |
| 4.2 | Exact age is NOT stored — only age bracket | | |
| 4.3 | User IP addresses are NOT stored in user records | | |
| 4.4 | Demo/analytics event logs are purged after 90 days | | |
| 4.5 | Resolved moderation reports are purged after 90 days | | |
| 4.6 | Deleted accounts are fully purged within 30 days | | |
| 4.7 | Expired sessions are purged automatically | | |
| 4.8 | Data retention sweep runs automatically (every 6 hours) | | |
| 4.9 | Billing/payment data is stored by Stripe, NOT in our database | | |

---

## Section 5: PII Protection

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | PII scanner strips emails, phone numbers, SSNs, addresses from user input before AI transmission | | |
| 5.2 | AI output is scanned for PII before being returned to the user | | |
| 5.3 | Pre-publish scan checks game code for PII before public publishing | | |
| 5.4 | Username filter blocks real-name patterns and PII at registration | | |
| 5.5 | Console logs do NOT contain parent emails or other PII | | |
| 5.6 | Public API responses strip `userId`, `ageMode`, `parentEmail` from non-owner data | | |
| 5.7 | Gallery API responses do not expose `ageMode` | | |
| 5.8 | Stripe checkout metadata contains only `userId` and `tier` — no PII | | |

---

## Section 6: Content Safety & Moderation

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Content filter blocks inappropriate terms in user prompts with normalization (leet-speak, confusables) | | |
| 6.2 | AI system prompt includes comprehensive child safety rules | | |
| 6.3 | AI output is filtered for inappropriate content, external requests, and tracking code | | |
| 6.4 | Pre-publish scan blocks games containing inappropriate content from being published publicly | | |
| 6.5 | Users can report inappropriate content via a "Report" button on published games | | |
| 6.6 | Reports are rate-limited to prevent abuse (5/hour/IP) | | |
| 6.7 | Admin moderation queue exists for reviewing and resolving reports | | |
| 6.8 | Progressive discipline is enforced: warnings → cooldowns → suspension for repeat violations | | |
| 6.9 | Admin alert emails are triggered when content blocks, reports, or suspensions spike | | |
| 6.10 | Multiplayer chat is restricted to preset phrases only (no free-text) | | |
| 6.11 | Published game iframes are sandboxed (no `allow-same-origin`) | | |

---

## Section 7: Third-Party Vendors

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | All third-party service providers are listed in the privacy policy by name | | |
| 7.2 | Data Processing Agreements (DPAs) are executed with Anthropic | | |
| 7.3 | DPA executed with xAI | | |
| 7.4 | DPA executed with Stripe | | |
| 7.5 | DPA executed with Resend | | |
| 7.6 | No third-party analytics, tracking, or advertising SDKs are present | | |
| 7.7 | Google Fonts are self-hosted (no CDN requests) | | |
| 7.8 | AI providers are contractually prohibited from using children's data for training | | |
| 7.9 | Stripe is never sent children's PII — only user IDs and tier names | | |

---

## Section 8: Security Hardening

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | HTTPS is enforced (HSTS header with max-age ≥ 1 year) | | |
| 8.2 | Content-Security-Policy header is configured and restrictive | | |
| 8.3 | Admin panel requires password + 2FA (email OTP) | | |
| 8.4 | Admin API routes are protected with `requireAdmin` middleware | | |
| 8.5 | No hardcoded secrets in the codebase (all via environment variables) | | |
| 8.6 | Passwords are hashed with bcrypt | | |
| 8.7 | Rate limiting is applied to login, registration, forgot password, and report endpoints | | |
| 8.8 | Published game iframes cannot access parent page cookies or DOM | | |
| 8.9 | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` headers are set | | |

---

## Section 9: Privacy Policy & Terms

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | Privacy policy is accessible at `/privacy` | | |
| 9.2 | Privacy policy accurately lists all data collected | | |
| 9.3 | Privacy policy names all third-party service providers | | |
| 9.4 | Privacy policy describes parental rights (review, delete, revoke) | | |
| 9.5 | Privacy policy describes the Parent Command Center | | |
| 9.6 | Terms of Service describe content rules, progressive discipline, and moderation | | |
| 9.7 | Terms of Service disclose AI providers by name | | |
| 9.8 | Privacy policy distinguishes "service providers" from "selling data" | | |
| 9.9 | Privacy policy has been reviewed by legal counsel within the last 12 months | | |
| 9.10 | Policies accurately reflect current platform behavior (no stale claims) | | |

---

## Section 10: Incident Response

| # | Item | Status | Notes |
|---|------|--------|-------|
| 10.1 | Incident Response Playbook exists and is current (`docs/INCIDENT_RESPONSE_PLAYBOOK.md`) | | |
| 10.2 | Incident severity levels are defined (P0–P3) | | |
| 10.3 | Notification procedures are documented for parent, FTC, and state AG notification | | |
| 10.4 | NCMEC CyberTipline contact information is documented for CSAM scenarios | | |
| 10.5 | All team members know where to find the playbook | | |
| 10.6 | Post-incident review process is defined | | |

---

## Section 11: Operational Governance

| # | Item | Status | Notes |
|---|------|--------|-------|
| 11.1 | Content filter patterns are reviewed at least monthly | | |
| 11.2 | Username filter (common names list) is reviewed at least quarterly | | |
| 11.3 | AI provider terms of service and privacy policies are monitored for changes | | |
| 11.4 | Automated safety test suite passes (`node server/tests/safety.test.js`) | | |
| 11.5 | COPPA self-assessment is completed quarterly | | |
| 11.6 | Moderation queue is reviewed daily (when there are pending reports) | | |
| 11.7 | Data retention sweep is running (check admin dashboard) | | |
| 11.8 | Admin alerts are configured and email delivery is verified | | |

---

## Summary & Sign-Off

| Section | Total Items | Compliant | Partial | Non-Compliant | N/A |
|---------|-------------|-----------|---------|---------------|-----|
| 1. Age-Gating | 6 | | | | |
| 2. Parental Consent | 9 | | | | |
| 3. Parental Rights | 8 | | | | |
| 4. Data Retention | 9 | | | | |
| 5. PII Protection | 8 | | | | |
| 6. Content Safety | 11 | | | | |
| 7. Third-Party Vendors | 9 | | | | |
| 8. Security | 9 | | | | |
| 9. Privacy Policy | 10 | | | | |
| 10. Incident Response | 6 | | | | |
| 11. Governance | 8 | | | | |
| **TOTAL** | **103** | | | | |

**Reviewer Signature:** _________________________ **Date:** _____________

**Next Steps / Remediation Items:**

1. _____________________________________
2. _____________________________________
3. _____________________________________

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| Feb 28, 2026 | 1.0 | Initial checklist created — 103 items across 11 sections |
