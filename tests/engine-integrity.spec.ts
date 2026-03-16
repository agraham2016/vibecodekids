import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect, test } from '@playwright/test';
import { ENGINE_SELECTION_GUIDE, STARTER_TEMPLATES } from '../src/config/gameCatalog';
import {
  ENGINE_FAMILY_PROFILES,
  TEMPLATE_BLUEPRINTS,
  resolveEngineProfile,
} from '../server/services/engineRegistry.js';
import { VALIDATION_RULES } from '../server/services/engineValidators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_DIR = path.join(__dirname, '..', 'server', 'templates');

test.describe('Vibe engine integrity', () => {
  test('every starter maps to a real family, validator, and template target', () => {
    for (const starter of STARTER_TEMPLATES) {
      const blueprint = TEMPLATE_BLUEPRINTS[starter.id];
      expect(blueprint, `Missing blueprint for starter ${starter.id}`).toBeTruthy();

      const familyProfile = ENGINE_FAMILY_PROFILES[starter.genreFamily];
      expect(familyProfile, `Missing family profile for ${starter.genreFamily}`).toBeTruthy();
      expect(familyProfile.engineId, `Engine mismatch for starter ${starter.id}`).toBe(starter.engineId);
      expect(familyProfile.dimension, `Dimension mismatch for starter ${starter.id}`).toBe(starter.dimension);
      expect(familyProfile.validationProfile, `Missing validation profile for ${starter.genreFamily}`).toBeTruthy();
      expect(
        VALIDATION_RULES[familyProfile.validationProfile],
        `Missing validator rules for ${familyProfile.validationProfile}`,
      ).toBeTruthy();
      expect(familyProfile.coreSystems?.length, `Missing core systems for ${starter.genreFamily}`).toBeGreaterThan(0);
      expect(familyProfile.safeEditSurfaces?.length, `Missing safe edit surfaces for ${starter.genreFamily}`).toBeGreaterThan(0);
      expect(familyProfile.architecture, `Missing architecture contract for ${starter.genreFamily}`).toBeTruthy();
      expect(familyProfile.architecture.runtimeShape, `Missing runtime shape for ${starter.genreFamily}`).toBeTruthy();
      expect(familyProfile.architecture.inputModel, `Missing input model for ${starter.genreFamily}`).toBeTruthy();
      expect(familyProfile.architecture.cameraModel, `Missing camera model for ${starter.genreFamily}`).toBeTruthy();
      expect(familyProfile.architecture.hudContract, `Missing HUD contract for ${starter.genreFamily}`).toBeTruthy();
      expect(familyProfile.architecture.failureContract, `Missing failure contract for ${starter.genreFamily}`).toBeTruthy();
      expect(familyProfile.architecture.assetStrategy, `Missing asset strategy for ${starter.genreFamily}`).toBeTruthy();
      expect(ENGINE_SELECTION_GUIDE[starter.engineId], `Missing engine guide for ${starter.engineId}`).toBeTruthy();

      const templateFile = blueprint.templateFile || (blueprint.sourceTemplateGenre ? `${blueprint.sourceTemplateGenre}.html` : null);
      expect(templateFile, `Starter ${starter.id} does not resolve to a template file`).toBeTruthy();
      expect(fs.existsSync(path.join(TEMPLATE_DIR, templateFile!)), `Template file ${templateFile} is missing`).toBe(true);
    }
  });

  test('engine selection guide stays aligned with exposed starter engines', () => {
    const starterEngineIds = new Set(STARTER_TEMPLATES.map((starter) => starter.engineId));
    for (const engineId of starterEngineIds) {
      const guide = ENGINE_SELECTION_GUIDE[engineId];
      expect(guide, `Missing engine selection guide for ${engineId}`).toBeTruthy();
      expect(guide.runtimeSummary, `Missing runtime summary for ${engineId}`).toBeTruthy();
      expect(guide.iterationSweetSpot, `Missing iteration guidance for ${engineId}`).toBeTruthy();
      expect(guide.assetStrategy, `Missing asset strategy guidance for ${engineId}`).toBeTruthy();
      expect(guide.architectureReason, `Missing architecture reason for ${engineId}`).toBeTruthy();
    }
  });

  test('generic follow-up edits preserve engine family from current code', () => {
    const scenarios = [
      { templateFile: 'platformer.html', family: 'platformAction', dimension: '2d' },
      { templateFile: 'maze.html', family: 'topDownAction', dimension: '2d' },
      { templateFile: 'puzzle.html', family: 'puzzleCasual', dimension: '2d' },
      { templateFile: 'racing.html', family: 'racingArcade', dimension: '2d' },
      { templateFile: 'pet-sim.html', family: 'simLite', dimension: '2d' },
      { templateFile: 'crystal-defense.html', family: 'strategyDefenseLite', dimension: '2d' },
      { templateFile: 'village-quest.html', family: 'rpgProgressionLite', dimension: '2d' },
      { templateFile: 'trick-shot-arena.html', family: 'sportsSkill', dimension: '2d' },
      { templateFile: 'obby.html', family: 'obbyPlatform3d', dimension: '3d' },
      { templateFile: 'open-map-explorer.html', family: 'explorationAdventure3d', dimension: '3d' },
      { templateFile: 'relic-hunt-3d.html', family: 'explorationAdventure3d', dimension: '3d' },
      { templateFile: 'stunt-racer-3d.html', family: 'racingDriving3d', dimension: '3d' },
      { templateFile: 'survival-crafting-game.html', family: 'survivalCraft3d', dimension: '3d' },
      { templateFile: 'house-builder.html', family: 'sandboxBuilder3d', dimension: '3d' },
    ];

    const followUpPrompts = ['make it faster', 'make it spooky', 'add more challenge'];

    for (const scenario of scenarios) {
      const currentCode = fs.readFileSync(path.join(TEMPLATE_DIR, scenario.templateFile), 'utf-8');
      for (const prompt of followUpPrompts) {
        const profile = resolveEngineProfile({ prompt, currentCode });
        expect(profile.genreFamily, `Wrong family for ${scenario.templateFile} on "${prompt}"`).toBe(scenario.family);
        expect(profile.dimension, `Wrong dimension for ${scenario.templateFile} on "${prompt}"`).toBe(scenario.dimension);
      }
    }
  });

  test('prompt signal matching favors the right family for ambiguous ideas', () => {
    const scenarios = [
      {
        prompt: 'make a 3d relic hunt in ancient ruins with landmarks and quests',
        family: 'explorationAdventure3d',
        starter: 'relic-hunt-3d',
      },
      {
        prompt: 'make a 3d house builder where I place walls, furniture, and decorate rooms',
        family: 'sandboxBuilder3d',
      },
      {
        prompt: 'make a 3d island survival game where I gather wood, craft tools, and survive the night',
        family: 'survivalCraft3d',
      },
      {
        prompt: 'make a 3d stunt car racing game with drift ramps, boost pads, and checkpoints',
        family: 'racingDriving3d',
      },
      {
        prompt: 'make a side scroller where I jump over spikes and collect coins',
        family: 'platformAction',
      },
      {
        prompt: 'make a top-down maze escape game with chasers and treasure',
        family: 'topDownAction',
      },
      {
        prompt: 'make a crystal defense game where guardians protect the base from enemy waves',
        family: 'strategyDefenseLite',
        starter: 'crystal-defense',
      },
      {
        prompt: 'make a village quest game where I help villagers, level up, and finish story quests',
        family: 'rpgProgressionLite',
        starter: 'village-quest',
      },
      {
        prompt: 'make a trick shot basketball challenge with moving hoops and accuracy timing',
        family: 'sportsSkill',
        starter: 'trick-shot-arena',
      },
    ];

    for (const scenario of scenarios) {
      const profile = resolveEngineProfile({ prompt: scenario.prompt });
      expect(profile.genreFamily, `Wrong family for "${scenario.prompt}"`).toBe(scenario.family);
      if (scenario.starter) {
        expect(profile.starterTemplateId, `Wrong starter for "${scenario.prompt}"`).toBe(scenario.starter);
      }
    }
  });
});
