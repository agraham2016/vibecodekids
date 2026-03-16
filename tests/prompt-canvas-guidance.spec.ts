import { expect, test } from '@playwright/test';
import { getSystemPrompt } from '../server/prompts/index.js';
import { getRelevantSnippets } from '../server/snippets/index.js';

test.describe('Canvas fallback guidance', () => {
  test('injects Phaser rules for new vibe-2d generations', () => {
    const { dynamicContext } = getSystemPrompt(
      null,
      {
        gameType: 'platformer',
        dimension: '2d',
        theme: 'jungle',
        character: 'frog hero',
        obstacles: 'spikes',
        visualStyle: 'bright cartoon',
      },
      'platformer',
      '',
      'make a jungle platformer',
      {
        engineId: 'vibe-2d',
        dimension: '2d',
        genreFamily: 'platformAction',
        starterTemplateId: 'platformer',
        templateGenre: 'platformer',
        validationProfile: 'vibe-2d-platform-action',
        coreSystems: ['movement'],
        safeEditSurfaces: ['theme swap'],
        architecture: {
          runtimeShape: 'single-scene Phaser arcade loop',
          inputModel: 'left right jump',
          cameraModel: 'side follow',
          hudContract: 'score and goal HUD',
          failureContract: 'restart on fail',
          assetStrategy: 'prefer verified sprites first',
        },
      },
    );

    expect(dynamicContext).toContain('PHASER 2D GAME - IMPORTANT RULES');
    expect(dynamicContext).toContain('If procedural art is required, make it look intentional');
    expect(dynamicContext).toContain('Match the procedural texture resolution to the final display size');
  });

  test('returns the canvas fallback snippet for procedural-art prompts', () => {
    const snippets = getRelevantSnippets('sports', 'draw a procedural mascot with canvas gradients and soft shadow');
    expect(snippets.some((snippet) => snippet.name === 'canvas-fallback-art')).toBe(true);
  });
});
