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

---

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Vite frontend | `npx vite --host 0.0.0.0` | 3000 | Proxies `/api`, `/play`, `/gallery`, `/admin` to backend |
| Express backend | `node server/index.js` | 3001 | Falls back to JSON file storage when `DATABASE_URL` is unset |
| Both (concurrently) | `npm run dev:full` | 3000 + 3001 | Uses `concurrently` |

### Environment

- Copy `.env.example` to `.env` before first run. The backend starts without real API keys; AI code generation will fail gracefully.
- PostgreSQL is **not required** for local dev — the server falls back to JSON file storage in `data/`.
- `ANTHROPIC_API_KEY` is needed for actual AI code generation but the app runs without it.

### Gotchas

- The `format:check` command currently reports 18 files with style issues (pre-existing in the repo). This is not a blocker.
- Husky pre-commit hook runs `lint-staged` + `npm run test:safety`. Both must pass before commits land.
- Playwright E2E tests (`npm test`) require browser binaries installed via `npx playwright install --with-deps`. These are heavyweight and not installed by the update script; install on demand.
- The backend uses ES modules (`"type": "module"` in `package.json`). Use `import`/`export`, not `require`.
- Node 18+ is required (`engines` field). Node 20 or 22 both work.
