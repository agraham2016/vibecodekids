# Game Template Development Roadmap & Process

**Owner:** Mason Byte (Game Template Factory)  
**Last updated:** March 2026  
**Status:** Draft — awaiting Atlas approval

---

## PART 1: EXISTING TEMPLATES (DO NOT DUPLICATE)

These 18 templates already exist in `server/templates/`:

| # | Template | File | Genres Mapped |
|---|----------|------|---------------|
| 1 | Platformer | platformer.html | platformer |
| 2 | Shooter (Space Blaster) | shooter.html | shooter |
| 3 | Racing | racing.html | racing, street-racing, driving |
| 4 | Frogger (Road Crosser) | frogger.html | frogger |
| 5 | Puzzle (Match-3) | puzzle.html | puzzle, card |
| 6 | Clicker | clicker.html | clicker |
| 7 | RPG | rpg.html | rpg |
| 8 | Endless Runner | endless-runner.html | endless-runner |
| 9 | Tower Defense | tower-defense.html | tower-defense |
| 10 | Fighting | fighting.html | fighting |
| 11 | Snake | snake.html | snake |
| 12 | Sports | sports.html | sports |
| 13 | Brick Breaker | brick-breaker.html | brick-breaker |
| 14 | Flappy Bird | flappy.html | flappy |
| 15 | Bubble Shooter | bubble-shooter.html | bubble-shooter |
| 16 | Falling Blocks (Tetris) | falling-blocks.html | falling-blocks |
| 17 | Rhythm | rhythm.html | rhythm |
| 18 | Pet Sim | pet-sim.html | pet-sim, simulation |

---

## PART 2: PROPOSED NEW TEMPLATES (PRIORITIZED)

Ranked by: (1) Template hit-rate improvement, (2) API-call reduction, (3) Kid fun/replayability, (4) Development complexity (lower = faster to build).

### Tier 1 — High Impact, Lower Complexity (Build First)

| Rank | Template | Dimension | Genres to Add | Why | Est. Effort |
|------|----------|----------|---------------|-----|-------------|
| 1 | **Pong** | 2D | pong, ping-pong, paddle | Kids frequently ask for "pong", "ping pong", "bounce ball". Zero coverage today. Classic, timeless. | 1–2 days |
| 2 | **Catch/Dodge** | 2D | catch, dodge, catch-game | "Catch falling stars", "catch fruit", "dodge rocks" — common prompts. Falling-blocks is Tetris; this is different (player moves L/R, catches/dodges). | 1–2 days |
| 3 | **Whack-a-Mole** | 2D | whack-a-mole, reaction | "Whack a mole", "hit targets", "reaction game". Tap-based, touch-friendly. Easy reskin. | 1 day |

### Tier 2 — Medium Impact, Medium Complexity

| Rank | Template | Dimension | Genres to Add | Why | Est. Effort |
|------|----------|----------|---------------|-----|-------------|
| 4 | **Memory (Card Flip)** | 2D | memory-card | "Memory game", "flip cards" — distinct from match-3. Match pairs by flipping two at a time. | 1–2 days |
| 5 | **Maze/Collect** | 2D | maze, pac-man, collect-dots | Top-down maze, collect dots, avoid ghosts/chasers. Pac-Man style. Different from frogger. | 2–3 days |
| 6 | **Top-Down Shooter** | 2D | top-down-shooter, twin-stick | Twin-stick or WASD + aim. Different feel from side-scrolling shooter. Popular genre. | 2 days |

### Tier 3 — Niche or Higher Complexity

| Rank | Template | Dimension | Genres to Add | Why | Est. Effort |
|------|----------|----------|---------------|-----|-------------|
| 7 | **Simple Fishing** | 2D | fishing, fish-game | "Catch fish" — could overlap with catch template or be distinct (timing rod cast, wait, reel). | 1–2 days |
| 8 | **Breakout Variant (Arkanoid)** | 2D | — | brick-breaker exists; power-up variant (multi-ball, paddle shrink) could be AI extension. Defer. | — |
| 9 | **Simple 3D Racing** | 3D | — | Racing template exists (2D). 3D adds chase cam, scenery recycling. Only if demand justifies. | 3–4 days |

### Recommended Build Order (First Batch)

1. **Pong** — highest demand gap, lowest complexity  
2. **Catch/Dodge** — new genre, high kid appeal  
3. **Whack-a-Mole** — quick win, touch-optimized  

---

## PART 3: TEMPLATE DEVELOPMENT PROCESS

### Overview

A repeatable 6-stage pipeline from proposal to ready-to-merge. Each stage has clear deliverables and checkpoints.

```
PROPOSE → APPROVE → SPEC → BUILD → REVIEW → HANDOFF
```

---

### Stage 1: PROPOSE (Mason)

**Input:** Template idea or gap from roadmap  
**Output:** Proposal doc with 5 sections  
**Time:** ~30 min per template

**Deliverables:**
1. **Template Proposal Summary** — Name, genre keywords, dimension, core loop (1–2 sentences), why it reduces API calls, difficulty/age fit  
2. **Spec** — Player goal, win/lose, controls, scoring, powerups/obstacles, theme variables, assets, performance notes  
3. **Integration Plan (Draft)** — Template filename, GENRE_TEMPLATE_MAP additions, GAME_TEMPLATES card, matching keys  
4. **Review Checklist** — Security, compliance, moderation, UX, limitations, test steps  
5. **Build estimate** — Days, dependencies

**Checkpoint:** Submit to Atlas for explicit approval. Do not proceed to build without it.

---

### Stage 2: APPROVE (Atlas)

**Input:** Proposal doc  
**Output:** Go / No-go / Revise

**Atlas reviews:**
- Does it fit MVP scope?
- Is the genre gap real?
- Any security/compliance concerns?
- Priority vs other work?

**Checkpoint:** Written approval (or revision notes). Mason proceeds only on Go.

---

### Stage 3: SPEC (Mason)

**Input:** Approved proposal  
**Output:** Detailed technical spec

**Deliverables:**
1. **House-style alignment** — Match existing template patterns:
   - Phaser 3.86.0 CDN
   - `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`
   - `touch-action: none`, viewport meta
   - NippleJS for touch (if keyboard game)
   - Restart on game over: `this.input.keyboard.once('keydown-SPACE', () => this.scene.restart())`
   - Score display, clear objective
2. **Asset list** — Use `/assets/sprites/{genre}/` when available; procedural fallback
3. **State machine** — Menu → Play → Pause → GameOver → Restart
4. **Edge cases** — Spam-click, rapid restart, memory leaks

**Checkpoint:** Spec ready for build. Optional: quick Cipher glance if new wiring/data.

---

### Stage 4: BUILD (Mason)

**Input:** Spec  
**Output:** Complete `server/templates/<name>.html` + wiring changes (draft)

**Build order:**
1. Create template file — full HTML, Phaser game, working loop  
2. Test locally — play, restart, touch, spam-restart  
3. Draft `referenceResolver.js` — add GENRE_TEMPLATE_MAP entries  
4. Draft `genres.js` — add GENRE_KEYWORDS  
5. Draft `LandingPage.tsx` — add GAME_TEMPLATES card  
6. Draft `assetManifest.js` — add ASSET_MANIFEST entry if new sprites/sounds  

**Quality bar (per template):**
- [ ] Clear objective + feedback (score/progress)
- [ ] Controls: keyboard + touch (joystick if movement)
- [ ] Restart button, predictable state reset
- [ ] Pause (optional but preferred)
- [ ] Difficulty curve (ramps gently)
- [ ] No crash on spam-click or rapid restart
- [ ] Deterministic base loop AI can extend

**Checkpoint:** All AC met. Run `npm run test:safety`. No new failures.

---

### Stage 5: REVIEW (Cipher, Elias, Lumi — as needed)

**Input:** Build package (HTML + diff summary)  
**Output:** Sign-off or change requests

**Reviewer matrix:**
| Concern | Owner |
|---------|-------|
| Security, data boundary, new wiring | Cipher |
| COPPA, data handling, child boundary | Elias |
| Kid-first UX, controls, onboarding | Lumi |
| Arcade safety, naming, content | Rowan |
| Integration, refactor risk | Nova |

**Checkpoint:** No blocking feedback. If blocking: iterate until resolved.

---

### Stage 6: HANDOFF (Mason → Atlas)

**Input:** Approved build package  
**Output:** Ready-to-merge package

**Deliverables:**
1. **Full template HTML** — ready to paste into `server/templates/<name>.html`  
2. **Diff-style summary** — exact changes for referenceResolver, genres, LandingPage, assetManifest  
3. **Test steps** — 5–10 bullets for manual verification  
4. **Changelog fragment** — for commit message

**Checkpoint:** Atlas applies (Mason does NOT push/commit). Atlas runs final safety + lint before merge.

---

## PART 4: EFFICIENCY PRACTICES

### Batch Similar Work
- Build all Tier 1 templates in one sprint
- Do all GENRE_KEYWORDS updates in one genres.js edit
- Group GAME_TEMPLATES card additions

### Reuse Patterns
- Copy structure from closest existing template (e.g., Pong from brick-breaker paddle logic; Catch from falling-blocks spawn pattern)
- Use shared snippets: pause-ui, restart-flow, score-display, joystick-setup

### Parallel Coordination
- Spec multiple templates before building
- Send review packets to Cipher/Elias/Lumi in one batch when possible

### Definition of Done (per template)
- [ ] Template loads and runs in studio preview
- [ ] Genre keywords trigger correct template in resolver
- [ ] Landing card displays correctly
- [ ] AI receives template in reference context when kid asks for genre
- [ ] Safety tests pass
- [ ] No new ESLint errors

---

## PART 5: TRACKING

| Template | Stage | Blocker |
|----------|--------|---------|
| Pong | **Built** | Complete |
| Catch/Dodge | **Built** | Complete |
| Whack-a-Mole | **Built** | Complete |
| Memory (Card Flip) | **Built** | Complete |
| Maze/Collect | **Built** | Complete |
| Top-Down Shooter | **Built** | Complete |
| Simple Fishing | **Built** | Complete |
| Simon Says | **Built** | Complete |

---

*This document is the single source of truth for template roadmap and process. Mason Byte operates this pipeline; Atlas approves at Propose and applies at Handoff.*
