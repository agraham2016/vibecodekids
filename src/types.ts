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

export interface Project {
  id: string;
  name: string;
  code: string;
  gameConfig?: GameConfig | null;
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

export type MembershipTier = 'free' | 'creator' | 'pro';

export interface MembershipUsage {
  tier: MembershipTier;
  tierName: string;
  gamesRemaining: number;
  gamesLimit: number;
  promptsRemaining: number;
  promptsLimit: number;
  aiCoversRemaining: number;
  aiCoversLimit: number;
  canAccessPremiumAssets: boolean;
}

export interface TierInfo {
  name: string;
  price: number;
  gamesPerMonth: number;
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
