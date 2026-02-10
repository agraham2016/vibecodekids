import { useState, useRef, useEffect, useCallback } from 'react'
import { Message, GameConfig } from '../types'
import GameSurvey from './GameSurvey'
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
  gameConfig: GameConfig | null
  onSurveyComplete: (config: GameConfig) => void
}

export default function ChatPanel({ messages, onSendMessage, isLoading, gameConfig, onSurveyComplete }: ChatPanelProps) {
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
          // Show interim results
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
      setInput('')
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image is too big! Please use an image smaller than 5MB.')
        return
      }
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

  // ========== SURVEY MODE ==========
  // If no gameConfig yet, show the survey instead of chat
  if (!gameConfig) {
    return (
      <div className="panel chat-panel">
        <div className="panel-header chat-header">
          <span className="icon">🎮</span>
          <span className="chat-header-title">Let's Build a Game!</span>
        </div>
        <GameSurvey onComplete={onSurveyComplete} />
      </div>
    )
  }

  // ========== CHAT MODE ==========
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
        <div className="game-config-badge">
          {gameConfig.gameType} • {gameConfig.theme}
        </div>
      </div>
      
      <div className="panel-content chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">🎮</div>
            <h3>Building your {gameConfig.theme} {gameConfig.gameType} game!</h3>
            <p>I'm creating it right now. Once it appears in the preview, you can ask me to change anything!</p>
            <div className="building-indicator">
              <div className="building-spinner-sm" />
              <span>Generating your game...</span>
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
            placeholder={isListening ? "🎤 Listening... speak now!" : uploadedImage ? "Describe what you want to do with this image..." : "What do you want to change? 🎨"}
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
