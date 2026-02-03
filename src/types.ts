export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string  // Base64 encoded image
  timestamp: Date
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
