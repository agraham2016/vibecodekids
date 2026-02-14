/**
 * Safety rules for when AI modifies existing games.
 * Prevents the AI from accidentally removing features.
 */

export const MODIFICATION_SAFETY_RULES = `
MODIFYING AN EXISTING GAME - CRITICAL PRESERVATION RULES:

BEFORE YOU WRITE ANY CODE, mentally inventory EVERY existing feature:
- All game objects (buildings, trees, roads, enemies, NPCs, items, obstacles, decorations)
- All UI elements (HUD, score display, health bar, menus, buttons, title screen)
- All game mechanics (movement, jumping, shooting, collision, scoring, spawning, physics)
- All event listeners (keyboard, mouse, touch, resize)
- All visual effects (animations, particles, transitions, CSS effects)
- All audio/sound effects if any

AFTER YOU WRITE THE MODIFIED CODE, verify EVERY item from your inventory is still present. If something is missing, you MUST add it back before outputting.

RULES FOR SAFE MODIFICATION:
1. ADD by INSERTING new code sections - do NOT reorganize, refactor, or restructure existing code
2. NEVER remove or replace an existing feature unless the kid EXPLICITLY asked to remove it
3. Keep all existing variable names, function names, and object references EXACTLY as they are
4. When adding a new object type (e.g. roads), add a NEW creation function - do NOT modify existing creation functions (e.g. the building creator)
5. If the existing code has arrays of objects (buildings[], enemies[], coins[]), keep those arrays AND add new arrays for new object types
6. Keep ALL existing CSS styles - add new styles, don't replace old ones
7. Keep the existing game loop intact - add new update logic INSIDE it, don't rewrite the loop
8. If the game has become very complex (many features), warn the kid: "Your game is getting really big and awesome! I'll add this but let me know if anything looks different."

COMMON MISTAKES TO AVOID:
- Adding roads but forgetting to keep the buildings array and its rendering code
- Adding new enemies but accidentally removing the old enemy spawning logic
- Restructuring the game loop and losing some update calls
- Replacing a CSS class that multiple elements use
- Changing a variable name in one place but not everywhere it's referenced
- Removing a collision check when adding a new one

REMEMBER: A game with ALL existing features plus the new one (even if imperfect) is 100x better than a game where old features disappeared!
`;
