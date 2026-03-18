import { expect, test } from '@playwright/test';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import {
  classifyEngineOutcome,
  clearEngineOverride,
  getEngineOverrideState,
  getEngineOutcomeAdminSummary,
  logEngineOutcomeFeedback,
  logEngineOutcomeGeneration,
  readEngineOutcomeEvents,
  scoreEngineOutcome,
  setEngineOverride,
} from '../server/services/engineOutcomes.js';

test.describe('engine outcomes telemetry', () => {
  test('scores strong generations above weak ones', async () => {
    const strong = scoreEngineOutcome({
      hasCode: true,
      validationSafe: true,
      repairAttempted: false,
      repairSucceeded: false,
      usedSpriteAssets: true,
      usedModelAssets: false,
    });
    const weak = scoreEngineOutcome({
      hasCode: false,
      validationSafe: false,
      repairAttempted: true,
      repairSucceeded: false,
      usedSpriteAssets: false,
      usedModelAssets: false,
    });

    expect(strong).toBeGreaterThan(weak);
    expect(classifyEngineOutcome(strong)).toBe('good');
    expect(classifyEngineOutcome(weak)).toBe('bad');
  });

  test('logs linked generation and feedback events by generationId', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vck-engine-outcomes-'));
    const filePath = path.join(tempDir, 'engine_outcomes.jsonl');
    const generationId = 'gen_test_123';

    await logEngineOutcomeGeneration(
      {
        generationId,
        sessionId: 'session-1',
        userId: 'user-1',
        ageBracket: '13to17',
        mode: 'default',
        modelUsed: 'claude',
        startingModel: 'claude',
        isNewGame: true,
        isCacheHit: false,
        hasCode: true,
        code: `
          const scene = new THREE.Scene();
          loader.load('/assets/models/kenney-castlekit/tower-square.glb', () => {});
        `,
        engineId: 'vibe-3d',
        dimension: '3d',
        genreFamily: 'explorationAdventure3d',
        starterTemplateId: 'relic-hunt-3d',
        templateGenre: 'open-map-explorer',
        validationProfile: 'three-core',
        validationSafe: true,
        validationWarningsCount: 1,
        validationViolationsCount: 0,
        repairAttempted: false,
        repairSucceeded: false,
        referenceSources: ['template:relic-hunt-3d.html', 'models:rpg-3d'],
        improvementOptOut: false,
      },
      { filePath },
    );

    await logEngineOutcomeFeedback(
      {
        generationId,
        sessionId: 'session-1',
        messageId: 'assistant-1',
        userId: 'user-1',
        modelUsed: 'claude',
        outcome: 'thumbsUp',
        details: 'This one worked great',
        improvementOptOut: false,
      },
      { filePath },
    );

    const events = await readEngineOutcomeEvents({ generationId }, { filePath });
    expect(events).toHaveLength(2);

    const generation = events.find((event) => event.kind === 'generation');
    const feedback = events.find((event) => event.kind === 'feedback');

    expect(generation).toMatchObject({
      generationId,
      engineId: 'vibe-3d',
      starterTemplateId: 'relic-hunt-3d',
      usedModelAssets: true,
      validationSafe: true,
      qualityBucket: 'good',
    });
    expect(feedback).toMatchObject({
      generationId,
      outcome: 'thumbsUp',
      qualityBucket: 'mixed',
    });
  });

  test('builds admin summary with ranked sources and totals', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vck-engine-summary-'));
    const filePath = path.join(tempDir, 'engine_outcomes.jsonl');

    await logEngineOutcomeGeneration(
      {
        generationId: 'gen_admin_1',
        sessionId: 'session-admin',
        userId: 'user-admin',
        ageBracket: '13to17',
        mode: 'default',
        modelUsed: 'claude',
        startingModel: 'claude',
        isNewGame: true,
        isCacheHit: false,
        hasCode: true,
        code: `
          const game = new Phaser.Game({});
          this.load.image('tower', '/assets/sprites/example/tower.png');
        `,
        engineId: 'vibe-2d',
        dimension: '2d',
        genreFamily: 'strategyDefenseLite',
        starterTemplateId: 'crystal-defense',
        templateGenre: 'tower-defense',
        validationProfile: 'vibe-2d-defense',
        validationSafe: true,
        validationWarningsCount: 0,
        validationViolationsCount: 0,
        repairAttempted: false,
        repairSucceeded: false,
        referenceSources: ['template:crystal-defense.html', 'snippet:ai-enemies'],
        improvementOptOut: false,
      },
      { filePath },
    );

    await logEngineOutcomeFeedback(
      {
        generationId: 'gen_admin_1',
        sessionId: 'session-admin',
        messageId: 'assistant-admin',
        userId: 'user-admin',
        modelUsed: 'claude',
        outcome: 'thumbsUp',
        details: 'nice result',
        improvementOptOut: false,
      },
      { filePath },
    );

    await logEngineOutcomeGeneration(
      {
        generationId: 'gen_admin_2',
        sessionId: 'session-admin',
        userId: 'user-admin-2',
        ageBracket: '13to17',
        mode: 'default',
        modelUsed: 'claude',
        startingModel: 'claude',
        isNewGame: true,
        isCacheHit: false,
        hasCode: false,
        code: '',
        engineId: 'vibe-3d',
        dimension: '3d',
        genreFamily: 'explorationAdventure3d',
        starterTemplateId: 'open-map-explorer',
        templateGenre: 'open-map-explorer',
        validationProfile: 'vibe-3d-exploration',
        validationSafe: false,
        validationWarningsCount: 0,
        validationViolationsCount: 2,
        repairAttempted: true,
        repairSucceeded: false,
        referenceSources: ['template:open-map-explorer.html', 'snippet:particle-system'],
        improvementOptOut: false,
      },
      { filePath },
    );

    await logEngineOutcomeFeedback(
      {
        generationId: 'gen_admin_2',
        sessionId: 'session-admin',
        messageId: 'assistant-admin-2',
        userId: 'user-admin-2',
        modelUsed: 'claude',
        outcome: 'thumbsDown',
        details: 'bad result',
        improvementOptOut: false,
      },
      { filePath },
    );

    const summary = await getEngineOutcomeAdminSummary({ sinceDays: 30, limit: 3 }, { filePath });

    expect(summary.totals.generations).toBe(2);
    expect(summary.totals.feedback).toBe(2);
    expect(summary.totals.thumbsUp).toBe(1);
    expect(summary.totals.thumbsDown).toBe(1);
    expect(summary.topFamilies[0]).toMatchObject({ key: 'strategyDefenseLite' });
    expect(summary.topStarters[0]).toMatchObject({ key: 'crystal-defense' });
    expect(summary.topSources[0].key).toMatch(/^(template:crystal-defense\.html|snippet:ai-enemies)$/);
    expect(summary.bottomFamilies[0]).toMatchObject({ key: 'explorationAdventure3d' });
    expect(summary.bottomStarters[0]).toMatchObject({ key: 'open-map-explorer' });
    expect(summary.bottomSources[0].key).toMatch(/^(template:open-map-explorer\.html|snippet:particle-system)$/);
  });

  test('stores and clears manual engine overrides', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vck-engine-overrides-'));
    const filePath = path.join(tempDir, 'engine_overrides.json');

    await setEngineOverride({ scope: 'starters', key: 'relic-hunt-3d', action: 'pin' }, { filePath });
    await setEngineOverride({ scope: 'sources', key: 'snippet:ai-enemies', action: 'mute' }, { filePath });

    let state = getEngineOverrideState({ filePath }, { cacheTtlMs: 0 });
    expect(state.starters['relic-hunt-3d'].action).toBe('pin');
    expect(state.sources['snippet:ai-enemies'].action).toBe('mute');

    await clearEngineOverride({ scope: 'sources', key: 'snippet:ai-enemies' }, { filePath });
    state = getEngineOverrideState({ filePath }, { cacheTtlMs: 0 });
    expect(state.sources['snippet:ai-enemies']).toBeUndefined();
  });
});
