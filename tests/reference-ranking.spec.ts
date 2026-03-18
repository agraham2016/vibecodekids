import { expect, test } from '@playwright/test';
import { buildEngineOutcomeRankingSnapshot } from '../server/services/engineOutcomes.js';
import { resolveReferences } from '../server/services/referenceResolver.js';

test.describe('reference ranking', () => {
  test('aggregates reference source scores from outcome events', async () => {
    const snapshot = buildEngineOutcomeRankingSnapshot([
      {
        kind: 'generation',
        generationId: 'gen-a',
        genreFamily: 'strategyDefenseLite',
        starterTemplateId: 'crystal-defense',
        score: 4,
        referenceSources: ['template:crystal-defense.html', 'snippet:ai-enemies'],
      },
      {
        kind: 'feedback',
        generationId: 'gen-a',
        outcome: 'thumbsUp',
        score: 3,
      },
    ]);

    expect(snapshot.sources['template:crystal-defense.html'].averageScore).toBe(7);
    expect(snapshot.sources['snippet:ai-enemies'].averageScore).toBe(7);
  });

  test('uses ranking to prefer the stronger template through resolveReferences', async () => {
    const rankingSnapshot = {
      families: {},
      starters: {
        'relic-hunt-3d': { count: 6, averageScore: 6, totalScore: 36, feedbackCount: 4, thumbsUpCount: 4, thumbsDownCount: 0 },
        'open-map-explorer': {
          count: 6,
          averageScore: -3,
          totalScore: -18,
          feedbackCount: 3,
          thumbsUpCount: 0,
          thumbsDownCount: 3,
        },
      },
      sources: {},
    };

    const result = await resolveReferences({
      prompt: 'make a 3d adventure with mysteries and hidden secrets',
      genre: 'open-map-explorer',
      gameConfig: {
        genreFamily: 'explorationAdventure3d',
        dimension: '3d',
        gameType: 'platformer',
        theme: 'ruins',
        character: 'explorer',
        obstacles: 'puzzles',
        visualStyle: 'ancient',
        customNotes: '',
      },
      isNewGame: true,
      currentCode: null,
      rankingSnapshot,
    });

    expect(result.engineProfile?.starterTemplateId).toBe('relic-hunt-3d');
    expect(result.sources).toContain('template:relic-hunt-3d.html');
  });

  test('uses ranked snippet sources to order injected snippets', async () => {
    const rankingSnapshot = {
      families: {},
      starters: {},
      sources: {
        'snippet:particle-system': {
          count: 5,
          averageScore: 5,
          totalScore: 25,
          feedbackCount: 3,
          thumbsUpCount: 3,
          thumbsDownCount: 0,
        },
        'snippet:ai-enemies': {
          count: 5,
          averageScore: -3,
          totalScore: -15,
          feedbackCount: 2,
          thumbsUpCount: 0,
          thumbsDownCount: 2,
        },
      },
    };

    const result = await resolveReferences({
      prompt: 'make a crystal defense game with enemy waves and explosion effects',
      genre: 'tower-defense',
      gameConfig: null,
      isNewGame: true,
      currentCode: null,
      rankingSnapshot,
    });

    const particleIndex = result.sources.indexOf('snippet:particle-system');
    const enemyIndex = result.sources.indexOf('snippet:ai-enemies');

    expect(particleIndex).toBeGreaterThan(-1);
    expect(enemyIndex).toBeGreaterThan(-1);
    expect(particleIndex).toBeLessThan(enemyIndex);
  });

  test('manual source override can mute a snippet for seven days', async () => {
    const result = await resolveReferences({
      prompt: 'make a crystal defense game with enemy waves and explosion effects',
      genre: 'tower-defense',
      gameConfig: null,
      isNewGame: true,
      currentCode: null,
      rankingSnapshot: { families: {}, starters: {}, sources: {} },
      overrideState: {
        families: {},
        starters: {},
        sources: {
          'snippet:ai-enemies': { action: 'mute', setAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() },
        },
      },
    });

    expect(result.sources).not.toContain('snippet:ai-enemies');
  });
});
