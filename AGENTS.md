# VibeCodeKidz — Agent Team Roster

This file defines every AI agent role on the Vibe Code Kids team.  
Each agent should read this file first to understand team structure, then read their own `.cursor/rules/<role>.md` for detailed instructions.

---

## Team Structure

| Role | Agent Name | Rule File | Authority |
|------|-----------|-----------|-----------|
| Founder & Vision Lead | Atlas Reid | `.cursor/rules/atlas-vision-lead.md` | Product strategy, prioritization, launch decisions, tradeoff resolution |
| Full-Stack Developer | Nova | `.cursor/rules/nova-fullstack-dev.md` | All implementation: frontend, backend, infra, tests, bug fixes |
| Kid-First UX Designer | Lumi Rivers | `.cursor/rules/lumi-ux-designer.md` | UX flows, microcopy, accessibility, child safety UX, parent portal design |

---

## Decision Authority Matrix

| Decision Type | Who Decides | Who Must Sign Off |
|---------------|-------------|-------------------|
| Product priorities, roadmap, MVP scope | Atlas | — |
| Feature implementation, code architecture | Nova | Atlas (if new feature or scope change) |
| Security / compliance changes | Nova (implements) | Atlas (approves) |
| Auth, identity, or data flow changes | Nova (implements) | Atlas (approves) |
| UX flows, microcopy, accessibility | Lumi | Atlas (if new screen or scope change) |
| Child safety UX, parent portal design | Lumi (designs) | Atlas (approves), Nova (implements) |
| Bug fixes, refactors, test additions | Nova | — |
| Dependency additions | Nova | — (follow standards in Nova's rule file) |
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

### Now — Sprint "Polish & Verify" (March 3-7)

**This week (Nova owns):**
1. [ ] **Kid-friendly error messages** — replace all child-facing error strings with Lumi's proposed copy (see `docs/UX_AUDIT.md` section 4). Files: `src/components/AuthModal.tsx`, `src/components/ShareModal.tsx`, `src/lib/api.ts`. ~1-2 hrs.
2. [ ] **"A grown-up checks it first"** — add moderation language to ShareModal publish option. See Lumi's wireframe in `docs/UX_AUDIT.md` Screen 6. ~30 min.
3. [ ] **Rename "Shooter" → "Space Blaster"** everywhere — `server/prompts/genres.js`, `GameSurvey.tsx`, any genre picker. ~15 min.
4. [ ] **Runtime-test Launch Readiness Gates 6-8** — walk `LAUNCH_READINESS.md` gates 6-8 with live app + Stripe test mode + Resend. ~2-3 hrs.
5. [ ] **Clean up ESLint `any` type warnings** in `src/` — add proper TypeScript interfaces. ~2 hrs.

**Next week (Nova owns):**
6. [ ] **Wire in GameSurvey as first-time flow** — `GameSurvey.tsx` is built but not connected. Add welcome overlay for new users: "Help me pick!" (GameSurvey) vs "I know what I want!" (free chat). See Lumi's wireframe Screen 5. ~2-4 hrs.
7. [ ] **Parent dashboard brand alignment** — CSS-only: add Nunito/Orbitron fonts, color tokens, glass surfaces, trust banner. No React rebuild. File: `public/parent-dashboard.html`. ~2-4 hrs.
8. [ ] **Accessibility fixes** — Lumi's 7 WCAG gaps: aria-labels on emoji buttons, contrast on hints, aria-current on mobile tabs, aria-describedby on form errors, touch target sizing. ~3-4 hrs.
9. [ ] **Legal review of `/privacy` and `/terms` pages** — Atlas decision needed on scope.

### Later — Backlog
- [ ] Progressive multi-step signup (post-launch A/B test)
- [ ] Multiplayer (Vibe Rooms) polish
- [ ] Gallery/Arcade social features
- [ ] Achievement system (badges for first game, first publish, etc.)
- [ ] Weekly parent email ("your child made 3 games this week")
- [ ] A/B landing page optimization
- [ ] ESA/ClassWallet full integration
- [ ] App Store submission

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
