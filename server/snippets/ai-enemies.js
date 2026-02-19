/**
 * AI Enemies Snippet (Phaser.js)
 * Patrol, chase, wave spawning, and boss patterns using Phaser groups.
 * Used for shooters, platformers, RPGs, tower defense.
 */

export const AI_ENEMIES_SNIPPET = `
// ===== PHASER ENEMY AI PATTERNS =====

// --- Patrol (bounce between two x positions) ---
// In create():
//   enemies = this.physics.add.group();
//   const e = enemies.create(300, 400, 'enemy');
//   e.setVelocityX(100);
//   e.patrolMin = 200; e.patrolMax = 500;
//   e.body.setAllowGravity(false);
//
// In update():
//   enemies.children.each(e => {
//     if (e.x <= e.patrolMin) e.setVelocityX(Math.abs(e.body.velocity.x));
//     if (e.x >= e.patrolMax) e.setVelocityX(-Math.abs(e.body.velocity.x));
//   });

// --- Chase Player ---
//   enemies.children.each(e => {
//     const dist = Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y);
//     if (dist < 250) {
//       this.physics.moveToObject(e, player, 120);
//     } else {
//       e.setVelocity(0);
//     }
//   });

// --- Flee from Player ---
//   const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
//   if (dist < 150) {
//     const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
//     this.physics.velocityFromRotation(angle, 150, enemy.body.velocity);
//   }

// --- Wave Spawning System ---
//   let wave = 0;
//   function startWave(scene) {
//     wave++;
//     const count = 3 + wave * 2;
//     for (let i = 0; i < count; i++) {
//       scene.time.delayedCall(i * 500, () => {
//         const x = Phaser.Math.Between(50, 750);
//         const e = enemies.create(x, -30, 'enemy');
//         e.setVelocityY(Phaser.Math.Between(60, 120 + wave * 15));
//         e.body.setAllowGravity(false);
//       });
//     }
//   }

// --- Enemy Shoot at Player ---
//   enemyBullets = this.physics.add.group();
//   this.time.addEvent({
//     delay: 2000, loop: true,
//     callback: () => {
//       enemies.children.each(e => {
//         if (!e.active) return;
//         const b = enemyBullets.create(e.x, e.y, 'enemyBullet');
//         b.body.setAllowGravity(false);
//         this.physics.moveToObject(b, player, 200);
//         scene.time.delayedCall(3000, () => { if (b.active) b.destroy(); });
//       });
//     }
//   });
//   this.physics.add.overlap(player, enemyBullets, playerHit, null, this);

// --- Boss Pattern (phases based on HP) ---
//   boss.maxHp = 50; boss.hp = 50;
//   // In update():
//   const hpPct = boss.hp / boss.maxHp;
//   if (hpPct > 0.6) {
//     // Phase 1: Slow patrol
//     if (boss.x < 200) boss.setVelocityX(80);
//     if (boss.x > 600) boss.setVelocityX(-80);
//   } else if (hpPct > 0.3) {
//     // Phase 2: Chase + shoot faster
//     this.physics.moveToObject(boss, player, 150);
//   } else {
//     // Phase 3: Enraged — fast chase + screen shake
//     this.physics.moveToObject(boss, player, 250);
//     this.cameras.main.shake(100, 0.005);
//   }

// --- Cleanup Off-Screen Enemies ---
//   enemies.children.each(e => {
//     if (e.y > 600 || e.y < -60 || e.x < -60 || e.x > 860) e.destroy();
//   });
`;
