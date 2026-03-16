import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODEL_MANIFEST } from '../assets/assetManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const modelPathCache = new Map();

export async function injectModels(code, engineProfile) {
  if (!code || !engineProfile || engineProfile.dimension !== '3d') return code;

  const modelLoads = await getModelLoadsForEngineProfile(engineProfile);
  if (modelLoads.length === 0) return code;

  const modelCalls = extractModelLoadCalls(code);
  if (modelCalls.length === 0) return code;

  const repairs = [];
  for (const call of modelCalls) {
    if (!call.path.startsWith('/assets/models/')) continue;

    const exists = await assetPathExists(call.path);
    if (exists) continue;

    const replacement = findReplacementForCall(call, modelLoads);
    if (!replacement || replacement.path === call.path) continue;

    repairs.push({ ...call, replacementPath: replacement.path });
  }

  if (repairs.length === 0) {
    return code;
  }

  let updated = code;
  for (const repair of repairs.reverse()) {
    const original = updated.slice(repair.start, repair.end);
    const rewritten = original.replace(repair.path, repair.replacementPath);
    updated = updated.slice(0, repair.start) + rewritten + updated.slice(repair.end);
  }

  console.log(`🧩 Model injector: repaired ${repairs.length} invalid GLB path${repairs.length === 1 ? '' : 's'}`);
  return updated;
}

async function getModelLoadsForEngineProfile(engineProfile) {
  const packKeys = [
    engineProfile.modelPackHint,
    engineProfile.templateGenre,
    engineProfile.templateGenre ? `${engineProfile.templateGenre}-3d` : null,
    engineProfile.starterTemplateId,
    engineProfile.starterTemplateId ? `${engineProfile.starterTemplateId}-3d` : null,
    'common-3d',
  ].filter(Boolean);

  const seen = new Set();
  const models = [];
  for (const packKey of packKeys) {
    const entry = MODEL_MANIFEST[packKey];
    if (!entry?.models?.length) continue;
    for (const model of entry.models) {
      if (seen.has(model.path)) continue;
      seen.add(model.path);
      if (await assetPathExists(model.path)) {
        models.push(model);
      }
    }
  }

  return models;
}

function extractModelLoadCalls(code) {
  const pattern = /\bload\s*\(\s*['"]([^'"]*\/assets\/models\/[^'"]+\.glb)['"]/g;
  const calls = [];
  let match;
  while ((match = pattern.exec(code)) !== null) {
    calls.push({
      path: match[1],
      start: match.index,
      end: pattern.lastIndex,
      context: code.slice(Math.max(0, match.index - 120), Math.min(code.length, pattern.lastIndex + 220)),
    });
  }
  return calls;
}

function findReplacementForCall(call, modelLoads) {
  const currentDir = path.posix.dirname(call.path);
  const currentBase = basenameWithoutExt(call.path);
  const currentNorm = normalizeValue(currentBase);
  const contextNorm = normalizeValue(call.context);
  const contextTokens = tokenize(call.context);

  const ranked = modelLoads
    .map((model) => {
      const modelBase = basenameWithoutExt(model.path);
      const modelNorm = normalizeValue(modelBase);
      const keyNorm = normalizeValue(model.key);
      const noteNorm = normalizeValue(model.note || '');
      let score = 0;

      if (currentNorm === modelNorm || currentNorm === keyNorm) score += 120;
      if (currentNorm && (currentNorm.includes(modelNorm) || modelNorm.includes(currentNorm))) score += 70;
      if (currentNorm && (currentNorm.includes(keyNorm) || keyNorm.includes(currentNorm))) score += 55;
      if (path.posix.dirname(model.path) === currentDir) score += 20;

      const modelTokens = new Set([...tokenize(modelBase), ...tokenize(model.key), ...tokenize(model.note || '')]);
      for (const token of contextTokens) {
        if (modelTokens.has(token)) score += 8;
      }

      if (contextNorm.includes(modelNorm)) score += 20;
      if (contextNorm.includes(keyNorm)) score += 18;
      if (noteNorm && contextNorm.includes(noteNorm)) score += 12;

      return { model, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.model || null;
}

function basenameWithoutExt(assetPath) {
  return path.posix.basename(assetPath, '.glb');
}

function tokenize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function normalizeValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function assetPathExists(assetPath) {
  if (modelPathCache.has(assetPath)) return modelPathCache.get(assetPath);

  const localPath = path.join(PUBLIC_DIR, assetPath.replace(/^\/+/, ''));
  try {
    await fs.access(localPath);
    modelPathCache.set(assetPath, true);
    return true;
  } catch {
    modelPathCache.set(assetPath, false);
    return false;
  }
}
