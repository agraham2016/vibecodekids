# Moderation Policy — Implementation Audit

**Auditor:** Rowan Vale, Community & Moderation Lead  
**Date:** March 5, 2026  
**Reference:** `docs/MODERATION_POLICY.md`  
**Scope:** Reporting workflow, pre-publish scan, content filter, admin alerts, retention

---

## Executive Summary

Policy and implementation are **largely aligned**. Four gaps require engineering work; one is a minor UX enhancement. Core flows (report API, moderation queue, pre-publish scan, admin alerts, 90-day purge) match policy.

---

## Verified — Policy Matches Implementation

| Policy Claim | Implementation | Location |
|--------------|----------------|----------|
| Report API rate-limited 5 per IP per hour | ✓ | `server/routes/report.js` — `MAX_PER_WINDOW = 5`, `WINDOW_MS = 1hr` |
| Report reasons: inappropriate_content, personal_info, bullying, scary_content, other | ✓ | `report.js` — `VALID_REASONS` matches |
| Project must be public to report | ✓ | `report.js` — `readProject`, `!project.isPublic` returns 400 |
| Reports stored in Postgres or JSONL | ✓ | `moderation.js` — `USE_POSTGRES` branch + `appendReportFile` |
| trackReport() called on create | ✓ | `moderation.js` — `trackReport()` after report creation |
| Admin alert: 5 reports/hour | ✓ | `adminAlerts.js` — `reports: 5` |
| Admin alert: 20 content blocks/hour | ✓ | `adminAlerts.js` — `contentBlocks: 20` |
| Admin alert: 3 suspensions/hour | ✓ | `adminAlerts.js` — `suspensions: 3` |
| Content filter blocks → trackContentBlock | ✓ | `contentFilter.js` → `contentFilterStats.recordBlocked` → `adminAlerts.trackContentBlock` |
| Pre-publish scan: content filter + PII + dangerous patterns | ✓ | `prePublishScan.js` — filterContent, scanPII, DANGEROUS_PATTERNS |
| Username/creator name filter → "Creator" fallback | ✓ | `projects.js` — `filterUsername(displayName)`, blocked → `'Creator'` |
| Admin queue: filter by pending/actioned/dismissed | ✓ | `admin.js` — `GET /moderation?status=` |
| Resolve: Remove sets isPublic=false, removedByModeration, moderationRemovedAt | ✓ | `admin.js` — resolve handler |
| Resolve: logAdminAction on all actions | ✓ | `admin.js` — `logAdminAction` |
| Resolved reports purged after 90 days | ✓ | `dataRetention.js` — `EPHEMERAL_RETENTION_DAYS = 90` |

---

## Gaps — Require Action

### GAP 1: Reporter User ID Always Null (P1)

**Policy:** "Pass reporterUserId when logged in for abuse detection" — MODERATION_POLICY §5 Recommended Additions.

**Current:** `report.js` line 59: `reporterUserId: null` hardcoded. Play page `submitReport()` does not pass auth token or user ID.

**Impact:** Cannot detect repeat reporters or report abuse by logged-in users.

**Owner:** Nova  
**Spec:** See `docs/NOVA_MODERATION_SPEC.md` (Section: Reporter User ID)

---

### GAP 2: Report Button Only on Play Page (P1)

**Policy:** "Report button on gallery cards" — MODERATION_POLICY §5 Recommended Additions. UX_AUDIT: "Add 'See something wrong?' link on Gallery cards."

**Current:** Report button exists on `/play/{id}` only. Gallery (`gallery.html`) has no report access.

**Impact:** Users must open a game to report it. Reduces reporting accessibility, especially for parents spotting bad thumbnails/titles from gallery view.

**Owner:** Nova  
**Spec:** See `docs/NOVA_MODERATION_SPEC.md` (Section: Gallery Report Button)

---

### GAP 3: Same Project 3+ Reports — No Surface (P2)

**Policy:** "Same project reported 3+ times → Fast-track review; remove if any violation" — MODERATION_POLICY §4 Escalation.

**Current:** `listReports` returns flat list. No aggregation by `projectId`. Admin queue does not show "this project has N reports."

**Impact:** Moderators cannot identify multi-reported projects for fast-track. Policy escalation cannot be executed.

**Owner:** Nova (backend aggregation) + Admin UI (display)  
**Recommendation:** Add `reportsByProject` aggregation or `projectReportCount` to report list. Flag in queue when count >= 3.

---

### GAP 4: Admin Queue — Minimal Project Context (Minor)

**Policy:** "View project (title, creator, category, code)" — MODERATION_POLICY §3 Step 3.

**Current:** Queue shows `projectId` (link to play), `reason`, `createdAt`. Moderator must click through to see title/creator.

**Impact:** Slower triage. No blocker; workaround exists (click link).

**Recommendation:** Enrich moderation API response with `projectTitle`, `creatorName`, `category` from `readProject` when fetching reports. Low effort.

---

## Pre-Publish Scan — Verified

- **Content filter:** `prePublishScan` calls `filterContent(combinedText, { source: 'publish_scan' })` — uses `getContentFilter()` from prompts/index.js. ✓
- **PII:** `scanPII(combinedText)` — piiScanner.js. ✓
- **Dangerous patterns:** fetch, XMLHttpRequest, sendBeacon, localStorage, sessionStorage, external image/src, document.cookie. ✓
- **Integration:** `projects.js` calls `prePublishScan(code)` when `allowPublic`; returns 400 with scanWarnings if `!scan.safe`. ✓

---

## Handoff

| Gap | Priority | Assignee | Blocking Launch? |
|-----|----------|----------|------------------|
| Reporter User ID | P1 | Nova | No |
| Gallery Report Button | P1 | Nova | No |
| Same-project aggregation | P2 | Nova | No |
| Queue context enrichment | Minor | Nova | No |

**Audit complete.** Gaps documented. Spec for P1 items in `docs/NOVA_MODERATION_SPEC.md`.
