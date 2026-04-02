/**
 * Canvas Drawing Skills
 *
 * Polished procedural art examples the AI can copy into preload()
 * when no sprite asset matches the kid's request.
 *
 * Each example uses the document.createElement('canvas') +
 * this.textures.addCanvas(key, canvas) pattern that works in Phaser 3.
 */

export const CANVAS_DRAWING_SKILLS = `
CANVAS DRAWING SKILL — POLISHED PROCEDURAL ART
================================================
When no sprite from the AVAILABLE ASSETS section fits what the kid wants,
draw it yourself using these patterns. NEVER use plain single-color rectangles.
Layer at least 3 shapes per object: base shape, detail, highlight/outline.
Use gradients instead of flat fills. Add eyes and faces to characters — kids love expressive sprites.

All examples go inside preload(). Register the canvas once, then reuse the
texture key everywhere in create() and update().

────────────────────────────────────────────────
EXAMPLE 1 — HUMANOID CHARACTER (64×64)
────────────────────────────────────────────────
(function drawCharacter(scene) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  // Body
  const bodyGrad = ctx.createLinearGradient(22, 20, 42, 56);
  bodyGrad.addColorStop(0, '#4fc3f7'); bodyGrad.addColorStop(1, '#0277bd');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.roundRect(22, 24, 20, 28, 6); ctx.fill();
  // Head
  const headGrad = ctx.createRadialGradient(32, 16, 2, 32, 16, 12);
  headGrad.addColorStop(0, '#ffe0b2'); headGrad.addColorStop(1, '#ffab91');
  ctx.fillStyle = headGrad;
  ctx.beginPath(); ctx.arc(32, 16, 11, 0, Math.PI * 2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(28, 14, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(36, 14, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a237e';
  ctx.beginPath(); ctx.arc(28, 14, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(36, 14, 1.5, 0, Math.PI * 2); ctx.fill();
  // Smile
  ctx.strokeStyle = '#c62828'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(32, 18, 4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  // Arms
  ctx.fillStyle = '#0277bd';
  ctx.fillRect(14, 26, 8, 4); ctx.fillRect(42, 26, 8, 4);
  // Legs
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(24, 52, 7, 10); ctx.fillRect(33, 52, 7, 10);
  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(22, 24, 20, 28, 6); ctx.stroke();
  ctx.beginPath(); ctx.arc(32, 16, 11, 0, Math.PI * 2); ctx.stroke();
  scene.textures.addCanvas('player', c);
})(this);

────────────────────────────────────────────────
EXAMPLE 2 — ENEMY CREATURE / SLIME (48×48)
────────────────────────────────────────────────
(function drawSlime(scene) {
  const c = document.createElement('canvas'); c.width = 48; c.height = 48;
  const ctx = c.getContext('2d');
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(24, 42, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Body blob
  const grad = ctx.createRadialGradient(24, 28, 4, 24, 28, 20);
  grad.addColorStop(0, '#66bb6a'); grad.addColorStop(1, '#1b5e20');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(4, 40); ctx.quadraticCurveTo(4, 14, 24, 10);
  ctx.quadraticCurveTo(44, 14, 44, 40); ctx.closePath(); ctx.fill();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(18, 20, 6, 4, -0.3, 0, Math.PI * 2); ctx.fill();
  // Angry eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(17, 26, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(31, 26, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b71c1c';
  ctx.beginPath(); ctx.arc(17, 27, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(31, 27, 2.5, 0, Math.PI * 2); ctx.fill();
  // Eyebrow slant (angry)
  ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(12, 20); ctx.lineTo(22, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(36, 20); ctx.lineTo(26, 22); ctx.stroke();
  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, 40); ctx.quadraticCurveTo(4, 14, 24, 10);
  ctx.quadraticCurveTo(44, 14, 44, 40); ctx.closePath(); ctx.stroke();
  scene.textures.addCanvas('enemy', c);
})(this);

────────────────────────────────────────────────
EXAMPLE 3 — SPACESHIP / VEHICLE (80×40)
────────────────────────────────────────────────
(function drawShip(scene) {
  const c = document.createElement('canvas'); c.width = 80; c.height = 40;
  const ctx = c.getContext('2d');
  // Body
  const bodyGrad = ctx.createLinearGradient(0, 8, 0, 32);
  bodyGrad.addColorStop(0, '#90caf9'); bodyGrad.addColorStop(1, '#1565c0');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(76, 20); ctx.lineTo(56, 4); ctx.lineTo(10, 6);
  ctx.lineTo(4, 20); ctx.lineTo(10, 34); ctx.lineTo(56, 36); ctx.closePath();
  ctx.fill();
  // Cockpit window
  const winGrad = ctx.createRadialGradient(58, 20, 2, 58, 20, 8);
  winGrad.addColorStop(0, '#e1f5fe'); winGrad.addColorStop(1, '#4fc3f7');
  ctx.fillStyle = winGrad;
  ctx.beginPath(); ctx.ellipse(58, 20, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Engine glow
  ctx.fillStyle = '#ff6f00';
  ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(-4, 20); ctx.lineTo(4, 26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath(); ctx.moveTo(4, 17); ctx.lineTo(-1, 20); ctx.lineTo(4, 23); ctx.closePath(); ctx.fill();
  // Wing stripes
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(20, 10, 30, 3); ctx.fillRect(20, 27, 30, 3);
  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(76, 20); ctx.lineTo(56, 4); ctx.lineTo(10, 6);
  ctx.lineTo(4, 20); ctx.lineTo(10, 34); ctx.lineTo(56, 36); ctx.closePath();
  ctx.stroke();
  scene.textures.addCanvas('ship', c);
})(this);

────────────────────────────────────────────────
EXAMPLE 4 — ENVIRONMENT TILE: TREE (64×64)
────────────────────────────────────────────────
(function drawTree(scene) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  // Trunk
  const trunkGrad = ctx.createLinearGradient(26, 36, 38, 62);
  trunkGrad.addColorStop(0, '#8d6e63'); trunkGrad.addColorStop(1, '#4e342e');
  ctx.fillStyle = trunkGrad;
  ctx.beginPath(); ctx.roundRect(26, 36, 12, 26, 2); ctx.fill();
  // Foliage layers (back to front for depth)
  const colors = ['#2e7d32', '#43a047', '#66bb6a'];
  const positions = [[32, 28, 20], [32, 20, 17], [32, 13, 13]];
  colors.forEach((color, i) => {
    const grad = ctx.createRadialGradient(positions[i][0], positions[i][1], 2, positions[i][0], positions[i][1], positions[i][2]);
    grad.addColorStop(0, color); grad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(positions[i][0], positions[i][1], positions[i][2], 0, Math.PI * 2); ctx.fill();
  });
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(26, 12, 5, 4, -0.4, 0, Math.PI * 2); ctx.fill();
  scene.textures.addCanvas('tree', c);
})(this);

────────────────────────────────────────────────
EXAMPLE 5 — COLLECTIBLE COIN (32×32)
────────────────────────────────────────────────
(function drawCoin(scene) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  // Outer ring
  const grad = ctx.createRadialGradient(16, 16, 4, 16, 16, 14);
  grad.addColorStop(0, '#fff176'); grad.addColorStop(0.6, '#fdd835'); grad.addColorStop(1, '#f9a825');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI * 2); ctx.fill();
  // Inner circle
  ctx.strokeStyle = '#f57f17'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(16, 16, 10, 0, Math.PI * 2); ctx.stroke();
  // Dollar sign
  ctx.fillStyle = '#e65100'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', 16, 17);
  // Sparkle highlight
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(11, 10, 3, 2, -0.5, 0, Math.PI * 2); ctx.fill();
  scene.textures.addCanvas('coin', c);
})(this);

────────────────────────────────────────────────
EXAMPLE 6 — PROJECTILE / FIREBALL (16×16)
────────────────────────────────────────────────
(function drawFireball(scene) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const ctx = c.getContext('2d');
  // Outer glow
  const glow = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
  glow.addColorStop(0, 'rgba(255,235,59,0.9)'); glow.addColorStop(0.5, 'rgba(255,87,34,0.7)'); glow.addColorStop(1, 'rgba(255,87,34,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 16, 16);
  // Core
  const core = ctx.createRadialGradient(8, 8, 0, 8, 8, 4);
  core.addColorStop(0, '#fff'); core.addColorStop(1, '#ffeb3b');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.fill();
  scene.textures.addCanvas('fireball', c);
})(this);

────────────────────────────────────────────────
RULES FOR PROCEDURAL ART
────────────────────────────────────────────────
- ALWAYS wrap each drawing in an IIFE that receives \`this\` (the scene): (function draw(scene){ ... })(this);
- ALWAYS call scene.textures.addCanvas(key, canvas) — never this.textures.addCanvas inside the IIFE
- Match canvas size to final display size so art stays crisp — don't stretch a 16px canvas to 64px display
- Use ctx.save() / ctx.restore() around transforms and shadows to avoid state leaks
- Combine at minimum: a gradient fill, an outline or shadow, and one highlight per object
- For characters: eyes + mouth make them feel alive
- For enemies: angry eyebrows, red/dark eyes, spiky outlines
- For environment: layer 2-3 overlapping shapes for depth
- For collectibles: metallic gradient + sparkle highlight + inner detail
- For projectiles: radial glow that fades to transparent at the edges
- Cache all canvas art in preload() — NEVER redraw in update()
`;
