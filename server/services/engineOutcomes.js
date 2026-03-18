/**
 * Engine Outcomes
 *
 * Append-only anonymized telemetry for engine routing quality.
 * Stores engine metadata and feedback linkage by generationId.
 */

import { promises as fs } from 'fs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from '../config/index.js';

const ENGINE_OUTCOMES_FILE = path.join(DATA_DIR, 'engine_outcomes.jsonl');
const ENGINE_OVERRIDES_FILE = path.join(DATA_DIR, 'engine_overrides.json');
const RANKING_CACHE_TTL_MS = 30000;
const emptyRankingSnapshot = { generatedAt: null, families: {}, starters: {} };
const emptyOverrideState = { updatedAt: null, families: {}, starters: {}, sources: {} };
let rankingCache = {
  filePath: ENGINE_OUTCOMES_FILE,
  loadedAt: 0,
  summary: emptyRankingSnapshot,
};
let overrideCache = {
  filePath: ENGINE_OVERRIDES_FILE,
  loadedAt: 0,
  state: emptyOverrideState,
};

async function ensureEngineOutcomesFile(filePath = ENGINE_OUTCOMES_FILE) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '');
  }
}

async function ensureEngineOverridesFile(filePath = ENGINE_OVERRIDES_FILE) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(emptyOverrideState, null, 2));
  }
}

function hashUserId(userId) {
  if (!userId) return null;
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

export function summarizeAssetUsage(code) {
  const text = String(code || '');
  const usedSpriteAssets = /this\.load\.image\(\s*['"][^'"]+['"]\s*,\s*['"]\/assets\/sprites\//i.test(text);
  const usedModelAssets = /\bload\s*\(\s*['"][^'"]*\/assets\/models\/[^'"]+\.glb['"]/i.test(text);
  return { usedSpriteAssets, usedModelAssets };
}

export function scoreEngineOutcome({
  hasCode,
  validationSafe,
  repairAttempted,
  repairSucceeded,
  usedSpriteAssets,
  usedModelAssets,
  feedbackOutcome = null,
}) {
  let score = 0;

  if (hasCode) score += 2;
  else score -= 3;

  if (validationSafe === true) score += 2;
  else if (validationSafe === false) score -= 2;

  if (repairAttempted) score -= 1;
  if (repairSucceeded) score += 1;

  if (usedSpriteAssets) score += 1;
  if (usedModelAssets) score += 1;

  if (feedbackOutcome === 'thumbsUp') score += 3;
  if (feedbackOutcome === 'thumbsDown') score -= 3;

  return score;
}

export function classifyEngineOutcome(score) {
  if (score >= 4) return 'good';
  if (score <= -1) return 'bad';
  return 'mixed';
}

function isExpiredOverride(entry) {
  if (!entry?.expiresAt) return false;
  return new Date(entry.expiresAt).getTime() <= Date.now();
}

function normalizeOverrideState(state = {}) {
  const normalized = {
    updatedAt: state.updatedAt || null,
    families: { ...(state.families || {}) },
    starters: { ...(state.starters || {}) },
    sources: { ...(state.sources || {}) },
  };

  for (const scope of ['families', 'starters', 'sources']) {
    for (const [key, entry] of Object.entries(normalized[scope])) {
      if (!entry || isExpiredOverride(entry)) {
        delete normalized[scope][key];
      }
    }
  }

  return normalized;
}

function safeReadOverridesSync(filePath) {
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    if (!existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(emptyOverrideState, null, 2));
      return emptyOverrideState;
    }

    const content = readFileSync(filePath, 'utf-8');
    if (!content.trim()) return emptyOverrideState;
    return normalizeOverrideState(JSON.parse(content));
  } catch {
    return emptyOverrideState;
  }
}

function buildActiveOverrideMap(state) {
  const normalized = normalizeOverrideState(state);
  return {
    families: normalized.families,
    starters: normalized.starters,
    sources: normalized.sources,
  };
}

export function getEngineOverrideState(storage = {}, opts = {}) {
  const filePath = storage.filePath || ENGINE_OVERRIDES_FILE;
  const now = Date.now();
  if (
    overrideCache.filePath === filePath &&
    now - overrideCache.loadedAt < (opts.cacheTtlMs ?? RANKING_CACHE_TTL_MS) &&
    overrideCache.state
  ) {
    return overrideCache.state;
  }

  const state = safeReadOverridesSync(filePath);
  overrideCache = {
    filePath,
    loadedAt: now,
    state,
  };
  return state;
}

export function getEngineOverrideEffect(overrideState, scope, key) {
  const entry = overrideState?.[scope]?.[key];
  if (!entry || isExpiredOverride(entry)) {
    return { boost: 0, hidden: false, action: null, expiresAt: null };
  }

  if (entry.action === 'pin') {
    return { boost: 3, hidden: false, action: 'pin', expiresAt: entry.expiresAt || null };
  }
  if (entry.action === 'downweight') {
    return { boost: -2.5, hidden: false, action: 'downweight', expiresAt: entry.expiresAt || null };
  }
  if (entry.action === 'mute') {
    return { boost: -5, hidden: true, action: 'mute', expiresAt: entry.expiresAt || null };
  }

  return { boost: 0, hidden: false, action: null, expiresAt: null };
}

async function writeOverrideState(state, storage = {}) {
  const filePath = storage.filePath || ENGINE_OVERRIDES_FILE;
  const normalized = normalizeOverrideState({
    ...state,
    updatedAt: new Date().toISOString(),
  });
  await ensureEngineOverridesFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2));
  overrideCache = {
    filePath,
    loadedAt: Date.now(),
    state: normalized,
  };
  return normalized;
}

export async function setEngineOverride({ scope, key, action }, storage = {}) {
  if (!['families', 'starters', 'sources'].includes(scope)) {
    throw new Error('Invalid override scope');
  }
  if (!key || typeof key !== 'string') {
    throw new Error('Override key is required');
  }
  if (!['pin', 'downweight', 'mute'].includes(action)) {
    throw new Error('Invalid override action');
  }
  if (action === 'mute' && scope !== 'sources') {
    throw new Error('Mute is only supported for sources');
  }

  const current = getEngineOverrideState(storage, { cacheTtlMs: 0 });
  const next = normalizeOverrideState(current);
  next[scope][key] = {
    action,
    setAt: new Date().toISOString(),
    expiresAt: action === 'mute' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
  };
  return writeOverrideState(next, storage);
}

export async function clearEngineOverride({ scope, key }, storage = {}) {
  if (!['families', 'starters', 'sources'].includes(scope)) {
    throw new Error('Invalid override scope');
  }
  if (!key || typeof key !== 'string') {
    throw new Error('Override key is required');
  }

  const current = getEngineOverrideState(storage, { cacheTtlMs: 0 });
  const next = normalizeOverrideState(current);
  delete next[scope][key];
  return writeOverrideState(next, storage);
}

export async function logEngineOutcomeGeneration(event, opts = {}) {
  if (event.improvementOptOut) return;

  const filePath = opts.filePath || ENGINE_OUTCOMES_FILE;
  await ensureEngineOutcomesFile(filePath);

  const assetUsage = summarizeAssetUsage(event.code || '');
  const score = scoreEngineOutcome({
    hasCode: !!event.hasCode,
    validationSafe: event.validationSafe,
    repairAttempted: !!event.repairAttempted,
    repairSucceeded: !!event.repairSucceeded,
    usedSpriteAssets: assetUsage.usedSpriteAssets,
    usedModelAssets: assetUsage.usedModelAssets,
  });

  const record = {
    id: `eo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    kind: 'generation',
    timestamp: new Date().toISOString(),
    generationId: event.generationId || null,
    sessionId: event.sessionId || null,
    userIdHash: hashUserId(event.userId),
    ageBracket: event.ageBracket || null,
    mode: event.mode || 'default',
    modelUsed: event.modelUsed || null,
    startingModel: event.startingModel || null,
    isNewGame: !!event.isNewGame,
    isCacheHit: !!event.isCacheHit,
    hasCode: !!event.hasCode,
    codeLength: event.code ? String(event.code).length : 0,
    engineId: event.engineId || null,
    dimension: event.dimension || null,
    genreFamily: event.genreFamily || null,
    starterTemplateId: event.starterTemplateId || null,
    templateGenre: event.templateGenre || null,
    validationProfile: event.validationProfile || null,
    validationSafe: typeof event.validationSafe === 'boolean' ? event.validationSafe : null,
    validationWarningsCount: event.validationWarningsCount ?? 0,
    validationViolationsCount: event.validationViolationsCount ?? 0,
    repairAttempted: !!event.repairAttempted,
    repairSucceeded: !!event.repairSucceeded,
    referenceSources: Array.isArray(event.referenceSources) ? event.referenceSources : [],
    usedSpriteAssets: assetUsage.usedSpriteAssets,
    usedModelAssets: assetUsage.usedModelAssets,
    score,
    qualityBucket: classifyEngineOutcome(score),
  };

  await fs.appendFile(filePath, JSON.stringify(record) + '\n');
}

export async function logEngineOutcomeFeedback(event, opts = {}) {
  if (event.improvementOptOut) return;

  const filePath = opts.filePath || ENGINE_OUTCOMES_FILE;
  await ensureEngineOutcomesFile(filePath);

  const score = scoreEngineOutcome({
    hasCode: false,
    validationSafe: null,
    repairAttempted: false,
    repairSucceeded: false,
    usedSpriteAssets: false,
    usedModelAssets: false,
    feedbackOutcome: event.outcome || null,
  });

  const record = {
    id: `eo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    kind: 'feedback',
    timestamp: new Date().toISOString(),
    generationId: event.generationId || null,
    sessionId: event.sessionId || null,
    messageId: event.messageId || null,
    userIdHash: hashUserId(event.userId),
    modelUsed: event.modelUsed || null,
    outcome: event.outcome || null,
    details: event.details || null,
    score,
    qualityBucket: classifyEngineOutcome(score),
  };

  await fs.appendFile(filePath, JSON.stringify(record) + '\n');
}

export async function readEngineOutcomeEvents(opts = {}, storage = {}) {
  const filePath = storage.filePath || ENGINE_OUTCOMES_FILE;
  await ensureEngineOutcomesFile(filePath);

  const content = await fs.readFile(filePath, 'utf-8');
  let events = content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (opts.generationId) {
    events = events.filter((event) => event.generationId === opts.generationId);
  }

  if (opts.kind) {
    events = events.filter((event) => event.kind === opts.kind);
  }

  if (opts.sinceDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - opts.sinceDays);
    const cutoffMs = cutoff.getTime();
    events = events.filter((event) => new Date(event.timestamp).getTime() >= cutoffMs);
  }

  return events;
}

function toRankedList(stats = {}, limit = 5, direction = 'desc') {
  return Object.entries(stats)
    .map(([key, value]) => ({ key, ...value, bias: getEngineOutcomeBias(value) }))
    .sort((a, b) => {
      if (direction === 'asc') {
        return a.averageScore - b.averageScore || b.count - a.count || a.key.localeCompare(b.key);
      }
      return b.averageScore - a.averageScore || b.count - a.count || a.key.localeCompare(b.key);
    })
    .slice(0, limit);
}

function safeReadEventsSync(filePath) {
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    if (!existsSync(filePath)) {
      writeFileSync(filePath, '');
      return [];
    }

    const content = readFileSync(filePath, 'utf-8');
    if (!content.trim()) return [];

    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function mergeFeedbackScores(events) {
  const feedbackByGenerationId = new Map();

  for (const event of events) {
    if (event.kind !== 'feedback' || !event.generationId) continue;

    const current = feedbackByGenerationId.get(event.generationId) || {
      totalScore: 0,
      feedbackCount: 0,
      thumbsUpCount: 0,
      thumbsDownCount: 0,
    };

    current.totalScore += Number(event.score || 0);
    current.feedbackCount += 1;
    if (event.outcome === 'thumbsUp') current.thumbsUpCount += 1;
    if (event.outcome === 'thumbsDown') current.thumbsDownCount += 1;

    feedbackByGenerationId.set(event.generationId, current);
  }

  return feedbackByGenerationId;
}

function addAggregate(store, key, score, feedback = {}) {
  if (!key) return;
  if (!store[key]) {
    store[key] = {
      count: 0,
      totalScore: 0,
      averageScore: 0,
      feedbackCount: 0,
      thumbsUpCount: 0,
      thumbsDownCount: 0,
    };
  }

  store[key].count += 1;
  store[key].totalScore += score;
  store[key].averageScore = Number((store[key].totalScore / store[key].count).toFixed(3));
  store[key].feedbackCount += feedback.feedbackCount || 0;
  store[key].thumbsUpCount += feedback.thumbsUpCount || 0;
  store[key].thumbsDownCount += feedback.thumbsDownCount || 0;
}

export function buildEngineOutcomeRankingSnapshot(events = []) {
  const generations = events.filter((event) => event.kind === 'generation');
  const feedbackByGenerationId = mergeFeedbackScores(events);
  const families = {};
  const starters = {};
  const sources = {};

  for (const generation of generations) {
    const feedback = generation.generationId ? feedbackByGenerationId.get(generation.generationId) : null;
    const combinedScore = Number(generation.score || 0) + Number(feedback?.totalScore || 0);

    addAggregate(families, generation.genreFamily, combinedScore, feedback);
    addAggregate(starters, generation.starterTemplateId, combinedScore, feedback);
    for (const source of generation.referenceSources || []) {
      addAggregate(sources, source, combinedScore, feedback);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    families,
    starters,
    sources,
  };
}

export function getEngineOutcomeBias(stat, opts = {}) {
  const minSamples = opts.minSamples ?? 3;
  const maxBoost = opts.maxBoost ?? 1.5;
  if (!stat || stat.count < minSamples) return 0;

  const confidence = Math.min(1, stat.count / (opts.fullConfidenceSamples ?? 12));
  const normalized = Math.max(-1, Math.min(1, stat.averageScore / (opts.normalizationDivisor ?? 6)));
  return Number((normalized * maxBoost * confidence).toFixed(3));
}

export function getEngineOutcomeRankingSnapshot(opts = {}, storage = {}) {
  const filePath = storage.filePath || ENGINE_OUTCOMES_FILE;
  const now = Date.now();
  if (
    rankingCache.filePath === filePath &&
    now - rankingCache.loadedAt < (opts.cacheTtlMs ?? RANKING_CACHE_TTL_MS) &&
    rankingCache.summary
  ) {
    return rankingCache.summary;
  }

  const events = safeReadEventsSync(filePath);
  const summary = buildEngineOutcomeRankingSnapshot(events);
  rankingCache = {
    filePath,
    loadedAt: now,
    summary,
  };
  return summary;
}

export async function getEngineOutcomeAdminSummary(opts = {}, storage = {}) {
  const sinceDays = opts.sinceDays ?? 30;
  const limit = opts.limit ?? 5;
  const events = await readEngineOutcomeEvents({ sinceDays }, storage);
  const snapshot = buildEngineOutcomeRankingSnapshot(events);
  const overrides = buildActiveOverrideMap(getEngineOverrideState(storage, { cacheTtlMs: 0 }));
  const generationEvents = events.filter((event) => event.kind === 'generation');
  const feedbackEvents = events.filter((event) => event.kind === 'feedback');

  const totals = {
    generations: generationEvents.length,
    feedback: feedbackEvents.length,
    thumbsUp: feedbackEvents.filter((event) => event.outcome === 'thumbsUp').length,
    thumbsDown: feedbackEvents.filter((event) => event.outcome === 'thumbsDown').length,
    cacheHits: generationEvents.filter((event) => event.isCacheHit).length,
    validationPasses: generationEvents.filter((event) => event.validationSafe === true).length,
    repairAttempts: generationEvents.filter((event) => event.repairAttempted).length,
    repairSuccesses: generationEvents.filter((event) => event.repairSucceeded).length,
  };

  return {
    periodDays: sinceDays,
    generatedAt: snapshot.generatedAt,
    totals,
    topFamilies: toRankedList(snapshot.families, limit),
    topStarters: toRankedList(snapshot.starters, limit),
    topSources: toRankedList(snapshot.sources, limit),
    bottomFamilies: toRankedList(snapshot.families, limit, 'asc'),
    bottomStarters: toRankedList(snapshot.starters, limit, 'asc'),
    bottomSources: toRankedList(snapshot.sources, limit, 'asc'),
    overrides,
  };
}
