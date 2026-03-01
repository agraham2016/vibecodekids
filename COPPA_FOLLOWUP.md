# COPPA Compliance — Operational Follow-Up Items

These items require human action (legal, vendor outreach, policy decisions) and cannot be fully automated in code. They were identified during the COPPA hardening sessions and should be completed before scaling.

---

## P0 — Do Before Launch / Scale

### 1. Data Processing Agreements (DPAs)
Execute DPAs with each third-party service provider that processes user data:

- **Anthropic** — AI generation (prompts are PII-stripped, but prompts still flow through their API)
- **xAI (Grok)** — AI generation (same as Anthropic)
- **Stripe** — Payment processing (only receives userId + tier, no child PII)
- **Resend** — Transactional email (receives parent email addresses for consent/reset emails)

Each DPA should include:
- Prohibition on using children's data for training or secondary purposes
- Data deletion upon request
- Security standards
- Breach notification obligations

### 2. Stripe Micro-Charge VPC — Frontend Integration
The backend for the Stripe micro-charge verification ($0.50 refundable) is built (`POST /api/parent/verify-charge/create` and `/confirm`). To go live:

- [ ] Build a frontend page (`/parent-verify-charge`) with Stripe Elements for the parent to enter card details
- [ ] Link to it from the consent approval email as an optional "Verify with credit card" button
- [ ] Test the full flow end-to-end in Stripe test mode

### 3. Legal Review of Privacy Policy + Terms of Service
Have your attorney review the updated:
- `public/privacy.html` (updated Feb 28, 2026)
- `public/terms.html` (updated Feb 28, 2026)

Key areas to verify:
- Service provider disclosure language is legally sufficient
- "Email plus" vs. "Stripe micro-charge" consent methods are properly disclosed
- Parental rights section covers all COPPA requirements
- Progressive discipline/moderation disclosure is adequate

---

## P1 — Complete Within 30 Days

### 4. Incident Response Playbook
Create a documented incident response plan covering:
- Data breach notification (72-hour FTC requirement for children's data)
- Who to contact (FTC, affected parents, state AGs if applicable)
- Internal escalation chain
- Evidence preservation procedures
- Post-incident review process

### 5. COPPA Self-Assessment Checklist
Create a quarterly internal audit checklist:
- [ ] All consent records are valid and unexpired
- [ ] No PII is being transmitted to third parties without filtering
- [ ] Content filter is catching current bypass trends
- [ ] Data retention job is running (check logs)
- [ ] No pending moderation reports older than 48 hours
- [ ] Privacy policy and terms are accurate
- [ ] DPAs are current with all vendors

### 6. Moderation Staffing / SLA
Define response time SLAs for:
- Reported games: review within 24 hours
- Data deletion requests: complete within 48 hours
- Parental inquiries: respond within 24 hours

Determine if volunteer/part-time moderators are needed as user base grows.

---

## P2 — Ongoing

### 7. Content Filter Updates
The content filter blocklist and regex patterns should be reviewed monthly:
- Monitor `admin dashboard → Content Filter` for blocked patterns
- Check if new bypass techniques are emerging
- Update `server/prompts/index.js` (`getContentFilter()`) and `server/middleware/contentFilter.js` as needed

### 8. AI Provider Policy Monitoring
Monitor Anthropic and xAI policy changes regarding:
- Children's data handling
- Training data inclusion/exclusion
- API terms of service updates

### 9. Username Filter Updates
The common names list (`server/middleware/usernameFilter.js`) should be expanded periodically based on:
- Registration rejection logs
- Trending names / cultural shifts

### 10. Annual Privacy Policy Review
COPPA requires policies to be kept current. Schedule an annual review of:
- `public/privacy.html`
- `public/terms.html`
- Consent email text in `server/services/consent.js`

---

## Completed (Code Sessions 1-6)

- [x] Session 1: P0 Critical Fixes (Stripe PII, ESA auth, multiplayer chat, iframes, admin tokens, project stripping, console redaction, CSP/HSTS, self-hosted fonts)
- [x] Session 2: PII Shield + Content Hardening (PII scanner, output filter, content filter upgrade, system prompt hardening, age bracket minimization)
- [x] Session 3: Parental Consent + Parent Command Center (verification tracking, consent email rewrite, parent dashboard, server-side publish/multiplayer enforcement)
- [x] Session 4: Moderation + Governance (report button, moderation queue, pre-publish scan, progressive discipline, data retention job, privacy policy rewrite)
- [x] Session 5: Vendor & Legal (Stripe micro-charge VPC backend, Terms of Service update)
- [x] Session 6: Monitoring & Hardening (username filtering, admin alerting, automated safety tests — 40/40 passing)
