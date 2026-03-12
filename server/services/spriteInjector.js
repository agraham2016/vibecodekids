/**
 * Sprite Injector — Post-processes AI-generated game code to ensure
 * Kenney sprites are loaded instead of procedural shape drawing.
 *
 * AI models frequently ignore prompt instructions to use this.load.image()
 * and instead draw shapes with this.make.graphics() + generateTexture().
 * This module fixes that AFTER the AI generates code, guaranteeing real
 * sprite files are used in the final output.
 */

import { ASSET_MANIFEST } from '../assets/assetManifest.js';

/**
 * Inject sprite loading into AI-generated game code.
 *
 * @param {string} code - The full HTML game code from the AI
 * @param {string|null} genre - Detected game genre
 * @returns {string} The code with sprites injected (or original if no changes needed)
 */
export function injectSprites(code, genre) {
  if (!code || !genre) return code;

  const manifest = ASSET_MANIFEST[genre];
  if (!manifest || !manifest.sprites || manifest.sprites.length === 0) return code;

  if (codeAlreadyUsesSprites(code)) return code;

  console.log(`🎨 Sprite injector: AI did not use this.load.image() for "${genre}" — injecting sprites`);

  let modified = code;

  const spriteKeys = new Set(manifest.sprites.map((s) => s.key));
  modified = removeGraphicsBlock(modified, spriteKeys);
  modified = removeCanvasTextureBlock(modified, spriteKeys);
  modified = insertSpriteLoading(modified, manifest.sprites);

  if (modified !== code) {
    console.log(`✅ Sprite injector: replaced procedural drawing with ${manifest.sprites.length} sprite loads`);
  }

  return modified;
}

function codeAlreadyUsesSprites(code) {
  const loadImageCount = (code.match(/this\.load\.image\s*\(/g) || []).length;
  const generateTextureCount = (code.match(/generateTexture\s*\(/g) || []).length;
  return loadImageCount > 0 && loadImageCount >= generateTextureCount;
}

/**
 * Remove this.make.graphics() blocks that generate textures matching our sprite keys.
 * Pattern: var/let/const g = this.make.graphics({add:false}); ... g.destroy();
 */
function removeGraphicsBlock(code, spriteKeys) {
  const graphicsPattern =
    /(?:var|let|const)\s+(\w+)\s*=\s*this\.make\.graphics\s*\(\s*\{[^}]*\}\s*\)\s*;[\s\S]*?\1\.destroy\s*\(\s*\)\s*;?/g;

  return code.replace(graphicsPattern, (match, varName) => {
    const usedKeys = [];
    const genTexPattern = new RegExp(`${varName}\\.generateTexture\\s*\\(\\s*['"]([^'"]+)['"]`, 'g');
    let m;
    while ((m = genTexPattern.exec(match)) !== null) {
      usedKeys.push(m[1]);
    }

    const hasMatchingKeys = usedKeys.some((k) => spriteKeys.has(k));
    if (hasMatchingKeys) {
      const keptLines = [];
      const lines = match.split('\n');
      let skipUntilClear = false;

      for (const line of lines) {
        const genTexMatch = line.match(/generateTexture\s*\(\s*['"]([^'"]+)['"]/);
        if (genTexMatch && spriteKeys.has(genTexMatch[1])) {
          skipUntilClear = true;
          continue;
        }
        if (skipUntilClear && /\.clear\s*\(\s*\)/.test(line)) {
          skipUntilClear = false;
          continue;
        }
        if (skipUntilClear) continue;

        if (line.match(new RegExp(`${varName}\\.destroy`))) continue;
        if (line.match(new RegExp(`(?:var|let|const)\\s+${varName}\\s*=\\s*this\\.make\\.graphics`))) continue;

        keptLines.push(line);
      }

      const remaining = keptLines.join('\n').trim();
      return remaining || '';
    }

    return match;
  });
}

/**
 * Remove document.createElement('canvas') blocks that create textures matching our sprite keys.
 * Pattern: const c = document.createElement('canvas'); ... this.textures.addCanvas('key', c);
 */
function removeCanvasTextureBlock(code, spriteKeys) {
  const addCanvasPattern = /this\.textures\.addCanvas\s*\(\s*['"]([^'"]+)['"]/g;
  let m;
  const canvasKeys = [];
  while ((m = addCanvasPattern.exec(code)) !== null) {
    if (spriteKeys.has(m[1])) {
      canvasKeys.push(m[1]);
    }
  }

  if (canvasKeys.length === 0) return code;

  for (const key of canvasKeys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blockPattern = new RegExp(
      `(?:const|let|var)\\s+\\w+\\s*=\\s*document\\.createElement\\s*\\(\\s*['"]canvas['"]\\s*\\)\\s*;[\\s\\S]*?this\\.textures\\.addCanvas\\s*\\(\\s*['"]${escapedKey}['"][^)]*\\)\\s*;?`,
      'g',
    );
    code = code.replace(blockPattern, '');
  }

  return code;
}

/**
 * Insert this.load.image() calls + loaderror handler into the preload() method.
 */
function insertSpriteLoading(code, sprites) {
  const preloadMatch = code.match(/preload\s*\(\s*\)\s*\{/);
  if (!preloadMatch) return code;

  const insertPos = preloadMatch.index + preloadMatch[0].length;

  const loadLines = sprites.map((s) => `      this.load.image('${s.key}', '${s.path}');`).join('\n');

  const spriteBlock = `
      // Kenney sprite assets (auto-injected)
${loadLines}

      // Fallback for any missing sprites
      this.load.on('loaderror', (file) => {
        if (this.textures.exists(file.key)) return;
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(32, 28, 4, 32, 32, 24);
        grad.addColorStop(0, '#ff9ed8'); grad.addColorStop(1, '#d63384');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a0204c'; ctx.lineWidth = 2; ctx.stroke();
        this.textures.addCanvas(file.key, c);
      });
`;

  return code.slice(0, insertPos) + spriteBlock + code.slice(insertPos);
}
