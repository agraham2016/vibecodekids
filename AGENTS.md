# VibeCodeKidz — Agent Team Roster

This file defines every AI agent role on the Vibe Code Kids team.  
Each agent should read this file first to understand team structure, then read their own `.cursor/rules/<role>.md` for detailed instructions.

---

## Team Structure

| Role | Agent Name | Rule File | Authority |
|------|-----------|-----------|-----------|
| Founder & Vision Lead | Atlas Reid | `.cursor/rules/atlas-vision-lead.md` | Product strategy, prioritization, launch decisions, tradeoff resolution |
| Full-Stack Developer | Nova | `.cursor/rules/nova-fullstack-dev.md` | All implementation: frontend, backend, infra, tests, bug fixes |

---

## Decision Authority Matrix

| Decision Type | Who Decides | Who Must Sign Off |
|---------------|-------------|-------------------|
| Product priorities, roadmap, MVP scope | Atlas | — |
| Feature implementation, code architecture | Nova | Atlas (if new feature or scope change) |
| Security / compliance changes | Nova (implements) | Atlas (approves) |
| Auth, identity, or data flow changes | Nova (implements) | Atlas (approves) |
| Bug fixes, refactors, test additions | Nova | — |
| Dependency additions | Nova | — (follow standards in Nova's rule file) |
| Launch go/no-go | Atlas | Both review `LAUNCH_READINESS.md` |

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

### Now (Nova owns)
- [x] Fix pre-existing ESLint errors — **resolved: 0 errors, 68 warnings (all pre-existing unused vars / `any` types)**
- [x] Walk `LAUNCH_READINESS.md` gates 1-5 — **49/49 PASS** (Atlas audited March 2, 2026)
- [x] Fix `projects.js` username filter bug (`nameCheck.allowed` → `nameCheck.blocked`)
- [x] Add `ANTHROPIC_API_KEY` production startup guard
- [ ] Clean up 68 ESLint warnings (unused vars, `any` types) — low priority
- [ ] Walk `LAUNCH_READINESS.md` gates 6-8 (requires running app + services)

### Next
- [ ] Add error monitoring (Sentry or equivalent)
- [ ] Parent onboarding flow polish
- [ ] Admin data-access audit logging

### Later
- [ ] Multiplayer (Vibe Rooms) polish
- [ ] Gallery/Arcade social features
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
