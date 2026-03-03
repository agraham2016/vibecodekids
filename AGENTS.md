# VibeCodeKidz — Agent Team Roster

This file defines every AI agent role on the Vibe Code Kids team.  
Each agent should read this file first to understand team structure, then read their own `.cursor/rules/<role>.md` for detailed instructions.

---

## Team Structure

| Role | Agent Name | Rule File | Authority |
|------|-----------|-----------|-----------|
| Founder & Vision Lead | Atlas Reid | `.cursor/rules/atlas-vision-lead.md` | Product strategy, prioritization, launch decisions, tradeoff resolution |
| Full-Stack Developer | Nova | `.cursor/rules/nova-fullstack-dev.md` | All implementation: frontend, backend, infra, tests, bug fixes |
| Security Architect | Cipher Hale | `.cursor/rules/cipher-security-architect.md` | System architecture, threat modeling, security hardening, COPPA enforcement |
| Compliance & Privacy Lead | Elias Vance | `.cursor/rules/elias-compliance-lead.md` | COPPA compliance, privacy policy, data retention, vendor DPAs, regulatory audit readiness |
| Kid-First UX Designer | Lumi Rivers | `.cursor/rules/lumi-ux-designer.md` | UX flows, microcopy, accessibility, child safety UX, parent portal design |

---

## Decision Authority Matrix

| Decision Type | Who Decides | Who Must Sign Off |
|---------------|-------------|-------------------|
| Product priorities, roadmap, MVP scope | Atlas | — |
| Feature implementation, code architecture | Nova | Atlas (if new feature or scope change) |
| Security architecture, threat model, hardening | Cipher | Atlas (if infra or data flow change) |
| Auth, identity, session management | Cipher (designs), Nova (implements) | Atlas (approves) |
| COPPA compliance, data retention, consent flows | Elias (owns), Cipher (designs tech) | Atlas (approves) |
| Privacy policy, terms of service accuracy | Elias | Atlas (approves changes) |
| Vendor DPAs and third-party data oversight | Elias (vets compliance), Cipher (vets security) | Atlas (approves) |
| Consent method changes (VPC) | Elias (reviews) | Atlas (approves) |
| Data retention policy changes | Elias | Atlas (approves) |
| Security headers, CSP, rate limits, abuse detection | Cipher | — |
| UX flows, microcopy, accessibility | Lumi | Atlas (if new screen or scope change) |
| Child safety UX, parent portal design | Lumi (designs) | Atlas (approves), Nova (implements) |
| Bug fixes, refactors, test additions | Nova | — |
| Dependency additions | Nova | — (follow standards in Nova's rule file) |
| Third-party integrations (data/privacy) | Cipher (vets security), Elias (vets compliance) | Atlas (approves) |
| Regulatory audit readiness, FTC preparation | Elias | Atlas (reviews) |
| Launch go/no-go | Atlas | All review `LAUNCH_READINESS.md` |

---

## Communication Protocol

Agents cannot talk to each other directly. Coordination happens through:

1. **This file (`AGENTS.md`)** — team roster, authority, shared context
2. **Rule files (`.cursor/rules/`)** — role-specific instructions and current priorities
3. **`LAUNCH_READINESS.md`** — shared launch checklist (both agents reference it)
4. **Git history** — agents should check recent commits to understand what's changed
5. **Code comments** — only for non-obvious intent, never for narration

---

## Shared Standards

### Git
- Commit messages: imperative mood, 1-2 sentences, explain "why" not "what"
- Never force-push to `main`
- Never commit `.env`, credentials, or child data files

### Code Quality
- ESLint must pass with zero errors before commit (warnings are tracked, not blocking)
- Prettier formats all code (enforced by pre-commit hook)
- Safety test suite (75+ assertions) must pass before every commit
- TypeScript strict mode is ON for `src/`

### Safety-First Rule
Any change that touches auth, COPPA flows, content filtering, PII handling, or iframe sandboxing requires explicit justification in the commit message and a re-run of `npm run test:safety`.

---

## CRITICAL: Revised COPPA Rule — Compliance Deadline April 22, 2026

**Every agent must read this.** The FTC published final amendments to the COPPA Rule on April 22, 2025. Compliance deadline is **April 22, 2026 (52 days out)**. These are the first COPPA updates since 2013.

### What Changed (Key New Requirements)

| New Requirement | What It Means for Us | Status | Owner |
|----------------|---------------------|--------|-------|
| **Separate consent for 3rd-party disclosure** | Parents must be able to consent to data *collection* without consenting to data *disclosure* to third parties, except when disclosure is "integral to the service." We send PII-stripped prompts to Anthropic/xAI. AI generation *is* the product, so this may qualify as integral — but it's a legal interpretation call. | Needs legal review | Atlas + Elias |
| **Enhanced privacy notice (persistent identifiers)** | Privacy policy must disclose which specific internal operations use persistent identifiers and how we ensure they aren't used to contact individuals. Our policy doesn't mention session tokens at all. | Not met | Elias (draft), Nova (implement) |
| **Written data retention policy with business justification** | Must maintain a written policy detailing specific business need for retaining children's PI and a timeline for deletion. No indefinite retention. We have retention *code* but no formal written policy document. | Partial | Elias (document) |
| **Enhanced direct notice content** | Consent email must specify: (1) which third parties, (2) purposes, (3) that parent can consent to collection without third-party sharing. Our consent email names vendors and purposes but lacks item (3). | Partial | Elias (draft), Nova (implement) |
| **Image data disclosure** | We send base64 screenshots to AI providers for game iteration. Privacy policy doesn't mention this. | Not disclosed | Elias (draft), Nova (verify PII scanning) |
| **Consent versioning** | When we update our disclosure, old consents may not cover new uses. `CONSENT_POLICY_VERSION` exists in config and user records but not in the `parental_consents` DB table. | Partial | Nova (schema), Elias (requirements) |
| **Expanded PI definition** | Now includes biometrics and government IDs. We don't collect either. | N/A | — |
| **New VPC methods approved** | Text message, government ID + facial recognition, knowledge-based auth. Our email-plus and Stripe micro-charge remain valid. | Met | — |

### What Each Agent Needs to Do About This

- **Elias:** Complete COPPA Self-Assessment, write formal retention policy, draft privacy policy updates, draft consent email updates. See your rule file for full task list.
- **Cipher:** Your COPPA technical documentation sprint feeds directly into Elias's compliance review. Prioritize it.
- **Nova:** Expect incoming work: consent versioning schema migration, privacy policy persistent-identifier language, consent email update to include opt-out-of-third-party language. Wait for specs from Elias.
- **Lumi:** If we need a split consent UI (separate opt-in for AI third-party sharing), you'll design the parent-facing flow. Stand by pending legal review.
- **Atlas:** Owns the legal review decision on "integral to the service" exception. Will engage external counsel.

---

## Current Sprint: "Lock the Doors" (March 2026)

### Completed (by Atlas)
- [x] Gallery iframe sandbox fix (removed `allow-same-origin`)
- [x] CORS restricted to `BASE_URL` in production
- [x] Prototype pollution fix in WebSocket sanitizer
- [x] Production Postgres enforcement (fail-fast)
- [x] `.gitignore` hardened (7 missing data file patterns)
- [x] Output filter hardened (blocks instead of strips-and-hopes)
- [x] CI/CD pipeline (GitHub Actions: safety, Playwright, lint+typecheck)
- [x] ESLint 9 + TypeScript parser + Prettier + Husky pre-commit hooks
- [x] Password minimum raised to 8 characters
- [x] Launch Readiness Checklist (`LAUNCH_READINESS.md`)

### Completed (by Nova, March 2 2026)
- [x] Fix 14 ESLint errors (2 real bugs: admin `req` undef, audit log `const` reassign)
- [x] Walk `LAUNCH_READINESS.md` gates 1-5 — **49/49 PASS**
- [x] Sentry error monitoring added (`@sentry/node` + global error handler)
- [x] Admin data-access audit logging (auto-logs admin views of user/project data)
- [x] Parent onboarding polish: fixed dashboard auth bug, added toggles, improved wording
- [x] Iframe sandbox: fixed 2 missing `allow-pointer-lock` attrs
- [x] Data export: now includes full project code (COPPA compliance)
- [x] Password hint corrected (4 → 8 chars), Playwright test bugs fixed
- [x] `.env.example` updated (added `XAI_API_KEY`, `SENTRY_DSN`)

### Completed (by Atlas, March 2 2026 — evening)
- [x] Fixed 502 outage: 3 startup crashes in upstream commit (duplicate import, wrong export names, missing function)
- [x] Merged upstream "full remediation" with local hardening (9 conflict files resolved)
- [x] Content filter: added obfuscation bypass (dot/space-separated evasion) + prompt injection defense (15 patterns)
- [x] All 75 safety tests passing post-merge
- [x] Reviewed Lumi's UX audit — priorities assigned below

### Completed (by Cipher Hale, March 2 2026)
- [x] Security Architecture document (`docs/SECURITY_ARCHITECTURE.md`) — full 8-section architecture, threat model, auth model, data flows, logging plan
- [x] CSP fix: restored `unsafe-inline` for script-src, fixed `frame-src` (was `none`), added `wss:/ws:` to `connect-src` — resolved gallery not loading
- [x] Removed `ADMIN_SECRET` header bypass from `requireAdmin` middleware (static credential risk)
- [x] Added `requireConsent` middleware factory to `ageGate.js`
- [x] Added `ageGate` consent enforcement to generate + publish + multiplayer routes (under-13 COPPA)
- [x] Fixed ESA checkout `parentEmail` conditioning on `needsConsent`
- [x] Fixed Railway build failure (`husky` prepare script crash in production install)
- [x] Verified iframe sandbox correct across all 4 surfaces (play, gallery, preview, landing)

### Completed (by Nova, March 3 2026)
- [x] ESLint warnings: 36 → 1 (eliminated all `any` types + unused vars; added `caughtErrorsIgnorePattern`)
- [x] TypeScript: proper interfaces for API client, auth modal, chat, projects (zero `any`)
- [x] Sentry: refactored to `instrument.js` pattern with `--import`, release tagging, profiles sampling
- [x] Playwright CI: browser caching, single-server CI mode (backend serves built frontend)
- [x] COPPA: removed exact age from Stripe metadata; added age-gate to WebSocket multiplayer
- [x] Railway/Docker: health check, restart policy, `--import` for Sentry
- [x] Stripe Customer Portal endpoint added (subscription cancellation)
- [x] Vite: build config with React vendor chunk splitting
- [x] Launch Readiness Gates 6-8: **70/71 PASS** (code-verified; 6.2 user test pending)

### Now — Sprint "Polish & Verify" (March 3-7)

**Remaining (Nova owns):**
1. [ ] **Kid-friendly error messages** — replace child-facing error strings with Lumi's proposed copy (see `docs/UX_AUDIT.md` section 4). ~1-2 hrs.
2. [ ] **"A grown-up checks it first"** — add moderation language to ShareModal publish option. ~30 min.
3. [ ] **Rename "Shooter" → "Space Blaster"** everywhere. ~15 min.

**Next week (Nova owns):**
6. [ ] **Wire in GameSurvey as first-time flow** — `GameSurvey.tsx` is built but not connected. Add welcome overlay for new users: "Help me pick!" (GameSurvey) vs "I know what I want!" (free chat). See Lumi's wireframe Screen 5. ~2-4 hrs.
7. [ ] **Parent dashboard brand alignment** — CSS-only: add Nunito/Orbitron fonts, color tokens, glass surfaces, trust banner. No React rebuild. File: `public/parent-dashboard.html`. ~2-4 hrs.
8. [ ] **Accessibility fixes** — Lumi's 7 WCAG gaps: aria-labels on emoji buttons, contrast on hints, aria-current on mobile tabs, aria-describedby on form errors, touch target sizing. ~3-4 hrs.
9. [ ] **Legal review of `/privacy` and `/terms` pages** — Atlas decision needed on scope.

**DONE (Cipher — security hardening, completed March 3):**
10. [x] **Kill SHA-256 password migration** — legacy users forced to reset, bcrypt-only.
11. [x] **Session binding to User-Agent** — stored on creation, enforced in both File and Pg stores.
12. [x] **Structured JSON logging (Pino)** — central logger, request logger, auth/session/multiplayer/index converted.
13. [x] **WebSocket session re-validation** — 5-min periodic check, auto-disconnect on expired session.
14. [x] **COPPA audit documentation** — self-assessment v1.1 completed (79/103 compliant), 8 action items for FTC deadline.
15. [x] **KORA benchmark evaluation** — mapped 25 risk categories, added 22 filter terms, gap analysis in `docs/CONTENT_FILTER_KORA_EVALUATION.md`.
16. [x] **Fixed free signup bug** — `AuthModal.tsx` was sending `ageBracket` (string) instead of `age` (number).
17. [x] **30-day hard purge** — added deleted-account purge to `dataRetention.js` per privacy policy commitment.
18. [x] **Sessions schema migration** — added `bound_ua` column for Postgres session binding.

**Next (Cipher — March 4-7):**
19. [ ] **DPA execution** — coordinate with Elias on Anthropic, xAI, Stripe, Resend DPAs.
20. [ ] **Emotional manipulation output filter** — KORA gap #14, add patterns to `outputFilter.js`.
21. [ ] **Grok safety review** — evaluate whether to restrict Grok to 13+ users based on declining KORA scores.
22. [ ] **Automated purge jobs** — add 90-day cleanup for demo analytics and moderation reports.
23. [ ] **Request ID traceability** — generate unique request IDs and propagate through structured logs.

**This week (Elias owns — compliance & privacy):**
16. [ ] **Complete COPPA Self-Assessment** — walk all 103 items in `docs/COPPA_SELF_ASSESSMENT.md`, mark YES/PARTIAL/NO with evidence. ~3 hrs.
17. [ ] **Assign WISP roles and verify accuracy** — fill named roles in `docs/WISP.md`, verify data inventory and safeguards match reality. ~1 hr.
18. [ ] **Privacy policy gap analysis** — read `public/privacy.html`, cross-ref against Blueprint Section H, document gaps and draft corrections. ~2 hrs.
19. [ ] **Vendor DPA status tracker** — create `docs/VENDOR_DPA_STATUS.md`, track DPA status for Anthropic, xAI, Stripe, Resend, Railway. ~1 hr.
20. [ ] **Review Cipher's COPPA audit documentation** — verify technical claims, check completeness for FTC readiness. ~1 hr.
21. [ ] **Consent versioning requirements spec** — document the gap, write requirements, hand off to Nova. ~1 hr.

### Later — Backlog
- [ ] Progressive multi-step signup (post-launch A/B test)
- [ ] Multiplayer (Vibe Rooms) polish
- [ ] Gallery/Arcade social features
- [ ] Achievement system (badges for first game, first publish, etc.)
- [ ] Weekly parent email ("your child made 3 games this week")
- [ ] A/B landing page optimization
- [ ] ESA/ClassWallet full integration
- [ ] App Store submission
- [ ] Nonce-based CSP (eliminate `unsafe-inline`)
- [ ] AST-level pre-publish code analysis
- [ ] Canary tokens in AI system prompts
- [ ] Per-user AI cost tracking + spending caps
- [ ] Encrypt sensitive DB fields at rest
- [ ] Formal penetration test
- [ ] Data deletion endpoint (COPPA right to delete)
- [ ] `security.txt` + responsible disclosure policy

---

## Project Quick Reference

| Item | Value |
|------|-------|
| Tech stack | React 18 + TypeScript (frontend), Express 4 + Node.js (backend), PostgreSQL |
| AI | Claude (Anthropic) + Grok (xAI) dual-model |
| Payments | Stripe subscriptions + ESA/ClassWallet |
| Email | Resend |
| Deployment | Railway + Docker |
| Frontend port | 3000 (Vite dev server) |
| Backend port | 3001 (Express) |
| Test: safety | `npm run test:safety` (75 assertions, content filter + PII + age-gate + abuse) |
| Test: E2E | `npm test` (Playwright) |
| Test: CI | `npm run test:ci` (safety + Playwright kid-bot) |
| Lint | `npm run lint` / `npm run lint:fix` |
| Format | `npm run format` / `npm run format:check` |
