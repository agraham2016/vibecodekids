# DPA Technical Input for Elias & Atlas

**From:** Cipher Hale (Security Architect)  
**Date:** March 5, 2026  
**Purpose:** Technical requirements and verification steps for DPA execution. Use alongside `VENDOR_DPA_STATUS.md`.

---

## Priority Order (Per Marching Orders)

1. **Anthropic** — AI provider; receives most child prompt data. Highest exposure.
2. **xAI (Grok)** — AI provider; receives 13+ prompts only. High exposure.
3. **Resend** — Parent email, consent/reset message content. Medium exposure.
4. **Sentry** — Error metadata; PII scrubbed. Lower exposure.
5. **Stripe** — Already has standard DPA; confirm acceptance.

---

## Anthropic (Claude)

### Data We Send (Technical Fact Check)
- System prompts (static, no PII)
- User prompts — **PII-stripped** by `piiScanner.js` before transmission
- Conversation history (same stripping)
- Base64 screenshots — game visuals only; no child photos. Risk: on-screen text could contain PII; we document in Section 7a of SECURITY_ARCHITECTURE.

### Clauses to Insist On
| Clause | Why |
|--------|-----|
| **No training on customer data** | COPPA requires we disclose; children's prompts must not train models. |
| **Subprocessor disclosure** | Who sees the data (e.g., AWS). We need to list in privacy policy. |
| **Data location** | US vs EU; COPPA is US-focused. |
| **Deletion on termination** | What happens to our data when we stop. |
| **Incident notification** | Breach notification timeline. |

### Technical Verification
- [ ] Confirm our API calls use Anthropic's "no training" opt-out if offered (e.g., API parameter).
- [ ] Document `ANTHROPIC_API_KEY` storage (env var, not in code).

---

## xAI (Grok)

### Data We Send (Technical Fact Check)
- Same structure as Anthropic
- **Under-13 never routed to Grok** — enforced in `generate.js`; only 13+ users' prompts sent
- PII-stripped via same `piiScanner.js`

### Clauses to Insist On
Same as Anthropic. Additional:
- **Age of users** — We only send 13+ data; DPA should still cover "children's platform" context (we may add under-13 later if Grok improves).

### Technical Verification
- [ ] Confirm `XAI_API_KEY` storage (env var).
- [ ] Code path: under-13 → `mode` forced to `claude` before `generateOrIterateGame` is called.

---

## Resend

### Data We Send (Technical Fact Check)
- **Recipient email** — parent email (COPPA contact), recovery email (13+)
- **Message body** — consent request text, reset links, dashboard links
- **Child username** may appear in body (e.g., "Approve account for username123")

### Clauses to Insist On
| Clause | Why |
|--------|-----|
| **Subprocessor list** | Resend may use SendGrid, etc. We need to disclose in privacy policy. |
| **Data retention** | How long Resend retains logs/delivery data. |
| **No use for marketing** | Transactional only; no selling data. |
| **Deletion on request** | Parent right to delete; can we request Resend purge? |

### Technical Verification
- [ ] Confirm `RESEND_API_KEY` in env.
- [ ] Audit: no Resend tracking pixels in our emails.

---

## Sentry

### Data We Send (Technical Fact Check)
- **beforeSend** in `instrument.js` scrubs: `Authorization`, `Cookie`, `Set-Cookie` headers
- Error message, stack trace, release tag
- Request path, method (no body in default config)
- **Gap:** Query params could contain PII (e.g., token in URL). Verify `beforeSend` strips or we add it.

### Clauses to Insist On
| Clause | Why |
|--------|-----|
| **No training** | Sentry may use for product improvement. Confirm opt-out. |
| **Data minimization** | We already scrub; DPA should reflect we send minimal PII. |
| **Subprocessors** | Sentry uses AWS, etc. |

### Technical Verification
- [ ] Review `instrument.js` `beforeSend` — confirm no child PII paths.
- [ ] Add query string scrubbing if tokens ever appear in URL.

---

## Stripe

### Technical Verification
- [ ] DPA acceptance in Stripe Dashboard (Atlas).
- [ ] Confirm metadata: we send `userId`, `tier`, `ageBracket`; no `parentEmail`, `recoveryEmail`, `password`.
- [ ] Micro-charge for parent verification: same metadata rules.

---

## Red Flags (Do Not Sign Without)

1. **AI providers:** No explicit "no training on customer data" clause.
2. **Any vendor:** Subprocessor list not provided or not current.
3. **Resend:** Retention > 90 days for delivery logs without business justification.
4. **Sentry:** No way to opt out of product-improvement use of our data.

---

## Post-Execution Checklist (Cipher)

- [ ] Document execution dates in `VENDOR_DPA_STATUS.md`
- [ ] Add DPA retention: 3+ years (FTC lookback)
- [ ] Update privacy policy with final subprocessor list from each vendor
- [ ] Ensure `beforeSend` / PII scrubbing covers any newly discovered paths
