/**
 * useChat Hook
 * 
 * Manages chat messages and AI generation.
 * Extracts all chat/AI logic from App.tsx.
 */

import { useState, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import type { Message, MembershipUsage, GenerateResponse } from '../types'

interface UseChatOptions {
  onCodeGenerated: (code: string) => void
  onUsageUpdate: (usage: MembershipUsage) => void
  onUpgradeNeeded: () => void
}

export function useChat({ onCodeGenerated, onUsageUpdate, onUpgradeNeeded }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (
    content: string,
    image: string | undefined,
    currentCode: string,
    gameConfig: any = null
  ) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      image,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

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
      })

      if (data.usage) {
        onUsageUpdate(data.usage)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      if (data.code) {
        onCodeGenerated(data.code)
      }
    } catch (error) {
      let friendlyMessage = "Oops! Something went wrong on my end. 😅 Can you try asking me again? Sometimes I need a second try!"

      if (error instanceof ApiError) {
        // Use server's kid-friendly message if available
        if (error.data?.message) {
          friendlyMessage = error.data.message
        }

        if (error.status === 429 || error.status === 403) {
          if (error.data?.upgradeRequired) {
            setTimeout(() => onUpgradeNeeded(), 1000)
          }
        }
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: friendlyMessage,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [messages, onCodeGenerated, onUsageUpdate, onUpgradeNeeded])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  }
}
