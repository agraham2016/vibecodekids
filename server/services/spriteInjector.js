/**
 * Sprite Injector — Post-processes AI-generated game code to ensure
 * Kenney sprites are loaded instead of procedural shape drawing.
 *
 * AI models frequently ignore prompt instructions to use this.load.image()
 * and instead draw shapes with this.make.graphics() + generateTexture().
 * This module fixes that AFTER the AI generates code, guaranteeing real
 * sprite files are used in the final output.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ASSET_MANIFEST } from '../assets/assetManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Inject sprite loading into AI-generated game code.
 *
 * Uses the actual template `this.load.image()` keys when possible, because they
 * match the keys the AI is most likely to reference in create()/update().
 *
 * @param {string} code - The full HTML game code from the AI
 * @param {string|null} genre - Detected game genre
 * @returns {Promise<string>} The code with sprites injected (or original if no changes needed)
 */
export async function injectSprites(code, genre) {
  if (!code || !genre) return code;

  const spriteLoads = await getSpriteLoadsForGenre(genre);
  if (spriteLoads.length === 0) return code;

  const proceduralTextureCount =
    (code.match(/generateTexture\s*\(/g) || []).length + (code.match(/this\.textures\.addCanvas\s*\(/g) || []).length;
  const loadImageCount = (code.match(/this\.load\.image\s*\(/g) || []).length;

  if (proceduralTextureCount === 0 && loadImageCount > 0) {
    return code;
  }

  console.log(
    `🎨 Sprite injector: genre="${genre}" | load.image=${loadImageCount} | procedural=${proceduralTextureCount}`,
  );

  let modified = code;
  const spriteKeys = new Set(spriteLoads.map((s) => s.key));

  modified = removeGraphicsBlock(modified, spriteKeys);
  modified = removeCanvasTextureBlock(modified, spriteKeys);
  modified = insertSpriteLoading(modified, spriteLoads);

  if (modified !== code) {
    console.log(`✅ Sprite injector: ensured ${spriteLoads.length} sprite loads for "${genre}"`);
  }

  return modified;
}

async function getSpriteLoadsForGenre(genre) {
  const templateLoads = await extractTemplateSpriteLoads(genre);
  if (templateLoads.length > 0) return templateLoads;

  const manifest = ASSET_MANIFEST[genre];
  if (!manifest || !manifest.sprites) return [];
  return manifest.sprites.map((s) => ({ key: s.key, path: s.path }));
}

async function extractTemplateSpriteLoads(genre) {
  const templatePath = path.join(TEMPLATES_DIR, `${genre}.html`);
  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    const loads = [];
    const seen = new Set();
    const loadPattern = /this\.load\.image\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = loadPattern.exec(content)) !== null) {
      const key = match[1];
      const spritePath = match[2];
      if (!seen.has(key)) {
        seen.add(key);
        loads.push({ key, path: spritePath });
      }
    }
    return loads;
  } catch {
    return [];
  }
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

  const existingKeys = new Set();
  const existingLoadPattern = /this\.load\.image\(\s*['"]([^'"]+)['"]\s*,/g;
  let match;
  while ((match = existingLoadPattern.exec(code)) !== null) {
    existingKeys.add(match[1]);
  }

  const missingLoads = sprites.filter((s) => !existingKeys.has(s.key));
  const hasLoadErrorHandler = /this\.load\.on\(\s*['"]loaderror['"]/.test(code);

  if (missingLoads.length === 0 && hasLoadErrorHandler) return code;

  const loadLines = missingLoads.map((s) => `      this.load.image('${s.key}', '${s.path}');`).join('\n');
  const fallbackBlock = hasLoadErrorHandler
    ? ''
    : `

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
      });`;

  const spriteBlock = `
      // Kenney sprite assets (auto-injected)
${loadLines}${fallbackBlock}
`;

  return code.slice(0, insertPos) + spriteBlock + code.slice(insertPos);
}
