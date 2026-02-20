/**
 * Sprite & Sound Loader Snippet (Phaser.js)
 * Patterns for loading pre-made assets: images, spritesheets, audio.
 * Includes fallback to procedural texture if a sprite doesn't fit the theme.
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

// --- Fallback: generate texture if sprite doesn't fit the theme ---
//   If the kid asks for something custom (e.g. "pizza character"),
//   generate a texture procedurally instead of using the pre-made sprite:
//   const gfx = this.make.graphics({ add: false });
//   gfx.fillStyle(0xff8800); gfx.fillCircle(16, 16, 14);
//   gfx.generateTexture('pizza', 32, 32); gfx.destroy();

// --- Error-safe loading (handles missing assets gracefully) ---
//   this.load.on('loaderror', (file) => {
//     console.warn('Asset not found:', file.key);
//   });
//   // After load completes, check if texture exists before using:
//   if (this.textures.exists('player')) {
//     player = this.physics.add.sprite(100, 400, 'player');
//   }
`;
