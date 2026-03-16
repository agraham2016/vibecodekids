# Vibe Engine Architecture Notes

**Status:** Living internal notes  
**Source lens:** Jason Gregory, *Game Engine Architecture*  
**Project fit:** `VibeCodeKidz` pre-launch MVP

---

## 1. Why This Exists

`VibeCodeKidz` is not building a traditional AAA engine from scratch.

We are building two reusable generation layers:

- `Vibe 2D` on top of Phaser
- `Vibe 3D` on top of Three.js

The useful lesson from Gregory's book is not "copy Unreal." The useful lesson is:

1. Separate engine foundations from one-off game logic.
2. Keep the system data-driven where reuse is high.
3. Treat tools, assets, and runtime contracts as one architecture.
4. Make genre-family differences explicit instead of pretending one engine shape fits every game.

---

## 2. Our Engine Definition

For this project, an engine is not the low-level renderer.

For this project, an engine is the reusable contract that connects:

- starter selection
- engine-family resolution
- template grounding
- asset guidance
- prompt composition
- validation and repair
- safe follow-up iteration

That architecture currently lives in:

- `src/config/gameCatalog.ts`
- `server/services/engineRegistry.js`
- `server/services/referenceResolver.js`
- `server/services/gameHandler.js`
- `server/services/engineValidators.js`

---

## 3. Tool-Side vs Runtime Model

Gregory draws a useful line between tool-side object models and runtime object models.

For `VibeCodeKidz`, the equivalent is:

### Tool-side model

This is the structured starter catalog and engine choice layer:

- `src/config/gameCatalog.ts`
- survey/chat/landing/help surfaces that expose starters

This layer answers:

- What starter does the kid see?
- What engine family should it map to?
- What theme, character, and obstacle defaults should seed generation?

### Runtime model

This is the server-side generation pipeline:

- `server/services/engineRegistry.js`
- `server/services/referenceResolver.js`
- `server/services/gameHandler.js`

This layer answers:

- What family is this request really asking for?
- What template and assets ground the prompt?
- What must the generated game preserve?
- How do we detect when a follow-up edit drifts out of family?

The key architectural rule is:

**The tool-side model may be friendlier than the runtime model, but it must never drift out of sync with it.**

---

## 4. Family-First Architecture

Gregory emphasizes that engines differ by genre. That maps directly to our `genreFamily` approach.

We should keep treating these as the core reusable engine units:

### Vibe 2D families

- `platformAction`
- `topDownAction`
- `racingArcade`
- `puzzleCasual`
- `simLite`
- supporting families such as `builderTycoonLite`, `strategyDefenseLite`, `rpgProgressionLite`, `sportsSkill`

### Vibe 3D families

- `obbyPlatform3d`
- `explorationAdventure3d`
- `racingDriving3d`
- `survivalCraft3d`
- `sandboxBuilder3d`
- `socialParty3d` only with moderation/compliance review

Each family should own a reusable contract for:

1. Core systems
2. Safe edit surfaces
3. Input model
4. Camera model
5. HUD contract
6. Failure and restart flow
7. Asset strategy

That contract now belongs in `server/services/engineRegistry.js`.

---

## 5. Runtime Layer Map

Gregory's layered runtime architecture maps cleanly to our current flow:

```text
Starter Catalog / Prompt
  -> Engine Profile Resolver
  -> Reference / Asset Resolver
  -> Prompt Composer
  -> Model Call
  -> Engine Validation
  -> Repair Loop
  -> Playable Game
```

### Current ownership

- `engineRegistry.js`
  - family definitions
  - starter-to-family mapping
  - current-code inference on edits

- `referenceResolver.js`
  - template grounding
  - sprite/model guidance
  - dimension-aware reference formatting

- `gameHandler.js`
  - orchestration
  - post-processing
  - validation retry / repair loop

- `engineValidators.js`
  - family-level structural checks

The architectural rule here is:

**Generation logic should stay thin; reusable intent and contracts should live in structured metadata.**

---

## 6. Asset Pipeline Lessons We Should Adopt

Gregory places major emphasis on the asset pipeline and resource metadata. That is highly relevant to this project.

For `VibeCodeKidz`, the equivalent pipeline is:

1. Starter metadata in `src/config/gameCatalog.ts`
2. Family and template blueprint metadata in `server/services/engineRegistry.js`
3. Asset availability and filtering in `server/assets/assetManifest.js`
4. Reference assembly in `server/services/referenceResolver.js`
5. Runtime integrity tests in `tests/engine-integrity.spec.ts`

### What we should keep doing

- Prefer explicit starter metadata over free-text guessing
- Prefer real hero templates over implied support
- Prefer verified local assets over invented asset paths
- Keep template promises testable

### What we should avoid

- exposing a starter before a real template or family contract exists
- adding families faster than validation and regression coverage can support
- letting UI naming drift away from backend family definitions

---

## 7. Data-Driven Design: Use It Carefully

Gregory is clear that data-driven systems are valuable, but teams often overshoot and create overly complex tools.

That warning applies directly to us.

### Good data-driven investments for this project

- starter catalog metadata
- family contracts
- validator profiles
- template integrity tests
- structured asset hints
- repair-loop instructions derived from engine contracts

### Bad near-term investments for this project

- custom visual scripting system
- giant in-browser world editor
- bespoke asset database before launch needs justify it
- a traditional ECS rewrite
- custom rendering or physics subsystems

The rule:

**Data-drive the parts that improve reuse and iteration. Do not data-drive everything.**

---

## 8. What To Adopt Now

These ideas are high-value and launch-friendly:

1. Family contracts as first-class engine architecture
2. Strong starter-to-template-to-validator integrity checks
3. Tool-side and runtime-side source-of-truth alignment
4. Runtime repair loops that preserve family identity
5. Asset-pipeline thinking around verified inputs, not guessed paths
6. Fast iteration via small, safe edit surfaces

---

## 9. What To Defer

These ideas are useful later, but not worth pre-launch scope:

1. Custom job systems and advanced concurrency
2. Deep memory-allocation architecture
3. Custom collision/physics middleware
4. Advanced animation graphs
5. A heavyweight in-engine world editor
6. Rich data-path visual scripting similar to Blueprints

---

## 10. Vibe Engine Design Rules

Going forward, every engine feature should pass these checks:

1. Does it improve a reusable family rather than a single prompt?
2. Does it tighten starter, template, and validator alignment?
3. Does it shorten iteration time for safe follow-up edits?
4. Does it preserve MVP scope?
5. Can it be verified by tests?

If the answer to most of those is "no," it is probably not an engine-layer improvement.

---

## 11. Next Architecture Moves

When we continue maturing the engine layer, the best follow-on steps are:

1. Extend family contracts into prompt and repair instructions everywhere they matter.
2. Add stronger starter-catalog integrity checks across UI and backend metadata.
3. Keep expanding hero templates only where the family contract and tests are already solid.
4. Improve asset conditioning and reference quality before adding more genre breadth.
5. Add a lightweight internal architecture checklist to every new family or starter rollout.

---

## 12. Bottom Line

The book is helpful here because it sharpens how we think about:

- reusable engine layers
- genre-family architecture
- tool/runtime boundaries
- asset pipelines
- data-driven iteration

It is not a directive to turn `VibeCodeKidz` into a traditional custom engine project.

Our best path is:

**small, explicit, testable engine contracts on top of existing runtimes.**
