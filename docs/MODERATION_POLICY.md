# Community & Moderation Policy — Vibe Code Kids

**Owner:** Rowan Vale, Community & Moderation Lead  
**Version:** 1.0  
**Last updated:** March 3, 2026  
**Audience:** Parents, moderators, engineers, compliance

---

## 1) Community Rules

### Kid-Friendly Version (shown in-app)

**The Arcade Code — How We Keep It Fun & Safe**

- **Be creative** — Build games that are fun for everyone. Space blasters, puzzles, adventures — all welcome!
- **Keep it E-rated** — No scary stuff, blood, bad words, or personal info in your games.
- **Protect your privacy** — Never use your real name, school, phone number, or address. Pick a fun nickname instead!
- **Be kind** — Other kids worked hard on their games. Say nice things, don’t be mean.
- **Tell a grown-up** — If you see something that doesn’t feel right, use the Report button. A real person will check it.
- **We check first** — Before your game shows up in the Arcade, a grown-up makes sure it’s safe.

---

### Parent Version

**Community Guidelines — Vibe Code Kids**

Vibe Code Kids is a COPPA-compliant game-building platform for children. The Arcade is our public gallery where approved games can be played by others. We enforce kid-safe, E-rated standards.

| Rule | What it means |
|------|----------------|
| **No PII in shared content** | Games may not contain names, addresses, phone numbers, school names, or other identifying information. Usernames are screened for real-name patterns. |
| **E-rated content only** | No graphic violence, gore, sexual content, drugs, self-harm references, hate speech, or predatory material. Arcade-style action (e.g., space shooters) is allowed. |
| **Pre-moderation for publishing** | All public games pass an automated content + PII scan. Under-13 users require your explicit approval before publishing. |
| **Reporting and review** | Anyone can report a published game. Reports are reviewed by humans. Content that violates our rules is removed promptly. |
| **Progressive discipline** | Repeated violations result in warnings, cooldowns, and account suspension. We document all enforcement actions. |

---

## 2) Content Categories: Allowed / Review / Remove

| Category | Description | Action |
|----------|-------------|--------|
| **Allowed** | Arcade-style combat (space blasters, lasers), fantasy violence (swords, spells), puzzles, racing, sports, platformers, mild humor | No action — publish passes scan |
| **Review** | Unclear tone (e.g., ambiguous “scary” content), borderline language, creative edge cases, multiple reports on same game | Human review — remove if violates guidelines |
| **Remove (immediate)** | PII (names, addresses, phones, schools), adult/sexual content, gore/extreme violence, hate speech, self-harm, grooming, real weapons/terrorism | Block pre-publish or remove from gallery |

### Automated Pre-Publish Blockers (no human override)

- Content filter hits (terms in `server/prompts/index.js`, `server/middleware/contentFilter.js`)
- PII detected (email, phone, SSN, address patterns — `server/middleware/piiScanner.js`, `server/middleware/prePublishScan.js`)
- Dangerous patterns in code (external requests, tracking, localStorage, cookies — `server/middleware/prePublishScan.js`)
- Username/creator name looks like real name (`server/middleware/usernameFilter.js` → falls back to "Creator")

### Human Review Triggers

- User-submitted report (any of 5 reasons)
- Same project reported 2+ times
- Pre-publish scan warning (logged but not blocking)
- Admin discovery during spot checks

---

## 3) Reporting + Review Workflow

### Step 1: User Reports

- **Where:** Report button on the play page (`/play/{id}`) — modal with reason select
- **Reasons:** `inappropriate_content`, `personal_info`, `bullying`, `scary_content`, `other`
- **API:** `POST /api/report` — rate-limited 5 per IP per hour
- **Storage:** Postgres `moderation_reports` or JSONL fallback

### Step 2: Report Creation

1. Validate `projectId` + `reason`
2. Confirm project is public (cannot report private projects)
3. Create report with `status: pending`
4. Track in admin alerts (5+ reports/hour → email alert)

### Step 3: Admin Review Queue

1. Admin opens `/admin` → Moderation Queue
2. Filter by status: `pending`, `actioned`, `dismissed`
3. For each report:
   - View project (title, creator, category, code)
   - Play the game if needed
   - Decide: **Remove** or **Dismiss**

### Step 4: Resolution

- **Remove:** Project `isPublic = false`, `removedByModeration = true`, `moderationRemovedAt` set. Report status → `actioned`.
- **Dismiss:** Report status → `dismissed`, no project change.
- Optional `note` for audit trail. All actions logged via `logAdminAction`.

### Step 5: Post-Resolution

- Resolved reports purged after 90 days (data retention policy)
- No automatic notification to reporter (privacy-first)

---

## 4) Escalation Policy — Immediate Action

| Trigger | Action | Owner |
|---------|--------|-------|
| **PII in public game** | Remove immediately; notify parent if child data exposed | Mod + Elias |
| **Predatory/grooming content** | Remove + suspend creator; preserve evidence; NCMEC CyberTipline if CSAM | Mod + Cipher |
| **5+ reports in 1 hour** | Admin email alert; prioritize queue review | Auto + Mod |
| **20+ content blocks/hour** | Admin email alert; check for filter bypass or attack | Auto + Cipher |
| **Same project reported 3+ times** | Fast-track review; remove if any violation | Mod |
| **CSAM or exploitation** | Remove + NCMEC + law enforcement; no delay | Mod + Cipher |

*Reference: `docs/INCIDENT_RESPONSE_PLAYBOOK.md` — Scenarios A & B*

---

## 5) Tooling Requirements for Engineers

### Existing (implemented)

| Tool | Location | Purpose |
|------|----------|---------|
| Report API | `server/routes/report.js` | Accept reports; rate limit by IP |
| Moderation service | `server/services/moderation.js` | Create, list, resolve reports |
| Admin moderation queue | `server/routes/admin.js` | List reports, resolve with remove/dismiss |
| Pre-publish scan | `server/middleware/prePublishScan.js` | Content + PII + dangerous patterns |
| Content filter | `server/middleware/contentFilter.js` | Block prohibited input terms |
| Username filter | `server/middleware/usernameFilter.js` | Block real-name patterns |
| Admin alerts | `server/services/adminAlerts.js` | Spike detection for reports, blocks, suspensions |

### Recommended Additions (prioritized)

| Priority | Item | Description |
|----------|------|-------------|
| P1 | **Report button on gallery cards** | Users can report from gallery view, not just play page |
| P1 | **Reporter user ID** | Pass `reporterUserId` when logged in (currently `null`) for abuse detection |
| P2 | **Shadow review queue** | Flag high-risk reports (PII, bullying, 3+ reports) for priority review |
| P2 | **Repeat-offender tracking** | Count projects removed per user; auto-escalate after N removals |
| P2 | **Ban/suspend UI in admin** | One-click suspend from moderation resolution |
| P3 | **Report confirmation to reporter** | Optional in-app "We reviewed this" (no details) |
| P3 | **Moderation audit export** | CSV of actions for compliance/audit |

---

## 6) Moderator Playbook — Examples + Responses

### Example 1: Report — "Inappropriate content"

**Scenario:** Game titled "Zombie Blood Fest" — report says it’s too scary/gory.

**Steps:**
1. Load project, inspect title + code
2. Search code for: blood, gore, dismember, etc. (content filter terms)
3. If blocked terms present → **Remove** (pre-publish should have caught; investigate scan bypass)
4. If no blocked terms but theme is disturbing → **Remove** with note: "Theme too intense for E-rated Arcade"
5. If arcade-style zombies with no gore → **Dismiss** with note: "Fantasy zombies within guidelines"

### Example 2: Report — "Shows personal information"

**Scenario:** Report says a game displays a kid’s school name.

**Steps:**
1. **Immediate remove** — PII is never allowed
2. Search code for school names, addresses, phones
3. Note in resolution: "PII confirmed: [type]. Creator notified via parent."
4. Escalate to Elias if under-13 — COPPA implications

### Example 3: Report — "Bullying or mean content"

**Scenario:** Game has text like "You’re ugly" or "Nobody likes you."

**Steps:**
1. Review visible text and string literals in code
2. If bullying language present → **Remove** with note
3. Check creator’s other projects for pattern
4. If repeat offender → consider suspension (manual for now)

### Example 4: Report — "Too scary for kids"

**Scenario:** Dark-themed puzzle game; parent finds it frightening.

**Steps:**
1. Review visuals and text — no blood, gore, or prohibited terms
2. Judgment call: if age-inappropriate (e.g., horror imagery) → **Remove**
3. If subjective "a bit dark" but within E-rated → **Dismiss** with note: "Within guidelines; parent preference"

### Example 5: Dismiss — False positive

**Scenario:** Report says "inappropriate" but game is a benign platformer.

**Steps:**
1. **Dismiss** with note: "No policy violation found"
2. If same project gets multiple frivolous reports → consider reporter abuse (future: flag IP)

---

## 7) Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Reports per day | Track baseline | `moderation_reports` count by `created_at` |
| Resolution time (pending → actioned/dismissed) | < 24 hours for PII/grooming; < 48 hours others | `reviewed_at - created_at` |
| Repeat offenders (users with 2+ projects removed) | Zero tolerance | Count distinct `project_id` per `user_id` where `removedByModeration = true` |
| Report rate (reports / public games) | Monitor for abuse | Reports / `COUNT(projects WHERE isPublic)` |
| Content filter blocks (pre-publish) | Log for tuning | `contentFilterStats` + admin dashboard |
| Admin alert triggers | Respond within 1 hour | 5 reports/hour, 20 blocks/hour, 3 suspensions/hour |

*Data retention: Resolved reports purged after 90 days. Metrics should be aggregated before purge.*

---

## 8) Risks + Mitigations

| Risk | Mitigation |
|------|------------|
| **Report abuse** — users mass-report to harass creators | Rate limit 5/IP/hour; future: flag reporters with high dismiss rate |
| **PII slips through pre-publish** | PII scanner + manual review on "personal_info" reports; creator name filtered |
| **Delayed response to serious reports** | Escalation policy: PII/grooming same-day; admin alerts for spikes |
| **Inconsistent enforcement** | This playbook; documented categories; audit trail on all actions |
| **COPPA exposure from shared content** | Pre-publish PII scan; username filter; under-13 requires parent approval |
| **Moderator bias** | Clear categories; examples; Cipher/Elias review of edge cases |

---

## 9) Related Documents

- **`docs/PARENT_MODERATION_TEMPLATES.md`** — Copy-paste email templates for parent notifications (game removed, PII notice, warning, suspension, report acknowledgment)
- **`docs/INCIDENT_RESPONSE_PLAYBOOK.md`** — Cipher's incident playbook; Scenarios A & B cover PII and predatory content
- **`docs/CONTENT_FILTER_KORA_EVALUATION.md`** — Content filter risk matrix

---

## 10) Document History

| Date | Version | Changes |
|------|---------|---------|
| Mar 3, 2026 | 1.0 | Initial policy — Rowan Vale |

---

*This policy is maintained by the Community & Moderation Lead and reviewed with Atlas (product), Cipher (security), and Elias (compliance).*
