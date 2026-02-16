/**
 * UI Components Snippet
 * HUD, health bars, menus, shop/garage screens, score displays.
 * Common UI patterns every game needs.
 */

export const UI_COMPONENTS_SNIPPET = `
// ===== GAME UI COMPONENTS =====

// --- HUD Overlay (score, health, level — HTML on top of canvas) ---
// Create an HTML div positioned over the game canvas.
// Pattern:
//   <div id="hud" style="position:absolute; top:0; left:0; right:0; padding:10px;
//     display:flex; justify-content:space-between; color:white; font-family:sans-serif;
//     font-size:18px; font-weight:bold; text-shadow:2px 2px 4px rgba(0,0,0,0.8);
//     pointer-events:none; z-index:10;">
//     <span id="hud-score">Score: 0</span>
//     <span id="hud-level">Level 1</span>
//     <span id="hud-lives">❤️❤️❤️</span>
//   </div>
//
// Update in game loop:
//   document.getElementById('hud-score').textContent = 'Score: ' + score;

// --- Health Bar (Canvas-drawn) ---
function drawHealthBar(ctx, x, y, width, height, current, max, color) {
  var pct = current / max;
  // Background
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, width, height);
  // Fill
  ctx.fillStyle = pct > 0.5 ? (color || '#44ff44') : pct > 0.25 ? '#ffaa00' : '#ff4444';
  ctx.fillRect(x + 1, y + 1, (width - 2) * pct, height - 2);
  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

// --- Title Screen / Menu ---
// Pattern: Draw centered text + buttons. Listen for click/key to start.
function drawTitleScreen(ctx, w, h, title, subtitle) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, h / 2 - 40);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(subtitle || 'Press Space or Click to Start', w / 2, h / 2 + 20);
}

// --- Game Over Screen ---
function drawGameOver(ctx, w, h, score, highScore) {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', w / 2, h / 2 - 50);
  ctx.fillStyle = '#fff';
  ctx.font = '24px sans-serif';
  ctx.fillText('Score: ' + score, w / 2, h / 2 + 10);
  if (score >= highScore) {
    ctx.fillStyle = '#ffff00';
    ctx.fillText('NEW HIGH SCORE!', w / 2, h / 2 + 45);
  }
  ctx.fillStyle = '#aaa';
  ctx.font = '18px sans-serif';
  ctx.fillText('Click or press Space to play again', w / 2, h / 2 + 90);
}

// --- Shop / Garage Screen (HTML-based) ---
// Pattern: Show a grid of items/cars. Each has name, image/emoji, stats, price.
//   <div class="shop-grid">
//     <div class="shop-item" onclick="buyItem(0)">
//       <div class="shop-icon">🏎️</div>
//       <div class="shop-name">Street Racer</div>
//       <div class="shop-stats">Speed: ⭐⭐⭐⭐</div>
//       <div class="shop-price">$500</div>
//     </div>
//   </div>
//
// Use CSS grid: display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px;

// --- Minimap (for open-world / RPG games) ---
function drawMinimap(ctx, x, y, size, player, objects, worldSize) {
  var scale = size / worldSize;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(x, y, size, size);
  // Player dot
  ctx.fillStyle = '#44ff44';
  ctx.beginPath();
  ctx.arc(x + player.x * scale, y + player.y * scale, 3, 0, Math.PI * 2);
  ctx.fill();
  // Objects (enemies, items, etc.)
  for (var obj of objects) {
    ctx.fillStyle = obj.color || '#ff4444';
    ctx.fillRect(x + obj.x * scale - 1, y + obj.y * scale - 1, 3, 3);
  }
}

// --- Combo Counter ---
var comboCount = 0;
var comboTimer = 0;
var COMBO_TIMEOUT = 2.0; // seconds

function addCombo() {
  comboCount++;
  comboTimer = COMBO_TIMEOUT;
  // Display: "3x COMBO!" centered on screen
}
function updateCombo(dt) {
  if (comboCount > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) comboCount = 0;
  }
}
`;
