/**
 * Snippet Library Index
 * 
 * Maps snippet names to their content and the genres/keywords they're relevant for.
 * The reference resolver uses this to pick which snippets to inject.
 */

import { PHYSICS_2D_SNIPPET } from './physics-2d.js';
import { CAR_PHYSICS_SNIPPET } from './car-physics.js';
import { PARTICLE_SYSTEM_SNIPPET } from './particle-system.js';
import { SOUND_ENGINE_SNIPPET } from './sound-engine.js';
import { AI_ENEMIES_SNIPPET } from './ai-enemies.js';
import { UI_COMPONENTS_SNIPPET } from './ui-components.js';
import { CAMERA_SYSTEMS_SNIPPET } from './camera-systems.js';

/**
 * Each snippet has:
 * - content: The code string to inject
 * - genres: Which detected genres auto-include this snippet
 * - keywords: Extra prompt keywords that trigger this snippet
 * - charCount: Approximate size (for budget tracking)
 */
export const SNIPPET_LIBRARY = [
  {
    name: 'physics-2d',
    content: PHYSICS_2D_SNIPPET,
    genres: ['platformer', 'shooter', 'frogger', 'rpg', 'fighting', 'endless-runner'],
    keywords: ['gravity', 'jump', 'bounce', 'collision', 'physics', 'platform'],
    charCount: PHYSICS_2D_SNIPPET.length,
  },
  {
    name: 'car-physics',
    content: CAR_PHYSICS_SNIPPET,
    genres: ['racing', 'street-racing', 'driving'],
    keywords: ['car', 'racing', 'driving', 'drift', 'steering', 'garage', 'street rod', 'muscle car', 'vehicle'],
    charCount: CAR_PHYSICS_SNIPPET.length,
  },
  {
    name: 'particle-system',
    content: PARTICLE_SYSTEM_SNIPPET,
    genres: ['shooter', 'platformer', 'racing', 'fighting', 'street-racing', 'tower-defense', 'endless-runner'],
    keywords: ['explosion', 'particles', 'confetti', 'trail', 'effects', 'juice', 'screen shake', 'sparkle'],
    charCount: PARTICLE_SYSTEM_SNIPPET.length,
  },
  {
    name: 'sound-engine',
    content: SOUND_ENGINE_SNIPPET,
    genres: ['racing', 'shooter', 'platformer', 'fighting', 'street-racing'],
    keywords: ['sound', 'audio', 'music', 'beep', 'engine sound', 'sound effects', 'sfx'],
    charCount: SOUND_ENGINE_SNIPPET.length,
  },
  {
    name: 'ai-enemies',
    content: AI_ENEMIES_SNIPPET,
    genres: ['shooter', 'platformer', 'rpg', 'tower-defense', 'fighting', 'endless-runner'],
    keywords: ['enemy', 'enemies', 'boss', 'patrol', 'chase', 'waves', 'spawn', 'ai', 'npc'],
    charCount: AI_ENEMIES_SNIPPET.length,
  },
  {
    name: 'ui-components',
    content: UI_COMPONENTS_SNIPPET,
    genres: ['rpg', 'racing', 'shooter', 'street-racing', 'tower-defense'],
    keywords: ['hud', 'health bar', 'score', 'menu', 'shop', 'garage', 'title screen', 'game over', 'minimap', 'combo'],
    charCount: UI_COMPONENTS_SNIPPET.length,
  },
  {
    name: 'camera-systems',
    content: CAMERA_SYSTEMS_SNIPPET,
    genres: ['platformer', 'rpg', 'racing', 'endless-runner', 'street-racing'],
    keywords: ['camera', 'scroll', 'parallax', 'follow', 'chase cam', 'zoom', 'side scroll'],
    charCount: CAMERA_SYSTEMS_SNIPPET.length,
  },
];

/**
 * Get snippets relevant to a genre and/or prompt.
 * Returns an array of { name, content } objects.
 */
export function getRelevantSnippets(genre, prompt) {
  const lower = (prompt || '').toLowerCase();
  const matched = [];

  for (const snippet of SNIPPET_LIBRARY) {
    let score = 0;

    // Genre match
    if (genre && snippet.genres.includes(genre)) score += 2;

    // Keyword match
    for (const kw of snippet.keywords) {
      if (lower.includes(kw)) { score += 1; break; }
    }

    if (score > 0) matched.push({ ...snippet, score });
  }

  // Sort by relevance score (highest first)
  matched.sort((a, b) => b.score - a.score);
  return matched;
}
