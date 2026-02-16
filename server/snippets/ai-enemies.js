/**
 * AI Enemies Snippet
 * Patrol, chase, flee, wave spawning, and boss patterns.
 * Used for shooters, platformers, RPGs, tower defense.
 */

export const AI_ENEMIES_SNIPPET = `
// ===== ENEMY AI PATTERNS =====

// --- Patrol (walk back and forth) ---
function updatePatrol(enemy, dt) {
  enemy.x += enemy.speed * enemy.dir * dt;
  // Reverse at patrol bounds
  if (enemy.x <= enemy.patrolMin || enemy.x >= enemy.patrolMax) {
    enemy.dir *= -1;
  }
}

// --- Chase Player ---
function updateChase(enemy, player, dt) {
  var dx = player.x - enemy.x;
  var dy = player.y - enemy.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0 && dist < enemy.detectRange) {
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
  }
}

// --- Flee from Player (scared enemies / NPCs) ---
function updateFlee(enemy, player, dt) {
  var dx = enemy.x - player.x;
  var dy = enemy.y - player.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0 && dist < enemy.fleeRange) {
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
  }
}

// --- Shoot at Player (ranged enemy) ---
function enemyShoot(enemy, player, projectiles) {
  if (Date.now() - enemy.lastShot < enemy.shootCooldown) return;
  var dx = player.x - enemy.x;
  var dy = player.y - enemy.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > enemy.shootRange) return;
  projectiles.push({
    x: enemy.x, y: enemy.y,
    vx: (dx / dist) * 300,
    vy: (dy / dist) * 300,
    hostile: true,
    life: 3.0,
  });
  enemy.lastShot = Date.now();
}

// --- Wave Spawning System ---
var waveNumber = 0;
var enemiesRemaining = 0;

function startWave(enemies, spawnFn) {
  waveNumber++;
  var count = 3 + waveNumber * 2; // More enemies each wave
  enemiesRemaining = count;
  for (var i = 0; i < count; i++) {
    setTimeout(function() {
      enemies.push(spawnFn(waveNumber));
    }, i * 500); // Stagger spawns
  }
}

function onEnemyKilled() {
  enemiesRemaining--;
  if (enemiesRemaining <= 0) {
    // Show "Wave Complete!" then start next wave
    setTimeout(function() { startWave(enemies, spawnEnemy); }, 2000);
  }
}

// --- Boss Pattern (phases, special attacks) ---
// Bosses have phases based on HP thresholds:
//   Phase 1 (100-60% HP): Slow patrol + occasional shoot
//   Phase 2 (60-30% HP): Chase player + rapid fire
//   Phase 3 (below 30%): Enraged — faster, more projectiles, screen shake
// Pattern:
//   function updateBoss(boss, player, dt) {
//     var hpPercent = boss.hp / boss.maxHp;
//     if (hpPercent > 0.6) { updatePatrol(boss, dt); }
//     else if (hpPercent > 0.3) { updateChase(boss, player, dt); boss.shootCooldown = 500; }
//     else { updateChase(boss, player, dt); boss.speed *= 1.5; boss.shootCooldown = 200; }
//     enemyShoot(boss, player, projectiles);
//   }

// --- Spawn Helper (creates enemy at random edge position) ---
function spawnEnemyAtEdge(canvasW, canvasH, speed) {
  var side = Math.floor(Math.random() * 4);
  var e = { w: 30, h: 30, speed: speed || 100, hp: 1, dir: 1 };
  if (side === 0) { e.x = Math.random() * canvasW; e.y = -30; }
  else if (side === 1) { e.x = canvasW + 30; e.y = Math.random() * canvasH; }
  else if (side === 2) { e.x = Math.random() * canvasW; e.y = canvasH + 30; }
  else { e.x = -30; e.y = Math.random() * canvasH; }
  return e;
}
`;
