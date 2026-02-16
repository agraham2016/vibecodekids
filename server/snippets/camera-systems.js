/**
 * Camera Systems Snippet
 * Chase cam, top-down follow, side-scroll, parallax, smooth lerp.
 * Essential for any game with a world larger than one screen.
 */

export const CAMERA_SYSTEMS_SNIPPET = `
// ===== CAMERA SYSTEMS =====

// --- Smooth Follow Camera (2D) ---
// Camera position lerps toward the player. Feels smooth and professional.
var camera = { x: 0, y: 0 };
var CAMERA_LERP = 0.08; // 0.01 = very smooth/slow, 0.2 = snappy

function updateCamera(player, canvasW, canvasH) {
  var targetX = player.x - canvasW / 2;
  var targetY = player.y - canvasH / 2;
  camera.x += (targetX - camera.x) * CAMERA_LERP;
  camera.y += (targetY - camera.y) * CAMERA_LERP;
}

// Apply camera offset before drawing:
//   ctx.save();
//   ctx.translate(-camera.x, -camera.y);
//   // ... draw all game objects ...
//   ctx.restore();
//   // Draw HUD after restore (HUD stays fixed on screen)

// --- Side-Scrolling Camera ---
// Camera only follows player horizontally. Good for platformers.
function updateSideScrollCamera(player, canvasW) {
  camera.x += (player.x - canvasW * 0.3 - camera.x) * CAMERA_LERP;
  // Don't scroll past world start
  if (camera.x < 0) camera.x = 0;
}

// --- Parallax Background Layers ---
// Multiple background layers move at different speeds for depth illusion.
// Layer 0 (farthest): 0.1x camera speed. Layer 1: 0.3x. Layer 2: 0.6x.
var parallaxLayers = [
  { img: null, speed: 0.1, x: 0 },  // Sky / distant mountains
  { img: null, speed: 0.3, x: 0 },  // Mid-ground (trees, buildings)
  { img: null, speed: 0.6, x: 0 },  // Foreground (close details)
];

function drawParallax(ctx, canvasW, canvasH) {
  for (var layer of parallaxLayers) {
    var offsetX = -camera.x * layer.speed;
    // Tile the layer to fill screen
    ctx.fillStyle = layer.color || '#1a1a2e'; // fallback solid color
    ctx.fillRect(0, 0, canvasW, canvasH);
    // If using drawn shapes (no images):
    // Draw repeated shapes at offsetX intervals
  }
}

// --- Top-Down Camera (RPG, open world) ---
// Camera centers on player, clamps to world bounds.
function updateTopDownCamera(player, canvasW, canvasH, worldW, worldH) {
  camera.x = player.x - canvasW / 2;
  camera.y = player.y - canvasH / 2;
  // Clamp to world bounds
  camera.x = Math.max(0, Math.min(camera.x, worldW - canvasW));
  camera.y = Math.max(0, Math.min(camera.y, worldH - canvasH));
}

// --- 3D Chase Camera (Three.js) ---
// For racing, driving, and third-person games.
// Camera sits behind and above the player, looks forward.
//   var chaseCamOffset = { x: 0, y: 5, z: 12 };
//   var chaseCamLookAhead = 20;
//
//   function updateChaseCamera(camera, target) {
//     camera.position.x += (target.position.x + chaseCamOffset.x - camera.position.x) * 0.1;
//     camera.position.y += (target.position.y + chaseCamOffset.y - camera.position.y) * 0.05;
//     camera.position.z = target.position.z + chaseCamOffset.z;
//     camera.lookAt(target.position.x, target.position.y + 1, target.position.z - chaseCamLookAhead);
//   }

// --- Camera Zoom (for dramatic moments) ---
var targetZoom = 1.0;
var currentZoom = 1.0;

function setZoom(z) { targetZoom = z; }

function updateZoom(ctx, canvasW, canvasH) {
  currentZoom += (targetZoom - currentZoom) * 0.05;
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(currentZoom, currentZoom);
  ctx.translate(-canvasW / 2, -canvasH / 2);
  // ... draw scene ...
  // ctx.restore(); after drawing
}
`;
