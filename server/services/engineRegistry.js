import { detectGameGenre, detectGenreFamily } from '../prompts/genres.js';

export const ENGINE_IDS = {
  VIBE_2D: 'vibe-2d',
  VIBE_3D: 'vibe-3d',
};

const DIMENSION_ARCHITECTURE_DEFAULTS = {
  '2d': {
    runtimeShape: 'single-scene Phaser arcade loop',
    inputModel: 'keyboard plus touch buttons with fast arcade response',
    cameraModel: 'fixed board or light follow camera',
    hudContract: 'always-visible HUD with score, progress, and current objective',
    failureContract: 'quick fail or win feedback with an easy restart flow',
    assetStrategy: 'prefer verified local sprite packs and simple reusable scene dressing',
  },
  '3d': {
    runtimeShape: 'single-world Three.js scene with a visible play space',
    inputModel: 'keyboard plus touch controls with clear movement affordances',
    cameraModel: 'follow, chase, or orbit camera that keeps the goal readable',
    hudContract: 'mission HUD with progress, status, and contextual action feedback',
    failureContract: 'clear overlay or toast feedback with reset or replay affordance',
    assetStrategy: 'geometry-first scenes with verified local models only when safely available',
  },
};

function createArchitecture(dimension, overrides = {}) {
  return {
    ...DIMENSION_ARCHITECTURE_DEFAULTS[dimension],
    ...overrides,
  };
}

export const ENGINE_FAMILY_PROFILES = {
  platformAction: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Platform Action',
    defaultTemplateGenre: 'platformer',
    heroTemplateIds: ['platformer', 'endless-runner'],
    starterTemplateIds: ['platformer', 'endless-runner'],
    validationProfile: 'vibe-2d-platform-action',
    coreSystems: ['movement', 'jump arc', 'hazards', 'collectibles', 'goal feedback'],
    safeEditSurfaces: ['theme swap', 'player skin', 'enemy skin', 'difficulty tuning', 'level dressing'],
    architecture: createArchitecture('2d', {
      inputModel: 'left, right, and jump controls with responsive airborne tuning',
      cameraModel: 'side-follow camera or stable side-view framing',
      hudContract: 'progress HUD with score, collectible count, and goal feedback',
      failureContract: 'fall or hit feedback with instant retry or checkpoint restart',
    }),
  },
  topDownAction: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Top-Down Action',
    defaultTemplateGenre: 'maze',
    heroTemplateIds: ['maze-escape', 'top-down-adventure'],
    starterTemplateIds: ['maze-escape', 'top-down-adventure'],
    validationProfile: 'vibe-2d-top-down',
    coreSystems: ['8-way movement', 'collision hooks', 'collectibles', 'objective HUD', 'enemy pressure'],
    safeEditSurfaces: ['theme swap', 'maze layout', 'enemy count', 'collectible type', 'objective text'],
    architecture: createArchitecture('2d', {
      inputModel: '4-way or 8-way movement with immediate stop-start control',
      cameraModel: 'top-down framing with the player always readable in play space',
      hudContract: 'objective HUD with status, threats, and collection progress',
      failureContract: 'clear caught or success state with quick restart and objective reset',
    }),
  },
  racingArcade: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Racing Arcade',
    defaultTemplateGenre: 'racing',
    heroTemplateIds: ['simple-racing', 'racing'],
    starterTemplateIds: ['simple-racing', 'racing'],
    validationProfile: 'vibe-2d-racing',
    coreSystems: ['lane motion', 'traffic pacing', 'boost tuning', 'score HUD', 'crash reset'],
    safeEditSurfaces: ['car skin', 'track theme', 'traffic density', 'speed tuning', 'boost behavior'],
    architecture: createArchitecture('2d', {
      inputModel: 'lane swap or steering input with optional boost button',
      cameraModel: 'fixed race framing with fast forward readability',
      hudContract: 'speed and survival HUD with score or distance progress',
      failureContract: 'crash feedback with immediate replay loop',
    }),
  },
  puzzleCasual: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Puzzle Casual',
    defaultTemplateGenre: 'puzzle',
    heroTemplateIds: ['matching-game', 'memory-card-game'],
    starterTemplateIds: ['matching-game', 'memory-card-game'],
    validationProfile: 'vibe-2d-puzzle',
    coreSystems: ['board state', 'clear objective', 'move counter', 'feedback effects', 'win state'],
    safeEditSurfaces: ['tile art', 'board colors', 'difficulty curve', 'goal text', 'power-up rewards'],
    architecture: createArchitecture('2d', {
      runtimeShape: 'single-board Phaser puzzle loop',
      inputModel: 'tap or click interactions on a readable board state',
      cameraModel: 'fixed full-board framing',
      hudContract: 'moves, timer, goal, and reward feedback visible at all times',
      failureContract: 'clean win or lose state with replay and board reset',
    }),
  },
  simLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Simulation Lite',
    defaultTemplateGenre: 'pet-sim',
    heroTemplateIds: ['pet-care-simulator', 'farming-game'],
    starterTemplateIds: ['pet-care-simulator', 'farming-game', 'fishing-game'],
    validationProfile: 'vibe-2d-sim',
    coreSystems: ['resource loop', 'needs meter', 'progression HUD', 'time pacing', 'reward feedback'],
    safeEditSurfaces: ['theme swap', 'pet crop skin', 'resource values', 'task list', 'shop rewards'],
    architecture: createArchitecture('2d', {
      runtimeShape: 'single-scene management loop with repeated task cadence',
      inputModel: 'tap or click task selection with simple movement if needed',
      cameraModel: 'fixed management view with all key tasks visible',
      hudContract: 'resource, mood, task, and upgrade HUD with positive feedback',
      failureContract: 'soft-failure pressure with recovery loop and easy retry',
    }),
  },
  builderTycoonLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Builder / Tycoon Lite',
    defaultTemplateGenre: 'clicker',
    heroTemplateIds: ['lemonade-stand-tycoon', 'farming-game'],
    starterTemplateIds: ['lemonade-stand-tycoon', 'farming-game'],
    validationProfile: 'vibe-2d-tycoon',
    coreSystems: ['economy loop', 'upgrade pacing', 'customer or order feedback', 'profit HUD', 'reward cadence'],
    safeEditSurfaces: ['theme swap', 'shop art', 'upgrade costs', 'order mix', 'customer pacing'],
    architecture: createArchitecture('2d', {
      runtimeShape: 'single-scene economy loop with upgrades and repeat actions',
      inputModel: 'tap, click, or light drag interactions for selling and upgrading',
      cameraModel: 'fixed storefront or management framing',
      hudContract: 'money, goals, and upgrade options always readable',
      failureContract: 'soft setback or missed goal feedback with continued play',
    }),
  },
  strategyDefenseLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Strategy / Defense Lite',
    defaultTemplateGenre: 'tower-defense',
    heroTemplateIds: ['tower-defense', 'crystal-defense'],
    starterTemplateIds: ['tower-defense', 'crystal-defense'],
    validationProfile: 'vibe-2d-defense',
    coreSystems: ['lane routing', 'tower placement', 'wave pacing', 'currency loop', 'base defense feedback'],
    safeEditSurfaces: ['theme swap', 'tower skins', 'wave pacing', 'currency tuning', 'enemy mix'],
    architecture: createArchitecture('2d', {
      runtimeShape: 'single-map defense loop with recurring waves',
      inputModel: 'tap or click placement with simple wave start interactions',
      cameraModel: 'fixed battlefield overview',
      hudContract: 'wave, cash, health, and tower choices visible together',
      failureContract: 'base-hit feedback with replay and wave restart',
    }),
  },
  rpgProgressionLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'RPG / Progression Lite',
    defaultTemplateGenre: 'rpg',
    heroTemplateIds: ['dungeon-crawler', 'creature-collector', 'village-quest'],
    starterTemplateIds: ['dungeon-crawler', 'creature-collector', 'village-quest'],
    validationProfile: 'vibe-2d-rpg',
    coreSystems: ['exploration loop', 'combat or encounter pressure', 'quest text', 'reward progression', 'status HUD'],
    safeEditSurfaces: ['theme swap', 'party art', 'quest copy', 'enemy roster', 'reward tuning'],
    architecture: createArchitecture('2d', {
      inputModel: 'top-down movement with simple action or interaction input',
      cameraModel: 'top-down exploration framing',
      hudContract: 'health, xp, quest, and reward state kept readable',
      failureContract: 'battle or quest setback with safe restart or checkpoint reset',
    }),
  },
  sportsSkill: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Sports / Skill',
    defaultTemplateGenre: 'sports',
    heroTemplateIds: ['fishing-game', 'trick-shot-arena', 'sports'],
    starterTemplateIds: ['fishing-game', 'trick-shot-arena'],
    validationProfile: 'vibe-2d-sports',
    coreSystems: ['precision input', 'clear score target', 'round pacing', 'reward feedback', 'retry loop'],
    safeEditSurfaces: ['theme swap', 'athlete gear', 'target mix', 'timing difficulty', 'goal text'],
    architecture: createArchitecture('2d', {
      inputModel: 'timed button or pointer input with readable accuracy feedback',
      cameraModel: 'fixed skill-challenge framing',
      hudContract: 'score, timer, and target state visible throughout the round',
      failureContract: 'round-end summary with quick replay',
    }),
  },
  obbyPlatform3d: {
    engineId: ENGINE_IDS.VIBE_3D,
    dimension: '3d',
    label: 'Obby / 3D Platform',
    defaultTemplateGenre: null,
    heroTemplateIds: ['obby'],
    starterTemplateIds: ['obby'],
    modelPackHint: 'platformer-3d',
    validationProfile: 'vibe-3d-obby',
    coreSystems: ['movement rig', 'camera rig', 'checkpoints', 'hazards', 'finish goal'],
    safeEditSurfaces: ['world theme', 'platform shapes', 'hazard pacing', 'collectibles', 'checkpoint spacing'],
    architecture: createArchitecture('3d', {
      inputModel: 'move, steer camera, and jump with touch fallback',
      cameraModel: 'third-person follow camera tuned for jumps and landings',
      hudContract: 'checkpoint, collectible, and finish-goal HUD',
      failureContract: 'respawn at checkpoint with visible recovery feedback',
    }),
  },
  explorationAdventure3d: {
    engineId: ENGINE_IDS.VIBE_3D,
    dimension: '3d',
    label: 'Exploration Adventure 3D',
    defaultTemplateGenre: null,
    heroTemplateIds: ['open-map-explorer', 'relic-hunt-3d'],
    starterTemplateIds: ['open-map-explorer', 'relic-hunt-3d'],
    modelPackHint: 'rpg-3d',
    validationProfile: 'vibe-3d-exploration',
    coreSystems: ['movement rig', 'camera rig', 'landmarks', 'quest HUD', 'discovery loop'],
    safeEditSurfaces: ['biome theme', 'landmark art', 'quest text', 'collectibles', 'travel pacing'],
    architecture: createArchitecture('3d', {
      inputModel: 'move-and-look controls with clear interaction affordances',
      cameraModel: 'third-person or trailing exploration camera',
      hudContract: 'quest log, discovery progress, and waypoint feedback',
      failureContract: 'soft fail states with return-to-goal or replay prompt',
    }),
  },
  racingDriving3d: {
    engineId: ENGINE_IDS.VIBE_3D,
    dimension: '3d',
    label: 'Racing / Driving 3D',
    defaultTemplateGenre: 'parking',
    heroTemplateIds: ['stunt-racer-3d', 'parking'],
    starterTemplateIds: ['stunt-racer-3d'],
    modelPackHint: 'racing-3d',
    validationProfile: 'vibe-3d-racing',
    coreSystems: ['driving rig', 'chase camera', 'track readability', 'boost system', 'finish feedback'],
    safeEditSurfaces: ['car body style', 'track theme', 'ramp layout', 'boost values', 'traffic obstacles'],
    architecture: createArchitecture('3d', {
      inputModel: 'accelerate, steer, and boost controls with touch pedals fallback',
      cameraModel: 'chase camera that keeps track direction and stunts readable',
      hudContract: 'speed, boost, checkpoint, and finish progress HUD',
      failureContract: 'crash or finish overlay with immediate replay',
    }),
  },
  survivalCraft3d: {
    engineId: ENGINE_IDS.VIBE_3D,
    dimension: '3d',
    label: 'Survival / Craft 3D',
    defaultTemplateGenre: null,
    heroTemplateIds: ['survival-crafting-game'],
    starterTemplateIds: ['survival-crafting-game'],
    modelPackHint: 'common-3d',
    validationProfile: 'vibe-3d-survival',
    coreSystems: ['movement rig', 'resource loop', 'build loop', 'survival HUD', 'night pressure'],
    safeEditSurfaces: ['biome theme', 'resource types', 'recipe costs', 'enemy pressure', 'day-night timing'],
    architecture: createArchitecture('3d', {
      inputModel: 'move, look, gather, and build actions with clear touch affordances',
      cameraModel: 'third-person survival camera with build-space readability',
      hudContract: 'health, resources, time pressure, and build options visible together',
      failureContract: 'night or health loss feedback with restart or rebuild path',
    }),
  },
  sandboxBuilder3d: {
    engineId: ENGINE_IDS.VIBE_3D,
    dimension: '3d',
    label: 'Sandbox / Builder 3D',
    defaultTemplateGenre: null,
    heroTemplateIds: ['house-builder'],
    starterTemplateIds: ['house-builder'],
    modelPackHint: 'common-3d',
    validationProfile: 'vibe-3d-builder',
    coreSystems: ['movement rig', 'placement cursor', 'materials inventory', 'build goals', 'undo reset flow'],
    safeEditSurfaces: ['block palette', 'lot theme', 'blueprint targets', 'material counts', 'room props'],
    architecture: createArchitecture('3d', {
      runtimeShape: 'single-lot 3D builder loop with placement and review phases',
      inputModel: 'move, place, remove, and cycle build parts with touch support',
      cameraModel: 'builder camera that keeps cursor, lot, and blueprint readable',
      hudContract: 'build mode, material counts, and blueprint progress HUD',
      failureContract: 'undo, remove, and reset affordances instead of harsh fail states',
    }),
  },
  socialParty3d: {
    engineId: ENGINE_IDS.VIBE_3D,
    dimension: '3d',
    label: 'Social / Party 3D',
    defaultTemplateGenre: null,
    heroTemplateIds: ['social-hangout-game'],
    starterTemplateIds: ['social-hangout-game'],
    modelPackHint: 'common-3d',
    validationProfile: 'vibe-3d-social',
    coreSystems: ['movement rig', 'social hub loop', 'mini-goal prompts', 'room feedback', 'round restart flow'],
    safeEditSurfaces: ['hub theme', 'mini-game prompts', 'avatar styling', 'round pacing', 'activity mix'],
    architecture: createArchitecture('3d', {
      inputModel: 'move-and-look controls plus simple interaction prompts',
      cameraModel: 'third-person social camera with readable nearby interactions',
      hudContract: 'room state, player prompts, and round goals visible at a glance',
      failureContract: 'round-end or disconnect recovery with return-to-hub flow',
    }),
  },
};

export const TEMPLATE_BLUEPRINTS = {
  racing: {
    id: 'racing',
    label: 'Simple Racing',
    family: 'racingArcade',
    sourceTemplateGenre: 'racing',
    dimension: '2d',
  },
  shooter: {
    id: 'shooter',
    label: 'Space Blaster',
    family: 'topDownAction',
    sourceTemplateGenre: 'shooter',
    dimension: '2d',
  },
  platformer: {
    id: 'platformer',
    label: 'Platformer',
    family: 'platformAction',
    sourceTemplateGenre: 'platformer',
    dimension: '2d',
  },
  puzzle: {
    id: 'puzzle',
    label: 'Matching Game',
    family: 'puzzleCasual',
    sourceTemplateGenre: 'puzzle',
    dimension: '2d',
  },
  'endless-runner': {
    id: 'endless-runner',
    label: 'Endless Runner',
    family: 'platformAction',
    sourceTemplateGenre: 'endless-runner',
    dimension: '2d',
  },
  'maze-escape': {
    id: 'maze-escape',
    label: 'Maze Escape',
    family: 'topDownAction',
    sourceTemplateGenre: 'maze',
    dimension: '2d',
  },
  'matching-game': {
    id: 'matching-game',
    label: 'Matching Game',
    family: 'puzzleCasual',
    sourceTemplateGenre: 'puzzle',
    dimension: '2d',
  },
  'memory-card-game': {
    id: 'memory-card-game',
    label: 'Memory Card Game',
    family: 'puzzleCasual',
    sourceTemplateGenre: 'memory',
    dimension: '2d',
  },
  'simple-racing': {
    id: 'simple-racing',
    label: 'Simple Racing',
    family: 'racingArcade',
    sourceTemplateGenre: 'racing',
    dimension: '2d',
  },
  'top-down-adventure': {
    id: 'top-down-adventure',
    label: 'Top-Down Adventure',
    family: 'rpgProgressionLite',
    sourceTemplateGenre: 'rpg',
    dimension: '2d',
  },
  'pet-care-simulator': {
    id: 'pet-care-simulator',
    label: 'Pet Care Simulator',
    family: 'simLite',
    sourceTemplateGenre: 'pet-sim',
    dimension: '2d',
  },
  'lemonade-stand-tycoon': {
    id: 'lemonade-stand-tycoon',
    label: 'Lemonade Stand Tycoon',
    family: 'builderTycoonLite',
    sourceTemplateGenre: 'clicker',
    dimension: '2d',
  },
  'tower-defense': {
    id: 'tower-defense',
    label: 'Tower Defense',
    family: 'strategyDefenseLite',
    sourceTemplateGenre: 'tower-defense',
    dimension: '2d',
  },
  'crystal-defense': {
    id: 'crystal-defense',
    label: 'Crystal Defense',
    family: 'strategyDefenseLite',
    sourceTemplateGenre: null,
    templateFile: 'crystal-defense.html',
    dimension: '2d',
  },
  'dungeon-crawler': {
    id: 'dungeon-crawler',
    label: 'Dungeon Crawler',
    family: 'rpgProgressionLite',
    sourceTemplateGenre: 'rpg',
    dimension: '2d',
  },
  'village-quest': {
    id: 'village-quest',
    label: 'Village Quest',
    family: 'rpgProgressionLite',
    sourceTemplateGenre: null,
    templateFile: 'village-quest.html',
    dimension: '2d',
  },
  'farming-game': {
    id: 'farming-game',
    label: 'Farming Game',
    family: 'builderTycoonLite',
    sourceTemplateGenre: 'pet-sim',
    dimension: '2d',
  },
  'fishing-game': {
    id: 'fishing-game',
    label: 'Fishing Game',
    family: 'sportsSkill',
    sourceTemplateGenre: 'fishing',
    dimension: '2d',
  },
  'trick-shot-arena': {
    id: 'trick-shot-arena',
    label: 'Trick Shot Arena',
    family: 'sportsSkill',
    sourceTemplateGenre: null,
    templateFile: 'trick-shot-arena.html',
    dimension: '2d',
  },
  'creature-collector': {
    id: 'creature-collector',
    label: 'Creature Collector',
    family: 'rpgProgressionLite',
    sourceTemplateGenre: 'pet-sim',
    dimension: '2d',
  },
  obby: {
    id: 'obby',
    label: 'Obstacle Course / Obby',
    family: 'obbyPlatform3d',
    sourceTemplateGenre: null,
    templateFile: 'obby.html',
    dimension: '3d',
  },
  'open-map-explorer': {
    id: 'open-map-explorer',
    label: 'Open Map Explorer',
    family: 'explorationAdventure3d',
    sourceTemplateGenre: null,
    templateFile: 'open-map-explorer.html',
    dimension: '3d',
  },
  'relic-hunt-3d': {
    id: 'relic-hunt-3d',
    label: 'Relic Hunt 3D',
    family: 'explorationAdventure3d',
    sourceTemplateGenre: null,
    templateFile: 'relic-hunt-3d.html',
    dimension: '3d',
  },
  'stunt-racer-3d': {
    id: 'stunt-racer-3d',
    label: 'Stunt Racer',
    family: 'racingDriving3d',
    sourceTemplateGenre: null,
    templateFile: 'stunt-racer-3d.html',
    dimension: '3d',
  },
  'survival-crafting-game': {
    id: 'survival-crafting-game',
    label: 'Survival Crafting Game',
    family: 'survivalCraft3d',
    sourceTemplateGenre: null,
    templateFile: 'survival-crafting-game.html',
    dimension: '3d',
  },
  'house-builder': {
    id: 'house-builder',
    label: 'House Builder',
    family: 'sandboxBuilder3d',
    sourceTemplateGenre: null,
    templateFile: 'house-builder.html',
    dimension: '3d',
  },
  'social-hangout-game': {
    id: 'social-hangout-game',
    label: 'Social Hangout Game',
    family: 'socialParty3d',
    sourceTemplateGenre: null,
    templateFile: 'social-hangout-game.html',
    dimension: '3d',
  },
  parking: {
    id: 'parking',
    label: 'Parking Challenge',
    family: 'racingDriving3d',
    sourceTemplateGenre: 'parking',
    dimension: '3d',
  },
};

const GAME_TYPE_ALIASES = {
  'obstacle-course': 'obby',
  'obstacle-course-game': 'obby',
  'maze-escape-game': 'maze-escape',
  matching: 'matching-game',
  'matching-puzzle': 'matching-game',
  'pet-care': 'pet-care-simulator',
  'pet-sim': 'pet-care-simulator',
  'pet-simulator': 'pet-care-simulator',
  'simple-racing-game': 'simple-racing',
  'tower-defense-game': 'tower-defense',
  'lane-defense': 'crystal-defense',
  'guardian-defense': 'crystal-defense',
  'crystal-guardians': 'crystal-defense',
  'town-quest': 'village-quest',
  'storybook-rpg': 'village-quest',
  'quest-village': 'village-quest',
  fishing: 'fishing-game',
  'trick-shot': 'trick-shot-arena',
  'basketball-challenge': 'trick-shot-arena',
  'hoop-shot': 'trick-shot-arena',
  'top-down-adventure-game': 'top-down-adventure',
  'open-map-adventure': 'open-map-explorer',
  'relic-hunt': 'relic-hunt-3d',
  'treasure-hunt-3d': 'relic-hunt-3d',
  'ruins-adventure': 'relic-hunt-3d',
  'survival-crafting': 'survival-crafting-game',
  'stunt-racer': 'stunt-racer-3d',
  'stunt-racing': 'stunt-racer-3d',
  'drift-racer': 'stunt-racer-3d',
  'house-designer': 'house-builder',
};

const GENRE_FAMILY_BY_GAME_TYPE = {
  racing: 'racingArcade',
  'street-racing': 'racingArcade',
  driving: 'racingArcade',
  shooter: 'topDownAction',
  'top-down-shooter': 'topDownAction',
  platformer: 'platformAction',
  'endless-runner': 'platformAction',
  fighting: 'platformAction',
  frogger: 'platformAction',
  catch: 'platformAction',
  dodge: 'platformAction',
  puzzle: 'puzzleCasual',
  card: 'puzzleCasual',
  memory: 'puzzleCasual',
  'memory-card': 'puzzleCasual',
  'bubble-shooter': 'puzzleCasual',
  'falling-blocks': 'puzzleCasual',
  'simon-says': 'puzzleCasual',
  'find-the-friend': 'puzzleCasual',
  'fruit-slice': 'puzzleCasual',
  'tower-stack': 'puzzleCasual',
  sports: 'sportsSkill',
  pong: 'sportsSkill',
  fishing: 'sportsSkill',
  snake: 'topDownAction',
  maze: 'topDownAction',
  'treasure-diver': 'topDownAction',
  rpg: 'rpgProgressionLite',
  'tower-defense': 'strategyDefenseLite',
  'pet-sim': 'simLite',
  simulation: 'simLite',
  'trash-sorter': 'simLite',
  clicker: 'builderTycoonLite',
  parking: 'racingDriving3d',
  obby: 'obbyPlatform3d',
  'crystal-defense': 'strategyDefenseLite',
  'village-quest': 'rpgProgressionLite',
  'trick-shot-arena': 'sportsSkill',
  'open-map-explorer': 'explorationAdventure3d',
  'relic-hunt': 'explorationAdventure3d',
  'relic-hunt-3d': 'explorationAdventure3d',
  'house-builder': 'sandboxBuilder3d',
  'survival-crafting-game': 'survivalCraft3d',
  'stunt-racer-3d': 'racingDriving3d',
};

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
}

function inferStarterTemplateFromPrompt(prompt = '') {
  const text = String(prompt || '').toLowerCase();
  if (!text) return null;

  const starterSignals = [
    {
      id: 'trick-shot-arena',
      patterns: [
        /\btrick shot\b/i,
        /\bbasketball challenge\b/i,
        /\bhoop shot\b/i,
        /\btarget shot\b/i,
        /\bskill shot\b/i,
      ],
    },
    {
      id: 'village-quest',
      patterns: [
        /\bvillage quest\b/i,
        /\btown quest\b/i,
        /\bhelp villagers\b/i,
        /\bstory quest\b/i,
        /\blevel up adventure\b/i,
      ],
    },
    {
      id: 'crystal-defense',
      patterns: [
        /\bcrystal defense\b/i,
        /\blane defense\b/i,
        /\bguardian defense\b/i,
        /\bprotect the crystal\b/i,
        /\bmagic defense\b/i,
      ],
    },
    {
      id: 'relic-hunt-3d',
      patterns: [/\brelic hunt\b/i, /\blost temple\b/i, /\bancient ruins\b/i, /\bclue trail\b/i, /\brelic quest\b/i],
    },
    {
      id: 'open-map-explorer',
      patterns: [/\bopen world\b/i, /\bopen map\b/i, /\bexplorer\b/i, /\bdiscover\b/i, /\blandmarks?\b/i],
    },
    {
      id: 'house-builder',
      patterns: [/\bhouse builder\b/i, /\bhouse designer\b/i, /\bdecorate rooms?\b/i, /\bplace furniture\b/i],
    },
    {
      id: 'survival-crafting-game',
      patterns: [/\bisland survival\b/i, /\bsurvival crafting\b/i, /\bgather and build\b/i, /\bsurvive the night\b/i],
    },
    {
      id: 'stunt-racer-3d',
      patterns: [/\bstunt racer\b/i, /\bstunt driving\b/i, /\bdrift\b/i, /\bboost pads?\b/i, /\bramps?\b/i],
    },
    { id: 'obby', patterns: [/\bobby\b/i, /\broblox\b/i, /\bparkour\b/i, /\bobstacle course\b/i] },
  ];

  for (const signal of starterSignals) {
    if (signal.patterns.some((pattern) => pattern.test(text))) {
      return signal.id;
    }
  }

  return null;
}

export function normalizeGameType(value) {
  const normalized = normalizeToken(value);
  return GAME_TYPE_ALIASES[normalized] || normalized;
}

export function getTemplateBlueprint(gameType) {
  const normalized = normalizeGameType(gameType);
  return TEMPLATE_BLUEPRINTS[normalized] || null;
}

export function getFamilyProfile(genreFamily) {
  return ENGINE_FAMILY_PROFILES[genreFamily] || null;
}

export function getFamilyArchitecture(genreFamily) {
  return ENGINE_FAMILY_PROFILES[genreFamily]?.architecture || null;
}

function inferFamilyFromCode(currentCode = '') {
  const code = String(currentCode || '');
  if (!code) return null;

  if (/THREE\.Scene|THREE\.PerspectiveCamera|new\s+THREE\./i.test(code)) {
    if (/health|hunger|day|night|shelter|campfire/i.test(code)) return 'survivalCraft3d';
    if (/\bbuild\b|\bplace\b|\bmaterials\b|\binventory\b|blueprint|buildMode/i.test(code)) {
      return 'sandboxBuilder3d';
    }
    if (/VibeMultiplayer|players|room/i.test(code)) return 'socialParty3d';
    if (/\broad\b|\btrack\b|\bcar\b|\bboost\b|\bdrift\b|\blap\b|\bsteer\b|sedan|suv|vehicle/i.test(code)) {
      return 'racingDriving3d';
    }
    if (/\bquest\b|\bobjective\b|\brelic\b|\blandmark\b|towerVisited|questLog/i.test(code)) {
      return 'explorationAdventure3d';
    }
    if (/checkpoint|finish|goal/i.test(code)) return 'obbyPlatform3d';
    return 'explorationAdventure3d';
  }

  if (/Phaser\.Game/i.test(code)) {
    if (/tower|wave|defense|guardian|crystalHp|baseHp/i.test(code)) return 'strategyDefenseLite';
    if (
      /\baccuracy\b|\bshot\b|\bhoop\b|\btarget\b|\breel\b|\bfish\b|playerScore|aiScore|goalScored|kickCooldown/i.test(
        code,
      )
    ) {
      return 'sportsSkill';
    }
    if (/\brace\b|\bcar\b|\btraffic\b|\bboost\b|\blap\b|\bvehicle\b/i.test(code)) return 'racingArcade';
    if (/\bquest\b|\bxp\b|\blevel\b|\binventory\b|villager|questLog|storyProgress/i.test(code))
      return 'rpgProgressionLite';
    if (/\bmood\b|\benergy\b|\bpet\b|\bharvest\b/i.test(code)) return 'simLite';
    if (/\bmoves\b|\bmatch\b|\bcard\b|\btimer\b|\bgrid\b/i.test(code)) return 'puzzleCasual';
    if (/ghost|maze|dotsTotal|collectDot|setVelocity\(vx,\s*vy\)|setVelocity\([^,]+,\s*[^)]+\)/i.test(code)) {
      return 'topDownAction';
    }
    if (/setVelocityY|touching\.down|setGravityY|staticGroup\(\)|jump/i.test(code)) return 'platformAction';
    return 'topDownAction';
  }

  return null;
}

const PROMPT_FAMILY_SIGNAL_PATTERNS = {
  explorationAdventure3d: [
    /\bopen world\b/i,
    /\bopen map\b/i,
    /\brelic\b/i,
    /\bruins?\b/i,
    /\blandmark\b/i,
    /\bquest\b/i,
    /\btreasure hunt\b/i,
    /\bexplore\b/i,
    /\bdiscovery\b/i,
    /\bancient temple\b/i,
  ],
  sandboxBuilder3d: [
    /\bhouse\b/i,
    /\bbuilder\b/i,
    /\bbuild\b/i,
    /\bplace\b/i,
    /\bdecorate\b/i,
    /\bfurniture\b/i,
    /\bblueprint\b/i,
    /\broom\b/i,
    /\bsandbox\b/i,
    /\bdesign\b/i,
  ],
  survivalCraft3d: [
    /\bsurviv(?:al|e)\b/i,
    /\bcraft(?:ing)?\b/i,
    /\bgather\b/i,
    /\bresource\b/i,
    /\bshelter\b/i,
    /\bhunger\b/i,
    /\bnight\b/i,
    /\bscavenge\b/i,
    /\bmine\b/i,
    /\bforage\b/i,
  ],
  racingDriving3d: [
    /\bstunt\b/i,
    /\bdrift\b/i,
    /\brace\b/i,
    /\bracing\b/i,
    /\bcar\b/i,
    /\bvehicle\b/i,
    /\btruck\b/i,
    /\bboost\b/i,
    /\bramp\b/i,
    /\bcheckpoint\b/i,
  ],
  obbyPlatform3d: [/\bobby\b/i, /\broblox\b/i, /\bparkour\b/i, /\bjump\b/i, /\bplatform\b/i, /\bobstacle course\b/i],
  platformAction: [
    /\bside scroller\b/i,
    /\bside-scroller\b/i,
    /\bjump\b/i,
    /\bdouble jump\b/i,
    /\bplatformer\b/i,
    /\bcoins?\b/i,
    /\bspikes?\b/i,
  ],
  topDownAction: [/\btop down\b/i, /\btop-down\b/i, /\bmaze\b/i, /\bchasers?\b/i, /\boverhead\b/i, /\bescape\b/i],
  strategyDefenseLite: [
    /\bdefense\b/i,
    /\btower\b/i,
    /\bwaves?\b/i,
    /\blanes?\b/i,
    /\bguardians?\b/i,
    /\bprotect\b/i,
    /\bcrystal\b/i,
    /\bbase\b/i,
  ],
  rpgProgressionLite: [
    /\brpg\b/i,
    /\bquest\b/i,
    /\bloot\b/i,
    /\bxp\b/i,
    /\blevel(?: up)?\b/i,
    /\bdungeon\b/i,
    /\bvillagers?\b/i,
    /\btown\b/i,
  ],
  sportsSkill: [/\bsports?\b/i, /\bscore\b/i, /\btimer\b/i, /\baccuracy\b/i, /\bshot\b/i, /\bhoop\b/i, /\bfishing\b/i],
};

function inferFamilyFromPromptSignals(prompt = '', gameConfig = null) {
  const text = String(prompt || '').toLowerCase();
  if (!text) return null;

  const families =
    gameConfig?.dimension === '3d'
      ? ['obbyPlatform3d', 'explorationAdventure3d', 'racingDriving3d', 'survivalCraft3d', 'sandboxBuilder3d']
      : gameConfig?.dimension === '2d'
        ? [
            'platformAction',
            'topDownAction',
            'racingArcade',
            'puzzleCasual',
            'simLite',
            'builderTycoonLite',
            'strategyDefenseLite',
            'rpgProgressionLite',
            'sportsSkill',
          ]
        : Object.keys(PROMPT_FAMILY_SIGNAL_PATTERNS);

  let bestFamily = null;
  let bestScore = 0;

  for (const family of families) {
    const patterns = PROMPT_FAMILY_SIGNAL_PATTERNS[family] || [];
    const score = patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestFamily = family;
    }
  }

  if (bestScore >= 2) return bestFamily;

  if (bestScore === 1) {
    if (bestFamily === 'obbyPlatform3d' || /\b3d\b|\broblox\b/.test(text)) return bestFamily;
    if (bestFamily === 'explorationAdventure3d' && /\b3d\b|\bopen\b|\brelic\b|\bruins?\b/.test(text)) return bestFamily;
    if (bestFamily === 'sandboxBuilder3d' && /\b3d\b|\bhouse\b|\bbuild\b|\bdecorate\b/.test(text)) return bestFamily;
    if (bestFamily === 'survivalCraft3d' && /\b3d\b|\bsurviv(?:al|e)\b|\bcraft(?:ing)?\b/.test(text)) return bestFamily;
    if (bestFamily === 'racingDriving3d' && /\b3d\b|\bstunt\b|\bdrift\b|\brace\b|\bcar\b/.test(text)) return bestFamily;
    if (bestFamily === 'platformAction' && /\bjump\b|\bside\b|\bplatform\b/.test(text)) return bestFamily;
    if (bestFamily === 'topDownAction' && /\bmaze\b|\bescape\b|\btop\b/.test(text)) return bestFamily;
    if (bestFamily === 'strategyDefenseLite' && /\bdefense\b|\btower\b|\bwave\b|\blane\b|\bcrystal\b/.test(text))
      return bestFamily;
    if (
      bestFamily === 'rpgProgressionLite' &&
      /\brpg\b|\bquest\b|\bloot\b|\bxp\b|\bdungeon\b|\bvillage\b|\btown\b/.test(text)
    )
      return bestFamily;
    if (bestFamily === 'sportsSkill' && /\bsport\b|\bshot\b|\bhoop\b|\baccuracy\b|\bfishing\b|\btarget\b/.test(text))
      return bestFamily;
  }

  return null;
}

export function resolveEngineProfile({ prompt = '', genre = null, gameConfig = null, currentCode = null } = {}) {
  const promptText = String(prompt || '');
  const promptSignalFamily = inferFamilyFromPromptSignals(promptText, gameConfig);
  const detectedFamily = detectGenreFamily(promptText);
  const codeDetectedFamily = inferFamilyFromCode(currentCode);
  const promptStarterId = inferStarterTemplateFromPrompt(promptText);
  const normalizedRequestedType = normalizeGameType(
    gameConfig?.starterTemplateId ||
      gameConfig?.gameType ||
      genre ||
      promptStarterId ||
      detectGameGenre(promptText) ||
      '',
  );

  const starterBlueprint = getTemplateBlueprint(normalizedRequestedType);
  const inferredFamily =
    gameConfig?.genreFamily ||
    promptSignalFamily ||
    detectedFamily ||
    starterBlueprint?.family ||
    codeDetectedFamily ||
    GENRE_FAMILY_BY_GAME_TYPE[normalizedRequestedType] ||
    (gameConfig?.dimension === '3d' ? 'obbyPlatform3d' : 'platformAction');

  const familyProfile = getFamilyProfile(inferredFamily) || ENGINE_FAMILY_PROFILES.platformAction;
  const wants3D =
    gameConfig?.dimension === '3d' ||
    familyProfile.dimension === '3d' ||
    /\b3d\b/.test(promptText.toLowerCase()) ||
    /\bobby\b|\broblox\b/.test(promptText.toLowerCase());

  const engineId = gameConfig?.engineId || (wants3D ? ENGINE_IDS.VIBE_3D : familyProfile.engineId);
  const dimension = wants3D ? '3d' : '2d';

  const preferredStarterId =
    familyProfile.dimension === '3d' && starterBlueprint?.dimension !== '3d'
      ? familyProfile.starterTemplateIds[0]
      : starterBlueprint?.id;
  const resolvedStarterId =
    preferredStarterId ||
    familyProfile.starterTemplateIds[0] ||
    normalizedRequestedType ||
    (dimension === '3d' ? 'obby' : familyProfile.defaultTemplateGenre || 'platformer');

  const resolvedBlueprint = getTemplateBlueprint(resolvedStarterId) || starterBlueprint;
  const templateGenre =
    resolvedBlueprint?.sourceTemplateGenre || normalizedRequestedType || familyProfile.defaultTemplateGenre || null;
  const templateFile = resolvedBlueprint?.templateFile || (templateGenre ? `${templateGenre}.html` : null);

  return {
    engineId,
    dimension,
    genreFamily: familyProfile === ENGINE_FAMILY_PROFILES[inferredFamily] ? inferredFamily : 'platformAction',
    requestedGameType: normalizedRequestedType || resolvedStarterId,
    starterTemplateId: resolvedStarterId,
    templateId: resolvedBlueprint?.id || resolvedStarterId,
    templateGenre,
    templateFile,
    validationProfile: familyProfile.validationProfile,
    label: familyProfile.label,
    heroTemplateIds: familyProfile.heroTemplateIds,
    modelPackHint: familyProfile.modelPackHint || null,
    coreSystems: familyProfile.coreSystems || [],
    safeEditSurfaces: familyProfile.safeEditSurfaces || [],
    architecture: familyProfile.architecture || null,
  };
}
