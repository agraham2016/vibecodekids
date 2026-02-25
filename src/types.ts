export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string  // Base64 encoded image
  timestamp: Date
}

// Game configuration from the onboarding survey
export type GameType = 'racing' | 'shooter' | 'platformer' | 'frogger' | 'puzzle' | 'clicker' | 'rpg'

export interface GameConfig {
  gameType: GameType
  dimension: '2d' | '3d'  // 2D (DOM/Canvas) or 3D (Three.js)
  theme: string        // "space", "underwater", "jungle", etc.
  character: string    // "rocket ship", "unicorn", "ninja", etc.
  obstacles: string    // "asteroids", "zombies", "cars", etc.
  visualStyle: string  // "neon", "retro", "cute", "spooky", "clean"
  customNotes: string  // Any free-text details the kid mentioned
}

// Survey question definition
export interface SurveyQuestion {
  id: string
  botMessage: string
  options: SurveyOption[]
  allowFreeText: boolean
  freeTextPlaceholder?: string
}

export interface SurveyOption {
  label: string
  icon: string
  value: string
}

export interface Project {
  id: string
  name: string
  code: string
  createdAt: Date
  updatedAt: Date
}

// Project from API (my-projects endpoint)
export interface UserProject {
  id: string
  title: string
  category: string
  isPublic: boolean
  createdAt: string
  views: number
  likes: number
}

export type MembershipTier = 'free' | 'creator' | 'pro'

export interface MembershipUsage {
  tier: MembershipTier
  tierName: string
  gamesRemaining: number
  gamesLimit: number
  promptsRemaining: number
  promptsLimit: number
  aiCoversRemaining: number
  aiCoversLimit: number
  canAccessPremiumAssets: boolean
}

export interface TierInfo {
  name: string
  price: number
  gamesPerMonth: number
  promptsPerDay: number
  playsPerDay: number
  aiCoversPerMonth: number
  aiSpritesPerMonth: number
  canAccessPremiumAssets: boolean
}

export interface User {
  id: string
  username: string
  displayName: string
  status: 'pending' | 'approved' | 'denied' | 'deleted'
  membershipTier: MembershipTier
  membershipExpires: string | null
  createdAt: string
  lastLoginAt: string | null
  isAdmin?: boolean
  // COPPA fields
  ageBracket?: 'under13' | '13to17' | '18plus' | 'unknown'
  parentalConsentStatus?: 'not_required' | 'pending' | 'granted' | 'denied' | 'revoked'
}

/** Login response from /api/auth/login. */
export interface LoginResponse {
  success: boolean
  token: string
  user: User
  membership: MembershipUsage
  showUpgradePrompt: boolean
  tiers: Record<string, TierInfo>
}

/** Register response from /api/auth/register. */
export interface RegisterResponse {
  success: boolean
  message: string
  requiresParentalConsent?: boolean
}

/** /api/auth/me response. */
export interface AuthMeResponse {
  user: User
  membership: MembershipUsage
}

/** Which AI model was used. */
export type AIModel = 'claude' | 'grok'

/** AI routing mode for the dual-model system. */
export type AIMode = 'default' | 'claude' | 'grok' | 'creative' | 'debug' | 'ask-other-buddy' | 'critic'

/** Alternate response from the other AI model (critic/side-by-side). */
export interface AlternateResponse {
  response: string
  code: string | null
  modelUsed: AIModel
}

/** Debug info when the system auto-escalated between models. */
export interface DebugInfo {
  attempts: number
  finalModel: AIModel
}

/** /api/generate response (dual-model). */
export interface GenerateResponse {
  message: string
  code: string | null
  usage?: MembershipUsage
  modelUsed: AIModel | null
  isCacheHit: boolean
  grokAvailable?: boolean
  alternateResponse?: AlternateResponse
  debugInfo?: DebugInfo
  rateLimited?: boolean
  waitSeconds?: number
  upgradeRequired?: boolean
  reason?: string
  cached?: boolean
}

/** /api/generate request body (dual-model). */
export interface GenerateRequest {
  message: string
  image?: string
  currentCode?: string
  conversationHistory?: Message[]
  gameConfig?: GameConfig
  mode?: AIMode
  lastModelUsed?: AIModel
  debugAttempt?: number
}
