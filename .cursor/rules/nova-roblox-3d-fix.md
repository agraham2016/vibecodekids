# Task: Fix 3D Model (GLB) Loading in Roblox-Style Games

**Priority:** High
**Owner:** Nova
**Consult:** Cipher Hale (if sandbox changes needed)

---

## Context

When a kid asks for a "Roblox-style game," the system now correctly generates a 3D Three.js world instead of a 2D Phaser side-scroller (that part is fixed). However, the Kenney GLB models fail to load inside the sandboxed `srcdoc` iframe, so the AI's error-callback fallback geometry renders instead of the real 3D models. The game is playable but looks like colored boxes, not the polished Kenney low-poly models we paid for.

## Console Error

```
Player model load failed InvalidStateError: The source image could not be decoded
```

## Root Cause (Narrowed Down)

Three.js r128's `GLTFLoader` extracts embedded textures from GLB files and decodes them. In our sandboxed `srcdoc` iframe (`sandbox="allow-scripts allow-pointer-lock"` — no `allow-same-origin`), the texture decoding fails. We already tried `delete window.createImageBitmap` to force the `Image()` fallback path, but that also fails with an `onerror` event on the `<img>` element — likely because blob URLs created from extracted texture data don't resolve correctly under the iframe's opaque (`null`) origin.

## Files You'll Need

| File | What it does |
|------|-------------|
| `src/components/PreviewPanel.tsx` | Builds the `srcdoc` iframe, injects Three.js + GLTFLoader CDN scripts. Injection goes right after `<head>` open tag. Has the `createImageBitmap` delete. |
| `src/components/LandingPageB.tsx` | Same injection logic for the landing page demo previews. |
| `server/middleware/security.js` | Sets CSP headers. `img-src` includes `blob:`, `connect-src` includes the request origin. |
| `server/index.js` | `/assets` static middleware with `Access-Control-Allow-Origin: *`. After DIST_DIR static, 404 handlers for `/assets/models`, `/assets/sprites`, `/assets/sounds`. |
| `server/prompts/system.js` | 3D game instructions, Roblox directive, model loading pattern with error callbacks. |
| `server/assets/assetManifest.js` | `MODEL_MANIFEST` with `platformer-3d` (21 models from kenney-platformerkit), `formatModelsForPrompt()` function. |
| `server/services/referenceResolver.js` | `force3D` flag skips 2D template for roblox/obby/3d prompts. Injects `platformer-3d` model list. |
| `server/prompts/genres.js` | `GENRE_KEYWORDS` maps "roblox", "obby", etc. to `platformer`. |

## What's Already Been Done (Don't Redo)

1. "roblox" mapped to `platformer` genre in `genres.js`
2. `force3D` flag in `referenceResolver.js` skips 2D Phaser template injection
3. System prompt has explicit "ROBLOX = Three.js 3D, never Phaser 2D" directive
4. Three.js/GLTFLoader CDN injection moved to right after `<head>` (loads before AI scripts)
5. `delete window.createImageBitmap` injected after Three.js loads
6. `/assets/models` returns 404 JSON for missing files (not HTML)
7. `platformer-3d` expanded to 21 models with good fallback geometry guidance

## FIXED (Nova, March 2026)

**Solution:** Patch `THREE.ImageLoader.prototype.load` to convert blob URLs to data URLs before loading. In sandboxed srcdoc iframes with opaque origin, blob URLs fail to decode for `<img>` elements. Data URLs work because the image data is embedded inline.

**Implementation:** In `PreviewPanel.tsx` and `LandingPageB.tsx`, after Three.js + GLTFLoader load, we patch ImageLoader: when `url` starts with `blob:`, we `fetch(url) → blob → FileReader.readAsDataURL() → orig.load(dataUrl, ...)`. No sandbox change; no `allow-same-origin`.

**Manual test:** Log in, prompt "build me a roblox style city game where I can walk around and go in houses" — Kenney models should render (not colored boxes).

---

## What Still Needs Fixing (if regression)

GLB models with embedded textures don't load in the sandboxed iframe. You need to find a way to make `GLTFLoader` successfully decode GLB textures under `sandbox="allow-scripts allow-pointer-lock"` (opaque origin).

## Options to Investigate

1. **Patch GLTFLoader's texture handling** — Override or monkeypatch the internal `ImageLoader` or `TextureLoader` to use a canvas-based decode instead of `Image()` with blob URLs.
2. **Add `allow-same-origin` to the sandbox** — Would fix everything instantly, but weakens sandbox security (scripts could access parent DOM/cookies). **Must get Cipher's approval** if you go this route.
3. **Use `data:` URLs instead of `blob:` URLs for textures** — Intercept the GLTFLoader's blob creation and convert to base64 data URIs, which work regardless of origin.
4. **Pre-process models server-side** — Strip embedded textures from GLB files and rely on vertex colors or programmatic materials. Kenney's low-poly models may already use vertex colors.
5. **Load models via a service worker or proxy** — Won't work without `allow-same-origin`.
6. **Test if the models actually have textures** — Some Kenney GLB models use only vertex colors (no image textures). If so, the error might be from a different source. Load one model in a non-sandboxed context to check.

## How to Test

Log in as `testing6` (or any test account), start a new project, and type:

> "build me a roblox style city game where I can walk around and go in houses"

The game should render with actual 3D Kenney models, not just colored boxes.

## Definition of Done

- Kenney GLB models visibly render in the preview iframe for Roblox-style game requests
- Fallback geometry still works gracefully if any individual model fails
- No regression on 2D Phaser games or existing game templates
- Iframe sandbox security is not weakened without Cipher's sign-off
