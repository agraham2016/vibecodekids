import { expect, test } from '@playwright/test';
import { resolveReferences } from '../server/services/referenceResolver.js';

test.describe('Engine reference resolution', () => {
  const scenarios = [
    {
      prompt: 'make a crystal defense game where guardians protect the base from enemy waves',
      genre: 'tower-defense',
      expectedStarter: 'crystal-defense',
      expectedTemplate: 'template:crystal-defense.html',
      expectedAssetSource: 'assets:crystal-defense',
      expectedAssetHint: 'using verified tower-defense sprites for this crystal-defense starter',
    },
    {
      prompt: 'make a village quest game where I help villagers, level up, and finish story quests',
      genre: 'rpg',
      expectedStarter: 'village-quest',
      expectedTemplate: 'template:village-quest.html',
      expectedAssetSource: 'assets:village-quest',
      expectedAssetHint: 'using verified rpg sprites for this village-quest starter',
    },
    {
      prompt: 'make a trick shot basketball challenge with moving hoops and accuracy timing',
      genre: 'sports',
      expectedStarter: 'trick-shot-arena',
      expectedTemplate: 'template:trick-shot-arena.html',
      expectedAssetSource: 'assets:trick-shot-arena',
      expectedAssetHint: 'using verified sports sprites for this trick-shot-arena starter',
    },
    {
      prompt: 'make a 3d relic hunt in ancient ruins with clue trails and mission goals',
      genre: 'open-map-explorer',
      expectedStarter: 'relic-hunt-3d',
      expectedTemplate: 'template:relic-hunt-3d.html',
      expectedModelSource: 'models:rpg-3d',
      expectedModelHint: '/assets/models/kenney-castlekit/tower-square.glb',
    },
  ];

  for (const scenario of scenarios) {
    test(`resolves starter-specific references for ${scenario.expectedStarter}`, async () => {
      const result = await resolveReferences({
        prompt: scenario.prompt,
        genre: scenario.genre,
        gameConfig: null,
        isNewGame: true,
        currentCode: null,
      });

      expect(result.engineProfile?.starterTemplateId).toBe(scenario.expectedStarter);
      expect(result.sources).toContain(scenario.expectedTemplate);
      if (scenario.expectedAssetSource) {
        expect(result.sources).toContain(scenario.expectedAssetSource);
      }
      if (scenario.expectedAssetHint) {
        expect(result.referenceCode.toLowerCase()).toContain(scenario.expectedAssetHint);
      }
      if (scenario.expectedModelSource) {
        expect(result.sources).toContain(scenario.expectedModelSource);
      }
      if (scenario.expectedModelHint) {
        expect(result.referenceCode.toLowerCase()).toContain(scenario.expectedModelHint);
      }
    });
  }
});
