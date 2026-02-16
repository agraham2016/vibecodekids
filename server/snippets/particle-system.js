/**
 * Particle System Snippet
 * Explosions, trails, sparkles, confetti, screen shake.
 * Makes games feel "juicy" and satisfying.
 */

export const PARTICLE_SYSTEM_SNIPPET = `
// ===== PARTICLE SYSTEM (game juice / visual effects) =====

// --- Particle Pool ---
var particles = [];

function spawnParticle(x, y, options = {}) {
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * (options.spread || 200),
    vy: (Math.random() - 0.5) * (options.spread || 200) - (options.upward || 0),
    life: options.life || 1.0,   // seconds remaining
    maxLife: options.life || 1.0,
    size: options.size || (4 + Math.random() * 6),
    color: options.color || '#ffaa00',
    gravity: options.gravity || 0,
    shrink: options.shrink !== false,
  });
}

function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  for (var p of particles) {
    var alpha = p.life / p.maxLife;
    var size = p.shrink ? p.size * alpha : p.size;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Explosion Effect ---
function spawnExplosion(x, y, count, color) {
  count = count || 30;
  color = color || '#ff6600';
  var colors = [color, '#ffaa00', '#ff4400', '#ffff00'];
  for (var i = 0; i < count; i++) {
    spawnParticle(x, y, {
      spread: 300,
      life: 0.4 + Math.random() * 0.6,
      size: 3 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 200,
    });
  }
}

// --- Confetti Burst ---
function spawnConfetti(x, y) {
  var colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
  for (var i = 0; i < 50; i++) {
    spawnParticle(x, y, {
      spread: 400,
      upward: 200,
      life: 1.0 + Math.random() * 1.5,
      size: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 300,
      shrink: false,
    });
  }
}

// --- Trail Effect (call each frame behind moving object) ---
function spawnTrail(x, y, color) {
  spawnParticle(x, y, {
    spread: 20,
    life: 0.3,
    size: 3 + Math.random() * 3,
    color: color || '#8888ff',
    gravity: 0,
  });
}

// --- Screen Shake ---
var shakeAmount = 0;
var shakeDuration = 0;

function startScreenShake(intensity, duration) {
  shakeAmount = intensity || 8;
  shakeDuration = duration || 0.3;
}

function updateScreenShake(dt, gameContainer) {
  if (shakeDuration > 0) {
    shakeDuration -= dt;
    var offsetX = (Math.random() - 0.5) * shakeAmount * 2;
    var offsetY = (Math.random() - 0.5) * shakeAmount * 2;
    gameContainer.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px)';
  } else {
    gameContainer.style.transform = '';
  }
}

// --- Floating Text ("+100!", "COMBO!", etc.) ---
var floatingTexts = [];

function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color: color || '#fff', life: 1.0, vy: -80 });
}

function updateFloatingTexts(dt, ctx) {
  for (var i = floatingTexts.length - 1; i >= 0; i--) {
    var ft = floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.life -= dt;
    if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
    ctx.globalAlpha = ft.life;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}
`;
