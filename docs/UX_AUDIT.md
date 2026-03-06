# Vibe Code Kids — Kid-First UX Audit & Recommendations

**Author:** Lumi Rivers, Kid-First UX Designer  
**Date:** March 2, 2026  
**Status:** Reviewed by Atlas (March 2, 2026) — priorities implemented in sprint

---

## 1) User Goals + Key Pain Points

### Child User Goals (ages 6–12)

- **Make something cool** — "I want to build a game and show my friends"
- **Feel creative** — "I want to pick what my game looks like"
- **Play immediately** — "I don't want to wait or fill out forms"
- **Share safely** — "I want people to play my game but not know who I am"
- **Come back and keep building** — "I want to find my old projects and make them better"

### Parent User Goals

- **Trust the platform** — "I need to know my kid's data is safe"
- **Control without hovering** — "Let me set boundaries, then step back"
- **Understand what my kid is doing** — "Show me progress, not just screen time"
- **Easy consent** — "Don't make COPPA compliance my homework"

### Key Pain Points (Current State)

| # | Pain Point | Severity | Where |
|---|-----------|----------|-------|
| P1 | **Signup is a wall of fields.** 6+ inputs on one screen. Kids under 13 see 7 fields + plan selector. A 7-year-old can't complete this alone. | Critical | `AuthModal.tsx` |
| P2 | **GameSurvey exists but isn't used.** The guided "what game do you want to make?" wizard (`GameSurvey.tsx`) is fully built — chat-style, emoji buttons, text-to-speech — but never appears in the actual app flow. Kids land on a blank chat instead. | High | `App.tsx` (not imported) |
| P3 | **No first-game guidance.** After login, kids see a 3-panel IDE with no tutorial, tooltip, or guided path. The game starters in ChatPanel help but are easy to miss on mobile. | High | `App.tsx`, `ChatPanel.tsx` |
| P4 | **Username creation is unsupported.** Hint says "3-20 characters, letters, numbers & underscores" — that's developer language. No fun suggestions, no "try this" buttons, no real-name warnings. | Medium | `AuthModal.tsx` line 383 |
| P5 | **Publishing lacks visible safety net.** ShareModal defaults `isPublic` to false (good), but never explains moderation, never says "a grown-up checks it first." Kids may worry or not understand what "Add to Arcade" means. | Medium | `ShareModal.tsx` |
| P6 | **Parent dashboard feels disconnected.** Vanilla HTML, no brand colors, no Nunito/Orbitron fonts, no glass panels. Looks like a separate product. | Medium | `parent-dashboard.html` |
| P7 | **Error messages are adult-phrased.** "Could not create account," "Server error — please try again later" — not recoverable or friendly for a child. | Medium | `AuthModal.tsx` |
| P8 | **No celebration/delight moments.** No confetti on first game, no badge on first publish, no "welcome!" animation after signup. | Low-Med | Everywhere |
| P9 | **Code editor toggle confuses younger kids.** "Preview" vs "Code" tabs with emoji but no explanation of what the code view is for. | Low | `App.tsx` line 283–296 |
| P10 | **Mobile panel juggling is heavy.** Chat, Game, Projects are 3 tabs — but a kid's workflow is always Chat→Game→Chat→Game. Two taps per iteration cycle. | Low | `App.tsx` mobile tab bar |

---

## 2) Primary User Flows (Step-by-Step)

### Flow A: Child Onboarding (Recommended Redesign)

**Current:** Plan → 7 fields → Submit → Wait for parent email → Login  
**Proposed:** 4 progressive micro-steps with defaults and delight

```
Step 1: "How old are you?"
  → Big number picker (not a text input), tap-friendly
  → Under 13 triggers parent-email path silently

Step 2: "Pick a screen name!"
  → 3 random fun suggestions (e.g., "CosmicFox42", "PixelDragon7", "NeonStar99")
  → "Or make your own" text field
  → Real-name warning: "Don't use your real name — pick something fun!"
  → Server-side username filter already handles PII

Step 3: "Create a secret password"
  → Big input, show/hide toggle, strength meter with kid labels
    ("Too short" → "Getting there" → "Super strong!")
  → Passphrase suggestion button: "Need an idea? Try: purple-rocket-dance"
    (API already exists: GET /api/auth/passphrase-suggestions)

Step 4 (under 13 only): "Ask a parent to type their email"
  → Clear language: "Hand the screen to your parent or guardian"
  → Parent sees: "We need your permission (COPPA). We'll email you
    one link — that's it."
  → Privacy checkbox appears HERE (parent is holding the device)

→ Success: Animated celebration screen
  → Under 13: "Your parent will get an email. Once they say OK, you can log in!"
  → 13+: Auto-login, straight to first-game flow
```

### Flow B: First Game (New User)

**Current:** Blank chat panel with game starters at bottom  
**Proposed:** GameSurvey wizard as first-time flow

```
Step 1: Welcome screen
  → "Ready to make your first game?" with mascot character
  → Two paths: "Help me pick!" (GameSurvey) or "I know what I want!" (free chat)

Step 2a (Guided — GameSurvey):
  → Already built! Chat-style wizard with emoji buttons
  → Game type → 2D/3D → Theme → Character → Obstacles → Style
  → Each step has text-to-speech (already implemented)
  → Ends with: "Building your [theme] [type] game..."
  → AI generates, preview appears with confetti

Step 2b (Free — Chat):
  → Chat panel with game starters prominently shown
  → Placeholder text: "Tell me what game you want to make!"

Step 3: First game appears
  → Preview auto-focuses (not code view)
  → Tooltip: "Like it? Try saying 'make the player faster' or 'add power-ups'"
  → Save prompt after 60 seconds: "Want to save this? Give it a name!"
```

### Flow C: Save & Publish to Arcade

**Current:** ShareModal with title, creator name, category, checkboxes  
**Proposed:** Safer defaults, clearer language, moderation transparency

```
Step 1: "Share Your Game!"
  → Title field (already exists, good)
  → Creator name pre-filled from display name
  → Category picker with emoji grid (already exists, good)

Step 2: Visibility choice (restructured)
  → Default: "Just for me" (private link)
  → Option: "Add to the Arcade" with explanation:
    "Other kids can find and play your game!
     A grown-up checks it first to make sure it's safe."
  → Under-13 without publishing enabled: option is hidden entirely
    (age-gate already handles this server-side)

Step 3: Success
  → Link to copy/share
  → If public: "Your game is being checked — it'll show up in the
    Arcade soon!" (sets expectation for moderation delay)
  → Confetti animation
```

### Flow D: Parent Dashboard

**Current:** Magic link → vanilla HTML dashboard  
**Proposed:** Same auth flow, polished UI, trust-first design

```
Step 1: Magic link request (unchanged — works well)
Step 2: Dashboard loads with brand styling
  → Header: Vibe Code Kids logo + "Parent Dashboard"
  → Trust banner: "COPPA compliant · Data encrypted · You're in control"

Step 3: Child cards (enhanced)
  → Each child: avatar + screen name (never real name)
  → Activity summary: "Made 5 games · Last active today"
  → Quick toggles: Public sharing ON/OFF, Multiplayer ON/OFF
  → "View Activity" → project list with thumbnails
  → "Export Data" and "Delete All Data" in a "Privacy" section
    (not alongside casual actions)
```

---

## 3) Wireframe Descriptions (Screen-by-Screen)

### Screen 1: Age Picker (Onboarding Step 1)

```
┌──────────────────────────────────┐
│  ✕ (close)                        │
│                                    │
│     🎮 Let's Get Started!         │
│     "First, how old are you?"     │
│                                    │
│     ┌─────────────────────┐       │
│     │      [ 8 ]          │       │
│     │   ▲ (increment)     │       │
│     │   ▼ (decrement)     │       │
│     └─────────────────────┘       │
│                                    │
│     "We ask to keep everyone      │
│      safe — we don't store        │
│      your exact age"              │
│                                    │
│     [ Next → ]                    │
│                                    │
└──────────────────────────────────┘
```

Single field. Progress dots (● ○ ○ ○) at top. Minimum tap target 48px.

### Screen 2: Screen Name Picker (Onboarding Step 2)

```
┌──────────────────────────────────┐
│  ← Back               ✕ (close)  │
│  ● ● ○ ○                         │
│                                    │
│     🎭 Pick a Screen Name!       │
│     "This is what other kids see" │
│                                    │
│  [ CosmicFox42  ]  ← tap to pick │
│  [ PixelDragon7 ]  ← tap to pick │
│  [ NeonStar99   ]  ← tap to pick │
│                                    │
│  ── or make your own ──           │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  └──────────────────────────┘    │
│  ⚠️ "Don't use your real name!"  │
│                                    │
│     [ Next → ]                    │
└──────────────────────────────────┘
```

Suggestions generated client-side (adjective + noun + number). Real-name warning is persistent. Username filter validates on blur.

### Screen 3: Password (Onboarding Step 3)

```
┌──────────────────────────────────┐
│  ← Back               ✕ (close)  │
│  ● ● ● ○                         │
│                                    │
│     🔒 Create a Secret Password  │
│                                    │
│  ┌──────────────────────[👁]─┐   │
│  │  ••••••••                  │   │
│  └────────────────────────────┘   │
│  ████████░░░░ "Getting there!"    │
│                                    │
│  💡 "Need an idea?"              │
│  [ purple-rocket-dance ]  ← tap  │
│  [ sunny-castle-brave  ]  ← tap  │
│                                    │
│     [ Next → ]                    │
└──────────────────────────────────┘
```

Passphrase suggestions from existing `/api/auth/passphrase-suggestions` endpoint. Strength meter uses fun labels.

### Screen 4: Parent Handoff (Under 13 Only)

```
┌──────────────────────────────────┐
│  ← Back               ✕ (close)  │
│  ● ● ● ●                         │
│                                    │
│  👨‍👩‍👧 "Hand the screen to       │
│      your parent or guardian"     │
│                                    │
│  ── FOR PARENTS ──                │
│  "Your child wants to join Vibe  │
│   Code Kids. We need your email  │
│   to send a one-time permission  │
│   link. That's all we use it for."│
│                                    │
│  ┌────────────────────────────┐  │
│  │ parent@email.com           │  │
│  └────────────────────────────┘  │
│                                    │
│  ☑ I agree to the Privacy Policy │
│    and Terms of Service           │
│                                    │
│     [ Create Account ✨ ]        │
└──────────────────────────────────┘
```

Tone shifts to adult language. Privacy checkbox is here because the parent is holding the device.

### Screen 5: Studio — First-Time Welcome Overlay

```
┌──────────────────────────────────────────────┐
│ [Header: Logo · Gallery · User Badge]         │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │         🎮 Welcome, CosmicFox42!       │ │
│  │                                         │ │
│  │     Ready to make your first game?      │ │
│  │                                         │ │
│  │  [ 🧙 Help Me Pick! ]   [ 💬 I Know   │ │
│  │    (guided wizard)        What I Want! ]│ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  (Studio panels dimmed behind overlay)        │
└──────────────────────────────────────────────┘
```

### Screen 6: Share Modal (Redesigned)

```
┌──────────────────────────────────┐
│  ✕                                │
│  🎉 Share Your Game!             │
│                                    │
│  Name: [My Space Adventure    ]   │
│                                    │
│  Category: [emoji grid — exists]  │
│                                    │
│  Who can play?                    │
│  ○ Just me (private link) ← default │
│  ○ Everyone! (Arcade)             │
│    "A grown-up checks it first    │
│     to keep the Arcade safe"      │
│                                    │
│     [ 🚀 Share It! ]             │
└──────────────────────────────────┘
```

Radio buttons instead of checkbox. "Just me" is default and first. Moderation explained proactively.

---

## 4) Microcopy (Exact Text)

### Onboarding

| Element | Current | Proposed |
|---------|---------|----------|
| Age field label | "How old are you?" | "How old are you?" (keep) |
| Age hint | "We ask to keep everyone safe online" | "We ask to keep everyone safe — we don't save your exact age" |
| Parent email label | "Parent/Guardian Email" | "Your parent or guardian's email" |
| Parent email hint | "We need a parent's permission for users under 13. We'll send them an approval email — that's the only time we use it." | "We'll send one email to ask their permission. That's the only time we use it." |
| Username label | "Username" | "Pick a Screen Name!" |
| Username hint | "3-20 characters, letters, numbers & underscores" | "Don't use your real name — pick something fun!" |
| Password hint | "At least 8 characters" | "At least 8 characters — or try a fun passphrase!" |
| Privacy checkbox | "I agree to the Privacy Policy and Terms of Service" | Same (legally required) |
| Submit (signup) | "✨ Create Free Account" | "✨ Let's Go!" |
| COPPA success | "Your parent/guardian will receive an email to approve your account. Once they approve, you can log in!" | "Almost there! Ask your parent to check their email and tap 'Approve.' Then you can log in!" |

### Studio

| Element | Current | Proposed |
|---------|---------|----------|
| Chat placeholder | (varies) | "What game do you want to make? Try: 'Make me a space racing game!'" |
| First-time welcome | (none) | "Welcome, [name]! Ready to make your first game?" |
| Code tab | "👨‍💻 Code" | "🔧 Peek at the Code" |
| Preview tab | "👁️ Preview" | "🎮 Play Your Game" |
| Auto-save toast | (none) | "Saved!" (brief, non-blocking) |
| Empty project | (blank preview) | "Your game will appear here! Tell the AI what to make." |

### Share / Publish

| Element | Current | Proposed |
|---------|---------|----------|
| Share header | "🎉 Share Your Creation!" | "🎉 Share Your Game!" |
| Public checkbox | "⭐ Add to the Arcade so others can play too!" | (Radio) "Everyone! Add to the Arcade" |
| Public hint | "When you add to the Arcade, other kids can find and play your creation!" | "Other kids can find and play your game. A grown-up checks it first to keep things safe." |
| Creator name hint | "Don't use your real name — pick something fun!" | Same (excellent, keep) |
| Title empty error | "Give your creation a name!" | "Your game needs a name! What should we call it?" |
| Success (public) | "⭐ Your creation is now in Vibe Code Arcade!" | "Your game is being checked — it'll show up in the Arcade soon!" |

### Error Messages (Kid-Friendly Rewrites)

| Current | Proposed |
|---------|----------|
| "Could not create account" | "Oops! Something went wrong. Try again?" |
| "Server error — please try again later" | "Our robots are taking a break. Try again in a minute!" |
| "Please enter a valid age" | "Hmm, that age doesn't look right. Try again?" |
| "A parent or guardian email is required for users under 13" | "We need a parent's email to keep you safe. Ask a grown-up to type theirs!" |
| "You must accept the privacy policy to create an account" | "One more thing — check the box to agree to the rules!" |
| "Could not connect to server. Try again!" | "Hmm, can't reach our servers. Check your internet and try again!" |

### Parent Dashboard

| Element | Current | Proposed |
|---------|---------|----------|
| Header | "Parent Dashboard" | "Vibe Code Kids — Parent Dashboard" |
| Subtitle | "Manage your child's account" | "See what your child is creating. You're in control." |
| Trust badge | "🔒 COPPA compliant. Your child's data is protected." | "COPPA compliant · Data encrypted · No ads · You're in control" |
| Delete button | "Delete All Data" | "Delete Account & All Data" |
| Delete confirmation | (basic `confirm()`) | "This will permanently delete your child's account and all their projects. This can't be undone. Are you sure?" |

---

## 5) Safety UX: What Prevents Mistakes & Abuse

### Already Strong (Keep)

- `isPublic` defaults to `false` in ShareModal
- Content filter + PII scanner on both input and output
- Pre-publish scan blocks dangerous patterns (fetch, localStorage, external resources)
- Age-gate middleware blocks publishing/multiplayer for under-13 without consent
- Username filter blocks real-name patterns
- Report flow with admin moderation queue

### Recommended Additions

| Safety Gap | Recommendation | Effort |
|-----------|----------------|--------|
| **Username creation has no real-time guidance** | Add client-side check on blur: "That looks like a real name — try a fun nickname instead!" using patterns from `usernameFilter.js` | Low |
| **No visible moderation promise** | Add "A grown-up checks every public game" text to ShareModal and Gallery | Low |
| **Publishing toggle explanation missing** | In parent dashboard, add tooltip: "When OFF, your child can save games but not add them to the public Arcade" | Low |
| **Delete confirmation is `window.confirm()`** | Replace with a modal that requires typing "DELETE" — irreversible action needs friction | Medium |
| **No "report" education for kids** | Add a small "See something wrong?" link on Gallery cards and Play page — exists in play.html but not prominent | Low |
| **Chat PII warning is invisible** | When the PII scanner strips content, add a gentle toast: "We removed some personal info to keep you safe!" | Medium |
| **No session timeout warning** | Parent dashboard sessions should warn before expiry, not silently fail | Low |
| **GameSurvey "shooter" option** | Rename "🔫 Shooter" to "🚀 Space Blaster" (ChatPanel starters already use this softer label) | Low |

---

## 6) Accessibility Notes

### Already Implemented (Good)

- `role="dialog"` and `aria-modal="true"` on modals
- `aria-label` on close buttons
- Escape key closes modals
- `prefers-reduced-motion` CSS media query
- Skip navigation link
- Screen-reader utility classes
- `:focus-visible` styling
- Self-hosted fonts (no Google Fonts latency)
- Text-to-speech in GameSurvey

### Gaps to Address

| Issue | Fix | WCAG |
|-------|-----|------|
| **Number input for age** — `type="number"` is problematic on mobile | Use a custom picker with large +/- buttons, or a dropdown for ages 5–18 | 2.5.5 Target Size |
| **Emoji-only buttons** — Some screen readers announce emoji oddly | Add `aria-label` to each game starter button | 1.1.1 Non-text Content |
| **Color contrast on hints** — `.input-hint` uses `rgba(255,255,255,0.7)` — may fail 4.5:1 | Increase to `rgba(255,255,255,0.85)` | 1.4.3 Contrast |
| **Tab order in mobile** — Bottom tab bar lacks `aria-current` | Add `aria-current="page"` to active mobile tab | 4.1.2 Name, Role, Value |
| **Touch targets** — Some category buttons in ShareModal may be < 44px on small screens | Ensure `min-height: 44px; min-width: 44px` on `.category-btn` | 2.5.8 Target Size |
| **Form errors not linked to fields** — Error div not associated via `aria-describedby` | Add `aria-describedby` on the first invalid field pointing to the error div | 3.3.1 Error Identification |
| **Read-aloud in Studio** — GameSurvey has TTS, but main ChatPanel does not | Add a 🔊 button to AI response messages in ChatPanel | Enhancement |

---

## 7) Success Metrics

### Primary (North Star)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Time to first game** | < 5 minutes from signup | Timestamp: account_created → first `POST /api/generate` |
| **Signup completion rate** | > 70% (visitors who click "Sign Up" → account created) | Funnel: signup_modal_opened → register_success |
| **First-session retention** | > 60% make 2+ games in first session | Count `POST /api/generate` per session for new users |

### Secondary

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Parental consent grant rate** | > 50% of consent emails → approved | consent_email_sent → consent_granted |
| **Publish rate** | > 25% of users publish at least 1 game | Users with ≥1 `isPublic: true` project / total |
| **Parent dashboard engagement** | > 40% of parents visit dashboard in first week | `request-access` events within 7 days of consent |
| **Rage clicks** | < 2% of sessions with 3+ rapid clicks on same element | Client-side dead-click detection |
| **Error recovery rate** | > 80% of users who see an error complete the action | Error shown → subsequent success within 60s |
| **Guided wizard usage** | > 50% of first-time users choose GameSurvey path | Track button clicks |
| **Accessibility** | 0 critical WCAG 2.1 AA violations | Automated axe-core scan on deploy |

---

## 8) Open Questions for Team

### For Atlas (Vision Lead)

1. **GameSurvey integration priority?** The guided wizard is fully built but disconnected. Wiring it in is a ~2-hour task. Should we prioritize this for launch or post-launch?
2. **First-time experience scope?** Full welcome tour = 1-2 days. Simple overlay with two buttons = 2 hours. Which fits the sprint?
3. **"Shooter" naming in kid context?** GameSurvey uses "🔫 Shooter" while ChatPanel uses "🚀 Space Blaster." Standardize on softer label?
4. **Parent dashboard redesign scope?** Full React rebuild is heavy. CSS-only brand alignment (fonts, colors, glass) is ~half a day. Which for launch?

### For Nova (Developer)

5. **Passphrase suggestions endpoint** — `GET /api/auth/passphrase-suggestions` exists. Is it returning kid-friendly phrases? Can we surface 2-3 suggestions in the password step?
6. **Client-side username filter** — Can we extract patterns from `usernameFilter.js` into a shared module for real-time frontend feedback without exposing the full blocklist?
7. **GameSurvey wiring** — `GameSurvey.tsx` calls `onComplete(config)` with a `GameConfig`. Is there a prompt builder to map config → AI prompt, or do we need one?

### For Compliance

8. **Privacy policy language level** — Is `/privacy` written at a parent-friendly reading level? Should we add a plain English summary at the top?
9. **Consent email tone** — Has anyone reviewed the consent email copy for warmth and clarity?

### For Future Sprints

10. **Achievement system?** Badges for "First Game," "Published Creator," "5 Games Made" would drive retention.
11. **Parent-child shared moments?** Weekly email: "Your child made 3 new games this week! Here's their latest."

---

## Top 5 Changes by Impact

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | **Wire in GameSurvey as first-time flow** — already built, just not connected | 2-4 hrs | Dramatically reduces time-to-first-game |
| 2 | **Break signup into progressive steps** — age → name → password → parent | 4-6 hrs | Reduces signup abandonment |
| 3 | **Add moderation language to ShareModal** — "A grown-up checks it first" | 30 min | Builds parent trust, sets kid expectations |
| 4 | **Kid-friendly error messages** — rewrite all error strings | 1-2 hrs | Reduces frustration, improves recovery rate |
| 5 | **Parent dashboard brand alignment** — fonts, colors, trust banner | 2-4 hrs | Closes visual gap between kid & parent UX |

All fit within the current sprint. No new backend work required — APIs, safety middleware, and component foundations are solid. The UX layer needs to catch up to the engineering.
