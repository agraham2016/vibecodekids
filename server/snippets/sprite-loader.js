/**
 * Sprite & Sound Loader Snippet (Phaser.js)
 * Patterns for loading pre-made assets: images, spritesheets, audio.
 * Reinforces real sprite loading and safe missing-asset fallback behavior.
 */

export const SPRITE_LOADER_SNIPPET = `
// ===== PHASER SPRITE & SOUND LOADING PATTERNS =====

// --- Loading images in preload() ---
//   this.load.image('player', '/assets/sprites/platformer/player.png');
//   this.load.image('coin', '/assets/sprites/platformer/coin.png');
//   this.load.image('heart', '/assets/sprites/common/heart.png');
//   this.load.image('particle', '/assets/sprites/common/particle.png');

// --- Loading spritesheets (for animation) ---
//   this.load.spritesheet('explosion', '/assets/sprites/shooter/explosion.png', {
//     frameWidth: 64, frameHeight: 64
//   });
//   this.load.spritesheet('gems', '/assets/sprites/puzzle/gems.png', {
//     frameWidth: 32, frameHeight: 32
//   });

// --- Creating animations from spritesheets ---
//   this.anims.create({
//     key: 'explode',
//     frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 3 }),
//     frameRate: 12, repeat: 0
//   });
//   // Play: sprite.play('explode');

// --- Loading sounds ---
//   this.load.audio('jump', '/assets/sounds/jump.wav');
//   this.load.audio('coin', '/assets/sounds/coin.wav');
//   this.load.audio('explosion', '/assets/sounds/explosion.wav');
//   this.load.audio('hit', '/assets/sounds/hit.wav');
//   this.load.audio('powerup', '/assets/sounds/powerup.wav');
//   this.load.audio('win', '/assets/sounds/win.wav');

// --- Playing sounds ---
//   this.sound.play('coin');
//   this.sound.play('jump', { volume: 0.5 });
//   this.sound.play('explosion', { volume: 0.7 });

// --- Theme remixes: keep real sprites whenever possible ---
//   If the kid asks for a custom theme, keep using the closest matching sprite
//   file and restyle the WORLD around it (backgrounds, HUD, particles, names).
//   Do NOT switch the player/enemy/items to generateTexture() just to match a theme.
//   Only use the loaderror fallback when a listed file fails to load at runtime.

// --- Error-safe loading (handles missing assets gracefully) ---
//   this.load.on('loaderror', (file) => {
//     if (this.textures.exists(file.key)) return;
//     const c = document.createElement('canvas'); c.width = 64; c.height = 64;
//     const ctx = c.getContext('2d');
//     ctx.fillStyle = '#d63384';
//     ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();
//     this.textures.addCanvas(file.key, c);
//   });
//   // After load completes, check if texture exists before using:
//   if (this.textures.exists('player')) {
//     player = this.physics.add.sprite(100, 400, 'player');
//   }
`;
