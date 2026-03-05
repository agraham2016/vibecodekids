/**
 * Asset Manifest
 * Maps game genres to available sprite and sound assets.
 * The reference resolver injects the relevant subset into the AI prompt.
 */

import { SPRITE_ASSET_MAX_CHARS } from '../config/index.js';

export const ASSET_MANIFEST = {
  platformer: {
    sprites: [
      { key: 'player', path: '/assets/sprites/platformer/player.png', w: 32, h: 32 },
      {
        key: 'tiles',
        path: '/assets/sprites/platformer/tiles.png',
        w: 16,
        h: 16,
        note: 'tileset: 4 tiles (grass, dirt, stone, brick) in a row',
      },
      { key: 'coin', path: '/assets/sprites/platformer/coin.png', w: 16, h: 16 },
      { key: 'enemy', path: '/assets/sprites/platformer/enemy.png', w: 32, h: 32 },
      { key: 'platform', path: '/assets/sprites/platformer/platform.png', w: 64, h: 16 },
    ],
    sounds: ['jump', 'coin', 'hit', 'win', 'lose'],
  },
  shooter: {
    sprites: [
      { key: 'ship', path: '/assets/sprites/shooter/ship.png', w: 32, h: 48 },
      { key: 'enemy', path: '/assets/sprites/shooter/enemy.png', w: 28, h: 28 },
      { key: 'bullet', path: '/assets/sprites/shooter/bullet.png', w: 8, h: 16 },
      {
        key: 'explosion',
        path: '/assets/sprites/shooter/explosion.png',
        w: 64,
        h: 64,
        note: 'spritesheet: 4 frames in a row (256x64), frameWidth: 64',
      },
    ],
    sounds: ['explosion', 'hit', 'powerup', 'win', 'lose'],
  },
  racing: {
    sprites: [
      { key: 'car-player', path: '/assets/sprites/racing/car-player.png', w: 24, h: 40 },
      { key: 'car-obstacle', path: '/assets/sprites/racing/car-obstacle.png', w: 24, h: 40 },
      {
        key: 'road',
        path: '/assets/sprites/racing/road.png',
        w: 16,
        h: 16,
        note: 'tileable road tile with dashed center line',
      },
    ],
    sounds: ['hit', 'explosion', 'win', 'lose'],
  },
  rpg: {
    sprites: [
      { key: 'hero', path: '/assets/sprites/rpg/hero.png', w: 32, h: 32 },
      { key: 'npc', path: '/assets/sprites/rpg/npc.png', w: 32, h: 32 },
      { key: 'wall', path: '/assets/sprites/rpg/wall.png', w: 16, h: 16, note: 'tileable stone wall' },
      { key: 'treasure', path: '/assets/sprites/rpg/treasure.png', w: 16, h: 16 },
    ],
    sounds: ['coin', 'hit', 'powerup', 'win', 'lose'],
  },
  puzzle: {
    sprites: [
      {
        key: 'gems',
        path: '/assets/sprites/puzzle/gems.png',
        w: 32,
        h: 32,
        note: 'spritesheet: 6 colored gems in a row (192x32), frameWidth: 32',
      },
    ],
    sounds: ['coin', 'click', 'win', 'lose'],
  },
  clicker: {
    sprites: [
      { key: 'gem', path: '/assets/sprites/clicker/gem.png', w: 64, h: 64 },
      { key: 'sparkle', path: '/assets/sprites/clicker/sparkle.png', w: 16, h: 16 },
    ],
    sounds: ['click', 'coin', 'powerup', 'win'],
  },
  frogger: {
    sprites: [
      { key: 'frog', path: '/assets/sprites/frogger/frog.png', w: 24, h: 24 },
      { key: 'car', path: '/assets/sprites/frogger/car.png', w: 48, h: 24 },
      { key: 'truck', path: '/assets/sprites/frogger/truck.png', w: 72, h: 24 },
      { key: 'log', path: '/assets/sprites/frogger/log.png', w: 64, h: 24 },
    ],
    sounds: ['jump', 'hit', 'win', 'lose'],
  },
  'endless-runner': {
    sprites: [
      { key: 'player', path: '/assets/sprites/endless-runner/player.png', w: 32, h: 32 },
      { key: 'obstacle', path: '/assets/sprites/endless-runner/obstacle.png', w: 32, h: 32 },
      { key: 'coin', path: '/assets/sprites/endless-runner/coin.png', w: 16, h: 16 },
      { key: 'ground', path: '/assets/sprites/endless-runner/ground.png', w: 64, h: 32 },
    ],
    sounds: ['jump', 'coin', 'hit', 'win', 'lose'],
  },
  'tower-defense': {
    sprites: [
      { key: 'tower', path: '/assets/sprites/tower-defense/tower.png', w: 32, h: 32 },
      { key: 'enemy', path: '/assets/sprites/tower-defense/enemy.png', w: 24, h: 24 },
      { key: 'bullet', path: '/assets/sprites/tower-defense/bullet.png', w: 8, h: 8 },
      { key: 'path', path: '/assets/sprites/tower-defense/path.png', w: 40, h: 40 },
    ],
    sounds: ['hit', 'explosion', 'coin', 'win', 'lose'],
  },
  fighting: {
    sprites: [
      { key: 'fighter', path: '/assets/sprites/fighting/fighter.png', w: 32, h: 40 },
      { key: 'enemy', path: '/assets/sprites/fighting/enemy.png', w: 32, h: 40 },
      { key: 'punch', path: '/assets/sprites/fighting/punch.png', w: 16, h: 16 },
    ],
    sounds: ['hit', 'explosion', 'win', 'lose'],
  },
  snake: {
    sprites: [
      { key: 'head', path: '/assets/sprites/snake/head.png', w: 20, h: 20 },
      { key: 'body', path: '/assets/sprites/snake/body.png', w: 20, h: 20 },
      { key: 'food', path: '/assets/sprites/snake/food.png', w: 20, h: 20 },
    ],
    sounds: ['coin', 'hit', 'win', 'lose'],
  },
  sports: {
    sprites: [
      { key: 'player', path: '/assets/sprites/sports/player.png', w: 24, h: 24 },
      { key: 'opponent', path: '/assets/sprites/sports/opponent.png', w: 24, h: 24 },
      { key: 'ball', path: '/assets/sprites/sports/ball.png', w: 16, h: 16 },
      { key: 'goal', path: '/assets/sprites/sports/goal.png', w: 16, h: 48 },
    ],
    sounds: ['hit', 'coin', 'win', 'lose'],
  },
  'brick-breaker': {
    sprites: [
      { key: 'paddle', path: '/assets/sprites/brick-breaker/paddle.png', w: 64, h: 12 },
      { key: 'ball', path: '/assets/sprites/brick-breaker/ball.png', w: 12, h: 12 },
      { key: 'brick', path: '/assets/sprites/brick-breaker/brick.png', w: 48, h: 16 },
      { key: 'powerup', path: '/assets/sprites/brick-breaker/powerup.png', w: 16, h: 16 },
    ],
    sounds: ['hit', 'coin', 'explosion', 'win', 'lose'],
  },
  flappy: {
    sprites: [
      { key: 'bird', path: '/assets/sprites/flappy/bird.png', w: 24, h: 24 },
      { key: 'pipe', path: '/assets/sprites/flappy/pipe.png', w: 48, h: 200 },
    ],
    sounds: ['jump', 'hit', 'coin', 'win', 'lose'],
  },
  'bubble-shooter': {
    sprites: [
      {
        key: 'bubbles',
        path: '/assets/sprites/bubble-shooter/bubbles.png',
        w: 32,
        h: 32,
        note: 'spritesheet: 6 colored bubbles (192x32), frameWidth: 32',
      },
      { key: 'arrow', path: '/assets/sprites/bubble-shooter/arrow.png', w: 16, h: 48 },
    ],
    sounds: ['hit', 'coin', 'explosion', 'win', 'lose'],
  },
  'falling-blocks': {
    sprites: [
      {
        key: 'blocks',
        path: '/assets/sprites/falling-blocks/blocks.png',
        w: 28,
        h: 28,
        note: 'spritesheet: 7 colored blocks (196x32), frameWidth: 28',
      },
    ],
    sounds: ['click', 'coin', 'win', 'lose'],
  },
  rhythm: {
    sprites: [
      {
        key: 'arrows',
        path: '/assets/sprites/rhythm/arrows.png',
        w: 32,
        h: 32,
        note: 'spritesheet: 4 colored arrows (128x32), frameWidth: 32',
      },
      { key: 'target', path: '/assets/sprites/rhythm/target.png', w: 32, h: 32 },
    ],
    sounds: ['hit', 'coin', 'click', 'win', 'lose'],
  },
  'pet-sim': {
    sprites: [
      { key: 'pet', path: '/assets/sprites/pet-sim/pet.png', w: 48, h: 48 },
      { key: 'heart', path: '/assets/sprites/pet-sim/heart.png', w: 24, h: 24 },
      { key: 'food', path: '/assets/sprites/pet-sim/food.png', w: 24, h: 24 },
      { key: 'toy', path: '/assets/sprites/pet-sim/toy.png', w: 24, h: 24 },
    ],
    sounds: ['click', 'coin', 'powerup', 'win', 'lose'],
  },
  pong: {
    sprites: [
      { key: 'paddle', path: '/assets/sprites/brick-breaker/paddle.png', w: 64, h: 12 },
      { key: 'ball', path: '/assets/sprites/brick-breaker/ball.png', w: 12, h: 12 },
    ],
    sounds: ['hit', 'coin', 'win', 'lose'],
  },
  catch: {
    sprites: [
      { key: 'basket', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'or generate procedurally' },
      { key: 'good', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
      { key: 'bad', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'use tint for bad item' },
    ],
    sounds: ['coin', 'hit', 'win', 'lose'],
  },
  'whack-a-mole': {
    sprites: [
      { key: 'mole', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'or generate procedurally' },
      { key: 'hole', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'or generate procedurally' },
    ],
    sounds: ['hit', 'coin', 'win', 'lose'],
  },
  memory: {
    sprites: [
      { key: 'card', path: '/assets/sprites/puzzle/gems.png', w: 32, h: 32 },
      { key: 'cardBack', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'or generate procedurally' },
    ],
    sounds: ['coin', 'click', 'win', 'lose'],
  },
  maze: {
    sprites: [
      { key: 'dot', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
      { key: 'player', path: '/assets/sprites/platformer/player.png', w: 32, h: 32 },
      { key: 'ghost', path: '/assets/sprites/shooter/enemy.png', w: 28, h: 28 },
    ],
    sounds: ['coin', 'hit', 'win', 'lose'],
  },
  'top-down-shooter': {
    sprites: [
      { key: 'player', path: '/assets/sprites/shooter/ship.png', w: 32, h: 48 },
      { key: 'bullet', path: '/assets/sprites/shooter/bullet.png', w: 8, h: 16 },
      { key: 'enemy', path: '/assets/sprites/shooter/enemy.png', w: 28, h: 28 },
    ],
    sounds: ['hit', 'explosion', 'win', 'lose'],
  },
  fishing: {
    sprites: [
      { key: 'bobber', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'or generate procedurally' },
      { key: 'fish', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'or generate procedurally' },
    ],
    sounds: ['coin', 'click', 'win', 'lose'],
  },
  'simon-says': {
    sprites: [
      { key: 'button', path: '/assets/sprites/common/star.png', w: 16, h: 16, note: 'or generate procedurally' },
    ],
    sounds: ['click', 'coin', 'hit', 'win', 'lose'],
  },
  common: {
    sprites: [
      { key: 'heart', path: '/assets/sprites/common/heart.png', w: 16, h: 16 },
      { key: 'star', path: '/assets/sprites/common/star.png', w: 16, h: 16 },
      { key: 'particle', path: '/assets/sprites/common/particle.png', w: 8, h: 8 },
    ],
    sounds: ['jump', 'coin', 'explosion', 'hit', 'powerup', 'click', 'win', 'lose'],
    soundPaths: {
      jump: '/assets/sounds/jump.wav',
      coin: '/assets/sounds/coin.wav',
      explosion: '/assets/sounds/explosion.wav',
      hit: '/assets/sounds/hit.wav',
      powerup: '/assets/sounds/powerup.wav',
      click: '/assets/sounds/click.wav',
      win: '/assets/sounds/win.wav',
      lose: '/assets/sounds/lose.wav',
    },
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

  const lines = ['AVAILABLE SPRITE & SOUND ASSETS (use these in preload):', ''];

  for (const role of roleOrder) {
    const list = byRole[role];
    if (list.length === 0) continue;
    const label = role === 'other' ? 'Other sprites' : `${role} sprites`;
    lines.push(`${label}:`);
    list.forEach((s, i) => {
      const key = list.length === 1 ? role : `${role}${i + 1}`;
      let desc = `  this.load.image('${key}', '${s.path}');  // ${s.w}x${s.h}`;
      if (s.note) desc += ` — ${s.note}`;
      lines.push(desc);
    });
    lines.push('');
  }

  lines.push('Common sprites:');
  for (const s of common.sprites) {
    lines.push(`  this.load.image('${s.key}', '${s.path}');  // ${s.w}x${s.h}`);
  }

  lines.push('');
  lines.push('Sound effects:');
  for (const sndKey of soundKeys.slice(0, 8)) {
    const p = common.soundPaths?.[sndKey];
    if (p) lines.push(`  this.load.audio('${sndKey}', '${p}');`);
  }

  lines.push('');
  lines.push("Play sounds: this.sound.play('coin');");
  lines.push('If a sprite does not match the theme, generate a texture procedurally instead.');

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
  if (!genreAssets) return '';

  let lines = ['AVAILABLE SPRITE & SOUND ASSETS (use these in preload):'];
  lines.push('');
  lines.push(`Genre sprites (${genre}):`);
  for (const s of genreAssets.sprites) {
    let desc = `  this.load.image('${s.key}', '${s.path}');  // ${s.w}x${s.h}`;
    if (s.note) desc += ` — ${s.note}`;
    lines.push(desc);
  }

  lines.push('');
  lines.push('Common sprites:');
  for (const s of common.sprites) {
    lines.push(`  this.load.image('${s.key}', '${s.path}');  // ${s.w}x${s.h}`);
  }

  lines.push('');
  lines.push('Sound effects:');
  for (const sndKey of genreAssets.sounds) {
    const p = common.soundPaths[sndKey];
    if (p) lines.push(`  this.load.audio('${sndKey}', '${p}');`);
  }

  lines.push('');
  lines.push("Play sounds: this.sound.play('coin');");
  lines.push('If a sprite does not match the theme, generate a texture procedurally instead.');

  return lines.join('\n');
}
