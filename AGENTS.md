# VibeCodeKidz — Project Operator Guide

This project now runs with a single primary AI operator: `Nova`.

Use `.cursor/rules/nova-fullstack-dev.md` for the standing development rules, and keep `.cursor/rules/nova-roblox-3d-fix.md` as a focused troubleshooting reference for 3D GLB preview issues.

---

## Active Project Rules

| Rule File | Purpose |
|-----------|---------|
| `.cursor/rules/nova-fullstack-dev.md` | Main implementation, testing, and safety guidance |
| `.cursor/rules/nova-roblox-3d-fix.md` | Reference notes for Roblox-style 3D model loading fixes |
| `.cursor/rules/git-workflow.mdc` | Git and commit workflow guidance |

---

## Operating Model

- One operator owns implementation across frontend, backend, tests, and infrastructure.
- Product, safety, and compliance decisions now come directly from the user.
- Historical multi-agent escalation flow has been retired from this repo.

---

## Shared Standards

### Git
- Commit messages: imperative mood, explain why, not just what
- Never force-push `main`
- Never commit `.env`, credentials, or child data files

### Code Quality
- ESLint should pass with zero errors
- Prettier formats code before commit
- Safety test suite must pass before commit
- TypeScript strict mode stays on for `src/`

### Safety-First Rule
- Any change touching auth, COPPA flows, content filtering, PII handling, or iframe sandboxing requires extra scrutiny and a `npm run test:safety` run before commit.

---

## Current Priorities

1. Keep the studio stable and shippable.
2. Improve engine quality, template coverage, and asset grounding.
3. Ship UX polish and bug fixes without reintroducing safety regressions.

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
| Test: safety | `npm run test:safety` |
| Test: E2E | `npm test` |
| Test: CI | `npm run test:ci` |
| Lint | `npm run lint` / `npm run lint:fix` |
| Format | `npm run format` / `npm run format:check` |
