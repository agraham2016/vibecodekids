/**
 * Asset Manifest
 * Maps game genres to available sprite and sound assets.
 * The reference resolver injects the relevant subset into the AI prompt.
 */

import { SPRITE_ASSET_MAX_CHARS } from '../config/index.js';

export const ASSET_MANIFEST = {
  platformer: {
    sprites: [
      { key: 'player', path: '/assets/sprites/kenney-platformer/character_green_idle.png', w: 32, h: 32 },
      { key: 'ground', path: '/assets/sprites/kenney-platformer/terrain_grass_block.png', w: 32, h: 32 },
      { key: 'platform', path: '/assets/sprites/kenney-platformer/block_plank.png', w: 32, h: 32 },
      { key: 'coin', path: '/assets/sprites/kenney-platformer/coin_gold.png', w: 32, h: 32 },
      { key: 'enemy', path: '/assets/sprites/kenney-platformer/slime_normal_rest.png', w: 32, h: 32 },
      { key: 'bgSky', path: '/assets/sprites/kenney-platformer/background_solid_sky.png', w: 128, h: 128 },
      { key: 'bgHills', path: '/assets/sprites/kenney-platformer/background_color_hills.png', w: 128, h: 128 },
    ],
    sounds: ['explosion'],
    note: 'Platformer is the ONLY genre with file-based sprites. All other genres must generate textures procedurally.',
  },
  common: {
    sprites: [],
    sounds: ['explosion'],
    soundPaths: {
      explosion: '/assets/sounds/explosion.wav',
    },
    note: 'Almost no file-based assets exist. ALWAYS generate textures procedurally using graphics.generateTexture().',
  },
};

/**
 * Format RAG search results into the same string shape as formatAssetsForPrompt.
 * Groups by role, emits this.load.image lines, includes common sprites + sounds.
 *
 * @param {Array<{id,path,w,h,roles,note}>} sprites - From spriteSearch.searchSprites
 * @param {string} genre - For sound selection
 * @param {number} maxChars - Cap output length (default SPRITE_ASSET_MAX_CHARS)
 * @returns {string}
 */
export function formatAssetsFromSearch(sprites, genre, maxChars = SPRITE_ASSET_MAX_CHARS) {
  if (!sprites || sprites.length === 0) return '';

  const common = ASSET_MANIFEST.common;
  const genreAssets = ASSET_MANIFEST[genre];
  const soundKeys = genreAssets?.sounds || common.sounds;

  const roleOrder = ['player', 'enemy', 'collectible', 'background', 'other'];
  const byRole = {};
  for (const r of roleOrder) byRole[r] = [];
  for (const s of sprites) {
    const roles = s.roles || [];
    let placed = false;
    for (const r of ['player', 'enemy', 'collectible', 'background']) {
      if (roles.includes(r)) {
        byRole[r].push(s);
        placed = true;
        break;
      }
    }
    if (!placed) byRole.other.push(s);
  }

  const lines = ['SPRITE ASSETS — generate procedurally by default:', ''];

  lines.push('IMPORTANT: Generate ALL sprites procedurally using graphics.generateTexture().');
  lines.push('Do NOT call this.load.image() or this.load.audio() unless using kenney-platformer sprites.');
  lines.push('Do NOT load sound files — they do not exist. Wrap any this.sound.play() in try/catch.');
  lines.push('');

  let hasFileSprites = false;
  for (const role of roleOrder) {
    const list = byRole[role];
    if (list.length === 0) continue;
    hasFileSprites = true;
    const label = role === 'other' ? 'Other sprites' : `${role} sprites`;
    lines.push(`${label} (file-based — optional, procedural preferred):`);
    list.forEach((s, i) => {
      const key = list.length === 1 ? role : `${role}${i + 1}`;
      let desc = `  this.load.image('${key}', '${s.path}');  // ${s.w}x${s.h}`;
      if (s.note) desc += ` — ${s.note}`;
      lines.push(desc);
    });
    lines.push('');
  }

  if (!hasFileSprites) {
    lines.push('No file-based sprites available for this genre — use generateTexture() for all sprites.');
    lines.push('');
  }

  const result = lines.join('\n');
  return result.length > maxChars ? result.slice(0, maxChars) + '\n...(truncated)' : result;
}

/**
 * Format an asset list for injection into the AI prompt.
 * Returns a readable string the AI can use to load assets.
 */
export function formatAssetsForPrompt(genre) {
  const genreAssets = ASSET_MANIFEST[genre];
  const common = ASSET_MANIFEST.common;

  let lines = ['SPRITE & SOUND ASSETS — procedural generation is the DEFAULT:'];
  lines.push('');
  lines.push('IMPORTANT: Generate ALL sprites procedurally using graphics.generateTexture().');
  lines.push('Do NOT call this.load.image() or this.load.audio() unless using kenney-platformer sprites.');
  lines.push('Do NOT load sound files — they do not exist. Wrap any this.sound.play() in try/catch.');
  lines.push('');

  if (genreAssets && genreAssets.sprites.length > 0) {
    lines.push(`File-based sprites for ${genre} (optional — procedural preferred):`);
    for (const s of genreAssets.sprites) {
      let desc = `  this.load.image('${s.key}', '${s.path}');  // ${s.w}x${s.h}`;
      if (s.note) desc += ` — ${s.note}`;
      lines.push(desc);
    }
    lines.push('');
  } else {
    lines.push(`No file-based sprites for ${genre} — generate ALL textures procedurally.`);
    lines.push('');
  }

  lines.push('Procedural texture example:');
  lines.push('  const g = this.make.graphics({ add: false });');
  lines.push('  g.fillStyle(0xff0000); g.fillRect(0, 0, 32, 32);');
  lines.push("  g.generateTexture('player', 32, 32); g.clear();");
  lines.push('  g.destroy();');

  return lines.join('\n');
}
