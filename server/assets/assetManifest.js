/**
 * Asset Manifest
 * Maps game genres to available sprite and sound assets.
 * The reference resolver injects the relevant subset into the AI prompt.
 */

export const ASSET_MANIFEST = {
  platformer: {
    sprites: [
      { key: 'player', path: '/assets/sprites/platformer/player.png', w: 32, h: 32 },
      { key: 'tiles', path: '/assets/sprites/platformer/tiles.png', w: 16, h: 16, note: 'tileset: 4 tiles (grass, dirt, stone, brick) in a row' },
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
      { key: 'explosion', path: '/assets/sprites/shooter/explosion.png', w: 64, h: 64, note: 'spritesheet: 4 frames in a row (256x64), frameWidth: 64' },
    ],
    sounds: ['explosion', 'hit', 'powerup', 'win', 'lose'],
  },
  racing: {
    sprites: [
      { key: 'car-player', path: '/assets/sprites/racing/car-player.png', w: 24, h: 40 },
      { key: 'car-obstacle', path: '/assets/sprites/racing/car-obstacle.png', w: 24, h: 40 },
      { key: 'road', path: '/assets/sprites/racing/road.png', w: 16, h: 16, note: 'tileable road tile with dashed center line' },
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
      { key: 'gems', path: '/assets/sprites/puzzle/gems.png', w: 32, h: 32, note: 'spritesheet: 6 colored gems in a row (192x32), frameWidth: 32' },
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
  lines.push('Play sounds: this.sound.play(\'coin\');');
  lines.push('If a sprite does not match the theme, generate a texture procedurally instead.');

  return lines.join('\n');
}
