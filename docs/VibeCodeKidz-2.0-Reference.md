# Vibe Code Kidz 2.0 — Creator Mode Reference Document

> **Date:** February 21, 2026
> **Status:** Planning / Pre-Development
> **Prerequisite:** Beta launch of current Game Studio + Arcade (V1)

---

## Table of Contents

1. [Vision Overview](#vision-overview)
2. [Platform Architecture](#platform-architecture)
3. [Phase 1 — AI Character Generation](#phase-1--ai-character-generation)
4. [Phase 2 — Upload Drawing & Digital Drawing](#phase-2--upload-drawing--digital-drawing)
5. [Phase 3 — Drag & Drop Character Builder](#phase-3--drag--drop-character-builder)
6. [Phase 4 — Map Builder & Background Creator](#phase-4--map-builder--background-creator)
7. [Phase 5 — Sound Studio](#phase-5--sound-studio)
8. [Phase 6 — Story Writer](#phase-6--story-writer)
9. [Phase 7 — Command Center](#phase-7--command-center)
10. [Phase 8 — Community Sharing & Remix](#phase-8--community-sharing--remix)
11. [Technology Stack Summary](#technology-stack-summary)
12. [Cost Analysis](#cost-analysis)
13. [Timeline](#timeline)
14. [Game Creation Quest — Guided Flow](#game-creation-quest--guided-flow)
15. [Strategic Notes](#strategic-notes)

---

## Vision Overview

Vibe Code Kidz 2.0 evolves the platform from a single-mode AI game generator into a **full creative suite for kids**, powered by AI. The current Game Studio (Quick Mode) remains the entry point and hook. Creator Mode adds depth for kids who want more control over their creations.

**Core Principle:** The gap between "idea in a kid's head" and "thing on the screen" should be as small as possible. Every tool shrinks that gap in a different way for a different type of kid.

### Two Modes

| Mode | Target | Experience |
|---|---|---|
| **Quick Mode** (V1 — Game Studio) | New users, young kids (6-8), "just want to play" | Describe a game → AI builds it in 30 seconds |
| **Creator Mode** (V2 — Animation Studio Hub) | Returning users, older kids (9-14), want control | Build characters, worlds, stories → Command Center assembles them |

### The User Journey

- **Week 1:** Kid uses Quick Mode, makes 5-10 games with AI
- **Month 2:** Kid wants their OWN character → Character Workshop surfaces
- **Month 3:** Kid wants custom levels → Map Builder unlocks
- **Month 4:** Kid wants a story → Story Writer + Command Center
- **Month 6+:** Kid shares assets, remixes others' work, becomes a full creator

---

## Platform Architecture

```
VIBE CODE KIDZ 2.0
│
├── 🎮 GAME SIDE (V1 — exists)
│   ├── Game Studio (Quick Mode — AI game creation)
│   ├── Arcade (play & share games)
│   └── 18 Game Templates
│
├── 🎨 ANIMATION STUDIO HUB (V2 — new)
│   ├── 🎨 Character Workshop
│   │   ├── "Imagine It" — AI generates from text description
│   │   ├── "Draw It" — Upload a paper drawing or draw digitally
│   │   ├── "Build It" — Drag & drop modular parts
│   │   └── "Find It" — Browse community character library
│   │
│   ├── 🗺️ Map Builder
│   │   ├── Tile Painter — grid-based world building
│   │   ├── AI Generate — describe your world, AI builds it
│   │   └── "Find It" — community maps
│   │
│   ├── 🖼️ Background Creator
│   │   ├── Scene Composer — layered backgrounds
│   │   ├── AI Generate — describe the scene
│   │   └── "Find It" — community backgrounds
│   │
│   ├── 🎬 Animation Workshop
│   │   ├── Frame-by-frame animation (Piskel)
│   │   ├── Skeletal rigging (DragonBones)
│   │   ├── AI Animate — describe movement, AI generates
│   │   └── "Find It" — community animations
│   │
│   ├── 🔊 Sound Studio
│   │   ├── Sound Effect Maker (jsfxr presets + sliders)
│   │   ├── Music Maker (Tone.js grid sequencer)
│   │   ├── Sound Library (pre-made effects)
│   │   └── Upload your own
│   │
│   ├── 📖 Story Writer
│   │   ├── Visual story board (scene cards)
│   │   ├── Branching dialogue editor
│   │   ├── AI story assistant
│   │   └── Character integration
│   │
│   └── ⭐ COMMAND CENTER
│       ├── Project type selector (Game / Animation / Story)
│       ├── Asset dock (all user's creations)
│       ├── Assignment slots (Player, Enemy, World, Music, etc.)
│       ├── Rules panel (natural language game logic)
│       ├── Guided Quest mode (step-by-step wizard)
│       └── "Build It!" → AI assembles everything into a game
│
└── 🌐 COMMUNITY (V2.5)
    ├── Shared Characters
    ├── Shared Maps & Backgrounds
    ├── Shared Animations & Sounds
    └── Remix Gallery
```

---

## Phase 1 — AI Character Generation

**Timeline:** 2-3 weeks after beta launch
**New Dependencies:** None (uses existing OpenAI API)
**Cost:** ~$0.011 per character (GPT Image 1 Low quality)

### What It Does
Kids describe a character in plain text, AI generates an image, it becomes a usable game sprite.

### Frontend Components
- New `CharacterGenerator.tsx` component
- Text input: "Describe your character"
- Style selector dropdown: Pixel Art / Cartoon / Realistic
- Generate button → loading spinner → result display
- "Use in Game" saves to user's asset library
- "Try Again" regenerates with variation

### Backend
- New endpoint: `POST /api/assets/generate-character`
- Calls GPT Image 1 API (Low quality = $0.011/image)
- Post-processing: resize to sprite dimensions (64x64, 128x128)
- Client-side background removal via `@bunnio/rembg-web`
- Save PNG to storage, record in database

### Database Schema
```sql
CREATE TABLE user_assets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  asset_type VARCHAR(20),     -- 'character', 'map', 'background', 'sound', 'story'
  name VARCHAR(100),
  file_path TEXT,
  thumbnail_path TEXT,
  metadata JSONB,             -- dimensions, tags, blueprint JSON, style info
  is_public BOOLEAN DEFAULT false,
  remix_of INTEGER REFERENCES user_assets(id),
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_assets_user ON user_assets(user_id);
CREATE INDEX idx_user_assets_type ON user_assets(asset_type);
CREATE INDEX idx_user_assets_public ON user_assets(is_public) WHERE is_public = true;
```

### AI Image Generation Options
| Provider | Model | Cost/Image | Best For |
|---|---|---|---|
| OpenAI | GPT Image 1 (Low) | $0.011 | Quick drafts, rapid iteration |
| OpenAI | GPT Image 1 (Medium) | $0.042 | Higher quality characters |
| OpenAI | GPT Image 1.5 | $0.009-$0.20 | Newest, best quality range |
| Replicate | SD Pixel-Sprite | ~$0.046 | Pixel art sprite sheets with 4 angles |
| OpenAI | DALL-E 3 | $0.04-$0.12 | Detailed art, less ideal for pixel art |

### Integration with Game Studio
When a kid creates a game (Quick Mode or Command Center), the AI prompt includes references to their saved characters:
```
The user has custom characters available:
- "Fire Robot" at /assets/user/123/fire-robot.png (64x64)
- "Evil Cat" at /assets/user/123/evil-cat.png (32x32)
Use these sprites in the game when the user references them.
```

---

## Phase 2 — Upload Drawing & Digital Drawing

**Timeline:** 2-3 weeks after Phase 1
**New Dependencies:** `@bunnio/rembg-web` (8KB), Piskel embed (iframe)
**Cost:** $0 (all client-side processing)

### 2A — Photo Upload ("Draw on paper, upload it")

**Flow:**
1. Kid draws character on paper with crayons/markers
2. Takes a photo or uploads an image
3. Client-side background removal (`@bunnio/rembg-web`, runs in browser)
4. Preview with transparent background
5. Optional: AI cleanup via GPT Image 1 ("clean up this drawing, keep the style")
6. Save as transparent PNG sprite

**Technical Notes:**
- `@bunnio/rembg-web` — WebAssembly, ~8KB gzipped, supports U2Net/ISNet/Silueta models
- AI model (~234MB) caches in browser after first load
- No server processing needed — fully client-side
- Accept camera input on mobile: `<input type="file" accept="image/*" capture="environment">`

**Meta Animated Drawings (Future Enhancement):**
- Open source (MIT), pose estimation + segmentation
- Converts drawing → rigged skeleton → animated character
- GitHub repo archived Sept 2025 but code still usable
- Could auto-generate walk/run/jump animations from a single drawing

### 2B — Digital Drawing (Piskel Embed)

**Flow:**
1. Piskel editor opens in iframe or web component
2. Kid draws pixel art frame by frame
3. Live animation preview
4. Export as PNG sprite sheet or animated GIF
5. Save to user's asset library

**Technical Notes:**
- Piskel: Apache 2.0, 10.9K GitHub stars
- Official `piskel-embed` package for integration
- Exports: animated GIF, PNG, ZIP sprite sheet
- Best for older kids (10+) who want pixel-precise control

---

## Phase 3 — Drag & Drop Character Builder

**Timeline:** 3-4 weeks after Phase 2
**New Dependencies:** `konva` (1.47MB), `react-konva`
**Cost:** $0 (Konva is MIT, Kenney assets are CC0)

### What It Does
Kids assemble characters from pre-made modular parts — like Mr. Potato Head.

### Why Konva.js Over Fabric.js
| Feature | Konva.js | Fabric.js |
|---|---|---|
| Size | 1.47MB | 25.7MB |
| Drag & drop | Optimized (10K shape stress test) | Supported but slower |
| Snapping | Built-in (5px threshold) | Manual implementation |
| Architecture | Scene graph (parent-child) | Object model |
| Animation | Excellent | Basic |
| npm downloads | 910K/week | 485K/week |

### Part Library (Free CC0 Assets)
- **Kenney Modular Characters** — 425+ parts (heads, bodies, limbs, accessories)
- **Kenney Monster Builder Pack** — 170+ creature parts, 6 color variations
- All CC0 licensed (free commercial use, no attribution)
- Organized in `public/assets/parts/` by category
- `partManifest.json` indexes all parts with thumbnails

### UI Layout
```
┌──────────┬─────────────────────────┬──────────┐
│ PARTS    │                         │ TOOLS    │
│          │                         │          │
│ [Heads]  │    ASSEMBLY CANVAS      │ [Color]  │
│ [Bodies] │                         │ [Size]   │
│ [Arms]   │    (Konva stage with    │ [Rotate] │
│ [Legs]   │     snap guides)        │ [Flip]   │
│ [Access] │                         │ [Layer]  │
│          │                         │          │
├──────────┴─────────────────────────┴──────────┤
│  [Clear]  [Undo]  [Save]  [Use in Game]       │
└───────────────────────────────────────────────┘
```

### Export
- Composite PNG via `stage.toDataURL()`
- JSON blueprint (parts, positions, colors, sizes) for AI reference
- Both saved to `user_assets` table

---

## Phase 4 — Map Builder & Background Creator

**Timeline:** 3-4 weeks after Phase 3
**New Dependencies:** `tilemap-editor` (zero deps, MIT)
**Cost:** $0

### 4A — Tile Map Builder

**What It Does:** Kids paint tile-based game worlds on a grid.

**Browser-Based Tile Editor Options:**
| Library | Dependencies | License | Notes |
|---|---|---|---|
| **tilemap-editor** (blurymind) | Zero | MIT | Most popular browser-based option, mobile-friendly |
| **react-super-tilemap** | React | MIT | High-performance rendering |
| **Custom (Konva.js)** | Already have | MIT | Full control, consistent with Character Builder |

**Tile Assets (Free CC0):**
- Kenney Platformer Pack (grass, dirt, stone, water, lava)
- Kenney Nature Pack (trees, bushes, flowers, rocks)
- Kenney Dungeon Pack (walls, floors, doors, chests)
- Kenney Sci-Fi Pack (metal, glass, neon, space)
- Kenney City Pack (roads, buildings, signs)

**Phaser Integration:**
Tiled-compatible JSON maps load directly into Phaser:
```javascript
// In preload()
this.load.tilemapTiledJSON('level1', '/assets/user/123/volcano-island.json');
this.load.image('tileset', '/assets/tilesets/platformer.png');

// In create()
const map = this.make.tilemap({ key: 'level1' });
const tiles = map.addTilesetImage('platformer', 'tileset');
const groundLayer = map.createLayer('ground', tiles);
groundLayer.setCollisionByProperty({ collides: true });
```

**AI Map Generation:**
AI can generate Tiled-compatible JSON from text descriptions. The JSON format is deterministic — array of tile IDs with layer metadata. Example prompt: "Generate a Tiled JSON map for a volcanic island with platforms over lava, using a 20x15 grid."

### 4B — Background Creator

**What It Does:** Kids compose scene backdrops from layered elements.

**Implementation:** Konva.js (same as Character Builder)
- Layer system: Sky → Horizon → Ground → Props
- Pre-made elements by theme (SVG/PNG):
  - Forest: trees, mountains, clouds, sun/moon
  - Space: stars, planets, nebulae, asteroids
  - Underwater: coral, fish, bubbles, seaweed
  - City: buildings, streets, cars, signs
  - Fantasy: castles, dragons, magic effects
- Export as flat PNG via `stage.toDataURL()`
- AI option: GPT Image 1 generates background from description ($0.011)

---

## Phase 5 — Sound Studio

**Timeline:** 2-3 weeks after Phase 4
**New Dependencies:** `jsfxr` (npm), `tone` (npm, MIT)
**Cost:** $0

### 5A — Sound Effect Maker (jsfxr)

**What It Does:** Kids create retro game sound effects with presets and sliders.

**jsfxr Features:**
- Preset generators: Jump, Laser, Explosion, Coin, PowerUp, Hit, Blip, Click
- Wave types: Square, Sawtooth, Sine, Noise
- Tweakable parameters: pitch, decay, vibrato, arpeggiation, filters
- Export as WAV, play preview, get data URI
- Commercial use allowed, no data collection

**UI Layout:**
```
┌────────────────────────────────────────┐
│  PRESETS                               │
│  [🦘Jump] [💥Boom] [⚡Laser] [🪙Coin] │
│  [⬆️Power] [💔Hit] [🔔Blip] [🎵Tone] │
├────────────────────────────────────────┤
│  TWEAK IT                              │
│  Pitch:    ▓▓▓▓▓▓░░░░ 60%            │
│  Speed:    ▓▓▓▓░░░░░░ 40%            │
│  Echo:     ▓▓░░░░░░░░ 20%            │
│  Wobble:   ▓▓▓░░░░░░░ 30%            │
├────────────────────────────────────────┤
│  [▶ Play]  [🔄 Randomize]  [💾 Save]  │
└────────────────────────────────────────┘
```

### 5B — Simple Music Maker (Tone.js)

**What It Does:** Kids compose simple music loops on a grid sequencer.

**Tone.js Features:**
- Web Audio framework, MIT license
- Pre-built synthesizers, effects, sequencers
- Browser-based, no install
- Requires user interaction before playing (browser policy)

**UI:** 8x16 grid (8 notes/instruments, 16 beats). Click cells to toggle notes on/off. Play/stop, tempo slider, instrument selector. Export as audio loop.

---

## Phase 6 — Story Writer

**Timeline:** 2-3 weeks after Phase 5
**New Dependencies:** `inkjs` (zero deps, MIT, 3.1K weekly npm downloads)
**Cost:** $0 (uses existing AI API)

### What It Does
Kids plan and write branching game stories with AI assistance.

### Ink — Branching Narrative Engine
Ink is the industry standard for interactive fiction (MIT, 4.4K GitHub stars, by Inkle Studios).

**Markup Example:**
```ink
"Welcome, brave adventurer!" said the wizard.
* [Ask about the quest]
  "You must find the Crystal of Light in the Dark Forest."
  -> dark_forest
* [Ask about the dragon]
  "The dragon guards the bridge. You'll need to be clever."
  -> dragon_bridge

=== dark_forest ===
The trees grow thick and the path splits.
* [Go left toward the river] -> river_path
* [Go right toward the cave] -> cave_path
```

### UI Layout
```
┌─────────────────────────────────────────────┐
│  STORY BOARD                                │
│                                             │
│  [Scene 1: The Village] ──→ [Scene 2: Fork] │
│                              ├→ [3A: Cave]  │
│                              └→ [3B: River] │
│                                             │
├─────────────────────────────────────────────┤
│  SCENE EDITOR: "The Village"                │
│  ┌─────────────────────────────────────────┐│
│  │ Characters: [🤖 Fire Robot] [😺 Cat]    ││
│  │                                         ││
│  │ Description: The hero arrives at...     ││
│  │                                         ││
│  │ Dialogue:                               ││
│  │   Wizard: "Welcome, brave adventurer!"  ││
│  │                                         ││
│  │ Choices:                                ││
│  │   → "Ask about quest" → Scene 2        ││
│  │   → "Ask about dragon" → Scene 3       ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [🤖 AI: Help me write] [✨ Suggest twist]  │
└─────────────────────────────────────────────┘
```

### AI Integration
- "Help me write this scene" → AI drafts description + dialogue
- "Suggest a plot twist" → AI proposes story complications
- "Write dialogue for [character]" → AI writes in-character speech
- Export: Ink JSON for game integration, or structured JSON for Command Center

---

## Phase 7 — Command Center

**Timeline:** 3-4 weeks after Phase 6
**New Dependencies:** None (pure UI + enhanced AI prompt)
**Cost:** $0

### What It Does
The assembly hub where kids combine all their created assets into a finished game or animation.

### UI Layout
```
┌────────────────────────────────────────────────────────┐
│  ⭐ COMMAND CENTER              [Game ▾] type selector │
├──────────┬─────────────────────────────────────────────┤
│ MY ASSETS│  ASSIGNMENT SLOTS                           │
│          │                                             │
│ Characters│  🎮 Player:    [Fire Robot    ] [Change]   │
│ ├ Robot  │  👾 Enemy:     [Evil Cat      ] [Change]   │
│ ├ Cat    │  🗺️ World:     [Volcano Island] [Change]   │
│ └ Princess│  🖼️ Background: [Lava Sky     ] [Change]   │
│          │  🎵 Music:     [Adventure Loop] [Change]   │
│ Maps     │  🔊 SFX:       [Jump, Coin    ] [Change]   │
│ ├ Volcano│  📖 Story:     [Crystal Quest ] [Change]   │
│ └ Forest │                                             │
│          ├─────────────────────────────────────────────┤
│ Sounds   │  GAME RULES (describe in your own words)    │
│ ├ Boing  │  ┌─────────────────────────────────────┐   │
│ └ Ding   │  │ Player collects gems and avoids the │   │
│          │  │ Evil Cat. Reach the castle to win.   │   │
│ Stories  │  │ There are 3 levels, each harder.     │   │
│ └ Crystal│  └─────────────────────────────────────┘   │
│          │                                             │
│          │  [🚀 BUILD IT!]  [👁️ PREVIEW]              │
└──────────┴─────────────────────────────────────────────┘
```

### How "Build It!" Works
1. Collects all selected assets (URLs, metadata, blueprints)
2. Collects game type, rules text, story JSON
3. Constructs an enriched AI prompt:

```
Generate a [platformer] game using Phaser.js.

PLAYER CHARACTER:
- Name: "Fire Robot"
- Sprite: /assets/user/123/fire-robot.png (64x64)
- Animations: walk (4 frames), jump (2 frames), idle (2 frames)

ENEMY:
- Name: "Evil Cat"
- Sprite: /assets/user/123/evil-cat.png (32x32)
- Behavior: patrol back and forth on platforms

MAP:
- Tilemap: /assets/user/123/volcano-island.json
- Tileset: /assets/tilesets/platformer.png

BACKGROUND: /assets/user/123/lava-sky.png

MUSIC: /assets/user/123/adventure-loop.wav
SOUND EFFECTS:
  - Jump: /assets/user/123/boing.wav
  - Coin: /assets/user/123/ding.wav
  - Hit: /assets/sounds/hit.wav

STORY (Ink JSON): { ... branching narrative data ... }

GAME RULES:
Player collects gems and avoids the Evil Cat. Reach the castle to win.
There are 3 levels, each harder than the last.
```

4. AI generates complete game code referencing all user assets
5. Preview loads in the game panel
6. Kid tests, tweaks, publishes

### Guided Quest Mode
An optional step-by-step wizard for kids who want guidance:

```
⭐ GAME CREATOR'S QUEST

Step 1: "Dream It" — What kind of game? (genre picker)     ☑️
Step 2: "Plan the Fun" — What does the player DO?          ☑️
Step 3: "Create Characters" → opens Character Workshop      ☑️
Step 4: "Write Your Story" → opens Story Writer             ⬜ (skip)
Step 5: "Build Your World" → opens Map Builder              🔄 in progress
Step 6: "Bring It to Life" → opens Animation Workshop       ⬜
Step 7: "Add Sound" → opens Sound Studio                    ⬜
Step 8: "Build It!" → Command Center assembles              ⬜
Step 9: "Test & Tweak" → play and adjust                    ⬜
Step 10: "Share It!" → publish to Arcade                    ⬜

[Skip to Build →]  (AI fills in anything not completed)
```

Kids can skip any step — AI fills in the blanks.

---

## Phase 8 — Community Sharing & Remix

**Timeline:** 4-6 weeks after Phase 7
**New Dependencies:** Supabase client SDK, image moderation API
**Cost:** ~$5-25/mo storage, moderation API costs

### 8A — Asset Gallery
- Browse community characters, maps, backgrounds, sounds, animations
- Filter by: genre, popularity, newest, style
- "Use in My Game" copies to user's library
- Credit system: "Original by [username]"
- Remix tracking: "Remixed 47 times"

### 8B — Content Moderation
- **Automated:** AI image safety filter before any asset is published
- **Community:** Flag/report button on every shared asset
- **Review queue:** Admin dashboard for reviewing flagged content
- **Auto-escalation:** High-risk reports auto-flagged for immediate review
- **Junior accounts:** Under-13 users need parent approval for public sharing

### 8C — COPPA Compliance
- FTC amended COPPA April 2025 (first update since 2013)
- Requirements for under-13 users:
  - Verifiable parental consent before data collection
  - No personal information in shared content
  - Clear, updated privacy policy
  - Age verification gate
  - Parent dashboard showing child's activity
- Consider **kidSAFE** certification for credibility

### Infrastructure
- Migrate asset storage to Supabase Storage (row-level security, CDN, image optimization)
- Database additions:
```sql
ALTER TABLE user_assets ADD COLUMN download_count INTEGER DEFAULT 0;
ALTER TABLE user_assets ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'pending';

CREATE TABLE asset_reports (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES user_assets(id),
  reporter_id INTEGER REFERENCES users(id),
  reason VARCHAR(50),
  details TEXT,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Technology Stack Summary

### New Frontend Libraries (All Free/Open Source)

| Library | Purpose | Size | License |
|---|---|---|---|
| `konva` | Canvas editor (Character Builder, Background Creator) | 1.47MB | MIT |
| `react-konva` | React bindings for Konva | ~100KB | MIT |
| `@bunnio/rembg-web` | Client-side background removal | ~8KB + 234MB model (cached) | MIT |
| `Piskel embed` | Pixel art / frame animation editor | iframe | Apache 2.0 |
| `tilemap-editor` | Browser-based tile map editor | Zero deps | MIT |
| `jsfxr` | Retro sound effect generator | Small | Free |
| `tone` | Web Audio music framework | ~150KB | MIT |
| `inkjs` | Branching narrative engine | Zero deps | MIT |

### Free Asset Packs (CC0 — No Attribution Required)

| Pack | Contents | Source |
|---|---|---|
| Kenney Modular Characters | 425+ character parts | kenney.nl |
| Kenney Monster Builder | 170+ creature parts, 6 color variants | kenney.nl |
| Kenney Platformer Tileset | Ground, platforms, items | kenney.nl |
| Kenney Nature Pack | Trees, rocks, flowers, water | kenney.nl |
| Kenney Dungeon Pack | Walls, floors, doors, chests | kenney.nl |
| Kenney Sci-Fi Pack | Metal, glass, neon, space | kenney.nl |
| Kenney City Pack | Roads, buildings, vehicles | kenney.nl |

### APIs

| API | Purpose | Cost |
|---|---|---|
| OpenAI GPT Image 1 | AI character / background generation | $0.011-$0.042/image |
| Replicate SD Pixel-Sprite | Pixel art sprite sheets | ~$0.046/run |
| Existing Claude/Grok | Game generation, story assistance | Already integrated |

---

## Cost Analysis

### Per-Use Costs
| Action | Cost |
|---|---|
| AI character generation (draft) | $0.011 |
| AI character generation (quality) | $0.042 |
| AI background generation | $0.011 |
| Pixel sprite sheet generation | $0.046 |
| AI story assistance | Existing API (no new cost) |
| Game generation | Existing API (no new cost) |
| All other tools | $0 (client-side) |

### Monthly Infrastructure
| Service | Cost | When |
|---|---|---|
| Railway (existing) | Current plan | Now |
| Supabase Storage | ~$25/mo | Phase 8 |
| Image moderation API | ~$10-20/mo | Phase 8 |
| **Total new monthly** | **~$35-45/mo** | After Phase 8 |

### Projection at Scale (1,000 active users)
- ~500 character generations/day × $0.011 = $5.50/day = ~$165/mo
- ~200 background generations/day × $0.011 = $2.20/day = ~$66/mo
- Storage: ~$25/mo
- **Total: ~$256/mo** (covered by ~37 Creator subscriptions at $7/mo)

---

## Timeline

```
BETA LAUNCH (V1) ──────────────────────── Week 0
     │
     │  Ship current Game Studio + Arcade
     │  Gather user feedback
     │  Fix bugs, polish
     │
PHASE 1: AI Character Generation ──────── Weeks 2-4
     │  "Imagine It" — describe → generate
     │  Highest impact, lowest effort
     │
PHASE 2: Upload Drawing + Piskel ──────── Weeks 5-7
     │  "Draw It" — paper upload + digital draw
     │  The viral feature (parents share on social)
     │
PHASE 3: Drag & Drop Builder ─────────── Weeks 8-11
     │  "Build It" — assemble from parts
     │  Kenney assets + Konva.js
     │
PHASE 4: Map Builder + Backgrounds ────── Weeks 12-15
     │  "Build Your World"
     │  Tile painter + scene composer
     │
PHASE 5: Sound Studio ────────────────── Weeks 16-18
     │  "Create Sounds & Music"
     │  jsfxr + Tone.js
     │
PHASE 6: Story Writer ────────────────── Weeks 19-21
     │  "Plan Your Story"
     │  Ink engine + AI assistance
     │
PHASE 7: Command Center ──────────────── Weeks 22-25
     │  "Put It All Together"
     │  The assembly hub + guided quest
     │
PHASE 8: Community & Remix ────────────── Weeks 26-31
     │  "Share & Remix"
     │  Asset gallery + moderation + COPPA
     │
VIBE CODE KIDZ 2.0 COMPLETE ──────────── ~Month 8
```

---

## Game Creation Quest — Guided Flow

The recommended order for kids to build games, based on professional game development best practices (Miyamoto's "gameplay first" principle):

| Step | Name | Tool | What Happens | Skippable? |
|---|---|---|---|---|
| 1 | **Dream It** | Genre picker | Pick game type + one-sentence description | No |
| 2 | **Plan the Fun** | AI assist | Define core mechanics (jump, fight, collect, race) | Yes (AI decides) |
| 3 | **Create Characters** | Character Workshop | Build hero, villains, NPCs | Yes (AI generates) |
| 4 | **Write Your Story** | Story Writer | Plot, dialogue, branching choices | Yes (skip or AI drafts) |
| 5 | **Build Your World** | Map Builder / Background Creator | Design levels and environments | Yes (AI generates) |
| 6 | **Bring It to Life** | Animation Workshop | Animate characters and effects | Yes (AI handles) |
| 7 | **Add Sound** | Sound Studio | Sound effects and music | Yes (defaults used) |
| 8 | **Build It!** | Command Center | AI assembles everything | No |
| 9 | **Test & Tweak** | Preview Panel | Play, find issues, adjust | Recommended |
| 10 | **Share It!** | Arcade | Publish for community | Optional |

**Key design principle:** Kids can enter at any step and skip any step. AI fills in everything the kid doesn't provide. The quest is a suggestion, not a requirement.

---

## Strategic Notes

### Don't Pivot — Evolve
The current Game Studio (Quick Mode) is the hook. Creator Mode is the depth. Keep both. Quick Mode for acquisition, Creator Mode for retention.

### Every Successful Kids Platform Has Two Modes
- Minecraft: Survival (play) + Creative (build)
- Roblox: Play games + Roblox Studio
- Scratch: Remix (quick) + Create from scratch (deep)
- Fortnite: Battle Royale (play) + Creative/UEFN (build)

### The Hype Strategy
While building Creator Mode in the background:
- Week 1-2 after beta: "Something big is coming..."
- Week 3-4: Sneak peek of Character Workshop
- Week 5-6: Video of a kid's drawing becoming a game character
- Week 7-8: "Creator Mode is almost here. Sign up for early access."
- Launch: "Creator Mode is LIVE"

### Monetization Opportunities
- Free tier: Quick Mode only, limited generations
- Creator ($7/mo): Access to Creator Mode tools, more AI generations
- Pro ($14/mo): Unlimited everything, community sharing, priority AI
- Future: Asset marketplace where creators can sell premium content

### The Nonprofit Arm (Future)
- Collect game code donations from the developer community
- 501(c)(3) educational mission
- STEM education grants eligibility
- Corporate sponsorship from game companies
- Curated, kid-safe, code-reviewed contributions
- Feeds into both the game template library and community asset collection

### COPPA Compliance Checklist (Before Community Launch)
- [ ] Parental consent flow for under-13 accounts
- [ ] Age verification gate
- [ ] Privacy policy updated for UGC sharing
- [ ] No personal info in public content
- [ ] Content moderation pipeline (automated + human review)
- [ ] Parent dashboard showing child's activity
- [ ] Consider kidSAFE certification
- [ ] Legal review of 2025 COPPA amendments

---

*This document serves as the master reference for Vibe Code Kidz 2.0 development. Each phase should be planned in detail before implementation begins. Phases can be adjusted based on user feedback from the beta launch.*
