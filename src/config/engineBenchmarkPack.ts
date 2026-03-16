import type { EngineId, GenreFamily, StarterTemplateId } from '../types';

export type EngineBenchmarkAxis = 'family-fit' | 'starter-fit' | 'hud-clarity' | 'camera-readability' | 'restart-flow';

export interface EngineBenchmarkCase {
  id: string;
  prompt: string;
  expectedEngineId: EngineId;
  expectedGenreFamily: GenreFamily;
  expectedStarterTemplateId?: StarterTemplateId;
  reviewAxes: EngineBenchmarkAxis[];
  notes: string;
}

export const ENGINE_BENCHMARK_AXES: Record<EngineBenchmarkAxis, string> = {
  'family-fit': 'Does the generated game keep the right core loop for the requested family?',
  'starter-fit': 'Did the system choose a starter that matches the prompt shape instead of a generic fallback?',
  'hud-clarity': 'Are the score, status, objectives, and progress readable during play?',
  'camera-readability': 'Does the camera or framing keep the play space understandable?',
  'restart-flow': 'Is there a quick, kid-friendly retry or replay path after failure or completion?',
};

export const ENGINE_PROMPT_BENCHMARKS: EngineBenchmarkCase[] = [
  {
    id: 'platformer-jungle-hero',
    prompt: 'make a jungle platformer where I jump over spikes and collect coins',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'platformAction',
    expectedStarterTemplateId: 'platformer',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Baseline side-view jump-and-collect prompt.',
  },
  {
    id: 'runner-city-dodge',
    prompt: 'make an endless runner where I dodge barriers in a busy city',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'platformAction',
    expectedStarterTemplateId: 'endless-runner',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Checks fast arcade runner routing inside platform action.',
  },
  {
    id: 'maze-escape-chasers',
    prompt: 'make a maze escape game with chasers, keys, and treasure',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'topDownAction',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Canonical maze-style top-down action case.',
  },
  {
    id: 'top-down-detective',
    prompt: 'make a top-down detective adventure where I search town blocks for clues',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'topDownAction',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity'],
    notes: 'Covers the more quest-shaped branch of top-down action.',
  },
  {
    id: 'simple-racing-traffic',
    prompt: 'make a simple racing game where I dodge traffic and grab boosts',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'racingArcade',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Baseline 2D arcade racing benchmark.',
  },
  {
    id: 'matching-gems',
    prompt: 'make a matching game with gems, combos, and a move counter',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'puzzleCasual',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Validates board-style casual puzzle selection.',
  },
  {
    id: 'pet-care-day',
    prompt: 'make a pet care simulator where I feed, play with, and clean up after a puppy',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'simLite',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity'],
    notes: 'Baseline cozy care-loop benchmark.',
  },
  {
    id: 'lemonade-stand-shop',
    prompt: 'make a lemonade stand tycoon where I serve customers and buy upgrades',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'builderTycoonLite',
    expectedStarterTemplateId: 'lemonade-stand-tycoon',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity'],
    notes: 'Checks economy loop and upgrade path selection.',
  },
  {
    id: 'crystal-defense-waves',
    prompt: 'make a crystal defense game where guardians protect the base from enemy waves',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'strategyDefenseLite',
    expectedStarterTemplateId: 'crystal-defense',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Covers the new lane-defense hero path.',
  },
  {
    id: 'village-quest-story',
    prompt: 'make a village quest game where I help villagers, level up, and finish story quests',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'rpgProgressionLite',
    expectedStarterTemplateId: 'village-quest',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Covers the new town-and-quests progression path.',
  },
  {
    id: 'trick-shot-hoops',
    prompt: 'make a trick shot basketball challenge with moving hoops and accuracy timing',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'sportsSkill',
    expectedStarterTemplateId: 'trick-shot-arena',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity', 'restart-flow'],
    notes: 'Covers the new timing-and-accuracy sports hero path.',
  },
  {
    id: 'fishing-relax',
    prompt: 'make a fishing game where I catch rare fish and upgrade my gear',
    expectedEngineId: 'vibe-2d',
    expectedGenreFamily: 'sportsSkill',
    expectedStarterTemplateId: 'fishing-game',
    reviewAxes: ['family-fit', 'starter-fit', 'hud-clarity'],
    notes: 'Covers the calmer skill-loop branch inside sports skill.',
  },
  {
    id: 'obby-parkour',
    prompt: 'make a roblox obby with moving platforms, lava, and checkpoints',
    expectedEngineId: 'vibe-3d',
    expectedGenreFamily: 'obbyPlatform3d',
    expectedStarterTemplateId: 'obby',
    reviewAxes: ['family-fit', 'starter-fit', 'camera-readability', 'restart-flow'],
    notes: 'Baseline 3D platform benchmark.',
  },
  {
    id: 'open-world-explorer',
    prompt: 'make an open world explorer where I roam a forest and discover landmarks',
    expectedEngineId: 'vibe-3d',
    expectedGenreFamily: 'explorationAdventure3d',
    expectedStarterTemplateId: 'open-map-explorer',
    reviewAxes: ['family-fit', 'starter-fit', 'camera-readability', 'hud-clarity'],
    notes: 'Checks free-roam exploration branch.',
  },
  {
    id: 'relic-hunt-ruins',
    prompt: 'make a 3d relic hunt in ancient ruins with clue trails and mission goals',
    expectedEngineId: 'vibe-3d',
    expectedGenreFamily: 'explorationAdventure3d',
    expectedStarterTemplateId: 'relic-hunt-3d',
    reviewAxes: ['family-fit', 'starter-fit', 'camera-readability', 'hud-clarity', 'restart-flow'],
    notes: 'Checks mission-oriented exploration branch.',
  },
  {
    id: 'stunt-racer-neon',
    prompt: 'make a stunt car racing game with drift ramps, boost pads, and checkpoints',
    expectedEngineId: 'vibe-3d',
    expectedGenreFamily: 'racingDriving3d',
    expectedStarterTemplateId: 'stunt-racer-3d',
    reviewAxes: ['family-fit', 'starter-fit', 'camera-readability', 'hud-clarity', 'restart-flow'],
    notes: 'Baseline 3D driving benchmark.',
  },
  {
    id: 'survival-craft-island',
    prompt: 'make a 3d island survival game where I gather wood, craft tools, and survive the night',
    expectedEngineId: 'vibe-3d',
    expectedGenreFamily: 'survivalCraft3d',
    expectedStarterTemplateId: 'survival-crafting-game',
    reviewAxes: ['family-fit', 'starter-fit', 'camera-readability', 'hud-clarity', 'restart-flow'],
    notes: 'Checks gather-build-survive selection.',
  },
  {
    id: 'house-builder-decorate',
    prompt: 'make a 3d house builder where I place walls, furniture, and decorate rooms',
    expectedEngineId: 'vibe-3d',
    expectedGenreFamily: 'sandboxBuilder3d',
    expectedStarterTemplateId: 'house-builder',
    reviewAxes: ['family-fit', 'starter-fit', 'camera-readability', 'hud-clarity'],
    notes: 'Checks explicit builder-style selection.',
  },
];

export const LIVE_ENGINE_BENCHMARK_IDS: string[] = [
  'platformer-jungle-hero',
  'crystal-defense-waves',
  'village-quest-story',
  'trick-shot-hoops',
  'relic-hunt-ruins',
];
