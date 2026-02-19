/**
 * Car Physics Snippet (Phaser.js)
 * Top-down driving, lane-based racing, and drift mechanics.
 * Used for racing games, driving sims, street racing.
 */

export const CAR_PHYSICS_SNIPPET = `
// ===== PHASER CAR / RACING PATTERNS =====

// --- Top-Down Scrolling Racer (obstacles scroll toward player) ---
// Player car at bottom, dodges obstacles. Road scrolls downward.
//
// In create():
//   player = this.physics.add.sprite(400, 450, 'car');
//   player.setCollideWorldBounds(true);
//   obstacles = this.physics.add.group();
//   this.physics.add.overlap(player, obstacles, crashHandler, null, this);
//
//   // Spawn obstacles on a timer
//   this.time.addEvent({
//     delay: 1200, loop: true,
//     callback: () => {
//       const lane = Phaser.Math.Between(0, 2);
//       const x = 200 + lane * 200;
//       const ob = obstacles.create(x, -40, 'obstacle');
//       ob.setVelocityY(speed);
//       ob.body.setAllowGravity(false);
//     }
//   });

// In update():
//   if (cursors.left.isDown) player.setVelocityX(-300);
//   else if (cursors.right.isDown) player.setVelocityX(300);
//   else player.setVelocityX(0);
//
//   // Speed up over time
//   speed = Math.min(speed + 0.02, 500);
//
//   // Destroy off-screen obstacles
//   obstacles.children.each(ob => { if (ob.y > 550) { ob.destroy(); score++; } });

// --- Road Visual (scrolling dashed lines) ---
// Use a tileSprite for scrolling road markings:
//   roadLines = this.add.tileSprite(400, 250, 4, 500, 'dash');
//   // In update(): roadLines.tilePositionY -= speed * delta / 1000;

// --- Top-Down Free Roam (angle-based steering) ---
// For open-world driving where the car rotates:
//   // In update():
//   if (cursors.up.isDown) {
//     this.physics.velocityFromRotation(player.rotation - Math.PI/2, 300, player.body.velocity);
//   } else {
//     player.setVelocity(0);
//   }
//   if (cursors.left.isDown) player.setAngularVelocity(-200);
//   else if (cursors.right.isDown) player.setAngularVelocity(200);
//   else player.setAngularVelocity(0);

// --- Garage / Car Selection ---
// Show car options as clickable sprites:
//   const cars = [
//     { name: 'Racer', color: 0xff4444, speed: 300, handling: 0.8 },
//     { name: 'Muscle', color: 0x4488ff, speed: 400, handling: 0.5 },
//     { name: 'Drift King', color: 0x44ff88, speed: 250, handling: 1.0 },
//   ];
//   cars.forEach((c, i) => {
//     const btn = this.add.rectangle(200 + i * 200, 300, 80, 120, c.color).setInteractive();
//     this.add.text(200 + i * 200, 370, c.name, { fontSize: '14px' }).setOrigin(0.5);
//     btn.on('pointerdown', () => selectCar(c));
//   });

// --- 3D Racing (Three.js, endless road style) ---
// Car stays at fixed Z, world scrolls toward camera.
// See THREE_D_RACING_RULES for full Three.js pattern.
`;
