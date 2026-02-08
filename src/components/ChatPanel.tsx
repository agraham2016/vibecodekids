import { useState, useRef, useEffect, useCallback } from 'react'
import { Message } from '../types'
import TipsModal from './TipsModal'
import './ChatPanel.css'

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface ChatPanelProps {
  messages: Message[]
  onSendMessage: (content: string, image?: string) => void
  isLoading: boolean
  mode: 'plan' | 'vibe'
  onModeChange: (mode: 'plan' | 'vibe') => void
}

// Game template categories - pre-built starter games
const GAME_TEMPLATES = [
  { id: 'racing', icon: '🏎️', label: 'Racing Game', prompt: 'Make a racing game where I dodge cars' },
  { id: 'shooter', icon: '🔫', label: 'Shooter Game', prompt: 'Make a space shooter game' },
  { id: 'platformer', icon: '🦘', label: 'Platformer', prompt: 'Make a platformer jumping game' },
  { id: 'frogger', icon: '🐸', label: 'Frogger Style', prompt: 'Make a frogger game crossing the road' },
  { id: 'puzzle', icon: '🧩', label: 'Puzzle Game', prompt: 'Make a memory matching puzzle game' },
  { id: 'clicker', icon: '👆', label: 'Clicker Game', prompt: 'Make a clicker idle game' },
  { id: 'rpg', icon: '⚔️', label: 'Adventure/RPG', prompt: 'Make an RPG adventure game' }
]

// Vibe Mode suggestions - for building
const VIBE_SUGGESTIONS = [
  "Make a game like Snake",
  "Create a bouncing ball animation",
  "Build a multiplayer game I can play with friends",
  "Make fireworks when I click",
  "Create a 3D spinning planet",
  "Build a 3D racing game",
  "Make a 3D cube that I can rotate",
  "Design a cool website about space"
]

// Plan Mode suggestions - for brainstorming
const PLAN_SUGGESTIONS = [
  "Help me plan a platformer game",
  "What makes a good racing game?",
  "I want to make something with animals",
  "Help me think of a fun multiplayer game",
  "What kind of game should I make?",
  "Help me design a puzzle game"
]

export default function ChatPanel({ messages, onSendMessage, isLoading, mode, onModeChange }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setInput(prev => prev + finalTranscript)
        } else if (interimTranscript) {
          // Show interim results in a visual way (optional)
        }
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setInput('') // Clear input when starting fresh
      recognitionRef.current.start()
      setIsListening(true)
    }
  }, [isListening])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((input.trim() || uploadedImage) && !isLoading) {
      onSendMessage(input.trim() || "Here's an image I'd like you to look at", uploadedImage || undefined)
      setInput('')
      setUploadedImage(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (!isLoading) {
      onSendMessage(suggestion)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image is too big! Please use an image smaller than 5MB.')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, etc.)')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const removeImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="panel chat-panel">
      <TipsModal 
        isOpen={showTipsModal} 
        onClose={() => setShowTipsModal(false)} 
      />
      
      {/* Panel Header */}
      <div className="panel-header chat-header">
        <span className="icon">💬</span>
        <span className="chat-header-title">AI Helper</span>
        
        {/* Mode Toggle */}
        <div className="mode-toggle-inline">
          <button 
            className={`mode-toggle-pill ${mode === 'plan' ? 'active' : ''}`}
            onClick={() => onModeChange('plan')}
            disabled={isLoading}
            title="Plan Mode - Brainstorm ideas"
          >
            📝 Plan
          </button>
          <button 
            className={`mode-toggle-pill ${mode === 'vibe' ? 'active' : ''}`}
            onClick={() => onModeChange('vibe')}
            disabled={isLoading}
            title="Vibe Mode - Build your game!"
          >
            🚀 Build
          </button>
        </div>
      </div>
      
      {/* Plan Mode Warning */}
      {mode === 'plan' && (
        <div className="plan-mode-bar">
          <span>📝 Planning Mode</span> — brainstorming only, nothing will be built yet.
          <button className="plan-switch-btn" onClick={() => onModeChange('vibe')}>
            Switch to Build 🚀
          </button>
        </div>
      )}
      
      <div className="panel-content chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">{mode === 'plan' ? '📝' : '🎮'}</div>
            <h3>{mode === 'plan' ? "Let's Plan Your Game!" : "What do you want to build?"}</h3>
            <p>{mode === 'plan' 
              ? "I'll help you brainstorm and plan before we build. What kind of game are you thinking?"
              : "Pick a game type to start with a working template, or describe your idea!"
            }</p>
            
            <div className="mode-indicator">
              {mode === 'plan' ? (
                <span className="mode-badge plan">Planning Mode - No code yet, just ideas!</span>
              ) : (
                <span className="mode-badge vibe">Build Mode - Let's create!</span>
              )}
            </div>
            
            {/* Template Buttons - Only in Vibe Mode */}
            {mode === 'vibe' && (
              <div className="template-section">
                <p className="template-label">Start with a working game:</p>
                <div className="template-grid">
                  {GAME_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      className="template-btn"
                      onClick={() => handleSuggestionClick(template.prompt)}
                      disabled={isLoading}
                    >
                      <span className="template-icon">{template.icon}</span>
                      <span className="template-name">{template.label}</span>
                    </button>
                  ))}
                </div>
                <p className="template-hint">These templates come with working game mechanics!</p>
              </div>
            )}
            
            <div className="suggestions">
              <p className="suggestions-label">{mode === 'plan' ? "Let's brainstorm:" : "Or try something custom:"}</p>
              <div className="suggestion-buttons">
                {(mode === 'plan' ? PLAN_SUGGESTIONS : VIBE_SUGGESTIONS).map((suggestion, i) => (
                  <button
                    key={i}
                    className="suggestion-btn"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                  >
                    <span className="suggestion-icon">{mode === 'plan' ? '💭' : '✨'}</span>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.role}`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  {message.image && (
                    <img 
                      src={message.image} 
                      alt="Uploaded" 
                      className="message-image"
                    />
                  )}
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant loading">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <form className="chat-input-area" onSubmit={handleSubmit}>
        {/* Image Preview */}
        {uploadedImage && (
          <div className="image-preview">
            <img src={uploadedImage} alt="Upload preview" />
            <button 
              type="button" 
              className="remove-image-btn"
              onClick={removeImage}
              title="Remove image"
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "🎤 Listening... speak now!" : uploadedImage ? "Describe what you want to do with this image..." : mode === 'plan' ? "What kind of game are you thinking about? 💭" : "What do you want to create today? 🎨"}
            disabled={isLoading}
            rows={3}
          />
          <div className="input-buttons">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            
            {/* Tips button */}
            <button 
              type="button"
              className="tips-btn"
              onClick={() => setShowTipsModal(true)}
              title="Tips & Rules"
            >
              <span className="tips-btn-icon">💡</span>
            </button>
            
            {/* Image upload button */}
            <button 
              type="button"
              className="upload-btn"
              onClick={handleImageClick}
              disabled={isLoading}
              title="Upload a screenshot or image"
            >
              <span className="upload-icon">📷</span>
            </button>
            
            {speechSupported && (
              <button 
                type="button"
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={isLoading}
                title={isListening ? 'Stop listening' : 'Speak to type'}
              >
                <span className="mic-icon">{isListening ? '🔴' : '🎤'}</span>
              </button>
            )}
            <button 
              type="submit" 
              className="send-btn"
              disabled={(!input.trim() && !uploadedImage) || isLoading}
            >
              <span className="send-icon">🚀</span>
              <span className="send-text">Send</span>
            </button>
          </div>
        </div>
        <div className="input-hint">
          {isListening ? "🎤 Speak clearly, then click Send" : "Press Enter to send • 🎤 Talk • 📷 Upload image"}
        </div>
      </form>
    </div>
  )
}
