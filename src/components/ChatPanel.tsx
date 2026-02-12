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
  currentProjectId: string
}

export default function ChatPanel({ messages, onSendMessage, isLoading, gameConfig, onSurveyComplete, currentProjectId }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gotResultRef = useRef(false)

  // Create a fresh SpeechRecognition instance (Safari needs a new one each session)
  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      gotResultRef.current = true
      // Clear the no-result timeout since we're getting data
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
        speechTimeoutRef.current = null
      }

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

    rec.onerror = (event: any) => {
      setIsListening(false)
      const error = event?.error || 'unknown'
      if (error === 'not-allowed' || error === 'permission-denied') {
        setSpeechError('Mic permission denied — check your browser settings')
      } else if (error === 'audio-capture' || error === 'no-speech') {
        setSpeechError("Couldn't hear you — try again closer to the mic")
      } else if (error === 'network') {
        setSpeechError('Speech needs an internet connection')
      } else if (error === 'aborted') {
        // User or code cancelled — no error needed
      } else {
        setSpeechError('Speech not working — try typing instead')
      }
      // Clear error after a few seconds
      setTimeout(() => setSpeechError(null), 4000)
    }

    rec.onend = () => {
      setIsListening(false)
    }

    return rec
  }, [])

  // Check if speech recognition is supported
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      setSpeechSupported(true)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
    }
  }, [])

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!speechSupported) return
    setSpeechError(null)

    // Clear any existing timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
    } else {
      // Abort previous instance (Safari can't reuse them)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (_e) { /* ignore */ }
      }

      // Create a fresh instance each session (fixes Safari InvalidStateError)
      const rec = createRecognition()
      if (!rec) {
        setSpeechError('Speech not available in this browser')
        setTimeout(() => setSpeechError(null), 4000)
        return
      }
      recognitionRef.current = rec

      try {
        gotResultRef.current = false
        rec.start()
        setIsListening(true)

        // Safety timeout: if no results AND no error after 8 seconds, stop and show message
        // This catches Safari silently failing without triggering onerror
        speechTimeoutRef.current = setTimeout(() => {
          if (!gotResultRef.current) {
            try { recognitionRef.current?.stop() } catch (_e) { /* ignore */ }
            setIsListening(false)
            setSpeechError("Couldn't hear anything — make sure your mic is allowed in browser settings")
            setTimeout(() => setSpeechError(null), 5000)
          }
        }, 8000)
      } catch (err: any) {
        // Safari can throw synchronously on start()
        setIsListening(false)
        setSpeechError('Speech not available — try typing instead')
        setTimeout(() => setSpeechError(null), 4000)
      }
    }
  }, [isListening, speechSupported, createRecognition])

  // ========== TEXT-TO-SPEECH (Read Aloud) ==========
  const speakMessage = useCallback((messageId: string, text: string) => {
    // Always cancel any current speech first
    window.speechSynthesis.cancel()

    // If same message was already playing, just stop (toggle off)
    if (speakingMessageId === messageId) {
      setSpeakingMessageId(null)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9   // Slightly slower for kids
    utterance.pitch = 1.0
    utterance.lang = 'en-US'

    utterance.onend = () => {
      setSpeakingMessageId(null)
    }
    utterance.onerror = () => {
      setSpeakingMessageId(null)
    }

    setSpeakingMessageId(messageId)
    window.speechSynthesis.speak(utterance)
  }, [speakingMessageId])

  // Cancel speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

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
  // Show survey only when no gameConfig AND no project loaded (new project)
  // If they clicked a project from the list, show chat so they can edit it
  const showSurvey = !gameConfig && currentProjectId === 'new'
  if (showSurvey) {
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
        {gameConfig && (
          <div className="game-config-badge">
            {gameConfig.gameType} • {gameConfig.theme}
          </div>
        )}
        {!gameConfig && currentProjectId !== 'new' && (
          <div className="game-config-badge edit-mode">Editing project</div>
        )}
      </div>
      
      <div className="panel-content chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">🎮</div>
            {gameConfig ? (
              <>
                <h3>Building your {gameConfig.theme} {gameConfig.gameType} game!</h3>
                <p>I'm creating it right now. Once it appears in the preview, you can ask me to change anything!</p>
                <div className="building-indicator">
                  <div className="building-spinner-sm" />
                  <span>Generating your game...</span>
                </div>
              </>
            ) : (
              <>
                <h3>Edit your game!</h3>
                <p>Ask me to add powerups, change colors, new levels, or anything else. I'll update the code for you.</p>
              </>
            )}
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
                  <div className="message-footer">
                    <div className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    {message.role === 'assistant' && (
                      <button
                        className={`read-aloud-btn ${speakingMessageId === message.id ? 'speaking' : ''}`}
                        onClick={() => speakMessage(message.id, message.content)}
                        title={speakingMessageId === message.id ? 'Stop reading' : 'Read aloud'}
                      >
                        {speakingMessageId === message.id ? '⏹️' : '🔊'}
                      </button>
                    )}
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
        {speechError && (
          <div className="speech-error">{speechError}</div>
        )}
        <div className="input-hint">
          {isListening ? "🎤 Speak clearly, then click Send" : "Press Enter to send • 🎤 Talk • 📷 Upload image"}
        </div>
      </form>
    </div>
  )
}
