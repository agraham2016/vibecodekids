# VibeCodeKidz — Defensible Architecture Blueprint

**Version:** 1.0  
**Date:** February 28, 2026  
**Author:** Principal Systems Architect + Compliance-by-Design Lead  
**Classification:** Internal — Confidential

---

## A) HIGH-LEVEL ARCHITECTURE

### System Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Landing Page │  │ Junior Studio│  │ Teen Dashboard│  │ Parent Portal │  │
│  │  (A/B)       │  │ (Under 13)   │  │ (13+)        │  │ (Unauthed)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │                  │           │
└─────────┼─────────────────┼──────────────────┼──────────────────┼───────────┘
          │                 │                  │                  │
┌─────────▼─────────────────▼──────────────────▼──────────────────▼───────────┐
│                           API GATEWAY (Express)                             │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │              MIDDLEWARE STACK (every request)                          │ │
│  │  securityHeaders → requestLogger → rateLimiter → requireAuth/extract  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Auth/Identity│  │ Age-Gated     │  │ Arcade       │  │ Admin /       │  │
│  │ Service      │  │ Feature Gate  │  │ Publishing   │  │ Moderation    │  │
│  │              │  │ [NEW]         │  │ Pipeline     │  │               │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                  │                   │          │
│  ┌──────▼─────────────────▼──────────────────▼───────────────────▼───────┐  │
│  │                      AI PROMPT FIREWALL                              │  │
│  │   piiScanner → contentFilter → [AI Provider] → outputFilter         │  │
│  └──────────────────────────────┬────────────────────────────────────────┘  │
│                                 │                                           │
│  ┌──────────────────────────────▼────────────────────────────────────────┐  │
│  │                      AUDIT / EVENT LOG                               │  │
│  │   adminAuditLog + consentAuditLog [NEW] + contentFilterStats         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

VENDOR BOUNDARIES (data leaves our ecosystem):
  ├── Anthropic (Claude) ← PII-stripped prompts only
  ├── xAI (Grok) ← PII-stripped prompts only
  ├── Stripe ← userId + tier only (no child PII)
  ├── Resend ← parent email for consent/reset only
  └── CDNs (jsdelivr, cdnjs) ← game libraries (Phaser, Three.js) loaded client-side in sandboxed iframes
```

### Key Services / Modules

| Module | Current File(s) | Purpose |
|--------|-----------------|---------|
| **Auth/Identity** | `server/routes/auth.js`, `server/middleware/auth.js` | Registration, login, session management, age bracket assignment |
| **Parent Portal** | `server/routes/parent.js`, `server/routes/parentDashboard.js`, `server/routes/parentVerifyCharge.js` | VPC flow, parent controls, data rights |
| **Junior Studio** | `src/App.tsx` (same IDE for all) | Game creation — same UI today, needs feature gating |
| **Teen Dashboard** | `src/App.tsx` (same IDE for all) | Game creation — expanded features for 13+ |
| **Arcade Publishing Pipeline** | `server/routes/projects.js`, `server/routes/gallery.js`, `server/middleware/prePublishScan.js` | Publish, scan, serve, display |
| **AI Prompt Firewall** | `server/middleware/piiScanner.js`, `server/middleware/contentFilter.js`, `server/middleware/outputFilter.js`, `server/routes/generate.js` | Input sanitization, content blocking, output filtering |
| **Moderation / Review Queue** | `server/services/moderation.js`, `server/routes/report.js`, `server/services/discipline.js` | Reports, progressive discipline, admin queue |
| **Audit Logging** | `server/services/adminAuditLog.js` | Admin action audit trail (consent/parent actions NOT yet logged) |
| **Vendor Boundaries** | `server/services/ai.js`, `server/services/consent.js`, `server/routes/billing.js` | Third-party integrations |

### CRITICAL BUG DISCOVERED DURING AUDIT

**`server/services/db.js` — Missing Postgres Field Mappings**

The `rowToUser()` and `userToRow()` functions do NOT map 7 COPPA-critical fields:

| Missing Field | Column Name | Impact |
|---------------|-------------|--------|
| `publishingEnabled` | `publishing_enabled` | Under-13 publishing gate not persisted in Postgres |
| `multiplayerEnabled` | `multiplayer_enabled` | Under-13 multiplayer gate not persisted in Postgres |
| `parentDashboardToken` | `parent_dashboard_token` | Parent Command Center link lost on restart |
| `parentVerifiedMethod` | `parent_verified_method` | VPC method not recorded |
| `parentVerifiedAt` | `parent_verified_at` | VPC timestamp not recorded |
| `filterViolations` | `filter_violations` | Progressive discipline resets on restart |
| `lastViolationAt` | `last_violation_at` | Discipline timing lost |

**This means on Postgres deployments, all parent dashboard toggles, VPC tracking, and progressive discipline are silently broken.** File storage works by accident (stores full JSON object).

---

## B) AGE-TIER SEGMENTATION

### Age Category Model

| Field | Values | Set At | Stored In |
|-------|--------|--------|-----------|
| `ageBracket` | `under13`, `13to17`, `18plus` | Registration | `users.age_bracket` |

**Current logic:** `auth.js` line ~180 — client sends `ageBracket` directly or `age` which is converted server-side via `getAgeBracket()`. Exact age is NOT stored (data minimization).

### Two-Tier Mapping

For the purposes of this blueprint, the two tiers map to `ageBracket` as follows:

| Tier | ageBracket Values | COPPA Applies | VPC Required |
|------|-------------------|---------------|--------------|
| **JUNIOR** | `under13` | Yes | Yes |
| **TEEN** | `13to17`, `18plus` | No | No |

### Feature Flags Matrix

| Feature | JUNIOR (under13) | TEEN (13+) | Current Enforcement | Gap |
|---------|-------------------|------------|---------------------|-----|
| **Account creation** | Allowed (triggers VPC) | Allowed | Server (auth.js) | None |
| **Login** | Blocked until consent ACTIVE | Allowed | Server (auth.js) | None |
| **AI game generation** | Allowed (after consent) | Allowed | Server (generate.js) | Suspended users not checked |
| **Save projects (private)** | Allowed | Allowed | Server (projects.js) | None |
| **Publish to Arcade** | Parent must enable | Allowed by default | Server (projects.js) | **Postgres bug** — toggle not persisted |
| **Multiplayer** | Parent must enable | Allowed by default | Server (projects.js) | **Postgres bug** — toggle not persisted |
| **Discord link/access** | **BLOCKED** | Allowed with disclaimer | **NOT ENFORCED** | Discord links visible to all users |
| **Contact page Discord** | **HIDDEN** | Shown | **NOT ENFORCED** | Contact page shows Discord to all |
| **Support tickets** | Via parent email only | Direct | N/A (no ticket system) | No support system exists yet |
| **Profile editing** | Username + display name | Username + display name | Server (no edit endpoint) | No profile edit exists |
| **Comments on games** | **BLOCKED** | Not implemented | N/A | No comment system exists |
| **Social links / external URLs** | **BLOCKED** | Allowed with moderation | N/A | No social feature exists |
| **Password reset** | Email sent to parent | Email sent to user | Server (auth.js) | None |
| **Data export** | Via Parent Command Center | Self-service (not built) | Server (parentDashboard.js) | Teens can't export own data |
| **Account deletion** | Via Parent Command Center | Self-service (not built) | Server (parentDashboard.js) | Teens can't delete own account |
| **Improvement data opt-out** | Via Parent Command Center | Not available to teens | Server (parentDashboard.js) | Teens should have this too |

### Enforcement Requirements

**Current state:** Age-tier checks happen in route logic (auth.js login, projects.js publish/multiplayer), NOT in centralized middleware. This is fragile.

**Required:** A new `ageGate` middleware or utility that every protected endpoint calls:

```
ageGate(req, feature) → { allowed: boolean, reason: string }
```

Implementation approach:
- Create `server/middleware/ageGate.js`
- Reads `user.ageBracket`, `user.parentalConsentStatus`, `user.publishingEnabled`, `user.multiplayerEnabled`, `user.status`
- Returns a decision per feature
- Server is source of truth; UI mirrors but cannot override

**Acceptance criteria:**
- Every feature in the matrix above has a server-side check
- No feature is gated only by UI hiding
- Unit tests verify that a JUNIOR user with consent=ACTIVE but publishing=OFF cannot publish
- Unit tests verify that a suspended user cannot generate

---

## C) VERIFIABLE PARENTAL CONSENT (JUNIOR ONLY)

### Current Consent State Machine

```
Registration (under13)
    │
    ▼
  PENDING ──────── Parent clicks DENY ──────► DENIED (login blocked)
    │
    │ Parent clicks APPROVE (email) ─────────► GRANTED (login allowed)
    │ Parent completes Stripe micro-charge ──► GRANTED (method: stripe_micro)
    │
    ▼
  GRANTED / ACTIVE
    │
    │ Parent revokes via dashboard ──────────► REVOKED (login blocked, account suspended)
```

| State | `parentalConsentStatus` | `user.status` | Login | Features |
|-------|-------------------------|---------------|-------|----------|
| Not required (13+) | `not_required` | `approved` | Yes | All teen features |
| Pending | `pending` | `pending` | No | None |
| Granted (email) | `granted` | `approved` | Yes | Based on parent toggles |
| Granted (Stripe) | `granted` | `approved` | Yes | Based on parent toggles |
| Denied | `denied` | `denied` | No | None |
| Revoked | `revoked` | `suspended` | No | None |

### VPC Methods Available

| Method | Reliability | Implementation | Status |
|--------|-------------|----------------|--------|
| Email confirmation | Lower | Parent clicks link in email | **Live** |
| Stripe micro-charge ($0.50 refund) | Higher | Stripe Elements + backend | **Backend live, frontend built** |
| ID verification vendor | Highest | Third-party integration | **Not implemented** |

**Why it matters:** The FTC considers email-only VPC insufficient when children's data is transmitted to third-party AI providers. The Stripe micro-charge provides higher-reliability verification.

### Consent Versioning (NEW — NOT YET IMPLEMENTED)

**Current gap:** We do not track which version of the privacy policy or consent language the parent agreed to. If we update our disclosure (e.g., add a new AI provider), old consents may not cover the new use.

**Required implementation:**
1. Add a `consent_policy_version` field to `parental_consents` table
2. Store a version string (e.g., `"2026-02-28-v1"`) when consent is granted
3. Maintain a `CURRENT_CONSENT_VERSION` constant in config
4. If the platform's consent version changes, existing consents should be flagged for re-verification
5. Parent Command Center should show which version they consented to

**Acceptance criteria:**
- Every consent record includes a `policyVersion` field
- Changing `CURRENT_CONSENT_VERSION` causes a log/alert that N users need re-consent
- Parent dashboard shows the consent version and date

### Parent Dashboard Controls (Current)

| Control | Default (Junior) | Enforced Server-Side |
|---------|-------------------|---------------------|
| Publishing enabled | OFF | Yes (projects.js) — **but Postgres bug** |
| Multiplayer enabled | OFF | Yes (projects.js) — **but Postgres bug** |
| Improvement opt-out | OFF | Yes (generate.js, eventStore.js) |
| Data export | Available | Yes (parentDashboard.js) |
| Data deletion | Available | Yes (parentDashboard.js) |
| Revoke consent | Available | Yes (parentDashboard.js) |

---

## D) AI "PROMPT FIREWALL" / DATA MINIMIZATION

### Current Data Flow

```
User types prompt
    │
    ▼
piiScannerMiddleware (server/middleware/piiScanner.js)
  - Strips: emails, phones, SSNs, addresses, name introductions, locations
  - Returns: { cleaned, piiFound[] }
    │
    ▼
filterContent (server/middleware/contentFilter.js)
  - Normalizes: leet-speak, Unicode confusables, repeated chars, separators
  - Blocks: 100+ terms across categories (sexual, violence, hate, grooming, etc.)
  - Records: contentFilterStats, triggers discipline for authenticated users
    │
    ▼
AI Provider (Anthropic Claude / xAI Grok)
  - Receives: PII-stripped prompt + conversation history + system prompt
  - System prompt includes child safety rules
  - Does NOT receive: userId, username, email, age, any identifiers
    │
    ▼
filterOutputText (server/middleware/outputFilter.js)
  - Scans AI response text for PII
    │
    ▼
filterOutputCode (server/middleware/outputFilter.js)
  - Removes: tracking pixels, sendBeacon, external fetch, localStorage/sessionStorage
  - Warns (but does NOT block): blocked content in visible HTML text
    │
    ▼
Response to user
```

### What Is Sent to AI Providers

| Sent | Not Sent |
|------|----------|
| PII-stripped prompt text | userId, username, displayName |
| Conversation history (messages only) | Email, parentEmail |
| System prompt (static) | ageBracket, age |
| Current game code (if iterating) | IP address |
| Image data (if provided) | Session token |

### Identified Gaps

| Gap | Risk | Severity |
|-----|------|----------|
| **Conversation history not re-scanned** | PII in earlier messages resent to AI without stripping | P1 |
| **Output filter warns but doesn't block** | Code with inappropriate visible text still returned to user | P1 |
| **No memory/persistence disable flag** | AI providers could theoretically persist context across calls (depends on API config) | P2 |
| **Demo route has no discipline** | Unauthenticated users can probe content filter without consequence | P2 |
| **Image data not scanned** | User could send image containing PII to AI | P2 |
| **Suspended users can still generate** | `generate.js` doesn't check `user.status` | P0 |

### Implementation Plan

#### D-1: Re-scan conversation history (P1)
- **File:** `server/routes/generate.js`
- **Change:** Before building the AI prompt, run `scanPII()` on each `conversationHistory` message
- **Acceptance:** Unit test that PII in history[2].content is stripped before AI call

#### D-2: Block (not warn) inappropriate output code (P1)
- **File:** `server/middleware/outputFilter.js`
- **Change:** When `filterOutputCode` finds blocked content in visible text, replace the entire game with a safe fallback message, or strip the offensive text
- **Acceptance:** Test that AI-generated code containing a blocked term has the term removed

#### D-3: Check user status before generation (P0)
- **File:** `server/routes/generate.js`
- **Change:** After loading user, check `user.status !== 'approved'` → 403
- **Acceptance:** Suspended user gets 403, not AI output

#### D-4: Prompt/output retention policy (P2)
- **Current:** `generate_events.jsonl` stores `prompt.slice(0,200)` for 90 days
- **Required:** Document that prompts are stored as truncated, PII-stripped excerpts and purged after 90 days
- **Acceptance:** Data retention sweep covers generate events

---

## E) ARCADE PUBLISHING PIPELINE

### Current Publishing Flow

```
CURRENT (all users):
  User saves project with isPublic=true
    → Content filter on title
    → Under-13: check publishingEnabled (parent toggle)
    → prePublishScan(code) — blocks on content filter match only
    → Save to storage
    → Visible in gallery
```

### Required: Two-Tier Publishing Flow

```
JUNIOR (under13):
  Child saves project with isPublic=true
    → Content filter on title
    → Check publishingEnabled (parent toggle) — BLOCK if OFF
    → prePublishScan(code) — BLOCK on content OR PII OR dangerous patterns
    → QUEUE for parent approval [NEW]
    → Parent reviews in Parent Command Center [NEW]
    → Parent approves → publish
    → Parent denies → stays private, child notified

TEEN (13+):
  Teen saves project with isPublic=true
    → Content filter on title
    → prePublishScan(code) — BLOCK on content OR PII OR dangerous patterns
    → Publish immediately
    → Flagged for moderation review if scan had warnings
```

### Why It Matters
Under COPPA, publicly displaying a child's content (game title, creator name) constitutes "public disclosure." Parents must explicitly approve this. The current flow allows publishing if the parent has toggled `publishingEnabled` to ON, but there is no per-game parent review.

### Implementation Steps

#### E-1: Upgrade prePublishScan to BLOCK on PII and dangerous patterns (P0)
- **File:** `server/middleware/prePublishScan.js`
- **Change:** Change PII and dangerous pattern checks from `warnings.push()` to `safe = false`
- **Acceptance:** Game with `fetch('https://evil.com')` in code is blocked from publishing

#### E-2: Add parent approval queue for Junior publishing (P1)
- **File:** `server/routes/projects.js`, `server/routes/parentDashboard.js`
- **Change:**
  - When a Junior user publishes, set `publishStatus: 'pending_parent_review'` instead of `isPublic: true`
  - Add `GET /api/parent/dashboard/pending-games` endpoint
  - Add `POST /api/parent/dashboard/approve-game` and `/deny-game` endpoints
  - Notify parent via email that a game is awaiting review
- **Acceptance:** Junior publishes → game NOT visible in gallery → parent approves → game visible

#### E-3: Re-scan on project edit (P1)
- **File:** `server/routes/projects.js`
- **Change:** When updating a project that is already public, re-run `prePublishScan`. If it fails, revert to private.
- **Acceptance:** Published game edited to include PII → automatically unpublished

#### E-4: Block access to non-public projects by ID (P1)
- **File:** `server/routes/projects.js`
- **Change:** `GET /:id` should return 404 for non-public projects when the requester is not the owner
- **Acceptance:** Unauthenticated request for private project ID gets 404

### Username / Screen Name Rules

**Current enforcement:**
- `filterUsername()` blocks real-name patterns, common first+last name combos, PII patterns (ZIP, phone, school)
- Runs at registration for `username` and `displayName`

**Required additions:**
- `creatorName` (used in gallery/play page) should also run through `filterUsername()`
- Consider offering a curated word-list name generator as the default for Juniors (e.g., "CosmicPanda42")

### Public Disclosure Controls

| Content | Visible Publicly | Controls |
|---------|-------------------|----------|
| Game title | Yes (gallery, play page) | Content filter on save |
| Game description | Not implemented | N/A |
| Creator alias (`creatorName`) | Yes (gallery, play page) | Should run through `filterUsername()` |
| Game code | Yes (play page iframe) | prePublishScan |
| `userId` | No (stripped for non-owners) | Server enforcement |
| `ageMode` / `ageBracket` | No (stripped) | Server enforcement |
| Comments | Not implemented | Should not exist for Juniors |
| DMs | Not implemented | Should not exist for Juniors |
| External links | Not implemented | Should not exist for Juniors |

---

## F) DISCORD 13+ ONLY INTEGRATION

### Current State — ALL REFERENCES

| Location | File | Line(s) | Visible To |
|----------|------|---------|------------|
| Nav bar "Discord" link | `src/components/LandingPage.tsx` | 305–307 | **Everyone** |
| Footer "Join Discord" | `src/components/LandingPage.tsx` | 698–700 | **Everyone** |
| Footer "Join Discord" | `src/components/LandingPageB.tsx` | 475 | **Everyone** |
| Contact page Discord section | `public/contact.html` | 150–278 | **Everyone** |
| Nav bar CSS `.nav-discord-link` | `src/components/LandingPage.css` | 149–160 | Styling only |
| Docs (Vibe Rooms spec) | `docs/VibeCodeKidz-1.5-Vibe-Rooms-Reference.md` | Multiple | Internal docs |

### Problem
Discord's own Terms of Service require users to be 13+. Showing Discord links to unauthenticated users (who may be under 13) or to authenticated Junior users creates liability.

### Required Changes

#### F-1: Hide Discord on landing pages for unauthenticated visitors (P0)
- **Why:** Landing pages are seen by ALL visitors including children. We cannot age-gate a public landing page, so Discord links must be removed from unauthenticated views entirely.
- **Files:** `src/components/LandingPage.tsx`, `src/components/LandingPageB.tsx`
- **Change:** Remove Discord links from nav and footer. Replace with general "Community" or "Contact Us" link.
- **Acceptance:** No Discord URL in landing page HTML source

#### F-2: Hide Discord on contact page for non-teen users (P0)
- **File:** `public/contact.html`
- **Change:** Either:
  - (a) Remove Discord section entirely and move it to an authenticated-only page, OR
  - (b) Gate the Discord section behind a JS check: if user is logged in AND ageBracket !== 'under13', show Discord section
- **Acceptance:** Under-13 user visiting /contact sees no Discord content

#### F-3: Show Discord in authenticated IDE only for Teens (P1)
- **File:** `src/App.tsx` or a new `CommunityPanel` component
- **Change:** Add a "Community" link in the header/sidebar that links to Discord, shown ONLY when `user.ageBracket !== 'under13'`
- **Acceptance:** Junior user sees no Discord link anywhere in the IDE

#### F-4: Discord disclaimer for Teens (P1)
- When a Teen clicks the Discord link, show an interstitial:
  - "You're leaving VibeCodeKidz to visit Discord. Discord has its own rules and privacy policy. Never share personal information on Discord."
- **Acceptance:** Clicking Discord link shows interstitial before opening Discord URL

### Failure Modes & Mitigation

| Failure Mode | Mitigation |
|--------------|------------|
| Teen invites Junior to Discord | Discord link not visible to Juniors; nothing we can control on Discord's side |
| Shared device (Teen session, Junior uses) | Session-based; Junior should log in to their own account |
| Age spoofing (child claims 13+) | Inherent limitation; same as all age-gated platforms. Our VPC for under-13 is our primary defense |
| Junior finds Discord link via web search | We don't control external search results; our platform does not expose the link to them |

---

## G) MODERATION, SAFETY, AND INCIDENT RESPONSE

### Current Reporting Mechanism

| Feature | Status | File |
|---------|--------|------|
| Report button on published games | Live | `public/play.html` |
| Report API endpoint | Live | `server/routes/report.js` |
| Rate limiting (5/hr/IP) | Live | `server/routes/report.js` |
| Admin moderation queue | Live | `server/routes/admin.js`, `public/admin.html` |
| Report resolution (action/dismiss) | Live | `server/services/moderation.js` |
| Progressive discipline | Live | `server/services/discipline.js` |
| Admin alerts (email) | Live | `server/services/adminAlerts.js` |
| Pre-publish content scan | Live | `server/middleware/prePublishScan.js` |

### Gaps and Required Improvements

#### G-1: Audit logging for consent and parent actions (P0)
- **Why:** COPPA requires demonstrating that consent was properly obtained and that parental rights were honored. Without audit logging, we cannot prove compliance under investigation.
- **Files:** `server/routes/parent.js`, `server/routes/parentDashboard.js`
- **Change:** Log all consent grants/denials, parent dashboard toggles, data exports, data deletions, and consent revocations to the admin audit log
- **Acceptance:** Every consent state change produces an audit record with timestamp, action, userId, and method

#### G-2: Validate projectId on reports (P1)
- **File:** `server/routes/report.js`
- **Change:** Verify that `projectId` refers to an existing, public project before accepting the report
- **Acceptance:** Report for non-existent projectId returns 400

#### G-3: Auto-enforce moderation actions on projects (P1)
- **File:** `server/services/moderation.js`
- **Change:** When a report is resolved with action `remove_game`, automatically set the project's `isPublic = false`
- **Acceptance:** Admin clicks "Remove Game" → project no longer in gallery

#### G-4: Multiplayer authentication and age check (P1)
- **File:** `server/multiplayer.js`
- **Change:** On `create_room` and `join_room`, verify the user's session and check that `multiplayerEnabled` is true (for Juniors) or that the user's age bracket allows multiplayer
- **Acceptance:** Junior with multiplayer OFF cannot create or join a room

#### G-5: Sanitize multiplayer game state (P2)
- **File:** `server/multiplayer.js`
- **Change:** Run `filterContent()` on `game_state` text fields and `player_input` values before broadcast
- **Acceptance:** Game state containing blocked terms is filtered before broadcast

### Escalation Process & Response SLAs

| Report Type | Triage SLA | Resolution SLA | Escalation |
|-------------|------------|----------------|------------|
| Inappropriate game content | 4 hours | 24 hours | Auto-unpublish if P0; admin review |
| PII exposure | 1 hour | 4 hours | Immediately unpublish; notify parent if child's PII |
| Grooming / predatory content | Immediate | 1 hour | Unpublish; suspend user; report to NCMEC if applicable |
| Copyright / DMCA | 24 hours | 72 hours | Admin review; takedown if valid |
| Spam / low quality | 48 hours | 72 hours | Dismiss or warn |

### Ban / Suspension Model

| Level | Trigger | Duration | Mechanism |
|-------|---------|----------|-----------|
| Warning | 1–2 content filter violations | Immediate message | `discipline.js` |
| Cooldown | 3–4 violations | 1 hour | `rateLimitedUntil` on user |
| Auto-suspension | 5+ violations | 24 hours | `status: 'suspended'` |
| Manual suspension | Admin action | Indefinite | Admin panel |
| Permanent ban | Admin action | Permanent | `status: 'deleted'` + data retention sweep |

### Mandatory Reporting Readiness Checklist

- [ ] NCMEC CyberTipline contact documented (`docs/INCIDENT_RESPONSE_PLAYBOOK.md`)
- [ ] Process for preserving evidence before any data deletion
- [ ] Staff training on recognizing CSAM and grooming indicators
- [ ] Legal counsel contact for mandatory reporting questions
- [ ] Law enforcement liaison identified (local jurisdiction)
- [ ] Documentation of what data we retain and for how long (for law enforcement requests)

---

## H) POLICY / PUBLIC COMMUNICATION ALIGNMENT

### Required Privacy Policy Statements

| Statement | Current Status | Correct? | Required Fix |
|-----------|---------------|----------|--------------|
| "We do not sell personal data" | Present in `privacy.html` | Mostly | Add: "We share limited data with service providers to operate our platform" |
| Data collected from children | Listed | Yes | None |
| Third-party providers named | Anthropic, xAI, Stripe, Resend listed | Yes | None |
| Parental rights (review/delete/export/revoke) | Listed | Yes | None |
| Parent Command Center described | Yes | Yes | None |
| Data retention limits | Listed (90 days events, 30 days deleted accounts) | Yes | None |
| Junior vs Teen feature separation | **NOT MENTIONED** | **No** | Add section explaining tier differences |
| Discord is 13+ only | **NOT MENTIONED** | **No** | Add to FAQ or privacy policy |
| AI providers do not train on children's data | Mentioned | Needs legal verification | Verify against current DPA terms |
| Cookie/tracking disclosure | States no trackers | Yes | None |
| PII stripping before AI transmission | Mentioned | Yes | None |
| Consent method disclosure (email + Stripe) | **PARTIAL** | **No** | Add Stripe micro-charge method to privacy policy |

### Risky / Misleading Statements Found

| Statement | Location | Risk | Correction |
|-----------|----------|------|------------|
| "We do not share personal data with third parties" (if stated broadly) | `privacy.html` | Deceptive practice (FTC Act §5) — we DO share with service providers | Use: "We share limited information with service providers solely to operate our platform. We do not sell personal information." |
| Discord link on contact page says "Join our community" with no age warning | `contact.html` | Implies all users welcome | Add: "Discord is for users 13 and older" or hide for Juniors |
| No mention of two-tier system | `privacy.html`, `terms.html` | Parents may not understand their child has different features | Add a "Children Under 13" section explaining Junior restrictions |

### FAQ Additions Needed

Create a `/faq` page (or add to existing pages):

1. **"How do you verify my child is under 13?"** — We ask for age bracket at registration. We never store exact age.
2. **"What is the $0.50 charge?"** — A refundable identity verification charge processed by Stripe.
3. **"Can my child chat with other users?"** — Multiplayer chat is limited to preset phrases only. No free-text chat.
4. **"Can my child publish games publicly?"** — Only if you enable publishing in the Parent Command Center.
5. **"Is Discord safe for my child?"** — Discord is only available to users 13 and older. Children under 13 do not see Discord links.
6. **"What AI services process my child's data?"** — Anthropic (Claude) and xAI (Grok). We strip personal information before sending prompts to these services.

---

## I) IMPLEMENTATION ROADMAP (30/60/90)

### 30 Days — Critical Blockers

| # | Task | Owner | Depends On | Files |
|---|------|-------|------------|-------|
| I-1 | **Fix Postgres field mapping bug** (7 COPPA fields) | Backend | None | `server/services/db.js` |
| I-2 | **Hide Discord for Juniors** everywhere | Frontend + Backend | None | `LandingPage.tsx`, `LandingPageB.tsx`, `contact.html` |
| I-3 | **Check user.status in generate route** | Backend | None | `server/routes/generate.js` |
| I-4 | **Upgrade prePublishScan to block PII/dangerous patterns** | Backend | None | `server/middleware/prePublishScan.js` |
| I-5 | **Re-scan conversation history for PII** | Backend | None | `server/routes/generate.js` |
| I-6 | **Block non-public projects from GET /:id** | Backend | None | `server/routes/projects.js` |
| I-7 | **Re-scan on project edit** | Backend | None | `server/routes/projects.js` |
| I-8 | **Add consent audit logging** | Backend | None | `server/routes/parent.js`, `server/routes/parentDashboard.js` |
| I-9 | **Filter creatorName through filterUsername** | Backend | None | `server/routes/projects.js` |
| I-10 | **Block output code with inappropriate content** (not just warn) | Backend | None | `server/middleware/outputFilter.js` |

### 60 Days — Moderation + Policy + Audit

| # | Task | Owner | Depends On | Files |
|---|------|-------|------------|-------|
| I-11 | **Parent approval queue for Junior publishing** | Backend + Frontend | I-1, I-4 | `projects.js`, `parentDashboard.js`, `parent-dashboard.html` |
| I-12 | **Multiplayer auth + age check** | Backend | I-1 | `server/multiplayer.js` |
| I-13 | **Consent versioning** | Backend | None | `server/services/consent.js`, `server/db/schema.sql` |
| I-14 | **Auto-enforce moderation actions** | Backend | None | `server/services/moderation.js` |
| I-15 | **Validate projectId on reports** | Backend | None | `server/routes/report.js` |
| I-16 | **Privacy policy update** (tier separation, Stripe VPC, FAQ) | Ops/Legal | Legal review | `public/privacy.html` |
| I-17 | **Discord interstitial for Teens** | Frontend | I-2 | New component |
| I-18 | **Age-gate middleware** (centralized) | Backend | I-1 | New: `server/middleware/ageGate.js` |
| I-19 | **Teen self-service data export/deletion** | Backend + Frontend | I-18 | New endpoints + UI |

### 90 Days — Hardening

| # | Task | Owner | Depends On | Files |
|---|------|-------|------------|-------|
| I-20 | **Multiplayer game state sanitization** | Backend | I-12 | `server/multiplayer.js` |
| I-21 | **Abuse detection** (IP heuristics, rapid account creation) | Backend | None | New service |
| I-22 | **Expanded content filter** (image scanning, prompt injection defense) | Backend | None | `piiScanner.js`, `contentFilter.js` |
| I-23 | **Penetration test checklist** | Security | All above | External or internal |
| I-24 | **Compliance regression suite** | QA | All above | `server/tests/` |
| I-25 | **Junior name generator** (curated word-list aliases) | Frontend + Backend | I-9 | New utility |
| I-26 | **FAQ page** | Frontend | I-16 | New: `public/faq.html` |

### Dependency Graph

```
I-1 (Postgres fix) ──► I-11 (Parent publish queue)
                   ──► I-12 (Multiplayer auth)
                   ──► I-18 (Age-gate middleware)

I-4 (prePublish block) ──► I-11 (Parent publish queue)

I-2 (Discord hide) ──► I-17 (Discord interstitial)

I-18 (Age-gate middleware) ──► I-19 (Teen self-service)
```

---

## J) TEST PLAN + ACCEPTANCE CRITERIA

### Unit Tests

| Test | File | What It Verifies |
|------|------|-----------------|
| Content filter blocks bypass attempts | `server/tests/safety.test.js` | Leet-speak, Unicode, separators — **40 tests, all passing** |
| PII scanner strips all PII types | `server/tests/safety.test.js` | Emails, phones, SSNs, addresses, names, locations |
| Pre-publish scan blocks content | `server/tests/safety.test.js` | Inappropriate game code blocked |
| Username filter blocks real names | `server/tests/safety.test.js` | John_Smith, JohnSmith, jake2015, etc. |
| Age bracket derivation | NEW | `getAgeBracket(12)` → `under13`, `getAgeBracket(13)` → `13to17` |
| Consent state transitions | NEW | pending→granted, pending→denied, granted→revoked |
| Feature flag matrix | NEW | Junior+publishingOFF → cannot publish; Teen → can publish |

### Integration Tests

| Test | What It Verifies |
|------|-----------------|
| Registration → Consent email → Approve → Login | Full JUNIOR onboarding flow |
| Registration → Stripe verify → Login | VPC via micro-charge |
| Junior publish → Parent approval → Gallery visible | Two-step publish flow |
| Junior publish → Parent deny → Not in gallery | Denied publish stays private |
| Suspended user → POST /api/generate → 403 | Status enforcement |
| Junior → GET /contact → No Discord | Discord hidden |
| Private project → GET /api/projects/:id → 404 (non-owner) | Access control |

### Abuse Tests

| Test | Attack Vector | Expected Result |
|------|---------------|-----------------|
| PII in prompt | "My name is Jake, I live at 123 Main St Mesa AZ" | PII stripped before AI call |
| PII in conversation history | PII in history[0], clean prompt | History PII stripped |
| Content filter bypass (leet) | "s3xu4l" | Blocked |
| Content filter bypass (Unicode) | Confusable characters | Blocked |
| Age spoofing at registration | Claim 18+, then request under-13 features | Server rejects based on stored ageBracket |
| Publish bypass (direct API) | POST project with isPublic=true, skip UI | Server enforces publishingEnabled check |
| Access private project | GET /api/projects/{private-id} without auth | 404 |
| Discord link injection | Junior submits game with Discord URL | prePublishScan catches external URL |
| Multiplayer without auth | WebSocket connect without session | Connection rejected |
| Report spam | 10 reports in 1 minute | Rate limited after 5 |

### Logging Verification Tests

| Test | What It Verifies |
|------|-----------------|
| Consent grant logged | Audit log contains `consent_granted` entry with userId, method, timestamp |
| Parent toggle logged | Audit log contains `parent_toggle` entry with setting name and value |
| Data deletion logged | Audit log contains `data_deletion_requested` entry |
| Admin moderation action logged | Existing — verify audit log entry |
| Content filter block logged | Existing — verify contentFilterStats increment |

### COPPA/Teen Safety Regression Checklist (Pre-Release)

Run before every deployment:

```
□ 1. npm run test:safety passes (40+ tests)
□ 2. Junior user cannot log in without consent
□ 3. Junior user cannot publish without publishingEnabled=true
□ 4. Junior user cannot access multiplayer without multiplayerEnabled=true
□ 5. Junior user cannot see Discord links (check landing page, contact page, IDE)
□ 6. PII in prompts is stripped (test with email, phone, address)
□ 7. PII in conversation history is stripped
□ 8. Content filter blocks leet-speak and Unicode bypass
□ 9. Pre-publish scan blocks PII and dangerous patterns (not just warns)
□ 10. Private projects return 404 to non-owners
□ 11. Suspended users cannot generate AI content
□ 12. Output filter blocks (not warns) inappropriate content in code
□ 13. Consent email includes Stripe verification link
□ 14. Parent Command Center loads and shows correct toggle states
□ 15. Data deletion via Parent Command Center works end-to-end
□ 16. Gallery responses contain no userId, ageBracket, or parentEmail
□ 17. Stripe checkout metadata contains only userId and tier
□ 18. No external analytics/tracking scripts in page source
□ 19. CSP header is set and restrictive
□ 20. HSTS header is set with max-age >= 1 year
```

---

## APPENDIX: RISK REGISTER (Updated)

| # | Risk | Likelihood | Impact | Current Mitigation | Residual Risk | Priority |
|---|------|-----------|--------|-------------------|---------------|----------|
| R1 | Postgres COPPA fields not persisted | **Confirmed bug** | Critical | File storage works accidentally | **Critical** (Postgres deploys broken) | **P0** |
| R2 | Discord shown to under-13 users | High | High | None | High | **P0** |
| R3 | Suspended user generates AI content | Medium | High | None (session still valid) | High | **P0** |
| R4 | PII in conversation history sent to AI | Medium | High | Only current message scanned | Medium | **P0** |
| R5 | Pre-publish scan only warns on PII/dangerous | High | Medium | Warnings logged, not blocked | Medium | **P0** |
| R6 | Non-public projects accessible by ID | Medium | Medium | No check | Medium | **P1** |
| R7 | No consent audit logging | High | High | Console logs only | High | **P0** |
| R8 | No parent approval for Junior publishing | Medium | High | Parent toggle exists but no per-game review | Medium | **P1** |
| R9 | Output filter only warns on blocked code content | Medium | Medium | Code returned with warnings | Medium | **P1** |
| R10 | No consent versioning | Low | Medium | Not tracked | Low | **P1** |
| R11 | Multiplayer WS has no auth/age check | Medium | High | None | High | **P1** |
| R12 | creatorName not filtered | Medium | Medium | Only username/displayName filtered | Medium | **P1** |
| R13 | No project edit re-scan | Medium | Medium | Only initial publish scanned | Medium | **P1** |

---

*End of Blueprint — Version 1.0*
