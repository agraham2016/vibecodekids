/**
 * Canvas Fallback Art Snippet
 *
 * Guidance for polished procedural textures when no real sprite fits.
 * Intended for Phaser preload() fallback paths.
 */

export const CANVAS_FALLBACK_ART_SNIPPET = `// CANVAS FALLBACK ART PLAYBOOK
// Use this only when no provided sprite pack fits the requested object.
// Match canvas width/height to the final display size to avoid blurry stretching.
// Build art in layers: shadow -> base silhouette -> midtone/detail -> highlight -> outline.
// Keep palettes tight: 2-4 colors plus one accent.
// Use ctx.save()/ctx.restore() around alpha, transforms, and shadow settings.
// Use beginPath() for each distinct shape so fills and strokes stay clean.
// Prefer arcs and curves over boxy rectangles for characters and props.
// Use ONE soft shadow and ONE highlight for depth; cache the result as a texture once in preload().

function makeCanvasTexture(scene, key, width, height, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  drawFn(ctx, width, height);
  scene.textures.addCanvas(key, canvas);
}

function drawPolishedToken(ctx, width, height, palette) {
  ctx.clearRect(0, 0, width, height);

  // Ground shadow: keeps the token readable on bright backgrounds.
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = palette.shadow || '#111827';
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.84, width * 0.26, height * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyGradient = ctx.createLinearGradient(0, 0, 0, height);
  bodyGradient.addColorStop(0, palette.light);
  bodyGradient.addColorStop(1, palette.base);
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.46, Math.min(width, height) * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = Math.max(2, Math.round(width * 0.06));
  ctx.strokeStyle = palette.outline || '#1f2937';
  ctx.stroke();

  ctx.fillStyle = palette.detail || '#f8fafc';
  ctx.beginPath();
  ctx.arc(width * 0.38, height * 0.34, Math.min(width, height) * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(width * 0.6, height * 0.28, Math.min(width, height) * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

// Example:
// makeCanvasTexture(this, 'custom-token', 48, 48, (ctx, w, h) => {
//   drawPolishedToken(ctx, w, h, {
//     base: '#f97316',
//     light: '#fdba74',
//     detail: '#7c2d12',
//     outline: '#431407',
//   });
// });
`;
