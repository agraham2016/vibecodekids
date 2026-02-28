/**
 * useChat Hook (Dual-Model: Claude + Grok)
 * 
 * Manages chat messages, AI generation, and dual-model routing.
 * Tracks which AI buddy is active, handles mode switching,
 * and surfaces model metadata to the UI.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { api, ApiError } from '../lib/api'
import type { Message, MembershipUsage, GenerateResponse, AIModel, AIMode } from '../types'

/** Extended message with model info for UI rendering. */
export interface ChatMessage extends Message {
  modelUsed?: AIModel | null
  isCacheHit?: boolean
  alternateResponse?: {
    response: string
    code: string | null
    modelUsed: AIModel
  }
  debugInfo?: {
    attempts: number
    finalModel: AIModel
  }
}

interface UseChatOptions {
  onCodeGenerated: (code: string) => void
  onUsageUpdate: (usage: MembershipUsage) => void
  onUpgradeNeeded: () => void
}

function pickRandomStartingModel(grokAvailable: boolean): AIModel {
  if (!grokAvailable) return 'claude'
  return Math.random() < 0.5 ? 'claude' : 'grok'
}

export function useChat({ onCodeGenerated, onUsageUpdate, onUpgradeNeeded }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeModel, setActiveModel] = useState<AIModel>('claude')
  const [grokAvailable, setGrokAvailable] = useState(false)
  const [lastModelUsed, setLastModelUsed] = useState<AIModel | null>(null)
  const debugAttemptRef = useRef(0)
  const sessionIdRef = useRef(crypto.randomUUID())
  const startingModelRef = useRef<AIModel>('claude')
  const hasPickedInitialRef = useRef(false)

  // Check if Grok is available on mount; when known, randomize starting model for fresh session
  useEffect(() => {
    api.get<{ grok?: boolean }>('/api/health')
      .then(data => {
        const available = !!data.grok
        setGrokAvailable(available)
        if (!hasPickedInitialRef.current) {
          hasPickedInitialRef.current = true
          const picked = pickRandomStartingModel(available)
          startingModelRef.current = picked
          setActiveModel(picked)
        }
      })
      .catch(() => { /* ignore — just means we can't check yet */ })
  }, [])

  /**
   * Send a message to the AI with dual-model routing.
   * 
   * @param content - The kid's message
   * @param image - Optional base64 image
   * @param currentCode - Current game code
   * @param gameConfig - Survey-based config
   * @param modeOverride - Force a specific routing mode (for buttons like "Ask Other Buddy")
   */
  const sendMessage = useCallback(async (
    content: string,
    image: string | undefined,
    currentCode: string,
    gameConfig: any = null,
    modeOverride?: AIMode
  ) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      image,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Determine the mode to send
    // If the user toggled to Grok, default mode becomes 'grok'
    // If modeOverride is set (from a button), use that
    let mode: AIMode = modeOverride || (activeModel === 'grok' ? 'grok' : 'default')

    try {
      const data = await api.post<GenerateResponse>('/api/generate', {
        message: content,
        image,
        currentCode,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content,
          image: m.image
        })),
        gameConfig,
        mode,
        lastModelUsed,
        debugAttempt: mode === 'debug' ? debugAttemptRef.current : 0,
        sessionId: sessionIdRef.current,
        startingModel: startingModelRef.current,
      })

      if (data.usage) {
        onUsageUpdate(data.usage)
      }

      // Track Grok availability
      if (data.grokAvailable !== undefined) {
        setGrokAvailable(data.grokAvailable)
      }

      // Track which model was used
      if (data.modelUsed) {
        setLastModelUsed(data.modelUsed)
      }

      // Track debug attempts for escalation
      if (mode === 'debug' && data.modelUsed === 'claude') {
        debugAttemptRef.current += 1
      } else {
        debugAttemptRef.current = 0
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        modelUsed: data.modelUsed,
        isCacheHit: data.isCacheHit,
        alternateResponse: data.alternateResponse,
        debugInfo: data.debugInfo,
      }
      setMessages(prev => [...prev, assistantMessage])

      if (data.code) {
        onCodeGenerated(data.code)
      }
    } catch (error) {
      let friendlyMessage = "Oops! Something went wrong on my end. 😅 Can you try asking me again? Sometimes I need a second try!"

      if (error instanceof ApiError) {
        if (error.data?.message) {
          friendlyMessage = error.data.message
        }

        if (error.status === 429 || error.status === 403) {
          if (error.data?.upgradeRequired) {
            setTimeout(() => onUpgradeNeeded(), 1000)
          }
        }
      }

      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: friendlyMessage,
        timestamp: new Date(),
        modelUsed: null,
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [messages, activeModel, lastModelUsed, onCodeGenerated, onUsageUpdate, onUpgradeNeeded])

  /** Switch the active AI buddy (toggle between Claude and Grok). */
  const switchModel = useCallback((model: AIModel) => {
    setActiveModel(model)
  }, [])

  const clearMessages = useCallback(() => {
    sessionIdRef.current = crypto.randomUUID()
    const picked = pickRandomStartingModel(grokAvailable)
    startingModelRef.current = picked
    setActiveModel(picked)
    setMessages([])
    setLastModelUsed(null)
    debugAttemptRef.current = 0
  }, [grokAvailable])

  /** Send thumbs up/down feedback for an AI response. */
  const sendFeedback = useCallback(async (
    messageId: string,
    outcome: 'thumbsUp' | 'thumbsDown',
    modelUsed: AIModel | null,
    details?: string
  ) => {
    try {
      await api.post('/api/feedback', {
        sessionId: sessionIdRef.current,
        messageId,
        outcome,
        modelUsed: modelUsed || null,
        details: details || undefined,
      })
    } catch {
      // Silently fail — feedback is non-critical
    }
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    sendFeedback,
    activeModel,
    switchModel,
    grokAvailable,
    lastModelUsed,
  }
}
