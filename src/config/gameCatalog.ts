import type { EngineId, GenreFamily, StarterTemplateId } from '../types';

export interface StarterTemplateCard {
  id: StarterTemplateId;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  engineId: EngineId;
  dimension: '2d' | '3d';
  genreFamily: GenreFamily;
  defaultTheme: string;
  defaultCharacter: string;
  defaultObstacle: string;
  promptHint: string;
  gradient: string;
}

export interface EngineSelectionGuide {
  label: string;
  runtimeSummary: string;
  iterationSweetSpot: string;
  assetStrategy: string;
  architectureReason: string;
}

export interface StarterFamilyGuide {
  label: string;
  bestFor: string;
  remixFocus: string;
}

export const ENGINE_SELECTION_GUIDE: Record<EngineId, EngineSelectionGuide> = {
  'vibe-2d': {
    label: 'Vibe 2D',
    runtimeSummary: 'Fast 2D starters for simple, arcade-style games.',
    iterationSweetSpot: 'Great for platformers, racers, mazes, and other quick-play ideas.',
    assetStrategy: 'Lean on verified sprite packs, simple scenes, and template reuse instead of one-off systems.',
    architectureReason: 'Best when you want a game that is easy to start, easy to change, and fun right away.',
  },
  'vibe-3d': {
    label: 'Vibe 3D',
    runtimeSummary: '3D starters for bigger worlds, movement, and exploration.',
    iterationSweetSpot: 'Great for obbies, builders, driving games, and open-world ideas.',
    assetStrategy:
      'Prefer geometry-first scenes and only use verified local 3D assets when the asset manifest says they are safe.',
    architectureReason: 'Best when the idea needs a world to explore, build in, or move through.',
  },
};

export const STARTER_FAMILY_GUIDE: Record<GenreFamily, StarterFamilyGuide> = {
  platformAction: {
    label: 'Platform Action',
    bestFor: 'Best for jumping, timing, hazards, and quick retries.',
    remixFocus: 'Easy to remix with new levels, enemies, collectibles, and boss moments.',
  },
  topDownAction: {
    label: 'Adventure & Maze',
    bestFor: 'Best for exploring maps, dodging chasers, and finding goals.',
    remixFocus: 'Easy to remix with new mazes, quests, treasure paths, and stealth twists.',
  },
  racingArcade: {
    label: 'Arcade Racing',
    bestFor: 'Best for speed, traffic pressure, boosts, and score chasing.',
    remixFocus: 'Easy to remix with new vehicles, roads, weather, and pace tuning.',
  },
  puzzleCasual: {
    label: 'Puzzle & Brain Games',
    bestFor: 'Best for matching, memory, timers, and satisfying win states.',
    remixFocus: 'Easy to remix with new board art, rules, goals, and difficulty curves.',
  },
  simLite: {
    label: 'Sim Lite',
    bestFor: 'Best for care loops, resources, routines, and cozy progression.',
    remixFocus: 'Easy to remix with new pets, crops, chores, rewards, and moods.',
  },
  builderTycoonLite: {
    label: 'Tycoon & Builder Lite',
    bestFor: 'Best for earning, upgrading, serving customers, and growing a shop.',
    remixFocus: 'Easy to remix with new businesses, upgrade paths, products, and pacing.',
  },
  strategyDefenseLite: {
    label: 'Strategy Defense',
    bestFor: 'Best for lane planning, tower placement, waves, and base defense.',
    remixFocus: 'Easy to remix with new towers, enemy mixes, maps, and upgrade costs.',
  },
  rpgProgressionLite: {
    label: 'RPG & Progression',
    bestFor: 'Best for quests, loot, leveling up, and adventure loops.',
    remixFocus: 'Easy to remix with new worlds, party members, enemies, and reward arcs.',
  },
  sportsSkill: {
    label: 'Sports & Skill',
    bestFor: 'Best for timing, aim, rounds, and score targets.',
    remixFocus: 'Easy to remix with new arenas, challenge rules, equipment, and precision goals.',
  },
  obbyPlatform3d: {
    label: 'Obby & 3D Platform',
    bestFor: 'Best for jumps, checkpoints, hazards, and readable 3D routes.',
    remixFocus: 'Easy to remix with new platform shapes, themes, collectibles, and stunt paths.',
  },
  explorationAdventure3d: {
    label: '3D Exploration',
    bestFor: 'Best for roaming worlds, landmarks, missions, and discovery.',
    remixFocus: 'Easy to remix with new biomes, relic hunts, routes, and quest goals.',
  },
  racingDriving3d: {
    label: '3D Racing & Driving',
    bestFor: 'Best for chase cameras, ramps, drifting, and checkpoint races.',
    remixFocus: 'Easy to remix with new cars, tracks, stunts, boost pads, and obstacle layouts.',
  },
  survivalCraft3d: {
    label: 'Survival & Craft 3D',
    bestFor: 'Best for gathering, crafting, building, and surviving day-night pressure.',
    remixFocus: 'Easy to remix with new biomes, resources, recipes, shelters, and creature pressure.',
  },
  sandboxBuilder3d: {
    label: 'Sandbox Builder 3D',
    bestFor: 'Best for placing parts, shaping spaces, and finishing build goals.',
    remixFocus: 'Easy to remix with new lots, materials, blueprints, room themes, and build targets.',
  },
  socialParty3d: {
    label: 'Social Party 3D',
    bestFor: 'Best for hub spaces, mini-goals, friendly competition, and shared play.',
    remixFocus: 'Easy to remix with new rooms, activities, prompts, and party rounds.',
  },
};

export function getStarterFamilyGuide(genreFamily: GenreFamily): StarterFamilyGuide {
  return STARTER_FAMILY_GUIDE[genreFamily];
}

export function getStarterRecommendationReason(template: StarterTemplateCard, wasInferred = false): string {
  const familyGuide = getStarterFamilyGuide(template.genreFamily);
  const engineGuide = ENGINE_SELECTION_GUIDE[template.engineId];

  if (wasInferred) {
    return `I matched that to ${template.label} because ${familyGuide.bestFor.toLowerCase()} It fits the ${familyGuide.label} path inside ${engineGuide.label}.`;
  }

  return `${template.label} uses the ${familyGuide.label} path in ${engineGuide.label}. ${familyGuide.bestFor}`;
}

export const STARTER_TEMPLATES: StarterTemplateCard[] = [
  {
    id: 'endless-runner',
    label: 'Endless Runner',
    shortLabel: 'Runner',
    description: 'Run, jump, and dodge forever',
    icon: '🏃',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'platformAction',
    defaultTheme: 'city',
    defaultCharacter: 'hero',
    defaultObstacle: 'barriers',
    promptHint: 'Fast starter for movement and jump-based action.',
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7c948 50%, #1a1a2e 100%)',
  },
  {
    id: 'maze-escape',
    label: 'Maze Escape',
    shortLabel: 'Maze',
    description: 'Find the exit and avoid trouble',
    icon: '🌀',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'topDownAction',
    defaultTheme: 'mystery',
    defaultCharacter: 'explorer',
    defaultObstacle: 'chasers',
    promptHint: 'Great for exploration, treasure, escape, and mystery loops.',
    gradient: 'linear-gradient(135deg, #0a3d62 0%, #0c2461 100%)',
  },
  {
    id: 'matching-game',
    label: 'Matching Game',
    shortLabel: 'Matching',
    description: 'Match shapes, gems, or colors',
    icon: '💎',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'puzzleCasual',
    defaultTheme: 'animals',
    defaultCharacter: 'gems',
    defaultObstacle: 'time limit',
    promptHint: 'Best starter for simple puzzle loops and younger players.',
    gradient: 'linear-gradient(135deg, #4a1a6b 0%, #2a1040 50%, #6b21a8 100%)',
  },
  {
    id: 'platformer',
    label: 'Platformer',
    shortLabel: 'Platformer',
    description: 'Jump, collect, and reach the goal',
    icon: '🦘',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'platformAction',
    defaultTheme: 'jungle',
    defaultCharacter: 'hero',
    defaultObstacle: 'spikes',
    promptHint: 'Strong starter for side-scrolling action and boss variants.',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  },
  {
    id: 'simple-racing',
    label: 'Simple Racing',
    shortLabel: 'Racing',
    description: 'Dodge traffic and speed ahead',
    icon: '🏎️',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'racingArcade',
    defaultTheme: 'city',
    defaultCharacter: 'race car',
    defaultObstacle: 'traffic',
    promptHint: 'Works for kart, bike, hover, and endless road variants.',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  {
    id: 'top-down-adventure',
    label: 'Top-Down Adventure',
    shortLabel: 'Adventure',
    description: 'Explore, find things, and complete a quest',
    icon: '🗺️',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'rpgProgressionLite',
    defaultTheme: 'forest',
    defaultCharacter: 'explorer',
    defaultObstacle: 'monsters',
    promptHint: 'Best starter for quest, detective, and treasure hunt ideas.',
    gradient: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #52b788 100%)',
  },
  {
    id: 'pet-care-simulator',
    label: 'Pet Care Simulator',
    shortLabel: 'Pet Care',
    description: 'Feed, play, and care for a buddy',
    icon: '🐾',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'simLite',
    defaultTheme: 'home',
    defaultCharacter: 'pet',
    defaultObstacle: 'needs',
    promptHint: 'Great for nurturing loops and cozy sim variants.',
    gradient: 'linear-gradient(135deg, #fdcb6e 0%, #f39c12 50%, #e17055 100%)',
  },
  {
    id: 'lemonade-stand-tycoon',
    label: 'Lemonade Stand Tycoon',
    shortLabel: 'Tycoon',
    description: 'Sell, upgrade, and earn more',
    icon: '🍋',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'builderTycoonLite',
    defaultTheme: 'summer',
    defaultCharacter: 'shop owner',
    defaultObstacle: 'busy customers',
    promptHint: 'Best starter for shop, bakery, restaurant, and farm tycoon loops.',
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  },
  {
    id: 'tower-defense',
    label: 'Tower Defense',
    shortLabel: 'Defense',
    description: 'Place towers and stop the waves',
    icon: '🏰',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'strategyDefenseLite',
    defaultTheme: 'castle',
    defaultCharacter: 'defender',
    defaultObstacle: 'enemy waves',
    promptHint: 'Great base for castle defense, base defense, and wave strategy games.',
    gradient: 'linear-gradient(135deg, #2d3436 0%, #636e72 50%, #00b894 100%)',
  },
  {
    id: 'crystal-defense',
    label: 'Crystal Defense',
    shortLabel: 'Crystal',
    description: 'Place guardians, protect the crystal, and stop lane waves',
    icon: '🔮',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'strategyDefenseLite',
    defaultTheme: 'magic valley',
    defaultCharacter: 'guardian',
    defaultObstacle: 'lane waves',
    promptHint: 'Best starter for lane defense, crystal defense, and magical base-defense ideas.',
    gradient: 'linear-gradient(135deg, #312e81 0%, #7c3aed 55%, #22d3ee 100%)',
  },
  {
    id: 'dungeon-crawler',
    label: 'Dungeon Crawler',
    shortLabel: 'Dungeon',
    description: 'Battle monsters and gather loot',
    icon: '⚔️',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'rpgProgressionLite',
    defaultTheme: 'dungeon',
    defaultCharacter: 'hero',
    defaultObstacle: 'monsters',
    promptHint: 'Best starter for fantasy RPGs and upgrade quests.',
    gradient: 'linear-gradient(135deg, #3a3a3a 0%, #6d597a 50%, #b56576 100%)',
  },
  {
    id: 'village-quest',
    label: 'Village Quest',
    shortLabel: 'Village',
    description: 'Help villagers, level up, and finish story quests',
    icon: '📜',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'rpgProgressionLite',
    defaultTheme: 'storybook village',
    defaultCharacter: 'quest hero',
    defaultObstacle: 'quest tasks',
    promptHint: 'Best starter for town quests, story missions, leveling up, and friendly RPG adventures.',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 55%, #f59e0b 100%)',
  },
  {
    id: 'farming-game',
    label: 'Farming Game',
    shortLabel: 'Farming',
    description: 'Plant, harvest, and grow your world',
    icon: '🌾',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'builderTycoonLite',
    defaultTheme: 'farm',
    defaultCharacter: 'farmer',
    defaultObstacle: 'weather',
    promptHint: 'Strong starter for farm, zoo, and cozy build loops.',
    gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
  },
  {
    id: 'fishing-game',
    label: 'Fishing Game',
    shortLabel: 'Fishing',
    description: 'Cast, catch, and reel in prizes',
    icon: '🎣',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'sportsSkill',
    defaultTheme: 'lake',
    defaultCharacter: 'angler',
    defaultObstacle: 'rare fish',
    promptHint: 'A relaxed skill-game starter with clear goals and upgrades.',
    gradient: 'linear-gradient(180deg, #74b9ff 0%, #0984e3 60%, #0a3d62 100%)',
  },
  {
    id: 'trick-shot-arena',
    label: 'Trick Shot Arena',
    shortLabel: 'Trick Shot',
    description: 'Aim, time, and sink wild shots',
    icon: '🏀',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'sportsSkill',
    defaultTheme: 'arena',
    defaultCharacter: 'shooter',
    defaultObstacle: 'moving hoops',
    promptHint: 'Best starter for basketball shots, trick shots, timing games, and accuracy challenges.',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 55%, #0f172a 100%)',
  },
  {
    id: 'creature-collector',
    label: 'Creature Collector',
    shortLabel: 'Collector',
    description: 'Find, train, and collect magical friends',
    icon: '🐉',
    engineId: 'vibe-2d',
    dimension: '2d',
    genreFamily: 'rpgProgressionLite',
    defaultTheme: 'fantasy',
    defaultCharacter: 'trainer',
    defaultObstacle: 'wild creatures',
    promptHint: 'Best starter for monster taming and creature battle ideas.',
    gradient: 'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)',
  },
  {
    id: 'obby',
    label: 'Obstacle Course / Obby',
    shortLabel: 'Obby',
    description: 'Jump through a 3D challenge world',
    icon: '🧱',
    engineId: 'vibe-3d',
    dimension: '3d',
    genreFamily: 'obbyPlatform3d',
    defaultTheme: 'sky',
    defaultCharacter: 'runner',
    defaultObstacle: 'platform traps',
    promptHint: 'Primary Vibe 3D starter for Roblox-style ideas.',
    gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  },
  {
    id: 'survival-crafting-game',
    label: 'Survival Crafting',
    shortLabel: 'Survival',
    description: 'Gather, build, and survive the night',
    icon: '🛠️',
    engineId: 'vibe-3d',
    dimension: '3d',
    genreFamily: 'survivalCraft3d',
    defaultTheme: 'island',
    defaultCharacter: 'survivor',
    defaultObstacle: 'night dangers',
    promptHint: 'Strong Vibe 3D path for gather-build-survive loops.',
    gradient: 'linear-gradient(135deg, #355c7d 0%, #6c5b7b 50%, #c06c84 100%)',
  },
  {
    id: 'open-map-explorer',
    label: 'Open Map Explorer',
    shortLabel: 'Explorer',
    description: 'Roam a world and uncover secrets',
    icon: '🌍',
    engineId: 'vibe-3d',
    dimension: '3d',
    genreFamily: 'explorationAdventure3d',
    defaultTheme: 'ancient ruins',
    defaultCharacter: 'explorer',
    defaultObstacle: 'mysteries',
    promptHint: 'Best Vibe 3D starter for discovery and quest-style prompts.',
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  },
  {
    id: 'relic-hunt-3d',
    label: 'Relic Hunt 3D',
    shortLabel: 'Relic Hunt',
    description: 'Follow clues, beat traps, and recover ancient relics',
    icon: '🧭',
    engineId: 'vibe-3d',
    dimension: '3d',
    genreFamily: 'explorationAdventure3d',
    defaultTheme: 'lost temple',
    defaultCharacter: 'relic hunter',
    defaultObstacle: 'ancient traps',
    promptHint: 'Mission-focused Vibe 3D starter for ruins, clue trails, and landmark quests.',
    gradient: 'linear-gradient(135deg, #4b2e83 0%, #c084fc 55%, #f59e0b 100%)',
  },
  {
    id: 'stunt-racer-3d',
    label: 'Stunt Racer 3D',
    shortLabel: '3D Racer',
    description: 'Drive, drift, and pull off wild stunts',
    icon: '🚗',
    engineId: 'vibe-3d',
    dimension: '3d',
    genreFamily: 'racingDriving3d',
    defaultTheme: 'neon city',
    defaultCharacter: 'stunt car',
    defaultObstacle: 'ramps',
    promptHint: 'Best Vibe 3D starter for stunt driving and drift-style prompts.',
    gradient: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  },
  {
    id: 'house-builder',
    label: 'House Builder',
    shortLabel: 'Builder',
    description: 'Place parts and build your own space',
    icon: '🏠',
    engineId: 'vibe-3d',
    dimension: '3d',
    genreFamily: 'sandboxBuilder3d',
    defaultTheme: 'suburb',
    defaultCharacter: 'builder',
    defaultObstacle: 'materials',
    promptHint: 'Starter for house, island, and sandbox build prompts.',
    gradient: 'linear-gradient(135deg, #c79081 0%, #dfa579 100%)',
  },
];

export const STARTERS_BY_ENGINE: Record<EngineId, StarterTemplateCard[]> = {
  'vibe-2d': STARTER_TEMPLATES.filter((template) => template.engineId === 'vibe-2d'),
  'vibe-3d': STARTER_TEMPLATES.filter((template) => template.engineId === 'vibe-3d'),
};

export const LONG_TERM_FAMILY_SHOWCASE: Array<{
  family: GenreFamily;
  label: string;
  engineId: EngineId;
  examples: string[];
}> = [
  {
    family: 'platformAction',
    label: 'Platform Action',
    engineId: 'vibe-2d',
    examples: ['Endless runner', 'Platformer', 'Boss battle', 'Wave survival'],
  },
  {
    family: 'topDownAction',
    label: 'Adventure & Maze',
    engineId: 'vibe-2d',
    examples: ['Maze escape', 'Treasure hunt', 'Detective game', 'Escape room'],
  },
  {
    family: 'puzzleCasual',
    label: 'Puzzle & Brain Games',
    engineId: 'vibe-2d',
    examples: ['Matching game', 'Memory cards', 'Tile puzzle', 'Trivia quiz'],
  },
  {
    family: 'builderTycoonLite',
    label: 'Tycoon & Builder Lite',
    engineId: 'vibe-2d',
    examples: ['Lemonade stand', 'Shop tycoon', 'Bakery', 'Farm builder'],
  },
  {
    family: 'rpgProgressionLite',
    label: 'RPG & Progression',
    engineId: 'vibe-2d',
    examples: ['Dungeon crawler', 'Creature collector', 'Fantasy RPG', 'Loot quest'],
  },
  {
    family: 'obbyPlatform3d',
    label: 'Obby & 3D Platform',
    engineId: 'vibe-3d',
    examples: ['Obby', 'Parkour', 'Checkpoint platformer', 'Roblox-style world'],
  },
  {
    family: 'survivalCraft3d',
    label: 'Survival & Craft 3D',
    engineId: 'vibe-3d',
    examples: ['Island survival', 'Gather-and-build', 'Mine-and-build', 'Shelter builder'],
  },
  {
    family: 'sandboxBuilder3d',
    label: 'Sandbox Builder 3D',
    engineId: 'vibe-3d',
    examples: ['House builder', 'Island builder', 'World creator', 'Defense base'],
  },
];

export const THEMES_BY_FAMILY: Record<GenreFamily, Array<{ icon: string; label: string; value: string }>> = {
  platformAction: [
    { icon: '🌋', label: 'Volcano', value: 'volcano' },
    { icon: '🌴', label: 'Jungle', value: 'jungle' },
    { icon: '🌌', label: 'Space', value: 'space' },
    { icon: '🍬', label: 'Candy Land', value: 'candy' },
  ],
  topDownAction: [
    { icon: '🏰', label: 'Castle', value: 'castle' },
    { icon: '🕵️', label: 'Mystery Town', value: 'mystery town' },
    { icon: '🏜️', label: 'Desert Ruins', value: 'desert ruins' },
    { icon: '🌊', label: 'Underwater', value: 'underwater' },
  ],
  racingArcade: [
    { icon: '🏙️', label: 'City', value: 'city' },
    { icon: '🚀', label: 'Space', value: 'space' },
    { icon: '❄️', label: 'Ice Track', value: 'ice track' },
    { icon: '🏜️', label: 'Desert', value: 'desert' },
  ],
  puzzleCasual: [
    { icon: '🐾', label: 'Animals', value: 'animals' },
    { icon: '🍕', label: 'Food', value: 'food' },
    { icon: '🌈', label: 'Rainbow', value: 'rainbow' },
    { icon: '🎃', label: 'Spooky', value: 'spooky' },
  ],
  simLite: [
    { icon: '🏡', label: 'Home', value: 'home' },
    { icon: '🏫', label: 'School', value: 'school' },
    { icon: '🌳', label: 'Park', value: 'park' },
    { icon: '🌞', label: 'Sunny Farm', value: 'farm' },
  ],
  builderTycoonLite: [
    { icon: '🏪', label: 'Shop Street', value: 'shop street' },
    { icon: '🌾', label: 'Farm', value: 'farm' },
    { icon: '🎡', label: 'Theme Park', value: 'theme park' },
    { icon: '🏨', label: 'Hotel', value: 'hotel' },
  ],
  strategyDefenseLite: [
    { icon: '🏰', label: 'Castle', value: 'castle' },
    { icon: '🤖', label: 'Robot Base', value: 'robot base' },
    { icon: '🏝️', label: 'Island Defense', value: 'island defense' },
    { icon: '🌌', label: 'Space Outpost', value: 'space outpost' },
  ],
  rpgProgressionLite: [
    { icon: '🌲', label: 'Forest', value: 'forest' },
    { icon: '🏰', label: 'Kingdom', value: 'kingdom' },
    { icon: '🐉', label: 'Dragon World', value: 'dragon world' },
    { icon: '🌌', label: 'Space Realm', value: 'space realm' },
  ],
  sportsSkill: [
    { icon: '🏞️', label: 'Lake', value: 'lake' },
    { icon: '⚽', label: 'Stadium', value: 'stadium' },
    { icon: '🏹', label: 'Training Grounds', value: 'training grounds' },
    { icon: '❄️', label: 'Snow Park', value: 'snow park' },
  ],
  obbyPlatform3d: [
    { icon: '☁️', label: 'Sky World', value: 'sky' },
    { icon: '🌈', label: 'Rainbow City', value: 'rainbow city' },
    { icon: '🌋', label: 'Lava Realm', value: 'lava realm' },
    { icon: '🤖', label: 'Robot Factory', value: 'robot factory' },
  ],
  explorationAdventure3d: [
    { icon: '🏛️', label: 'Ancient Ruins', value: 'ancient ruins' },
    { icon: '🌲', label: 'Forest', value: 'forest' },
    { icon: '🌊', label: 'Underwater', value: 'underwater' },
    { icon: '👽', label: 'Alien Planet', value: 'alien planet' },
  ],
  racingDriving3d: [
    { icon: '🌃', label: 'Neon City', value: 'neon city' },
    { icon: '🏜️', label: 'Desert', value: 'desert' },
    { icon: '🧊', label: 'Frozen Track', value: 'frozen track' },
    { icon: '🌌', label: 'Space Highway', value: 'space highway' },
  ],
  survivalCraft3d: [
    { icon: '🏝️', label: 'Island', value: 'island' },
    { icon: '🌲', label: 'Wilderness', value: 'wilderness' },
    { icon: '🧟', label: 'Zombie Zone', value: 'zombie zone' },
    { icon: '⛺', label: 'Mountain Camp', value: 'mountain camp' },
  ],
  sandboxBuilder3d: [
    { icon: '🏡', label: 'Neighborhood', value: 'neighborhood' },
    { icon: '🏰', label: 'Castle Grounds', value: 'castle grounds' },
    { icon: '🏝️', label: 'Island', value: 'island' },
    { icon: '🪐', label: 'Space Colony', value: 'space colony' },
  ],
  socialParty3d: [
    { icon: '🎉', label: 'Party Plaza', value: 'party plaza' },
    { icon: '🏁', label: 'Challenge Arena', value: 'challenge arena' },
    { icon: '🌴', label: 'Beach Hangout', value: 'beach hangout' },
    { icon: '🛰️', label: 'Space Hub', value: 'space hub' },
  ],
};

export const CHARACTERS_BY_FAMILY: Record<GenreFamily, Array<{ icon: string; label: string; value: string }>> = {
  platformAction: [
    { icon: '🦊', label: 'Fox', value: 'fox' },
    { icon: '🤖', label: 'Robot', value: 'robot' },
    { icon: '🦸', label: 'Hero', value: 'hero' },
    { icon: '🐉', label: 'Dragon Rider', value: 'dragon rider' },
  ],
  topDownAction: [
    { icon: '🧭', label: 'Explorer', value: 'explorer' },
    { icon: '🕵️', label: 'Detective', value: 'detective' },
    { icon: '🏴‍☠️', label: 'Pirate', value: 'pirate' },
    { icon: '🧙', label: 'Wizard', value: 'wizard' },
  ],
  racingArcade: [
    { icon: '🏎️', label: 'Race Car', value: 'race car' },
    { icon: '🏍️', label: 'Bike', value: 'bike' },
    { icon: '🚤', label: 'Boat', value: 'boat' },
    { icon: '🚀', label: 'Hover Craft', value: 'hover craft' },
  ],
  puzzleCasual: [
    { icon: '💎', label: 'Gems', value: 'gems' },
    { icon: '🧩', label: 'Shapes', value: 'shapes' },
    { icon: '🔤', label: 'Letters', value: 'letters' },
    { icon: '🍬', label: 'Candy Pieces', value: 'candy pieces' },
  ],
  simLite: [
    { icon: '🐶', label: 'Puppy', value: 'puppy' },
    { icon: '🐱', label: 'Kitten', value: 'kitten' },
    { icon: '🧸', label: 'Baby Buddy', value: 'baby buddy' },
    { icon: '🧑‍🍳', label: 'Chef', value: 'chef' },
  ],
  builderTycoonLite: [
    { icon: '🧒', label: 'Owner', value: 'owner' },
    { icon: '👩‍🌾', label: 'Farmer', value: 'farmer' },
    { icon: '🧁', label: 'Baker', value: 'baker' },
    { icon: '🎡', label: 'Park Manager', value: 'park manager' },
  ],
  strategyDefenseLite: [
    { icon: '🛡️', label: 'Defender', value: 'defender' },
    { icon: '🧙', label: 'Wizard', value: 'wizard' },
    { icon: '🤖', label: 'Robot Commander', value: 'robot commander' },
    { icon: '🏹', label: 'Archer', value: 'archer' },
  ],
  rpgProgressionLite: [
    { icon: '⚔️', label: 'Knight', value: 'knight' },
    { icon: '🧙', label: 'Wizard', value: 'wizard' },
    { icon: '🦸', label: 'Hero', value: 'hero' },
    { icon: '🐉', label: 'Trainer', value: 'trainer' },
  ],
  sportsSkill: [
    { icon: '🎣', label: 'Angler', value: 'angler' },
    { icon: '⚽', label: 'Athlete', value: 'athlete' },
    { icon: '🏹', label: 'Archer', value: 'archer' },
    { icon: '🏂', label: 'Rider', value: 'rider' },
  ],
  obbyPlatform3d: [
    { icon: '🏃', label: 'Runner', value: 'runner' },
    { icon: '🤖', label: 'Robot', value: 'robot' },
    { icon: '🦸', label: 'Hero', value: 'hero' },
    { icon: '🐱', label: 'Cat', value: 'cat' },
  ],
  explorationAdventure3d: [
    { icon: '🧭', label: 'Explorer', value: 'explorer' },
    { icon: '🕵️', label: 'Detective', value: 'detective' },
    { icon: '🏴‍☠️', label: 'Pirate', value: 'pirate' },
    { icon: '🤠', label: 'Ranger', value: 'ranger' },
  ],
  racingDriving3d: [
    { icon: '🚗', label: 'Stunt Car', value: 'stunt car' },
    { icon: '🚙', label: 'Monster Truck', value: 'monster truck' },
    { icon: '🏎️', label: 'Drift Car', value: 'drift car' },
    { icon: '🚀', label: 'Hover Racer', value: 'hover racer' },
  ],
  survivalCraft3d: [
    { icon: '🧑‍🚀', label: 'Survivor', value: 'survivor' },
    { icon: '🏕️', label: 'Builder', value: 'builder' },
    { icon: '🪓', label: 'Gatherer', value: 'gatherer' },
    { icon: '🧟', label: 'Zombie Hunter', value: 'zombie hunter' },
  ],
  sandboxBuilder3d: [
    { icon: '🏠', label: 'Builder', value: 'builder' },
    { icon: '🧱', label: 'Architect', value: 'architect' },
    { icon: '👷', label: 'Creator', value: 'creator' },
    { icon: '🪵', label: 'Craft Worker', value: 'craft worker' },
  ],
  socialParty3d: [
    { icon: '🏃', label: 'Tag Runner', value: 'tag runner' },
    { icon: '🎉', label: 'Party Host', value: 'party host' },
    { icon: '🕶️', label: 'Spy', value: 'spy' },
    { icon: '🏁', label: 'Challenger', value: 'challenger' },
  ],
};

export const CHALLENGES_BY_FAMILY: Record<GenreFamily, Array<{ icon: string; label: string; value: string }>> = {
  platformAction: [
    { icon: '🌵', label: 'Spikes', value: 'spikes' },
    { icon: '👾', label: 'Enemies', value: 'enemies' },
    { icon: '🔥', label: 'Fire', value: 'fire' },
    { icon: '💣', label: 'Traps', value: 'traps' },
  ],
  topDownAction: [
    { icon: '👻', label: 'Chasers', value: 'chasers' },
    { icon: '🗝️', label: 'Locked Doors', value: 'locked doors' },
    { icon: '🧩', label: 'Puzzles', value: 'puzzles' },
    { icon: '💎', label: 'Hidden Treasure', value: 'hidden treasure' },
  ],
  racingArcade: [
    { icon: '🚗', label: 'Traffic', value: 'traffic' },
    { icon: '🛢️', label: 'Oil Slicks', value: 'oil slicks' },
    { icon: '🚧', label: 'Barriers', value: 'barriers' },
    { icon: '⚡', label: 'Power-Ups', value: 'power-ups' },
  ],
  puzzleCasual: [
    { icon: '⏰', label: 'Timer', value: 'time limit' },
    { icon: '🔒', label: 'Locked Tiles', value: 'locked tiles' },
    { icon: '💣', label: 'Tricky Bombs', value: 'bombs' },
    { icon: '🌀', label: 'Shuffle', value: 'shuffle' },
  ],
  simLite: [
    { icon: '😴', label: 'Needs Meter', value: 'needs' },
    { icon: '💸', label: 'Supplies', value: 'supplies' },
    { icon: '🧹', label: 'Messes', value: 'messes' },
    { icon: '📅', label: 'Daily Tasks', value: 'daily tasks' },
  ],
  builderTycoonLite: [
    { icon: '💰', label: 'Cash Goals', value: 'cash goals' },
    { icon: '🧾', label: 'Orders', value: 'orders' },
    { icon: '👥', label: 'Customers', value: 'customers' },
    { icon: '📦', label: 'Upgrades', value: 'upgrades' },
  ],
  strategyDefenseLite: [
    { icon: '🌊', label: 'Enemy Waves', value: 'enemy waves' },
    { icon: '🏹', label: 'Stronger Towers', value: 'tower upgrades' },
    { icon: '💰', label: 'Resource Budget', value: 'resource budget' },
    { icon: '👹', label: 'Boss Enemy', value: 'boss enemy' },
  ],
  rpgProgressionLite: [
    { icon: '👹', label: 'Monsters', value: 'monsters' },
    { icon: '💎', label: 'Loot', value: 'loot' },
    { icon: '⭐', label: 'XP', value: 'xp' },
    { icon: '🗺️', label: 'Quests', value: 'quests' },
  ],
  sportsSkill: [
    { icon: '🎯', label: 'Accuracy', value: 'accuracy' },
    { icon: '🏆', label: 'Score Chase', value: 'score chase' },
    { icon: '🐟', label: 'Rare Targets', value: 'rare targets' },
    { icon: '⏱️', label: 'Timed Challenge', value: 'timed challenge' },
  ],
  obbyPlatform3d: [
    { icon: '🧱', label: 'Moving Platforms', value: 'moving platforms' },
    { icon: '🔥', label: 'Lava', value: 'lava' },
    { icon: '⚙️', label: 'Trap Blocks', value: 'trap blocks' },
    { icon: '🏁', label: 'Checkpoints', value: 'checkpoints' },
  ],
  explorationAdventure3d: [
    { icon: '🔐', label: 'Locked Secrets', value: 'locked secrets' },
    { icon: '🗺️', label: 'Quest Goals', value: 'quest goals' },
    { icon: '👻', label: 'Mysteries', value: 'mysteries' },
    { icon: '💎', label: 'Treasure', value: 'treasure' },
  ],
  racingDriving3d: [
    { icon: '🚧', label: 'Ramps', value: 'ramps' },
    { icon: '🛢️', label: 'Hazards', value: 'hazards' },
    { icon: '🏁', label: 'Time Trial', value: 'time trial' },
    { icon: '⚡', label: 'Boost Pads', value: 'boost pads' },
  ],
  survivalCraft3d: [
    { icon: '🌙', label: 'Night Danger', value: 'night danger' },
    { icon: '🪵', label: 'Gathering', value: 'gathering' },
    { icon: '🏕️', label: 'Shelter', value: 'shelter' },
    { icon: '🧟', label: 'Hostiles', value: 'hostiles' },
  ],
  sandboxBuilder3d: [
    { icon: '🧱', label: 'Place Blocks', value: 'place blocks' },
    { icon: '📦', label: 'Materials', value: 'materials' },
    { icon: '🎨', label: 'Decorate', value: 'decorate' },
    { icon: '🏠', label: 'Room Goals', value: 'room goals' },
  ],
  socialParty3d: [
    { icon: '🏁', label: 'Mini-Games', value: 'mini-games' },
    { icon: '🧑‍🤝‍🧑', label: 'Teams', value: 'teams' },
    { icon: '🏆', label: 'Last Player Standing', value: 'last player standing' },
    { icon: '🎯', label: 'Capture Goals', value: 'capture goals' },
  ],
};

export const VISUAL_STYLES = [
  { icon: '💜', label: 'Neon Glow', value: 'neon' },
  { icon: '👾', label: 'Retro Pixel', value: 'retro' },
  { icon: '🌈', label: 'Cute & Colorful', value: 'cute' },
  { icon: '🌙', label: 'Dark & Spooky', value: 'spooky' },
  { icon: '✨', label: 'Clean & Simple', value: 'clean' },
];

export function getStarterTemplateById(id: StarterTemplateId | string) {
  return STARTER_TEMPLATES.find((template) => template.id === id) || null;
}
