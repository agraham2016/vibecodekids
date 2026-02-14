/**
 * Auth Context
 * 
 * Provides user, token, membership state and auth actions to the entire app.
 * Eliminates prop drilling of user/token/membership through every component.
 * 
 * Usage:
 *   const { user, login, logout, membership } = useAuth()
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, setAuthToken, getAuthToken } from '../lib/api'
import type { User, MembershipUsage, TierInfo, LoginResponse, AuthMeResponse } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  membership: MembershipUsage | null
  tiers: Record<string, TierInfo>
  isCheckingAuth: boolean
}

interface AuthActions {
  login: (data: LoginResponse) => void
  logout: () => void
  setMembership: (m: MembershipUsage) => void
  refreshUser: () => Promise<void>
}

type AuthContextType = AuthState & AuthActions

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [membership, setMembership] = useState<MembershipUsage | null>(null)
  const [tiers, setTiers] = useState<Record<string, TierInfo>>({})
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = getAuthToken()
    if (savedToken) {
      setAuthToken(savedToken)
      setToken(savedToken)

      api.get<AuthMeResponse>('/api/auth/me')
        .then(data => {
          if (data.user) {
            setUser(data.user)
            if (data.membership) setMembership(data.membership)
          } else {
            setAuthToken(null)
            setToken(null)
          }
        })
        .catch(() => {
          setAuthToken(null)
          setToken(null)
        })
        .finally(() => setIsCheckingAuth(false))
    } else {
      setIsCheckingAuth(false)
    }

    // Load tiers
    api.get<{ tiers: Record<string, TierInfo> }>('/api/membership/tiers')
      .then(data => { if (data.tiers) setTiers(data.tiers) })
      .catch(() => {})
  }, [])

  const login = useCallback((data: LoginResponse) => {
    setAuthToken(data.token)
    setToken(data.token)
    setUser(data.user)
    if (data.membership) setMembership(data.membership)
    if (data.tiers) setTiers(data.tiers)
  }, [])

  const logout = useCallback(() => {
    const currentToken = getAuthToken()
    if (currentToken) {
      api.post('/api/auth/logout').catch(() => {})
    }
    setAuthToken(null)
    setToken(null)
    setUser(null)
    setMembership(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<AuthMeResponse>('/api/auth/me')
      if (data.user) {
        setUser(data.user)
        if (data.membership) setMembership(data.membership)
      }
    } catch {
      // Session might be expired
    }
  }, [])

  const value: AuthContextType = {
    user,
    token,
    membership,
    tiers,
    isCheckingAuth,
    login,
    logout,
    setMembership,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
