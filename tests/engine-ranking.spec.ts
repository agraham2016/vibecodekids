import { expect, test } from '@playwright/test';
import { buildEngineOutcomeRankingSnapshot } from '../server/services/engineOutcomes.js';
import { resolveEngineProfile } from '../server/services/engineRegistry.js';

test.describe('engine outcome ranking', () => {
  test('merges generation and feedback into starter ranking stats', async () => {
    const ranking = buildEngineOutcomeRankingSnapshot([
      {
        kind: 'generation',
        generationId: 'gen-1',
        genreFamily: 'explorationAdventure3d',
        starterTemplateId: 'relic-hunt-3d',
        score: 4,
      },
      {
        kind: 'feedback',
        generationId: 'gen-1',
        outcome: 'thumbsUp',
        score: 3,
      },
      {
        kind: 'generation',
        generationId: 'gen-2',
        genreFamily: 'explorationAdventure3d',
        starterTemplateId: 'open-map-explorer',
        score: 1,
      },
      {
        kind: 'feedback',
        generationId: 'gen-2',
        outcome: 'thumbsDown',
        score: -3,
      },
    ]);

    expect(ranking.families.explorationAdventure3d.count).toBe(2);
    expect(ranking.starters['relic-hunt-3d'].averageScore).toBe(7);
    expect(ranking.starters['open-map-explorer'].averageScore).toBe(-2);
  });

  test('uses ranking to prefer the stronger starter when family is fixed', async () => {
    const rankingSnapshot = {
      families: {},
      starters: {
        'relic-hunt-3d': { count: 6, averageScore: 6, totalScore: 36, feedbackCount: 4, thumbsUpCount: 4, thumbsDownCount: 0 },
        'open-map-explorer': {
          count: 6,
          averageScore: -4,
          totalScore: -24,
          feedbackCount: 3,
          thumbsUpCount: 0,
          thumbsDownCount: 3,
        },
      },
    };

    const result = resolveEngineProfile({
      prompt: 'make a 3d adventure game with mysteries, travel goals, and hidden secrets',
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
      rankingSnapshot,
    });

    expect(result.genreFamily).toBe('explorationAdventure3d');
    expect(result.starterTemplateId).toBe('relic-hunt-3d');
  });

  test('does not override an explicit starter choice with ranking', async () => {
    const rankingSnapshot = {
      families: {},
      starters: {
        'relic-hunt-3d': { count: 10, averageScore: 6, totalScore: 60, feedbackCount: 6, thumbsUpCount: 6, thumbsDownCount: 0 },
      },
    };

    const result = resolveEngineProfile({
      prompt: 'make my 3d open map explorer game more polished',
      gameConfig: {
        starterTemplateId: 'open-map-explorer',
        genreFamily: 'explorationAdventure3d',
        engineId: 'vibe-3d',
        dimension: '3d',
        gameType: 'open-map-explorer',
        theme: 'forest',
        character: 'scout',
        obstacles: 'fog',
        visualStyle: 'bright',
        customNotes: '',
      },
      rankingSnapshot,
    });

    expect(result.starterTemplateId).toBe('open-map-explorer');
  });

  test('manual starter override can pin a preferred starter', async () => {
    const rankingSnapshot = {
      families: {},
      starters: {
        'relic-hunt-3d': { count: 6, averageScore: -2, totalScore: -12, feedbackCount: 2, thumbsUpCount: 0, thumbsDownCount: 2 },
        'open-map-explorer': { count: 6, averageScore: 4, totalScore: 24, feedbackCount: 3, thumbsUpCount: 3, thumbsDownCount: 0 },
      },
    };

    const overrideState = {
      families: {},
      starters: {
        'relic-hunt-3d': { action: 'pin', setAt: new Date().toISOString(), expiresAt: null },
      },
      sources: {},
    };

    const result = resolveEngineProfile({
      prompt: 'make a 3d adventure game with mysteries, travel goals, and hidden secrets',
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
      rankingSnapshot,
      overrideState,
    });

    expect(result.starterTemplateId).toBe('relic-hunt-3d');
  });
});
