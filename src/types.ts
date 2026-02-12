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
  status: 'pending' | 'approved' | 'denied'
  membershipTier: MembershipTier
  membershipExpires: string | null
  createdAt: string
  lastLoginAt: string | null
}
