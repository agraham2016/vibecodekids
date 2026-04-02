export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Base64 encoded image
  timestamp: Date;
}

export type EngineId = 'vibe-2d' | 'vibe-3d';

export type GenreFamily =
  | 'platformAction'
  | 'topDownAction'
  | 'racingArcade'
  | 'puzzleCasual'
  | 'simLite'
  | 'builderTycoonLite'
  | 'strategyDefenseLite'
  | 'rpgProgressionLite'
  | 'sportsSkill'
  | 'obbyPlatform3d'
  | 'explorationAdventure3d'
  | 'racingDriving3d'
  | 'survivalCraft3d'
  | 'sandboxBuilder3d'
  | 'socialParty3d';

export type StarterTemplateId =
  | 'endless-runner'
  | 'maze-escape'
  | 'matching-game'
  | 'chess'
  | 'platformer'
  | 'obby'
  | 'simple-racing'
  | 'top-down-adventure'
  | 'pet-care-simulator'
  | 'lemonade-stand-tycoon'
  | 'tower-defense'
  | 'crystal-defense'
  | 'dungeon-crawler'
  | 'village-quest'
  | 'farming-game'
  | 'fishing-game'
  | 'trick-shot-arena'
  | 'creature-collector'
  | 'survival-crafting-game'
  | 'open-map-explorer'
  | 'relic-hunt-3d'
  | 'stunt-racer-3d'
  | 'house-builder';

// Game configuration from the onboarding survey or starter selector
export type GameType =
  | 'racing'
  | 'shooter'
  | 'platformer'
  | 'frogger'
  | 'puzzle'
  | 'clicker'
  | 'rpg'
  | 'treasure-diver'
  | 'trash-sorter'
  | 'fruit-slice'
  | 'tower-stack'
  | 'find-the-friend'
  | StarterTemplateId;

export interface GameConfig {
  gameType: GameType;
  engineId?: EngineId;
  genreFamily?: GenreFamily;
  starterTemplateId?: StarterTemplateId;
  selectionReason?: string; // Why this starter/family was chosen for the idea
  dimension: '2d' | '3d'; // 2D (DOM/Canvas) or 3D (Three.js)
  theme: string; // "space", "underwater", "jungle", etc.
  character: string; // "rocket ship", "unicorn", "ninja", etc.
  obstacles: string; // "asteroids", "zombies", "cars", etc.
  visualStyle: string; // "neon", "retro", "cute", "spooky", "clean"
  customNotes: string; // Any free-text details the kid mentioned
}

// Survey question definition
export interface SurveyQuestion {
  id: string;
  botMessage: string;
  options: SurveyOption[];
  allowFreeText: boolean;
  freeTextPlaceholder?: string;
}

export interface SurveyOption {
  label: string;
  icon: string;
  value: string;
}

export type EditorLayerKind = 'background' | 'gameplay' | 'foreground' | 'ui';

export interface EditorLayer {
  id: string;
  name: string;
  kind: EditorLayerKind;
  visible: boolean;
  locked: boolean;
  opacity: number;
  parallax: number;
  zIndex: number;
}

export type EditorObjectType =
  | 'sprite'
  | 'text'
  | 'collision-region'
  | 'spawn-point'
  | 'background-image'
  | 'gameplay-trigger';

export interface EditorObjectBehavior {
  speed?: number;
  health?: number;
  damage?: number;
  points?: number;
  spawnType?: string;
  triggerAction?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface EditorObject {
  id: string;
  type: EditorObjectType;
  name: string;
  layerId: string;
  assetId?: string | null;
  assetPath?: string | null;
  text?: string;
  fontSize?: number;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  behavior?: EditorObjectBehavior;
}

export interface GameplaySettings {
  playerSpeed: number;
  jumpPower: number;
  gravity: number;
  enemyCount: number;
  timerSeconds: number;
  scoreGoal: number;
  spawnRate: number;
  difficulty: 'easy' | 'medium' | 'hard';
  notes: string;
}

export interface EditorSelection {
  activeObjectId: string | null;
  objectIds: string[];
  layerId: string | null;
}

export interface EditorScene {
  viewportWidth: number;
  viewportHeight: number;
  gridSize: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  zoom: number;
  panX: number;
  panY: number;
  layers: EditorLayer[];
  objects: EditorObject[];
  gameplay: GameplaySettings;
  selection: EditorSelection;
}

export type EditorCommandType =
  | 'select-object'
  | 'add-object'
  | 'update-object'
  | 'move-object'
  | 'rotate-object'
  | 'resize-object'
  | 'duplicate-object'
  | 'delete-object'
  | 'reorder-object'
  | 'toggle-lock-object'
  | 'toggle-hide-object'
  | 'set-text-object'
  | 'set-gameplay-setting';

export interface EditorCommand {
  type: EditorCommandType;
  targetId?: string;
  targetIds?: string[];
  object?: Partial<EditorObject> & Pick<EditorObject, 'type' | 'name' | 'layerId'>;
  patch?: Partial<EditorObject>;
  delta?: {
    x?: number;
    y?: number;
  };
  rotation?: number;
  size?: {
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
  };
  zIndex?: number;
  direction?: 'forward' | 'backward' | 'front' | 'back';
  text?: string;
  gameplayPatch?: Partial<GameplaySettings>;
}

export interface ProjectVersion {
  versionId: string;
  code: string;
  title: string;
  savedAt: string;
  autoSave: boolean;
  editorScene?: EditorScene | null;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  gameConfig?: GameConfig | null;
  editorScene?: EditorScene | null;
  versions?: ProjectVersion[];
  createdAt: Date;
  updatedAt: Date;
}

// Project from API (my-projects endpoint)
export interface UserProject {
  id: string;
  title: string;
  category: string;
  engineId?: EngineId | null;
  genreFamily?: GenreFamily | null;
  isPublic: boolean;
  createdAt: string;
  views: number;
  likes: number;
}

export interface StudioAssetCategory {
  id: string;
  label: string;
  assetCount: number;
}

export interface StudioAsset {
  id: string;
  label: string;
  key: string;
  genre: string;
  genreLabel: string;
  pack: string;
  packLabel: string;
  path: string;
  width: number | null;
  height: number | null;
  note: string;
}

export interface StudioAssetCatalogResponse {
  ok: boolean;
  categories: StudioAssetCategory[];
  assets: StudioAsset[];
  selectedAssets: StudioAsset[];
  totalAssets: number;
  hasMore: boolean;
  selectionLimit: number;
}

export type MembershipTier = 'free' | 'creator' | 'pro';

export interface MembershipUsage {
  tier: MembershipTier;
  tierName: string;
  creationsRemaining: number;
  creationsLimit: number;
  promptsRemaining: number;
  promptsLimit: number;
  aiCoversRemaining: number;
  aiCoversLimit: number;
  canAccessPremiumAssets: boolean;
}

export interface TierInfo {
  name: string;
  price: number;
  creationsPerMonth: number;
  promptsPerDay: number;
  playsPerDay: number;
  aiCoversPerMonth: number;
  aiSpritesPerMonth: number;
  canAccessPremiumAssets: boolean;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  status: 'pending' | 'approved' | 'denied' | 'deleted';
  membershipTier: MembershipTier;
  membershipExpires: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isAdmin?: boolean;
  // COPPA fields
  ageBracket?: 'under13' | '13to17' | '18plus' | 'unknown';
  parentalConsentStatus?: 'not_required' | 'pending' | 'granted' | 'denied' | 'revoked';
  consentPolicyVersion?: string | null;
  parentAcceptedTerms?: boolean;
  parentAcceptedTermsAt?: string | null;
  parentVerifiedMethod?: 'email_plus' | 'stripe_micro' | null;
  parentVerifiedAt?: string | null;
}

/** Login response from /api/auth/login. */
export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  membership: MembershipUsage;
  showUpgradePrompt: boolean;
  tiers: Record<string, TierInfo>;
}

/** Register response from /api/auth/register. */
export interface RegisterResponse {
  success: boolean;
  message: string;
  requiresParentalConsent?: boolean;
}

/** /api/auth/me response. */
export interface AuthMeResponse {
  user: User;
  membership: MembershipUsage;
}

/** Which AI model was used. */
export type AIModel = 'claude' | 'grok' | 'openai';

/** AI routing mode for the tri-model system. */
export type AIMode = 'default' | 'claude' | 'grok' | 'openai' | 'creative' | 'debug' | 'ask-other-buddy' | 'critic';

/** Alternate response from the other AI model (critic/side-by-side). */
export interface AlternateResponse {
  response: string;
  code: string | null;
  modelUsed: AIModel;
}

/** Debug info when the system auto-escalated between models. */
export interface DebugInfo {
  attempts: number;
  finalModel: AIModel;
}

/** /api/generate response (tri-model). */
export interface GenerateResponse {
  generationId?: string;
  message: string;
  code: string | null;
  editorCommand?: EditorCommand | null;
  editorScene?: EditorScene | null;
  usage?: MembershipUsage;
  modelUsed: AIModel | null;
  isCacheHit: boolean;
  grokAvailable?: boolean;
  openaiAvailable?: boolean;
  alternateResponse?: AlternateResponse;
  debugInfo?: DebugInfo;
  rateLimited?: boolean;
  waitSeconds?: number;
  upgradeRequired?: boolean;
  reason?: string;
  cached?: boolean;
}

/** /api/generate request body (tri-model). */
export interface GenerateRequest {
  message: string;
  image?: string;
  currentCode?: string;
  conversationHistory?: Message[];
  gameConfig?: GameConfig;
  selectedAssetIds?: string[];
  mode?: AIMode;
  lastModelUsed?: AIModel;
  debugAttempt?: number;
}

export interface BugReportConversationEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  modelUsed?: AIModel | null;
}

export interface BugReportEnvironment {
  route: string;
  language?: string;
  viewport?: {
    width: number;
    height: number;
  };
  lastModelUsed?: AIModel | null;
  debugInfo?: DebugInfo | null;
}

export interface BugReportRequest {
  description: string;
  currentCode?: string;
  conversationHistory?: BugReportConversationEntry[];
  projectId?: string | null;
  projectName?: string | null;
  sessionId?: string | null;
  appSurface?: string;
  environment?: BugReportEnvironment;
}

export interface BugReportResponse {
  ok: boolean;
  reportId: string;
  triageCategory: string | null;
}

export interface BugReportResolutionNotification {
  id: string;
  projectName?: string | null;
  description: string;
  status: 'resolved' | 'dismissed';
  reviewedAt?: string | null;
  reviewNote?: string | null;
}

export interface BugReportResolutionNotificationsResponse {
  ok: boolean;
  notifications: BugReportResolutionNotification[];
}
