# Vendor DPA Status Tracker

**Owner:** Elias Vance (Compliance Lead)  
**Last Updated:** March 5, 2026  
**Purpose:** Track Data Processing Agreement (DPA) and contractual status with all third-party vendors that process children's personal information or platform data.

---

## Summary

| Vendor | Data Received | DPA Status | Action Required |
|--------|---------------|------------|-----------------|
| Anthropic (Claude) | PII-stripped prompts, base64 screenshots | ⚠️ Verify | Confirm DPA/BAA; verify no-training clause |
| xAI (Grok) | PII-stripped prompts (13+ only; under-13 Claude-only) | ⚠️ Verify | Confirm DPA; verify no-training clause |
| Stripe | username, displayName, tier, ageBracket (checkout metadata); no password/emails | ✅ Standard | Stripe DPA in ToS; confirm acceptance in dashboard |
| Resend | Recipient email, message body (consent, reset, dashboard links) | ⚠️ Verify | Execute DPA or confirm Resend ToS covers |
| Sentry | Stack traces, request metadata (PII scrubbed) | ⚠️ Verify | Review Sentry DPA; ensure acceptable for COPPA |
| Railway | All data at rest (hosting) | ✅ Standard | Railway terms apply; no separate DPA typically |
| ClassWallet (ESA) | Parent-initiated checkout redirect | 🔴 Not live | When enabled: execute DPA before launch |

---

## Vendor Details

### Anthropic (Claude)

| Field | Value |
|-------|-------|
| **Data we send** | System prompts, user prompts (PII-stripped), conversation history, base64 game screenshots (for iteration) |
| **Purpose** | AI game code generation |
| **Child data** | Under-13 prompts transmitted (PII stripped). Screenshots may contain game visuals (not child photos). |
| **DPA location** | Anthropic Enterprise/Business terms; DPA available on request |
| **No-training clause** | Anthropic states they do not train on customer data; verify in executed agreement |
| **Action** | Atlas: Execute DPA or confirm existing agreement covers children's data. Elias: Review for COPPA adequacy. |

### xAI (Grok)

| Field | Value |
|-------|-------|
| **Data we send** | System prompts, user prompts (PII-stripped), conversation history. Under-13 restricted to Claude only (no Grok). |
| **Purpose** | AI game code generation (13+ users) |
| **Child data** | Indirect — 13+ users only; under-13 never sent to Grok |
| **DPA location** | xAI Business/Enterprise terms |
| **No-training clause** | Verify in executed agreement |
| **Action** | Atlas: Execute DPA. Elias: Confirm no-training and data handling terms. |

### Stripe

| Field | Value |
|-------|-------|
| **Data we send** | Checkout metadata: username, displayName, tier, ageBracket, privacyAccepted. No password, parent email, or recovery email (stored server-side). |
| **Purpose** | Payment processing, parental verification ($0.50 micro-charge) |
| **Child data** | Username/displayName are pseudonymous; ageBracket indicates under-13. No direct PII. |
| **DPA location** | Stripe Data Processing Addendum (DPA) in Stripe Dashboard; part of Service Agreement |
| **Status** | Standard Stripe DPA covers processors. Confirm "Child data" / COPPA if Stripe offers COPPA addendum. |
| **Action** | Atlas: Accept DPA in Stripe Dashboard if not already. Elias: Document acceptance date. |

### Resend

| Field | Value |
|-------|-------|
| **Data we send** | Recipient email addresses (parent, recovery), email subject and body (consent text, reset links, dashboard links) |
| **Purpose** | Transactional email (consent requests, password reset, parent dashboard magic links) |
| **Child data** | Parent email (COPPA contact); message body may reference child username |
| **DPA location** | Resend DPA / Data Processing Agreement |
| **Status** | Resend ToS includes data processing terms; dedicated DPA available for enterprise |
| **Action** | Atlas: Execute Resend DPA or confirm ToS suffices. Elias: Verify subprocessor list if Resend uses subprocessors. |

### Sentry

| Field | Value |
|-------|-------|
| **Data we send** | Error events, stack traces, request metadata. Authorization and Cookie headers scrubbed in `beforeSend`. |
| **Purpose** | Server-side error monitoring |
| **Child data** | Minimal; no child PII in error payloads after scrubbing |
| **DPA location** | Sentry DPA (available for Business/Team plans) |
| **Status** | Standard DPA; verify COPPA applicability |
| **Action** | Atlas: Execute Sentry DPA if on paid plan. Elias: Confirm scrubbing adequate; document. |

### Railway

| Field | Value |
|-------|-------|
| **Data we send** | All application data (users, projects, sessions) — hosting/infrastructure |
| **Purpose** | Application hosting, database, deployment |
| **Child data** | Yes — full database at rest |
| **DPA location** | Railway Terms of Service; DPA for enterprise |
| **Status** | Standard cloud provider terms |
| **Action** | Document acceptance. No separate DPA typically required for standard plan. |

### ClassWallet (ESA)

| Field | Value |
|-------|-------|
| **Data we send** | Parent redirects to ClassWallet for checkout; parent email on waitlist |
| **Purpose** | Arizona ESA payment processing |
| **Child data** | Not directly; parent-initiated |
| **DPA location** | ClassWallet agreement |
| **Status** | ESA flow not yet live |
| **Action** | Before enabling: Execute ClassWallet DPA. Elias: Review for COPPA/FERPA alignment. |

---

## Checklist Before Launch

- [ ] Anthropic DPA executed and retained
- [ ] xAI DPA executed and retained
- [ ] Stripe DPA accepted (dashboard confirmation)
- [ ] Resend DPA executed or ToS confirmed
- [ ] Sentry DPA executed (if paid plan) or terms reviewed
- [ ] All DPAs include: purpose limitation, data minimization, subprocessor disclosure, no-training (AI), deletion/return on termination
- [ ] DPA retention: maintain copies for 3+ years (FTC audit lookback)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-05 | Elias Vance | Initial tracker. Documented all vendors, data flows, DPA status. |
