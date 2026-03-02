# Vibe Code Kids — Security Architecture Document

**Author:** Cipher Hale, Security-Focused Technical Architect
**Date:** 2026-03-01
**Status:** Living Document — v1.0
**Scope:** Full-stack security architecture for VibeCodeKidz platform

---

## 1. Architecture Overview

```
[Child Browser] ──HTTPS──▶ [CDN / Static Assets]
       │                          │
       ▼                          ▼
[React SPA (Vite)] ──REST──▶ [Express API Server]
       │                     ┌────┴─────────────┐
       │                     │                   │
       │              [Middleware Chain]    [WebSocket Server]
       │              - Security headers    - Multiplayer rooms
       │              - Auth extraction     - Chat allowlist
       │              - Rate limiting       - State sanitization
       │              - Content filter
       │              - PII scanner
       │              - Age gate / consent
       │                     │
       │              [Route Handlers]
       │              ┌──┬──┬──┬──┐
       │              │  │  │  │  │
       │            Auth AI Proj Admin Stripe/ESA
       │              │  │  │  │  │
       │              ▼  ▼  ▼  ▼  ▼
       │           [Service Layer]
       │           - sessions, storage, ai, consent
       │           - abuseDetection, adminAuditLog
       │                     │
       │              [Data Layer]
       │           ┌────┴────┐
       │        [Postgres]  [JSON files (dev only)]
       │
[Parent Browser] ──HTTPS──▶ Same API, different permissions
[Admin Browser]  ──HTTPS──▶ Same API, admin middleware gate
```

### Key Architectural Decisions

- Middleware chain pattern for defense-in-depth
- Separation of routes, services, and data access
- Dual storage mode (Postgres prod / JSON dev — production enforced via startup guard)
- Content filtering at BOTH input and output boundaries
- Published games rendered in sandboxed iframes (`allow-scripts allow-pointer-lock`, no `allow-same-origin`)

---

## 2. Key Components and Responsibilities

| Component | Location | Responsibility | Trust Level |
|-----------|----------|----------------|-------------|
| React SPA | `src/` | UI rendering, local state, API calls | Untrusted (client) |
| Static Pages | `public/` | Marketing, legal, parent pages | Untrusted (client) |
| Express API | `server/index.js` | Request routing, middleware orchestration | Trusted |
| Auth Middleware | `server/middleware/auth.js` | Session validation, role extraction | Trusted, critical |
| Security Middleware | `server/middleware/security.js` | HTTP headers, CSP, HSTS | Trusted |
| Content Filter | `server/middleware/contentFilter.js` | Input sanitization (leet-speak, injection) | Trusted, critical |
| PII Scanner | `server/middleware/piiScanner.js` | Detect/redact PII in transit | Trusted, critical |
| Output Filter | `server/middleware/outputFilter.js` | Scrub AI responses | Trusted, critical |
| Pre-Publish Scan | `server/middleware/prePublishScan.js` | Block dangerous code in published games | Trusted, critical |
| Age Gate | `server/middleware/ageGate.js` | COPPA consent + feature enforcement | Trusted, critical |
| Username Filter | `server/middleware/usernameFilter.js` | Block PII-like usernames | Trusted |
| Rate Limiter | `server/middleware/rateLimit.js` | Abuse prevention per-user/tier | Trusted |
| AI Service | `server/services/ai.js` | Proxy to Claude/Grok with prompt guardrails | Trusted, high-risk |
| Session Service | `server/services/sessions.js` | Token lifecycle (create, validate, destroy) | Trusted, critical |
| Storage Service | `server/services/storage.js` | Data access abstraction | Trusted |
| Abuse Detection | `server/services/abuseDetection.js` | Registration anomaly detection | Trusted |
| Admin Audit | `server/services/adminAuditLog.js` | Admin action logging | Trusted |
| Multiplayer | `server/multiplayer.js` | WebSocket rooms, chat, state sync | Trusted, high-risk |
| Stripe Integration | `server/routes/billing.js` | Payment processing | Trusted, PCI-adjacent |
| Postgres | `server/db/` | Persistent data | Trusted, critical |

---

## 3. Data Flows and What Data Is Stored

### 3.1 Child Data Flow

```
Child ──▶ Register (username, password, age bracket)
       ──▶ Login (session token issued)
       ──▶ Create game (AI prompt → code → saved project)
       ──▶ Publish game (pre-publish scan, requires consent if under-13)
       ──▶ Multiplayer (WebSocket, allowlisted chat only)
```

**Data stored for children:**

| Field | Stored | Purpose | Retention |
|-------|--------|---------|-----------|
| Username | Yes | Identity (not real name — enforced by usernameFilter) | Account lifetime |
| Password hash (bcrypt) | Yes | Authentication | Account lifetime |
| Age bracket | Yes | COPPA gate (data-minimized: bracket, not exact age) | Account lifetime |
| Parent email | Yes (under-13 only) | Consent flow, password reset | Account lifetime |
| Recovery email | Yes (13+ only) | Password reset | Account lifetime |
| Project code | Yes | User-created content | Account lifetime + 30d post-delete |
| AI prompts | Session only | Generation — not persisted | Session duration |
| Chat messages | No | Allowlist-only, not stored | N/A |
| IP address | Logs only | Abuse detection | 30-day max |

### 3.2 Parent Data Flow

```
Parent ──▶ Receive consent email
        ──▶ Approve/deny child account
        ──▶ Access parent dashboard (view child activity)
        ──▶ Manage billing (Stripe)
        ──▶ Enable/disable publish, multiplayer per child
```

**Data stored for parents:**

| Field | Stored | Purpose | Retention |
|-------|--------|---------|-----------|
| Email | Yes | Account, billing, consent | Account lifetime |
| Password hash | Yes | Authentication | Account lifetime |
| Stripe customer ID | Yes | Billing | Account lifetime |
| Child linkages | Yes | Consent, oversight | Account lifetime |
| Consent tokens | Yes | COPPA proof | 3 years post-consent |

### 3.3 Admin Data Flow

```
Admin ──▶ Auth (isAdmin user flag, 2FA when enabled)
       ──▶ View users, projects, moderation reports
       ──▶ Manage content, bans, system config
       ──▶ All actions logged to admin audit log
```

**Admin data access constraints:**

| Access | Scope | Constraint |
|--------|-------|------------|
| User list | All users | Read-only by default |
| Project content | All projects | For moderation only |
| Moderation reports | All reports | Action + audit trail |
| System config | Server settings | 2FA required |
| Child PII | DENY | Admins should not see child email/IP unless incident response |

---

## 4. AuthN/AuthZ Model

### 4.1 Authentication

| Mechanism | Implementation | Status |
|-----------|----------------|--------|
| Password hashing | bcrypt | Active |
| Session tokens | Bearer token, 24h expiry | Active |
| Admin auth | Logged-in user with `isAdmin` flag | Active |
| Admin 2FA | TOTP-based when enabled | Active |
| Rate limiting | Per-endpoint (5/min login) | Active |

### 4.2 Authorization — Role Hierarchy

```
anonymous < child < child-with-consent < parent < admin
```

### 4.3 Permission Matrix

| Action | anonymous | child | child+consent | parent | admin |
|--------|-----------|-------|---------------|--------|-------|
| View public gallery | Yes | Yes | Yes | Yes | Yes |
| Try demo | Yes | No | No | No | No |
| Create project | No | Yes | Yes | Yes | Yes |
| Use AI generation | No | Yes (rate-limited) | Yes | Yes | Yes |
| Publish game | No | No | Yes | Yes | Yes |
| Join multiplayer | No | No | Yes | Yes | Yes |
| View own projects | No | Yes | Yes | Yes | Yes |
| View child's projects | No | No | No | Yes (linked) | Yes |
| Manage billing | No | No | No | Yes | Yes |
| Moderation actions | No | No | No | No | Yes |
| View user list | No | No | No | No | Yes |
| System config | No | No | No | No | Yes+2FA |

This matrix is enforced server-side via `requireAuth`, `requireAdmin`, `requireConsent`, and `ageGate` middleware.

---

## 5. Threat Model

| # | Threat | Likelihood | Impact | Mitigation |
|---|--------|-----------|--------|------------|
| T1 | Prompt injection via child input | High | High | Content filter, output filter, system prompt guardrails, discipline system |
| T2 | Child PII exposure | Medium | Critical | PII scanner (input+output), username filter, pre-publish scan |
| T3 | Credential stuffing | High | Medium | Rate limiting (5/min), abuse detection |
| T4 | XSS via published games | High | High | Sandboxed iframes (no `allow-same-origin`), pre-publish scan, CSP |
| T5 | Session hijacking | Medium | High | HTTPS, security headers, HSTS |
| T6 | Admin credential compromise | Low | Critical | 2FA support, admin audit log, isAdmin-only auth |
| T7 | Malicious game code | Medium | High | Pre-publish scan (content, PII, dangerous patterns), sandboxed rendering |
| T8 | AI model abuse (cost) | Medium | Medium | Per-user rate limits, tier caps, abuse detection |
| T9 | WebSocket abuse | Medium | Medium | Session verification, allowlisted chat, state sanitization, size limits |
| T10 | Data breach (Postgres) | Low | Critical | TLS connections, credential rotation, backup encryption |
| T11 | Gallery scraping | Medium | Low | Rate limiting on gallery API |
| T12 | Parent impersonation | Low | High | Email-based consent verification |

---

## 6. Logging and Monitoring Plan

### Security Events to Log

| Event | Level | Retention |
|-------|-------|-----------|
| `auth.login.success` | info | 90 days |
| `auth.login.failure` | warn | 90 days |
| `auth.login.ratelimited` | security | 1 year |
| `auth.session.created` | info | 90 days |
| `auth.session.revoked` | info | 90 days |
| `auth.admin.action` | security | 1 year |
| `content.filter.triggered` | security | 1 year |
| `content.pii.detected` | security | 1 year |
| `content.publish.blocked` | security | 1 year |
| `ai.output.filtered` | security | 1 year |
| `ai.prompt.injection.suspected` | security | 1 year |
| `consent.requested` | info | 3 years |
| `consent.granted` | info | 3 years |
| `consent.revoked` | info | 3 years |
| `stripe.payment.success` | info | 7 years |
| `stripe.payment.failure` | warn | 7 years |

### Monitoring Alerts

| Condition | Action |
|-----------|--------|
| >10 failed logins from same IP in 5 min | Block IP temporarily |
| Content filter triggers >5x for same user in 1 hour | Flag account for review |
| AI output filter triggers for PII | Alert immediately |
| Admin login from new IP | Alert admin team |
| Security event spike (>3x baseline in 1 hour) | Page on-call |

---

## 7. Security Checklist

### Authentication and Sessions
- [x] bcrypt password hashing (SHA-256 migration path exists for legacy)
- [x] Bearer token sessions with 24h expiry
- [x] Admin auth requires isAdmin flag (ADMIN_SECRET header removed)
- [x] Rate limiting on login (5/min)
- [ ] Session binding to User-Agent
- [ ] "Revoke all sessions" for parent accounts
- [ ] Deprecate SHA-256 migration path

### Input Validation and Content Safety
- [x] Content filter on user input (leet-speak, Unicode, prompt injection)
- [x] PII scanner on input
- [x] Username filter blocks real names
- [x] Pre-publish scan for dangerous patterns
- [ ] Canary tokens in AI system prompts
- [ ] AST-level analysis in pre-publish scan

### Output Safety
- [x] Published games in sandboxed iframes (no `allow-same-origin`)
- [x] AI output filter blocks PII, tracking, localStorage
- [x] CSP restricts external resources
- [ ] Game iframe CSP (separate, more restrictive)

### Data Protection
- [x] Under-13: no personal email (parent email only)
- [x] Age bracket stored instead of exact age (data minimization)
- [x] Parent email stripped from login responses
- [x] Production requires Postgres (startup guard)
- [x] `requireConsent` middleware on publish and generate routes
- [ ] Encrypt sensitive DB fields at rest
- [ ] Data deletion endpoint (COPPA right to delete)
- [ ] IP address anonymization after 30 days

### Infrastructure
- [x] HTTPS + HSTS (includeSubDomains)
- [x] CSP header
- [x] X-Frame-Options, X-Content-Type-Options
- [x] Express fingerprint removed
- [x] CORS restricted in production
- [ ] HSTS preload directive
- [ ] Dockerfile: run as non-root

---

## 8. Open Questions and Recommended Defaults

| # | Question | Recommended Default | Owner |
|---|----------|--------------------|----|
| Q1 | Are AI prompts stored persistently? | No — session only | Compliance Lead |
| Q2 | IP address retention window? | 30 days, then anonymize | Compliance Lead |
| Q3 | Data deletion flow for COPPA? | Parent-initiated, 30-day grace, hard delete | Full Stack Dev + Compliance |
| Q4 | AI cost tracking per-user? | Token counting + per-user budget | Full Stack Dev |
| Q5 | WebSocket re-validation interval? | Every 5 minutes | Full Stack Dev |
| Q6 | ClassWallet data sharing? | Document what data is sent | Compliance Lead |
| Q7 | Bug bounty / disclosure policy? | security.txt + disclosure email | Business |
| Q8 | Child data on parent consent revocation? | Immediate access suspension, full deletion within 30 days | Compliance Lead |
