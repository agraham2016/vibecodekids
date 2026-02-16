import { useState, useRef, useEffect, useCallback } from 'react'
import type { AIModel, AIMode } from '../types'
import type { ChatMessage } from '../hooks/useChat'
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
  messages: ChatMessage[]
  onSendMessage: (content: string, image?: string, modeOverride?: AIMode) => void
  isLoading: boolean
  activeModel: AIModel
  onSwitchModel: (model: AIModel) => void
  grokAvailable: boolean
  lastModelUsed: AIModel | null
  onUseAlternateCode?: (code: string) => void
}

/** Model badge info */
const MODEL_INFO: Record<AIModel, { name: string; icon: string; color: string }> = {
  claude: { name: 'Professor Claude', icon: '🎓', color: 'claude' },
  grok: { name: 'VibeGrok', icon: '🚀', color: 'grok' },
}

export default function ChatPanel({ 
  messages, 
  onSendMessage, 
  isLoading, 
  activeModel, 
  onSwitchModel, 
  grokAvailable, 
  lastModelUsed,
  onUseAlternateCode 
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [expandedAlternate, setExpandedAlternate] = useState<string | null>(null)
  
  // Detect GitHub URL in input
  const hasGitHubUrl = /github\.com\/[^\s]+/i.test(input)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gotResultRef = useRef(false)

  // Create a fresh SpeechRecognition instance
  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      gotResultRef.current = true
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
        speechTimeoutRef.current = null
      }

      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }

      if (finalTranscript) {
        setInput(prev => prev + finalTranscript)
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
        // User or code cancelled
      } else {
        setSpeechError('Speech not working — try typing instead')
      }
      setTimeout(() => setSpeechError(null), 4000)
    }

    rec.onend = () => {
      setIsListening(false)
    }

    return rec
  }, [])

  // Check speech recognition support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) setSpeechSupported(true)

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current)
    }
  }, [])

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!speechSupported) return
    setSpeechError(null)

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop()
      setIsListening(false)
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (_e) { /* ignore */ }
      }

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

        speechTimeoutRef.current = setTimeout(() => {
          if (!gotResultRef.current) {
            try { recognitionRef.current?.stop() } catch (_e) { /* ignore */ }
            setIsListening(false)
            setSpeechError("Couldn't hear anything — make sure your mic is allowed in browser settings")
            setTimeout(() => setSpeechError(null), 5000)
          }
        }, 8000)
      } catch {
        setIsListening(false)
        setSpeechError('Speech not available — try typing instead')
        setTimeout(() => setSpeechError(null), 4000)
      }
    }
  }, [isListening, speechSupported, createRecognition])

  // Text-to-Speech
  const speakMessage = useCallback((messageId: string, text: string) => {
    window.speechSynthesis.cancel()

    if (speakingMessageId === messageId) {
      setSpeakingMessageId(null)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.lang = 'en-US'
    utterance.onend = () => setSpeakingMessageId(null)
    utterance.onerror = () => setSpeakingMessageId(null)

    setSpeakingMessageId(messageId)
    window.speechSynthesis.speak(utterance)
  }, [speakingMessageId])

  // Cancel speech on unmount
  useEffect(() => {
    return () => { window.speechSynthesis.cancel() }
  }, [])

  // Auto-scroll
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
      reader.onloadend = () => { setUploadedImage(reader.result as string) }
      reader.readAsDataURL(file)
    }
  }

  const handleImageClick = () => { fileInputRef.current?.click() }

  const removeImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ========== DUAL MODEL QUICK ACTIONS ==========

  const handleAskOtherBuddy = () => {
    if (isLoading) return
    const otherModel = lastModelUsed === 'grok' ? 'claude' : 'grok'
    const buddyName = MODEL_INFO[otherModel].name
    onSendMessage(
      input.trim() || `Hey ${buddyName}, can you take a look at my game?`,
      undefined,
      'ask-other-buddy'
    )
    setInput('')
  }

  const handleMakeItFun = () => {
    if (isLoading) return
    onSendMessage('Make it more fun! Add surprises and cool effects!', undefined, 'creative')
    setInput('')
  }

  const handleCriticMode = () => {
    if (isLoading) return
    onSendMessage(
      input.trim() || 'Can both of you work together to make this the best game ever?',
      undefined,
      'critic'
    )
    setInput('')
  }

  // Get info for the "other" buddy
  const otherModel: AIModel = lastModelUsed === 'grok' ? 'claude' : 'grok'
  const otherBuddy = MODEL_INFO[otherModel]

  // Loading personality name
  const loadingModelInfo = MODEL_INFO[activeModel]

  return (
    <div className="panel chat-panel">
      <TipsModal 
        isOpen={showTipsModal} 
        onClose={() => setShowTipsModal(false)} 
      />
      
      {/* ===== PANEL HEADER WITH MODEL TOGGLE ===== */}
      <div className="panel-header chat-header">
        <span className="icon">💬</span>
        <span className="chat-header-title">AI Buddy</span>
        
        {/* Model Toggle Switch */}
        <div className="model-toggle">
          <button
            className={`model-toggle-btn ${activeModel === 'claude' ? 'active' : ''}`}
            onClick={() => onSwitchModel('claude')}
            title="Professor Claude — Patient teacher, explains everything"
            disabled={isLoading}
          >
            🎓
          </button>
          <button
            className={`model-toggle-btn ${activeModel === 'grok' ? 'active' : ''} ${!grokAvailable ? 'unavailable' : ''}`}
            onClick={() => grokAvailable && onSwitchModel('grok')}
            title={grokAvailable ? "VibeGrok — Hype gamer buddy, adds fun surprises" : "VibeGrok not available (no API key)"}
            disabled={isLoading || !grokAvailable}
          >
            🚀
          </button>
        </div>
      </div>

      {/* ===== ACTIVE MODEL INDICATOR ===== */}
      <div className={`model-indicator model-indicator-${activeModel}`}>
        <span className="model-indicator-icon">{MODEL_INFO[activeModel].icon}</span>
        <span className="model-indicator-name">{MODEL_INFO[activeModel].name}</span>
        <span className="model-indicator-status">is helping you build</span>
      </div>
      
      {/* ===== MESSAGES ===== */}
      <div className="panel-content chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">🎮</div>
            <h3>Let's build something awesome!</h3>
            <p>Tell me what kind of game you want to make! For example: "Make me a 3D space shooter" or "Build a racing game with dinosaurs" — anything you can imagine!</p>
            
            {/* Model intro cards */}
            <div className="buddy-intro-cards">
              <div className="buddy-card buddy-card-claude">
                <span className="buddy-card-icon">🎓</span>
                <span className="buddy-card-name">Professor Claude</span>
                <span className="buddy-card-desc">Patient teacher. Explains how things work!</span>
              </div>
              {grokAvailable && (
                <div className="buddy-card buddy-card-grok">
                  <span className="buddy-card-icon">🚀</span>
                  <span className="buddy-card-name">VibeGrok</span>
                  <span className="buddy-card-desc">Hype buddy. Makes things EPIC and fun!</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`chat-message ${message.role}`}>
                  <div className="message-avatar">
                    {message.role === 'user' 
                      ? '👤' 
                      : message.modelUsed 
                        ? MODEL_INFO[message.modelUsed].icon 
                        : '🤖'
                    }
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

                      {/* Model Badge */}
                      {message.role === 'assistant' && message.modelUsed && (
                        <span className={`model-badge model-badge-${message.modelUsed}`}>
                          {MODEL_INFO[message.modelUsed].icon} {MODEL_INFO[message.modelUsed].name}
                        </span>
                      )}

                      {/* Cache Hit Badge */}
                      {message.isCacheHit && (
                        <span className="cache-badge" title="Served instantly from cache!">⚡ Instant</span>
                      )}

                      {/* Debug Escalation Badge */}
                      {message.debugInfo && message.debugInfo.finalModel === 'grok' && (
                        <span className="escalation-badge" title="VibeGrok jumped in to help debug!">
                          🔧 Grok helped fix it!
                        </span>
                      )}

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

                {/* ===== ALTERNATE RESPONSE (Side-by-Side from Critic Mode) ===== */}
                {message.alternateResponse && (
                  <div className="alternate-response-section">
                    <button
                      className="alternate-toggle-btn"
                      onClick={() => setExpandedAlternate(
                        expandedAlternate === message.id ? null : message.id
                      )}
                    >
                      <span>{MODEL_INFO[message.alternateResponse.modelUsed].icon}</span>
                      <span>
                        {expandedAlternate === message.id ? 'Hide' : 'See'} {MODEL_INFO[message.alternateResponse.modelUsed].name}'s version
                      </span>
                      <span className="alternate-arrow">
                        {expandedAlternate === message.id ? '▲' : '▼'}
                      </span>
                    </button>
                    
                    {expandedAlternate === message.id && (
                      <div className={`alternate-response model-bg-${message.alternateResponse.modelUsed}`}>
                        <div className="alternate-header">
                          <span>{MODEL_INFO[message.alternateResponse.modelUsed].icon}</span>
                          <span>{MODEL_INFO[message.alternateResponse.modelUsed].name}'s Take:</span>
                        </div>
                        <div className="alternate-text">
                          {message.alternateResponse.response}
                        </div>
                        {message.alternateResponse.code && onUseAlternateCode && (
                          <button
                            className="use-alternate-btn"
                            onClick={() => onUseAlternateCode(message.alternateResponse!.code!)}
                          >
                            Use This Version Instead
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator with personality */}
            {isLoading && (
              <div className="chat-message assistant loading">
                <div className="message-avatar">{loadingModelInfo.icon}</div>
                <div className="message-content">
                  <div className={`typing-indicator typing-${activeModel}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="loading-label">
                    {activeModel === 'grok' ? 'VibeGrok is cooking... 🔥' : 'Professor Claude is thinking... 🧠'}
                  </div>
                  <div className="loading-sublabel">
                    Finding the best references and building your game...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* ===== QUICK ACTION BUTTONS ===== */}
      {messages.length > 0 && !isLoading && (
        <div className="quick-actions">
          {grokAvailable && (
            <>
              <button
                className="quick-action-btn action-fun"
                onClick={handleMakeItFun}
                title="Let VibeGrok add some creative flair!"
              >
                🔥 Make It Fun!
              </button>
              <button
                className="quick-action-btn action-buddy"
                onClick={handleAskOtherBuddy}
                title={`Ask ${otherBuddy.name} to take a look`}
              >
                {otherBuddy.icon} Ask {otherBuddy.name.split(' ').pop()}
              </button>
              <button
                className="quick-action-btn action-critic"
                onClick={handleCriticMode}
                title="Both AIs work together — Claude builds, Grok reviews!"
              >
                🤝 Team Up!
              </button>
            </>
          )}
        </div>
      )}

      {/* ===== INPUT AREA ===== */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        {/* GitHub URL detected indicator */}
        {hasGitHubUrl && (
          <div className="github-url-badge">
            <span>🔗</span>
            <span>GitHub link detected — I'll fetch reference code from this repo!</span>
          </div>
        )}
        
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
            placeholder={
              isListening 
                ? "🎤 Listening... speak now!" 
                : uploadedImage 
                  ? "Describe what you want to do with this image..." 
                  : activeModel === 'grok'
                    ? "Tell VibeGrok what to build! 🚀🔥"
                    : "What do you want to change? 🎨"
            }
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
              className={`send-btn send-btn-${activeModel}`}
              disabled={(!input.trim() && !uploadedImage) || isLoading}
            >
              <span className="send-icon">{activeModel === 'grok' ? '🔥' : '🚀'}</span>
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
