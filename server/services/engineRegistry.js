import { detectGameGenre, detectGenreFamily } from '../prompts/genres.js';

export const ENGINE_IDS = {
  VIBE_2D: 'vibe-2d',
  VIBE_3D: 'vibe-3d',
};

export const ENGINE_FAMILY_PROFILES = {
  platformAction: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Platform Action',
    defaultTemplateGenre: 'platformer',
    heroTemplateIds: ['platformer', 'endless-runner'],
    starterTemplateIds: ['platformer', 'endless-runner'],
    validationProfile: 'vibe-2d-platform-action',
  },
  topDownAction: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Top-Down Action',
    defaultTemplateGenre: 'maze',
    heroTemplateIds: ['maze-escape', 'top-down-adventure'],
    starterTemplateIds: ['maze-escape', 'top-down-adventure'],
    validationProfile: 'vibe-2d-top-down',
  },
  racingArcade: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Racing Arcade',
    defaultTemplateGenre: 'racing',
    heroTemplateIds: ['simple-racing', 'racing'],
    starterTemplateIds: ['simple-racing', 'racing'],
    validationProfile: 'vibe-2d-racing',
  },
  puzzleCasual: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Puzzle Casual',
    defaultTemplateGenre: 'puzzle',
    heroTemplateIds: ['matching-game', 'memory-card-game'],
    starterTemplateIds: ['matching-game', 'memory-card-game'],
    validationProfile: 'vibe-2d-puzzle',
  },
  simLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Simulation Lite',
    defaultTemplateGenre: 'pet-sim',
    heroTemplateIds: ['pet-care-simulator', 'farming-game'],
    starterTemplateIds: ['pet-care-simulator', 'farming-game', 'fishing-game'],
    validationProfile: 'vibe-2d-sim',
  },
  builderTycoonLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Builder / Tycoon Lite',
    defaultTemplateGenre: 'clicker',
    heroTemplateIds: ['lemonade-stand-tycoon', 'farming-game'],
    starterTemplateIds: ['lemonade-stand-tycoon', 'farming-game'],
    validationProfile: 'vibe-2d-tycoon',
  },
  strategyDefenseLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Strategy / Defense Lite',
    defaultTemplateGenre: 'tower-defense',
    heroTemplateIds: ['tower-defense'],
    starterTemplateIds: ['tower-defense'],
    validationProfile: 'vibe-2d-defense',
  },
  rpgProgressionLite: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'RPG / Progression Lite',
    defaultTemplateGenre: 'rpg',
    heroTemplateIds: ['dungeon-crawler', 'creature-collector'],
    starterTemplateIds: ['dungeon-crawler', 'creature-collector'],
    validationProfile: 'vibe-2d-rpg',
  },
  sportsSkill: {
    engineId: ENGINE_IDS.VIBE_2D,
    dimension: '2d',
    label: 'Sports / Skill',
    defaultTemplateGenre: 'sports',
    heroTemplateIds: ['fishing-game', 'sports'],
    starterTemplateIds: ['fishing-game'],
    validationProfile: 'vibe-2d-sports',
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
  },
  explorationAdventure3d: {
    engineId: ENGINE_IDS.VIBE_3D,
    dimension: '3d',
    label: 'Exploration Adventure 3D',
    defaultTemplateGenre: null,
    heroTemplateIds: ['open-map-explorer'],
    starterTemplateIds: ['open-map-explorer'],
    modelPackHint: 'rpg-3d',
    validationProfile: 'vibe-3d-exploration',
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
  'dungeon-crawler': {
    id: 'dungeon-crawler',
    label: 'Dungeon Crawler',
    family: 'rpgProgressionLite',
    sourceTemplateGenre: 'rpg',
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
  'stunt-racer-3d': {
    id: 'stunt-racer-3d',
    label: 'Stunt Racer',
    family: 'racingDriving3d',
    sourceTemplateGenre: 'parking',
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
  fishing: 'fishing-game',
  'top-down-adventure-game': 'top-down-adventure',
  'open-map-adventure': 'open-map-explorer',
  'survival-crafting': 'survival-crafting-game',
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
};

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
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

function inferFamilyFromCode(currentCode = '') {
  const code = String(currentCode || '');
  if (!code) return null;

  if (/THREE\.Scene|THREE\.PerspectiveCamera|new\s+THREE\./i.test(code)) {
    if (/checkpoint|finish|goal/i.test(code)) return 'obbyPlatform3d';
    if (/health|hunger|day|night|shelter|campfire/i.test(code)) return 'survivalCraft3d';
    if (/road|track|car|boost|drift|lap|steer/i.test(code)) return 'racingDriving3d';
    if (/build|place|materials|inventory/i.test(code)) return 'sandboxBuilder3d';
    if (/VibeMultiplayer|players|room/i.test(code)) return 'socialParty3d';
    return 'explorationAdventure3d';
  }

  if (/Phaser\.Game/i.test(code)) {
    if (/tower|wave/i.test(code)) return 'strategyDefenseLite';
    if (/quest|xp|level|inventory/i.test(code)) return 'rpgProgressionLite';
    if (/mood|energy|pet|harvest/i.test(code)) return 'simLite';
    if (/moves|match|card|timer|grid/i.test(code)) return 'puzzleCasual';
    if (/race|car|road|boost/i.test(code)) return 'racingArcade';
    if (/setVelocityY|gravity|platform/i.test(code)) return 'platformAction';
    return 'topDownAction';
  }

  return null;
}

export function resolveEngineProfile({ prompt = '', genre = null, gameConfig = null, currentCode = null } = {}) {
  const promptText = String(prompt || '');
  const detectedFamily = detectGenreFamily(promptText);
  const codeDetectedFamily = inferFamilyFromCode(currentCode);
  const normalizedRequestedType = normalizeGameType(
    gameConfig?.starterTemplateId || gameConfig?.gameType || genre || detectGameGenre(promptText) || '',
  );

  const starterBlueprint = getTemplateBlueprint(normalizedRequestedType);
  const inferredFamily =
    gameConfig?.genreFamily ||
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
    normalizedRequestedType ||
    familyProfile.starterTemplateIds[0] ||
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
  };
}
