/**
 * 2D Physics Snippet (Phaser.js)
 * Arcade physics patterns for platformers, action games, top-down games.
 * The AI injects this as reference when building physics-based games.
 */

export const PHYSICS_2D_SNIPPET = `
// ===== PHASER ARCADE PHYSICS PATTERNS =====

// --- Platformer Setup (gravity + platforms) ---
// In config: physics: { default: 'arcade', arcade: { gravity: { y: 800 } } }
//
// In create():
//   player = this.physics.add.sprite(100, 400, 'player');
//   player.setCollideWorldBounds(true);
//   player.setBounce(0.1);
//
//   platforms = this.physics.add.staticGroup();
//   platforms.create(400, 580, 'ground').setScale(10, 1).refreshBody();
//   platforms.create(300, 400, 'platform');
//   platforms.create(600, 300, 'platform');
//
//   this.physics.add.collider(player, platforms);

// --- Platformer Movement (in update()) ---
//   if (cursors.left.isDown) player.setVelocityX(-200);
//   else if (cursors.right.isDown) player.setVelocityX(200);
//   else player.setVelocityX(0);
//   if (cursors.up.isDown && player.body.touching.down) player.setVelocityY(-450);

// --- Top-Down Movement (no gravity — set gravity.y: 0 in config) ---
//   player.setVelocity(0);
//   if (cursors.left.isDown) player.setVelocityX(-200);
//   if (cursors.right.isDown) player.setVelocityX(200);
//   if (cursors.up.isDown) player.setVelocityY(-200);
//   if (cursors.down.isDown) player.setVelocityY(200);

// --- Projectile / Bullet Pattern ---
//   bullets = this.physics.add.group({ defaultKey: 'bullet' });
//   // Fire:
//   const b = bullets.create(player.x, player.y - 16, 'bullet');
//   b.setVelocityY(-400);
//   b.body.setAllowGravity(false);
//   // Cleanup off-screen:
//   bullets.children.each(b => { if (b.active && b.y < -10) b.destroy(); });

// --- Overlap (triggers — coins, powerups, enemy hits) ---
//   this.physics.add.overlap(player, coins, (p, coin) => {
//     coin.destroy();
//     score += 10;
//   }, null, this);

// --- Collider (solid — walls, platforms) ---
//   this.physics.add.collider(player, walls);
//   this.physics.add.collider(enemies, platforms);

// --- Bounce & Drag ---
//   player.setBounce(0.2);               // bouncy collisions
//   player.setDrag(200);                  // gradual slowdown
//   player.setMaxVelocity(300, 500);      // speed limits

// --- Moving Platforms ---
//   const movPlat = this.physics.add.image(300, 350, 'platform');
//   movPlat.setImmovable(true); movPlat.body.setAllowGravity(false);
//   this.tweens.add({ targets: movPlat, x: 500, duration: 2000, yoyo: true, repeat: -1 });
//   this.physics.add.collider(player, movPlat);
`;
