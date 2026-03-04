# Gate 6.2 User Test Script: Signup → First Game in < 2 Minutes

**Purpose:** Verify that a 9-year-old can complete signup and create their first game in under 2 minutes.  
**Gate Reference:** `LAUNCH_READINESS.md` Gate 6.2  
**Tester:** Adult facilitator + 1 child (or adult role-playing a 9-year-old)

---

## Prerequisites

- [ ] Test environment running (local or staging)
- [ ] Fresh browser session (incognito/private) or clear cookies for the test domain
- [ ] Timer (phone or stopwatch)
- [ ] Parent email inbox accessible (for under-13 path) OR use age 13 for faster test
- [ ] Paper or digital form to record times and observations

---

## Test Path Options

| Path | Age Used | Parent Consent | Best For |
|------|----------|----------------|----------|
| **A** | 13 | Not needed | Quickest test; measures signup + first game flow only |
| **B** | 9 | Parent clicks approve immediately | Full under-13 flow; parent must be standing by |
| **C** | 9 | Parent approves after 5+ min delay | Realistic scenario; 2-min clock may not apply |

**Recommendation:** Run Path A first to verify the core flow. Run Path B if you need to validate the under-13 consent experience.

---

## Script: Path A (Age 13 — No Consent Delay)

### Phase 1: Signup (Start timer when tester clicks "Sign Up" on landing page)

| Step | Action | Success Criteria | Time (sec) | Notes |
|------|--------|------------------|------------|-------|
| 1.1 | Click "Sign Up" | Signup modal or plan selector appears | | |
| 1.2 | Select Free plan, click Continue | Details form appears | | |
| 1.3 | Enter display name (e.g., "TestKid") | Field accepts input | | |
| 1.4 | Enter age: **13** | Field accepts; no parent email appears | | |
| 1.5 | Enter recovery email (optional; can skip) | | | |
| 1.6 | Enter username (e.g., "testkid99") | Hint visible: "Don't use your real name" | | |
| 1.7 | Enter password (8+ chars) | Hint visible: "or try a fun passphrase" | | |
| 1.8 | Check privacy checkbox | | | |
| 1.9 | Click "Let's Go!" | Account created; redirected to Studio | | |

**Phase 1 stop time:** _________ (Target: < 60 seconds for an adult; child may take longer)

---

### Phase 2: First Game (Timer continues or restarts when Studio loads)

| Step | Action | Success Criteria | Time (sec) | Notes |
|------|--------|------------------|------------|-------|
| 2.1 | Studio loads | Welcome overlay OR chat panel visible | | |
| 2.2 | If welcome overlay: click "Help Me Pick!" OR "I Know What I Want!" | Overlay dismisses; GameSurvey or chat appears | | |
| 2.3a | **If GameSurvey:** Tap 6 options (game type, 2D/3D, theme, character, obstacles, style) | Wizard advances; "Building..." appears | | |
| 2.3b | **If free chat:** Type or tap a game starter (e.g., "Make me a platformer") | AI responds; game generates | | |
| 2.4 | Wait for game to appear in preview | Playable game visible in preview panel | | |

**Phase 2 stop time:** _________ (Target: < 60 seconds from Studio load to first game)

---

### Total Time

| Phase | Time | Target |
|-------|------|--------|
| Signup (1.1–1.9) | _____ sec | < 90 sec |
| First game (2.1–2.4) | _____ sec | < 90 sec |
| **TOTAL** | _____ sec | **< 120 sec (2 min)** |

**PASS:** Total < 2 minutes  
**FAIL:** Total ≥ 2 minutes OR child abandoned at any step

---

## Script: Path B (Age 9 — Parent Consent Immediate)

Same as Path A, except:

- **Step 1.4:** Enter age **9**
- **Step 1.4b:** Parent email field appears. Enter real parent email.
- **Step 1.9:** Click "Let's Go!" → Success message: "Almost there! Ask your parent to check their email..."
- **Step 1.10:** Parent opens email, clicks "Approve" link immediately
- **Step 1.11:** Child (or tester) navigates back to site, logs in with username + password
- **Phase 2:** Same as Path A (Studio → first game)

**Timer:** Pause during consent wait. Resume when child logs in. Phase 2 target remains < 90 sec.

---

## Observation Checklist

During the test, note:

| Observation | Yes / No / N/A |
|-------------|----------------|
| Child hesitated on any field? Which one? | |
| Child needed to re-read any instruction? | |
| Child asked "what do I put here?" | |
| Child tried to skip a required field? | |
| Child confused by PlanSelector (Free vs Creator vs Pro)? | |
| Welcome overlay clear? Child understood both options? | |
| GameSurvey wizard easy to tap through? | |
| Any error messages shown? Were they friendly? | |
| Rage clicks (repeated clicking on non-responsive element)? | |
| Child expressed frustration or gave up? | |

---

## Post-Test Debrief (If Child Available)

1. "What was the hardest part?"
2. "Was anything confusing?"
3. "Did you feel like you knew what to do next?"
4. "Would you want to do this again to make another game?"

---

## Reporting

| Field | Value |
|-------|-------|
| Test date | |
| Tester name | |
| Path (A or B) | |
| Child age (if real child) | |
| Total time (sec) | |
| PASS / FAIL | |
| Blockers or bugs | |
| Qualitative notes | |

---

## Quick Reference: Key URLs / Flows

- **Landing:** `/` → Sign Up / Log In
- **Plan selector:** First signup step
- **Details form:** Age, parent email (if <13), username, password, privacy
- **Consent email:** Parent clicks link → approves → child can log in
- **Studio:** After login → Welcome overlay or chat
- **GameSurvey:** "Help Me Pick!" → 6-step wizard
- **Free chat:** "I Know What I Want!" → Type or tap game starter

---

**Next step after test:** Update `LAUNCH_READINESS.md` Gate 6.2 status to PASS or FAIL with date and notes.

---

## Automated Test (Playwright)

A Playwright test covers Path A for regression:

```bash
# Prerequisites: npm run build, server running (node server/index.js), ANTHROPIC_API_KEY in .env
$env:PLAYWRIGHT_BASE_URL="http://localhost:3001"; npm run test:gate62
```

Or in CI (build runs first, Playwright starts server): `CI=true npm run test:gate62`
