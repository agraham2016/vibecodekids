# Lumi → Nova: UX Specs & Answers

**Author:** Lumi Rivers, Kid-First UX Designer  
**Date:** March 3, 2026  
**Purpose:** Answers to Nova's open questions (#5, #6, #7) + detailed component spec for the GameSurvey welcome overlay

---

## Answers to Nova's Questions

### Question #5: Passphrase Suggestions UX

> "GET /api/auth/passphrase-suggestions exists. Is it returning kid-friendly phrases? Can we surface 2-3 suggestions in the password step?"

**Answer: Yes, and yes.**

I reviewed `server/services/passphrase.js` — it generates passphrases in `adjective-noun-verb` format from curated kid-friendly word lists (e.g., "sparkly-dragon-zooms", "cosmic-unicorn-dashes"). The words are perfect: no scary/adult terms, all fun and memorable. The endpoint returns 4 suggestions by default.

**UX spec for the password step:**

1. Below the password input, add a collapsible "Need an idea?" section.
2. On first render, call `GET /api/auth/passphrase-suggestions` and display 2 suggestions (not all 4 — reduce choice paralysis).
3. Each suggestion is a tappable pill button:

```
💡 Need an idea?
[ sparkly-dragon-zooms ]  [ cosmic-unicorn-dashes ]
              [ 🔄 More ideas ]
```

4. Tapping a suggestion **fills the password field** with that passphrase and updates the strength meter.
5. "More ideas" re-fetches and replaces the 2 pills (don't accumulate — keep it simple).
6. Strength meter labels for passphrases: a 3-word passphrase always hits "Super strong!" since it meets the 8-char minimum by a wide margin.

**Implementation notes:**
- Fetch lazily (only when the password step mounts), not on modal open.
- Cache the response — don't re-fetch on every step navigation.
- If the fetch fails, simply hide the suggestion section. No error toast needed.
- Don't send passphrases to any analytics or logging — they're pre-passwords.

---

### Question #6: Screen Name Real-Time Feedback

> "Can we extract patterns from usernameFilter.js into a shared module for real-time frontend feedback without exposing the full blocklist?"

**Answer: No — Atlas rejected this approach.** Exposing the blocklist (even partially) in a client-side module lets users reverse-engineer what's filtered.

**Alternative approach (Atlas-approved):** Client-side "Firstname Lastname" format check only.

The server-side `filterUsername()` already catches everything on submit. The client-side check is purely for **immediate, friendly guidance** — not a security gate.

**UX spec:**

Add a single client-side validation function in a new file `src/lib/screenNameHelper.ts`:

```typescript
/**
 * Lightweight client-side check for obvious "real name" patterns.
 * NOT a security filter — server-side usernameFilter.js handles that.
 * This is purely for friendly, immediate UX guidance.
 */
export function looksLikeRealName(input: string): boolean {
  const trimmed = input.trim();

  // Two capitalized words separated by space/dot/dash
  // e.g., "John Smith", "John.Smith", "John-Smith"
  const twoWordName = /^[A-Z][a-z]{1,15}[\s.\-_][A-Z][a-z]{1,15}$/;
  if (twoWordName.test(trimmed)) return true;

  // CamelCase two words: "JohnSmith"
  const camelCase = /^[A-Z][a-z]{1,15}[A-Z][a-z]{1,15}$/;
  if (camelCase.test(trimmed)) return true;

  return false;
}
```

**In the signup form (AuthModal or future stepped signup):**

```
onBlur → if looksLikeRealName(value):
  Show inline warning: "That looks like a real name — pick a fun nickname instead! 🎭"
  Warning style: amber/yellow, not red (it's guidance, not an error)
  Don't block submission — server filter is the real gate
```

**Why this is safe:**
- We're only detecting a structural pattern (two capitalized words), not exposing any name database.
- False positives are fine — the message is friendly ("pick a fun nickname"), not punitive.
- The server-side `filterUsername()` in `server/middleware/usernameFilter.js` does the real blocking with its 200+ name database, PII patterns, and camelCase splitting. That stays server-only.

---

### Question #7: GameSurvey → AI Prompt Mapping

> "GameSurvey.tsx calls onComplete(config) with a GameConfig. Is there a prompt builder to map config → AI prompt, or do we need one?"

**Answer: The backend already handles `GameConfig` natively — no prompt builder needed on the frontend.**

Here's the full data path I traced:

```
GameSurvey.onComplete(config: GameConfig)
  → App builds a natural-language prompt string (NEW — see below)
  → sendMessage(prompt, undefined, code, config)
  → useChat sends POST /api/generate with { message, gameConfig }
  → generate.js passes gameConfig to generateOrIterateGame()
  → gameHandler.js passes gameConfig to handleSingleModel()
  → handleSingleModel() calls getSystemPrompt(currentCode, gameConfig, genre)
  → prompts/index.js builds personalized GAME CONFIG block in system prompt
  → AI receives: game type, dimension, theme, character, obstacles, visual style
  → Template cache uses gameConfig for cache keys (fast repeat games)
```

The backend's `getSystemPrompt()` in `server/prompts/index.js` (line 252) already constructs a rich context block from `GameConfig` fields. It also detects 3D racing, 3D shooters, and multiplayer intent from the config. The template cache (`getTemplateCacheKey`) uses `gameType|dimension|theme|visualStyle` as keys.

**What Nova needs to build on the frontend:**

**Step 1: Prompt builder function** (simple — translates config to a kid-style message)

Create `src/lib/gameConfigToPrompt.ts`:

```typescript
import type { GameConfig } from '../types';

/**
 * Convert a GameSurvey config into a natural-language prompt
 * that matches what a kid would type in free chat.
 *
 * The backend also receives the raw gameConfig for system prompt
 * injection, so this prompt just needs to feel natural — the AI
 * gets the detailed config separately.
 */
export function gameConfigToPrompt(config: GameConfig): string {
  const dimension = config.dimension === '3d' ? '3D' : '2D';
  const style = config.visualStyle === 'neon' ? 'neon glow'
    : config.visualStyle === 'retro' ? 'retro pixel'
    : config.visualStyle === 'cute' ? 'cute and colorful'
    : config.visualStyle === 'spooky' ? 'dark and spooky'
    : 'clean and simple';

  return [
    `Make me a ${dimension} ${config.gameType} game`,
    `set in a ${config.theme} world`,
    `where I play as a ${config.character}`,
    `and dodge ${config.obstacles}.`,
    `Make it look ${style}!`,
  ].join(' ');
}
```

Example output: `"Make me a 2D platformer game set in a castle world where I play as a fox and dodge ghosts. Make it look neon glow!"`

**Step 2: Wire GameSurvey → App → sendMessage**

In `App.tsx`, the `handleSendMessage` currently passes `null` for `gameConfig`:

```typescript
// CURRENT (line 106-108):
const handleSendMessage = useCallback(async (content: string, image?: string, modeOverride?: any) => {
  await sendMessage(content, image, code, null, modeOverride)
}, [sendMessage, code])
```

Add a new handler for GameSurvey completion:

```typescript
const handleGameSurveyComplete = useCallback((config: GameConfig) => {
  const prompt = gameConfigToPrompt(config);
  sendMessage(prompt, undefined, code, config);
  setShowWelcomeOverlay(false);
}, [sendMessage, code]);
```

**Step 3: No backend changes needed.** The `/api/generate` endpoint already accepts `gameConfig` in the request body, and `useChat.ts` already sends it through (line 111). The system prompt builder, template cache, and genre detection all work with it already.

---

## Component Spec: Welcome Overlay (First-Time Experience)

### Overview

A modal overlay shown to new users on their first login. Offers two paths to making their first game: the guided GameSurvey wizard or free-form chat. Dismissed permanently after first interaction.

### Component: `WelcomeOverlay.tsx`

**Location:** `src/components/WelcomeOverlay.tsx`  
**CSS:** `src/components/WelcomeOverlay.css`

### Props

```typescript
interface WelcomeOverlayProps {
  displayName: string;
  onStartGuided: () => void;   // User chose "Help me pick!"
  onStartFreeChat: () => void; // User chose "I know what I want!"
}
```

### Behavior

1. **Show condition:** Overlay appears when ALL of these are true:
   - User is authenticated
   - `localStorage.getItem('vck_welcome_seen')` is NOT set
   - User has 0 projects (truly new user)

2. **Dismiss:** Overlay is dismissed (and `localStorage.setItem('vck_welcome_seen', 'true')`) when:
   - User clicks either button ("Help me pick!" or "I know what I want!")
   - User presses Escape (dismiss = "I know what I want!")
   - User clicks the backdrop (same as Escape)

3. **Never re-shows** after being dismissed, even if user has 0 projects.

4. **Animation:**
   - Backdrop fades in (200ms)
   - Card scales up with `spring-pop` animation (the class already exists in `src/index.css`)
   - On dismiss: fade out (150ms), then remove from DOM

### Layout

```
┌────────────────────────────────────────────────┐
│                                                 │
│  (translucent backdrop — same as modal-overlay) │
│                                                 │
│   ┌──────────────────────────────────────────┐  │
│   │                                          │  │
│   │      🎮                                  │  │
│   │                                          │  │
│   │   Welcome, [displayName]!                │  │
│   │                                          │  │
│   │   Ready to make your first game?         │  │
│   │                                          │  │
│   │  ┌────────────────┐ ┌─────────────────┐  │  │
│   │  │  🧙‍♂️            │ │  💬             │  │  │
│   │  │  Help Me Pick!  │ │  I Know What    │  │  │
│   │  │                 │ │  I Want!         │  │  │
│   │  │  (guided wizard │ │                  │  │  │
│   │  │   picks your    │ │  (jump straight  │  │  │
│   │  │   game type,    │ │   to chat and    │  │  │
│   │  │   theme, &      │ │   describe your  │  │  │
│   │  │   style)        │ │   game)          │  │  │
│   │  └────────────────┘ └─────────────────┘  │  │
│   │                                          │  │
│   └──────────────────────────────────────────┘  │
│                                                 │
└────────────────────────────────────────────────┘
```

### Exact Microcopy

| Element | Text |
|---------|------|
| Heading | "Welcome, [displayName]!" |
| Subheading | "Ready to make your first game?" |
| Left button label | "Help Me Pick!" |
| Left button subtitle | "Answer a few fun questions and we'll build your dream game" |
| Left button emoji | 🧙‍♂️ |
| Right button label | "I Know What I Want!" |
| Right button subtitle | "Jump straight to chat and describe your game idea" |
| Right button emoji | 💬 |

### Styling

- Card: `.glass` class (already exists) + `max-width: 520px`
- Heading: Orbitron font, white, `font-size: 1.5rem`
- Subheading: Nunito, `--text-secondary` color, `font-size: 1rem`
- Buttons: side-by-side on desktop, stacked on mobile (< 480px)
- Each button: `.glass-light` background, `border-radius: var(--radius)` (16px), `padding: 20px`, `min-height: 120px`
- Button hover: `btn-shimmer` animation, slight scale-up (`transform: scale(1.03)`)
- Button emoji: `font-size: 2rem`, centered above text
- Minimum tap target: 44px (buttons are well above this)

### Mobile (< 480px)

- Buttons stack vertically (column layout)
- Card has `padding: 16px`, `margin: 16px`
- Heading size decreases to `1.25rem`

### Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="welcome-heading"`
- Both buttons are `<button>` elements with descriptive `aria-label` attributes
- Focus trap: first button receives focus on mount
- Escape key dismisses (same as clicking "I Know What I Want!")
- `prefers-reduced-motion`: skip `spring-pop`, use instant opacity transition

---

## Component Spec: GameSurvey Integration in App.tsx

### State Changes in App.tsx

Add to existing state:

```typescript
const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
const [showGameSurvey, setShowGameSurvey] = useState(false);
```

### Show Logic

Add to existing `useEffect` that runs when `token` changes:

```typescript
useEffect(() => {
  if (user && userProjects.length === 0 && !isLoadingProjects) {
    const seen = localStorage.getItem('vck_welcome_seen');
    if (!seen) {
      setShowWelcomeOverlay(true);
    }
  }
}, [user, userProjects, isLoadingProjects]);
```

### Handler Wiring

```typescript
// User chose "Help Me Pick!" → show GameSurvey
const handleStartGuided = useCallback(() => {
  localStorage.setItem('vck_welcome_seen', 'true');
  setShowWelcomeOverlay(false);
  setShowGameSurvey(true);
}, []);

// User chose "I Know What I Want!" → dismiss, focus chat
const handleStartFreeChat = useCallback(() => {
  localStorage.setItem('vck_welcome_seen', 'true');
  setShowWelcomeOverlay(false);
}, []);

// GameSurvey completed → build prompt, send to AI
const handleGameSurveyComplete = useCallback((config: GameConfig) => {
  const prompt = gameConfigToPrompt(config);
  sendMessage(prompt, undefined, code, config);
  setShowGameSurvey(false);
}, [sendMessage, code]);
```

### Render Location

In the authenticated layout (after Header, before `<main>`):

```tsx
{showWelcomeOverlay && (
  <WelcomeOverlay
    displayName={user.displayName}
    onStartGuided={handleStartGuided}
    onStartFreeChat={handleStartFreeChat}
  />
)}

{showGameSurvey && (
  <div className="modal-overlay" onClick={() => setShowGameSurvey(false)}>
    <div className="game-survey-modal glass" onClick={e => e.stopPropagation()}>
      <GameSurvey onComplete={handleGameSurveyComplete} />
    </div>
  </div>
)}
```

### GameSurvey Modal Styling

The `GameSurvey` component already has its own internal layout and CSS (`GameSurvey.css`). Wrap it in a modal container:

```css
.game-survey-modal {
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: var(--radius-lg);
}
```

### "Shooter" → "Space Blaster" Rename

In `GameSurvey.tsx`, update the `GAME_TYPES` array:

```typescript
// BEFORE:
{ value: 'shooter', icon: '🔫', label: 'Shooter' },

// AFTER:
{ value: 'shooter', icon: '🚀', label: 'Space Blaster' },
```

The `value` stays `'shooter'` — that's the internal type used by the backend. Only the user-facing `icon` and `label` change.

---

## Summary: What Nova Needs to Build

### This Week (approved)

| Task | Files to Touch | Effort |
|------|---------------|--------|
| Kid-friendly error messages | `AuthModal.tsx`, `ShareModal.tsx` | 1-2 hrs |
| "A grown-up checks it first" in ShareModal | `ShareModal.tsx` | 30 min |
| "Shooter" → "Space Blaster" rename | `GameSurvey.tsx` | 5 min |

### Next Week (approved)

| Task | Files to Create/Touch | Effort |
|------|----------------------|--------|
| `WelcomeOverlay.tsx` + CSS | New file | 1-2 hrs |
| `src/lib/screenNameHelper.ts` | New file | 15 min |
| `src/lib/gameConfigToPrompt.ts` | New file | 15 min |
| Wire GameSurvey in `App.tsx` | `App.tsx` (add state, handlers, render) | 1 hr |
| GameSurvey modal wrapper CSS | `App.css` or new file | 15 min |
| Passphrase suggestions in signup | `AuthModal.tsx` | 1 hr |
| Screen name blur warning | `AuthModal.tsx` | 30 min |
| Accessibility fixes (7 items) | Various components | 3-4 hrs |
| Parent dashboard brand CSS | `parent-dashboard.html` | 2-4 hrs |

---

## Design Review Checklist

When Nova finishes each task, I'll review for:

- [ ] Microcopy matches the exact text in this spec and `docs/UX_AUDIT.md`
- [ ] Error messages are kid-friendly (warm, actionable, not scary)
- [ ] Tap targets are >= 44px on mobile
- [ ] `aria-label` attributes on icon-only / emoji-only buttons
- [ ] `prefers-reduced-motion` respected for new animations
- [ ] Glass/brand styling is consistent with design system tokens
- [ ] No dark patterns introduced (guilt copy, fake urgency, etc.)

---
---

# Progressive Multi-Step Signup — Full Component Spec

**Status:** Approved for post-launch A/B test. Wireframes ready for Nova to build when Atlas gives the go.  
**A/B Context:** This will be tested against the current single-form `AuthModal` signup. The A/B variant system (`src/lib/abVariant.ts`) already supports cookie-persisted 50/50 splits with URL override (`?variant=a`).

---

## Overview

Replace the single-form signup (7 fields on one screen) with a 4-step wizard that shows one question per screen. The goal is to reduce cognitive load for ages 6–12, improve completion rate, and make the parent handoff moment explicit rather than buried in a form.

**Key constraint:** The final API call is identical — `POST /api/auth/register` with the same payload. No backend changes needed. We're only restructuring the frontend flow.

---

## Architecture Decision: New Component vs. Refactor AuthModal

**Recommendation: New component `SteppedSignup.tsx`**

Reasons:
- AuthModal handles login, signup, and forgot-password in a single component with complex conditional rendering. Adding step logic would make it unmanageable.
- A/B testing is cleaner with two separate components — swap at the render site in `App.tsx`.
- After the A/B test, the winner replaces the loser. No code to untangle.

AuthModal continues to handle login and forgot-password. Only the signup path forks.

---

## Component: `SteppedSignup.tsx`

**Location:** `src/components/SteppedSignup.tsx`  
**CSS:** `src/components/SteppedSignup.css`

### Props

```typescript
interface SteppedSignupProps {
  selectedPlan: 'free' | 'creator' | 'pro';
  onClose: () => void;
  onLogin: (user: any, token: string, loginData?: LoginData) => void;
  onSwitchToLogin: () => void;
  onChangePlan: () => void;
}
```

### State Machine

```
        ┌──────────┐
        │  step 1   │  Age
        │  "age"    │
        └────┬─────┘
             │ Next (age valid)
             ▼
        ┌──────────┐
        │  step 2   │  Screen Name
        │  "name"   │
        └────┬─────┘
             │ Next (username valid)
             ▼
        ┌──────────┐
        │  step 3   │  Password
        │ "password"│
        └────┬─────┘
             │ Next (password valid)
             ▼
      ┌──────┴───────┐
      │ age < 13?    │
      ├── yes ───────▼──────────┐
      │         ┌──────────┐    │
      │         │  step 4   │   │
      │         │ "parent"  │   │
      │         └────┬─────┘   │
      │              │ Submit   │
      │              ▼          │
      │    POST /api/auth/register
      │    (requiresParentalConsent)
      │              │
      │              ▼
      │    ┌──────────────────┐
      │    │  "consent_sent"  │
      │    │  (success screen) │
      │    └──────────────────┘
      │
      ├── no (13+, free plan) ──▼──────────┐
      │              │ Submit               │
      │              ▼                      │
      │    POST /api/auth/register          │
      │    (auto-approved)                  │
      │              │                      │
      │              ▼                      │
      │    ┌──────────────────┐            │
      │    │  "success_login" │            │
      │    │  (auto-login)    │            │
      │    └──────────────────┘            │
      │                                     │
      ├── no (13+, paid plan) ──▼──────────┘
      │              │ Submit
      │              ▼
      │    POST /api/stripe/checkout
      │    → redirect to Stripe
      └────────────────────────
```

### Internal State

```typescript
type SignupStep = 'age' | 'name' | 'password' | 'parent' | 'submitting' | 'success';

interface SteppedSignupState {
  step: SignupStep;
  age: number | null;
  isUnder13: boolean;
  screenName: string;
  screenNameSource: 'suggested' | 'custom';
  password: string;
  parentEmail: string;
  recoveryEmail: string;
  privacyAccepted: boolean;
  error: string;
  isLoading: boolean;
  successMessage: string;
  requiresConsent: boolean;
}
```

---

## Step 1: Age Picker

### Layout

```
┌──────────────────────────────────┐
│  ✕ (close)                        │
│                                    │
│  ● ○ ○ ○        (progress dots)  │
│                                    │
│     🎮 Let's Get Started!         │
│     "First, how old are you?"     │
│                                    │
│         ┌─────────┐              │
│         │   ▲     │              │
│         │  [ 8 ]  │              │
│         │   ▼     │              │
│         └─────────┘              │
│                                    │
│  "We ask to keep everyone safe    │
│   — we don't save your exact age" │
│                                    │
│  [selected plan badge + Change]   │
│                                    │
│     [ Next → ]                    │
│                                    │
│  Already have an account? Log in  │
└──────────────────────────────────┘
```

### Age Picker Component

**Do NOT use `<input type="number">`.** Mobile number inputs have tiny stepper buttons that are unusable for kids.

Build a custom picker:

```typescript
interface AgePicker {
  value: number;           // default: 8
  min: 5;
  max: 18;
  onChange: (age: number) => void;
}
```

**Rendering:**
- Large display of the current number (font-size: 3rem, Orbitron font, centered)
- Up arrow button above (▲) — 48px tap target minimum
- Down arrow button below (▼) — 48px tap target minimum
- Tap-and-hold accelerates (200ms initial delay, then 100ms repeat)
- Keyboard: up/down arrow keys work, Enter advances to next step
- `aria-label="Your age"`, `role="spinbutton"`, `aria-valuemin="5"`, `aria-valuemax="18"`, `aria-valuenow={value}`

**Validation:**
- Always valid (bounded between 5–18 by the picker)
- Under 13 → silently sets `isUnder13 = true` (affects later steps)
- No error states possible on this step

### Microcopy

| Element | Text |
|---------|------|
| Heading | "Let's Get Started!" |
| Heading emoji | 🎮 |
| Subheading | "First, how old are you?" |
| Safety hint | "We ask to keep everyone safe — we don't save your exact age" |
| Plan badge (free) | "⭐ Free Plan" |
| Plan badge (creator) | "🚀 Creator Plan" |
| Plan badge (pro) | "👑 Pro Plan" |
| Change plan link | "Change" |
| Next button | "Next →" |
| Login link | "Already have an account? Log in" |

---

## Step 2: Screen Name Picker

### Layout

```
┌──────────────────────────────────┐
│  ← Back               ✕ (close)  │
│                                    │
│  ● ● ○ ○                         │
│                                    │
│     🎭 Pick a Screen Name!       │
│     "This is what other kids see" │
│                                    │
│  ┌──────────────────────────────┐│
│  │ 🎲 CosmicFox42         [✓]  ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ 🎲 PixelDragon7        [ ]  ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ 🎲 NeonStar99          [ ]  ││
│  └──────────────────────────────┘│
│                                    │
│     [ 🔄 New suggestions ]       │
│                                    │
│  ── or type your own ──           │
│  ┌──────────────────────────────┐│
│  │ _                            ││
│  └──────────────────────────────┘│
│  ⚠️ Don't use your real name!    │
│                                    │
│     [ Next → ]                    │
└──────────────────────────────────┘
```

### Screen Name Suggestion Generator

Create `src/lib/screenNameGenerator.ts`:

```typescript
/**
 * Generate fun, kid-safe screen name suggestions.
 * Runs entirely client-side — no API call needed.
 * 
 * Format: AdjectiveNoun + 2-digit number
 * Examples: CosmicFox42, PixelDragon7, NeonStar99
 */

const ADJECTIVES = [
  'Cosmic', 'Pixel', 'Neon', 'Turbo', 'Mega', 'Super',
  'Epic', 'Blazing', 'Mystic', 'Crystal', 'Thunder',
  'Stellar', 'Hyper', 'Sonic', 'Quantum', 'Radiant',
  'Spark', 'Storm', 'Astro', 'Cyber', 'Solar', 'Lunar',
  'Rocket', 'Zippy', 'Brave', 'Swift', 'Lucky', 'Jolly',
  'Fuzzy', 'Sneaky', 'Bouncy', 'Shiny', 'Golden',
];

const NOUNS = [
  'Fox', 'Dragon', 'Star', 'Wolf', 'Phoenix', 'Panda',
  'Tiger', 'Falcon', 'Comet', 'Knight', 'Ninja', 'Wizard',
  'Shark', 'Eagle', 'Lion', 'Bear', 'Hawk', 'Otter',
  'Coder', 'Gamer', 'Builder', 'Pilot', 'Racer', 'Scout',
  'Spark', 'Bolt', 'Blaze', 'Storm', 'Wave', 'Dash',
];

export function generateScreenName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10–99
  return `${adj}${noun}${num}`;
}

export function generateScreenNameOptions(count = 3): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  while (results.length < count) {
    const name = generateScreenName();
    if (!seen.has(name)) {
      seen.add(name);
      results.push(name);
    }
  }
  return results;
}
```

**Design notes:**
- Generated names always pass the username regex (`/^[a-zA-Z0-9_]{3,20}$/`) since they're `AdjectiveNoun##` (no spaces, no special chars, 8–18 chars).
- They never trigger the real-name filter because they're fantasy compound words, not "Firstname Lastname" patterns.
- The word lists intentionally avoid anything that could be someone's actual name.

### Behavior

1. On step mount, generate 3 suggestions via `generateScreenNameOptions(3)`.
2. Suggestions render as radio-style cards. Tapping one selects it.
3. "New suggestions" button regenerates all 3.
4. "Or type your own" reveals a text input.
5. Custom input: validate on blur with `looksLikeRealName()` (from `src/lib/screenNameHelper.ts` — spec'd earlier). Show amber warning if triggered.
6. **"Next →" validation:**
   - A name must be selected or typed
   - Must match `/^[a-zA-Z0-9_]{3,20}$/`
   - If custom and `looksLikeRealName()` returns true: show amber warning but DON'T block (server filter is the real gate)
   - If empty: "Pick a screen name to continue!"

### Microcopy

| Element | Text |
|---------|------|
| Heading | "Pick a Screen Name!" |
| Heading emoji | 🎭 |
| Subheading | "This is what other kids see" |
| Refresh button | "🔄 New suggestions" |
| Custom input label | "Or type your own" |
| Real-name warning | "That looks like a real name — pick a fun nickname instead! 🎭" |
| Validation error (empty) | "Pick a screen name to continue!" |
| Validation error (format) | "Screen names can only use letters, numbers, and underscores (3–20 characters)" |
| Back button | "← Back" |

---

## Step 3: Password

### Layout

```
┌──────────────────────────────────┐
│  ← Back               ✕ (close)  │
│                                    │
│  ● ● ● ○                         │
│                                    │
│     🔒 Create a Secret Password  │
│                                    │
│  ┌──────────────────────[👁]──┐  │
│  │  ••••••••                   │  │
│  └─────────────────────────────┘  │
│                                    │
│  ████████████░░░ "Super strong!"  │
│                                    │
│  💡 Need an idea?                 │
│  ┌──────────────────────────────┐ │
│  │ sparkly-dragon-zooms    [use]│ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ cosmic-unicorn-dashes   [use]│ │
│  └──────────────────────────────┘ │
│     [ 🔄 More ideas ]            │
│                                    │
│  { if 13+: recovery email field } │
│                                    │
│     [ Next → ]  (or final submit) │
└──────────────────────────────────┘
```

### Password Strength Meter

```typescript
function getPasswordStrength(password: string): {
  level: 0 | 1 | 2 | 3;
  label: string;
  color: string;
  width: string;
} {
  const len = password.length;
  if (len === 0) return { level: 0, label: '', color: 'transparent', width: '0%' };
  if (len < 8)   return { level: 1, label: 'Too short!', color: 'var(--error)', width: '25%' };
  if (len < 12)  return { level: 2, label: 'Getting there!', color: 'var(--warning)', width: '60%' };
  return { level: 3, label: 'Super strong!', color: 'var(--success)', width: '100%' };
}
```

Three-word passphrases like "sparkly-dragon-zooms" (22 chars) always hit "Super strong!" immediately.

### Passphrase Suggestions

- Fetch `GET /api/auth/passphrase-suggestions` on step mount. Shows 2 suggestions.
- Render as tappable cards with a "use" action on the right side.
- Tapping "use" fills the password input and updates the strength meter.
- "More ideas" re-fetches and replaces the 2 cards.
- If fetch fails, hide the suggestion section entirely (no error shown).

### Recovery Email (13+ only)

If age >= 13, show an optional recovery email field below the password:

```
Recovery Email (optional)
┌──────────────────────────────────┐
│ you@example.com                   │
└──────────────────────────────────┘
"In case you forget your password. We never use it for anything else."
```

### Show/Hide Password Toggle

- 👁 button inside the input field (right-aligned)
- Toggles `type="password"` ↔ `type="text"`
- `aria-label="Show password"` / `aria-label="Hide password"`

### Behavior on "Next →"

- **Under 13:** This is NOT the final step — advances to step 4 ("parent").
- **13+, free plan:** This IS the final step. Button says "✨ Let's Go!" and submits `POST /api/auth/register`.
- **13+, paid plan:** This IS the final step. Button says "💳 Continue to Payment" and submits `POST /api/stripe/checkout`.

The privacy checkbox appears on THIS step for 13+ users (they're old enough to agree themselves):

```
☑ I agree to the Privacy Policy and Terms of Service
```

### Microcopy

| Element | Text |
|---------|------|
| Heading | "Create a Secret Password" |
| Heading emoji | 🔒 |
| Show/hide toggle | 👁 |
| Strength: too short | "Too short!" |
| Strength: medium | "Getting there!" |
| Strength: strong | "Super strong!" |
| Passphrase header | "💡 Need an idea?" |
| Passphrase "use" button | "Use this" |
| More ideas button | "🔄 More ideas" |
| Recovery email label | "Recovery Email (optional)" |
| Recovery email hint | "In case you forget your password. We never use it for anything else." |
| Privacy checkbox | "I agree to the Privacy Policy and Terms of Service" |
| Submit (13+, free) | "✨ Let's Go!" |
| Submit (13+, paid) | "💳 Continue to Payment" |
| Next (under 13) | "Next →" |
| Validation: too short | "Your password needs at least 8 characters" |
| Validation: privacy | "One more thing — check the box to agree to the rules!" |

---

## Step 4: Parent Handoff (Under 13 Only)

### Layout

```
┌──────────────────────────────────┐
│  ← Back               ✕ (close)  │
│                                    │
│  ● ● ● ●                         │
│                                    │
│  👨‍👩‍👧 Almost there!               │
│                                    │
│  "Hand the screen to your         │
│   parent or guardian"              │
│                                    │
│  ┌─── FOR PARENTS ─────────────┐ │
│  │                              │ │
│  │ Your child wants to join     │ │
│  │ Vibe Code Kids. We need     │ │
│  │ your email to send a         │ │
│  │ one-time permission link.    │ │
│  │ That's all we use it for.    │ │
│  │                              │ │
│  │ ┌────────────────────────┐  │ │
│  │ │ parent@email.com       │  │ │
│  │ └────────────────────────┘  │ │
│  │                              │ │
│  │ ☑ I agree to the Privacy    │ │
│  │   Policy and Terms of       │ │
│  │   Service                    │ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                                    │
│  [ Create Account ✨ ]            │
│  (or 💳 Continue to Payment      │
│   for paid plans)                  │
└──────────────────────────────────┘
```

### The "FOR PARENTS" Card

This is a visually distinct card within the step. The purpose is to make it obvious that the device has been handed off.

**Styling:**
- Background: `rgba(255, 255, 255, 0.15)` (slightly brighter than the modal glass)
- Border: `1px solid rgba(255, 255, 255, 0.25)` (more visible than usual)
- Border-radius: `var(--radius)` (16px)
- Padding: 20px
- Font style shifts: Nunito stays, but text color becomes slightly warmer/brighter. The "FOR PARENTS" label uses small caps, `letter-spacing: 2px`, `color: var(--accent)` (green, signaling trust).

### Behavior

- Parent email is required. Must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Privacy checkbox is required.
- On submit:
  - **Free plan:** `POST /api/auth/register` with full payload (age as number, server converts to bracket)
  - **Paid plan:** `POST /api/stripe/checkout` with full payload → redirect to Stripe

### Microcopy

| Element | Text |
|---------|------|
| Heading | "Almost there!" |
| Heading emoji | 👨‍👩‍👧 |
| Handoff instruction | "Hand the screen to your parent or guardian" |
| Parent card label | "FOR PARENTS" |
| Parent card body | "Your child wants to join Vibe Code Kids. We need your email to send a one-time permission link. That's all we use it for." |
| Email placeholder | "your.parent@email.com" |
| Privacy checkbox | "I agree to the Privacy Policy and Terms of Service" |
| Submit (free) | "Create Account ✨" |
| Submit (paid) | "💳 Continue to Payment" |
| Validation: email empty | "We need a parent's email to keep your child safe" |
| Validation: email invalid | "That doesn't look like an email address — double check?" |
| Validation: privacy | "Please agree to the Privacy Policy to continue" |

---

## Success Screens

### Under 13 (consent pending)

```
┌──────────────────────────────────┐
│                                    │
│         🎉 (animated)            │
│                                    │
│     Almost there!                 │
│                                    │
│  "Ask your parent to check their  │
│   email and tap 'Approve.'        │
│   Then you can log in!"           │
│                                    │
│     [ Got it! ]                   │
│                                    │
└──────────────────────────────────┘
```

- Confetti/sparkle animation plays using existing `.spring-pop` + new CSS keyframe
- "Got it!" closes the modal and switches to login mode
- Auto-redirects to login mode after 8 seconds (matches current AuthModal behavior)

### 13+ Free (auto-approved)

```
┌──────────────────────────────────┐
│                                    │
│         🎉 (animated)            │
│                                    │
│     Welcome to Vibe Code Kids!    │
│                                    │
│  "Your account is ready.          │
│   Let's make something awesome!"  │
│                                    │
│     (auto-logging in...)          │
│                                    │
└──────────────────────────────────┘
```

- Calls `POST /api/auth/login` automatically with the username/password just created
- On success, calls `onLogin(user, token, loginData)` and closes
- If auto-login fails, falls back to showing "Log in to get started!" with a button

### 13+ Paid

No success screen — user is redirected to Stripe Checkout (`window.location.href = data.checkoutUrl`). Same as current AuthModal behavior.

---

## API Payload Construction

The stepped signup collects data across 3-4 screens but submits it in a single API call. Here's the exact payload mapping:

### Free Plan: `POST /api/auth/register`

```typescript
{
  username: screenName.toLowerCase(),    // from step 2
  password: password,                     // from step 3
  displayName: screenName,                // same as screen name (display-safe casing)
  age: age,                               // from step 1 (number, server converts to bracket)
  parentEmail: isUnder13 ? parentEmail : undefined,  // from step 4
  recoveryEmail: !isUnder13 && recoveryEmail ? recoveryEmail : undefined,  // from step 3
  privacyAccepted: true,                  // from step 3 (13+) or step 4 (under 13)
}
```

**Note on displayName:** In the current single-form flow, `displayName` is a separate field from `username`. In the stepped flow, we use the screen name for both. This eliminates one field and reduces confusion — the screen name IS their display name. If Atlas later wants separate display names, we can add it back.

### Paid Plan: `POST /api/stripe/checkout`

```typescript
{
  tier: selectedPlan,                     // 'creator' or 'pro'
  username: screenName.toLowerCase(),
  password: password,
  displayName: screenName,
  age: age,
  parentEmail: isUnder13 ? parentEmail : undefined,
  recoveryEmail: !isUnder13 && recoveryEmail ? recoveryEmail : undefined,
  privacyAccepted: true,
}
```

---

## A/B Test Integration

### How it Works

The existing A/B system in `src/lib/abVariant.ts` uses a cookie (`vck_variant`) for persistent assignment. Currently it splits between landing page A and B. We'll add a separate variant for signup flow.

**New variant cookie:** `vck_signup_variant` (separate from landing page A/B)

Add to `src/lib/abVariant.ts`:

```typescript
const SIGNUP_COOKIE = 'vck_signup_variant';

export type SignupVariant = 'single' | 'stepped';

export function getSignupVariant(): SignupVariant {
  const params = new URLSearchParams(window.location.search);
  const urlVariant = params.get('signup');
  if (urlVariant === 'single' || urlVariant === 'stepped') {
    setCookie(SIGNUP_COOKIE, urlVariant, COOKIE_DAYS);
    return urlVariant;
  }

  const saved = getCookie(SIGNUP_COOKIE);
  if (saved === 'single' || saved === 'stepped') return saved;

  const assigned: SignupVariant = Math.random() < 0.5 ? 'single' : 'stepped';
  setCookie(SIGNUP_COOKIE, assigned, COOKIE_DAYS);
  return assigned;
}
```

### Render in App.tsx

```tsx
// When signup is triggered:
const signupVariant = getSignupVariant();

{showAuthModal && authMode === 'signup' && signupVariant === 'stepped' ? (
  <SteppedSignup
    selectedPlan={selectedPlan}
    onClose={() => setShowAuthModal(false)}
    onLogin={handleLogin}
    onSwitchToLogin={() => { setAuthMode('login'); /* keep AuthModal open */ }}
    onChangePlan={() => { /* show PlanSelector */ }}
  />
) : showAuthModal ? (
  <AuthModal
    onClose={() => setShowAuthModal(false)}
    onLogin={handleLogin}
    initialMode={authMode}
  />
) : null}
```

### Metrics to Track

For the A/B test, emit events at each step boundary. Add to `src/lib/api.ts` or a new analytics helper:

```typescript
function trackSignupEvent(event: string, variant: SignupVariant, step?: string) {
  // POST /api/demo/event (existing endpoint) or however Atlas decides to track
  fetch('/api/demo/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: `signup_${event}`,
      variant,
      step,
      timestamp: Date.now(),
    }),
  }).catch(() => {}); // fire-and-forget
}
```

Events to emit:

| Event | When | Variant |
|-------|------|---------|
| `signup_started` | Signup modal/flow opens | both |
| `signup_step_age` | Step 1 completed | stepped only |
| `signup_step_name` | Step 2 completed | stepped only |
| `signup_step_password` | Step 3 completed | stepped only |
| `signup_step_parent` | Step 4 completed | stepped only |
| `signup_completed` | Account created (API success) | both |
| `signup_abandoned` | Modal closed before completion | both |
| `signup_error` | API returned error | both |

**Primary metric:** `signup_completed / signup_started` (completion rate)  
**Secondary:** Step-level drop-off funnel (stepped variant only)

---

## Transition Animations

### Step Transitions

When advancing to the next step:
1. Current step slides left + fades out (200ms, `ease-out`)
2. Next step slides in from right + fades in (250ms, `ease-out`)

When going back:
1. Current step slides right + fades out (200ms, `ease-out`)
2. Previous step slides in from left + fades in (250ms, `ease-out`)

```css
.step-enter-forward {
  animation: slideInFromRight 250ms ease-out;
}
.step-exit-forward {
  animation: slideOutToLeft 200ms ease-out;
}
.step-enter-back {
  animation: slideInFromLeft 250ms ease-out;
}
.step-exit-back {
  animation: slideOutToRight 200ms ease-out;
}

@keyframes slideInFromRight {
  from { transform: translateX(40px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutToLeft {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(-40px); opacity: 0; }
}
/* ... mirror for back direction */
```

**`prefers-reduced-motion`:** Replace all slide animations with instant opacity fade (100ms).

### Progress Dots

```css
.progress-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;
}
.progress-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: background 300ms, transform 300ms;
}
.progress-dot.active {
  background: var(--primary-light);
  transform: scale(1.2);
}
.progress-dot.completed {
  background: var(--success);
}
```

Total dots: 4 for under-13, 3 for 13+ (step 4 is hidden from progress).

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Dialog semantics | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="signup-heading"` |
| Focus management | On each step transition, focus moves to the step heading (or first input) |
| Escape closes | Same as current AuthModal |
| Back button | `aria-label="Go back to previous step"` |
| Progress dots | `role="list"` with `role="listitem"` children; `aria-label="Step {n} of {total}: {stepName}"` |
| Age picker | `role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Suggestion cards | `role="radio"` within `role="radiogroup"` with `aria-label="Screen name suggestions"` |
| Password toggle | `aria-label="Show password"` / `aria-label="Hide password"` |
| Error messages | `role="alert"` on error divs, `aria-describedby` linking error to relevant input |
| Step announcements | `aria-live="polite"` region announces step changes to screen readers |
| Min tap targets | All buttons and interactive elements >= 44px |

---

## Mobile Layout (< 480px)

- Modal: `width: 100%; max-height: 100vh; border-radius: 0;` (full-screen sheet)
- Age picker: arrows become larger (56px tap targets)
- Screen name suggestions: full-width cards, stacked
- Passphrase suggestions: full-width cards, stacked
- Progress dots: smaller (8px) to fit narrow screens
- "FOR PARENTS" card: full-width, reduced padding (16px)

---

## File Summary

| File | Status | Purpose |
|------|--------|---------|
| `src/components/SteppedSignup.tsx` | New | 4-step signup wizard component |
| `src/components/SteppedSignup.css` | New | Styling for all steps, animations, progress dots |
| `src/lib/screenNameGenerator.ts` | New | Client-side AdjectiveNoun## name generator |
| `src/lib/abVariant.ts` | Edit | Add `getSignupVariant()` function |
| `src/App.tsx` | Edit | A/B branch between AuthModal and SteppedSignup |

No backend changes. No new API endpoints. No new dependencies.
