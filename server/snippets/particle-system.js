/**
 * Particle System Snippet (Phaser.js)
 * Explosions, trails, sparkles, screen shake, floating text.
 * Makes games feel "juicy" and satisfying.
 */

export const PARTICLE_SYSTEM_SNIPPET = `
// ===== PHASER PARTICLE & EFFECTS PATTERNS =====

// --- Generate a Particle Texture (in preload) ---
//   const pg = this.make.graphics({ add: false });
//   pg.fillStyle(0xffffff); pg.fillCircle(4, 4, 4);
//   pg.generateTexture('particle', 8, 8); pg.destroy();

// --- Explosion Effect (one-shot burst) ---
//   function explode(scene, x, y) {
//     scene.add.particles(x, y, 'particle', {
//       speed: { min: 80, max: 250 },
//       lifespan: 400,
//       quantity: 20,
//       scale: { start: 1.2, end: 0 },
//       tint: [0xff4400, 0xffaa00, 0xffff00],
//       emitting: false
//     }).explode();
//   }

// --- Confetti Burst (celebration) ---
//   function confetti(scene, x, y) {
//     scene.add.particles(x, y, 'particle', {
//       speed: { min: 100, max: 350 },
//       lifespan: 1200,
//       quantity: 40,
//       scale: { start: 1, end: 0.3 },
//       tint: [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff],
//       gravityY: 200,
//       emitting: false
//     }).explode();
//   }

// --- Trail Effect (continuous, follow a sprite) ---
//   const trail = scene.add.particles(0, 0, 'particle', {
//     speed: 15,
//     lifespan: 300,
//     scale: { start: 0.6, end: 0 },
//     tint: 0x8888ff,
//     follow: player,
//     quantity: 1,
//     frequency: 30
//   });

// --- Screen Shake ---
//   this.cameras.main.shake(200, 0.01);     // mild
//   this.cameras.main.shake(300, 0.03);     // strong (boss hit)

// --- Screen Flash ---
//   this.cameras.main.flash(100, 255, 255, 255);   // white flash
//   this.cameras.main.flash(200, 255, 0, 0);       // red flash (damage)

// --- Floating Score Text ("+100" that drifts up and fades) ---
//   function floatingText(scene, x, y, text, color) {
//     const txt = scene.add.text(x, y, text, {
//       fontSize: '22px', fill: color || '#ffff00',
//       stroke: '#000', strokeThickness: 3
//     }).setOrigin(0.5);
//     scene.tweens.add({
//       targets: txt, y: y - 50, alpha: 0, duration: 800,
//       ease: 'Cubic.easeOut',
//       onComplete: () => txt.destroy()
//     });
//   }

// --- Scale Pulse (satisfying click/collect feedback) ---
//   scene.tweens.add({
//     targets: sprite,
//     scaleX: 1.3, scaleY: 1.3,
//     duration: 80, yoyo: true, ease: 'Quad.easeOut'
//   });

// --- Slow-Motion Effect (brief) ---
//   scene.time.timeScale = 0.3;  // slow
//   scene.time.delayedCall(500, () => { scene.time.timeScale = 1; });  // restore
`;
