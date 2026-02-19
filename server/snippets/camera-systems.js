/**
 * Camera Systems Snippet (Phaser.js)
 * Follow cam, bounds, parallax, zoom, and effects.
 * Essential for any game with a world larger than one screen.
 */

export const CAMERA_SYSTEMS_SNIPPET = `
// ===== PHASER CAMERA PATTERNS =====

// --- Basic Follow Camera ---
//   // In create():
//   this.cameras.main.startFollow(player, true, 0.1, 0.1);
//   this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
//   this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

// --- Side-Scroll Camera (platformer — follow X more than Y) ---
//   this.cameras.main.startFollow(player, true, 0.08, 0.05);
//   this.cameras.main.setDeadzone(100, 50);  // player can move in center without camera moving
//   this.cameras.main.setBounds(0, 0, levelWidth, 500);

// --- Zoom (for dramatic moments or minimap feel) ---
//   this.cameras.main.setZoom(1.5);  // zoom in
//   this.cameras.main.setZoom(1);    // normal
//   // Animated zoom:
//   this.tweens.add({
//     targets: this.cameras.main, zoom: 1.5, duration: 300, yoyo: true
//   });

// --- Camera Shake (impacts, explosions) ---
//   this.cameras.main.shake(200, 0.01);    // mild shake
//   this.cameras.main.shake(400, 0.03);    // heavy impact

// --- Camera Flash (damage, power-up) ---
//   this.cameras.main.flash(100);                    // white flash
//   this.cameras.main.flash(200, 255, 0, 0);        // red flash (damage)
//   this.cameras.main.flash(200, 255, 255, 0);      // yellow flash (power-up)

// --- Camera Fade (scene transitions) ---
//   this.cameras.main.fadeOut(500);
//   this.cameras.main.once('camerafadeoutcomplete', () => {
//     this.scene.start('NextLevel');
//   });
//   // In next scene's create(): this.cameras.main.fadeIn(500);

// --- Parallax Background with TileSprites ---
//   // In create():
//   this.bg1 = this.add.tileSprite(400, 250, 800, 500, 'sky').setScrollFactor(0);
//   this.bg2 = this.add.tileSprite(400, 250, 800, 500, 'mountains').setScrollFactor(0);
//   // In update():
//   this.bg1.tilePositionX = this.cameras.main.scrollX * 0.1;
//   this.bg2.tilePositionX = this.cameras.main.scrollX * 0.3;

// --- Parallax with Plain Colors (no images needed) ---
//   // In create(): draw colored rectangles at different scroll factors
//   this.add.rectangle(400, 480, 800, 80, 0x2d5a1e).setScrollFactor(0.2);  // distant hills
//   this.add.rectangle(400, 490, 800, 60, 0x3a7a28).setScrollFactor(0.5);  // mid hills
//   // Main game objects at default scrollFactor (1.0)

// --- Camera Bounds for Rooms/Levels ---
//   // Switch camera bounds when entering a new room:
//   function enterRoom(scene, rx, ry, rw, rh) {
//     scene.cameras.main.setBounds(rx, ry, rw, rh);
//     scene.cameras.main.fadeIn(300);
//   }

// --- 3D Chase Camera (Three.js — for 3D games only) ---
//   // Camera sits behind and above the player:
//   // camera.position.set(player.x, 5, player.z + 10);
//   // camera.lookAt(player.x, 1, player.z - 20);
//   // See THREE_D_RACING_RULES for full 3D racing camera pattern.
`;
