/**
 * 2D Physics Snippet
 * Reusable gravity, friction, bounce, and collision detection patterns.
 * The AI injects this as reference when building platformers, action games, etc.
 */

export const PHYSICS_2D_SNIPPET = `
// ===== 2D PHYSICS ENGINE (copy/adapt these patterns) =====

// --- Gravity & Jumping ---
// In your game loop:
//   player.vy += GRAVITY * dt;
//   player.y += player.vy * dt;
//   if (player.y >= groundY) { player.y = groundY; player.vy = 0; player.onGround = true; }
// To jump:
//   if (player.onGround) { player.vy = -JUMP_FORCE; player.onGround = false; }

const GRAVITY = 1200;      // pixels/sec^2 — tune this for feel
const JUMP_FORCE = 500;    // initial upward velocity
const FRICTION = 0.85;     // multiply velocity each frame for deceleration
const BOUNCE = 0.6;        // restitution coefficient (0 = no bounce, 1 = full bounce)

// --- AABB Rectangle Collision ---
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// --- Circle Collision ---
function circlesOverlap(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < a.radius + b.radius;
}

// --- Circle vs Rectangle Collision ---
function circleRectOverlap(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX, dy = circle.y - closestY;
  return (dx * dx + dy * dy) < (circle.radius * circle.radius);
}

// --- Platformer Collision Resolution ---
// Call after moving player. Checks each platform and pushes player out.
function resolvePlatformCollisions(player, platforms) {
  for (const plat of platforms) {
    if (!rectsOverlap(player, plat)) continue;
    // Falling down onto platform top
    const overlapBottom = (player.y + player.h) - plat.y;
    if (overlapBottom > 0 && overlapBottom < 20 && player.vy >= 0) {
      player.y = plat.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }
}

// --- Velocity-based Movement with Friction ---
function updateMovement(obj, dt) {
  obj.x += obj.vx * dt;
  obj.y += obj.vy * dt;
  obj.vx *= FRICTION;
  if (Math.abs(obj.vx) < 0.5) obj.vx = 0;
}

// --- Bounce off walls ---
function bounceOffWalls(obj, canvasW, canvasH) {
  if (obj.x <= 0 || obj.x + obj.w >= canvasW) { obj.vx *= -BOUNCE; }
  if (obj.y <= 0 || obj.y + obj.h >= canvasH) { obj.vy *= -BOUNCE; }
  obj.x = Math.max(0, Math.min(obj.x, canvasW - obj.w));
  obj.y = Math.max(0, Math.min(obj.y, canvasH - obj.h));
}
`;
