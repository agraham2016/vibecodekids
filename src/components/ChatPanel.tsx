import { useState, useRef, useEffect, useCallback } from 'react';
import type { AIModel, AIMode, GameConfig } from '../types';
import type { ChatMessage, GenerationStatus } from '../hooks/useChat';
import {
  ENGINE_SELECTION_GUIDE,
  STARTERS_BY_ENGINE,
  STARTER_TEMPLATES,
  getStarterTemplateById,
  getStarterFamilyGuide,
  getStarterRecommendationReason,
} from '../config/gameCatalog';
import { ENABLE_3D_STUDIO } from '../config/featureFlags';
import TipsModal from './TipsModal';
import './ChatPanel.css';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface ChatPanelProps {
  messages: ChatMessage[];
  activeGameConfig?: GameConfig | null;
  onSendMessage: (content: string, image?: string, modeOverride?: AIMode, gameConfig?: GameConfig | null) => void;
  onFeedback?: (
    messageId: string,
    outcome: 'thumbsUp' | 'thumbsDown',
    modelUsed: AIModel | null,
    generationId?: string,
    details?: string,
  ) => void;
  isLoading: boolean;
  generationStatus?: GenerationStatus | null;
  activeModel: AIModel;
  onSwitchModel: (model: AIModel) => void;
  openaiAvailable: boolean;
  lastModelUsed: AIModel | null;
  onUseAlternateCode?: (code: string) => void;
  onReplayTutorial?: () => void;
}

/** Model badge info */
const MODEL_INFO: Record<AIModel, { name: string; icon: string; color: string }> = {
  claude: { name: 'Professor Claude', icon: '🎓', color: 'claude' },
  grok: { name: 'VibeGrok', icon: '🚀', color: 'grok' },
  openai: { name: 'Coach GPT', icon: '🏆', color: 'openai' },
};

const NEXT_BUDDY_MAP: Record<string, AIModel> = { claude: 'openai', openai: 'claude', grok: 'claude' };

/** Safe lookup — handles null/undefined or invalid model names. */
function getModelInfo(model: AIModel | null | undefined) {
  if (!model) return null;
  const info = MODEL_INFO[model as AIModel];
  return info || null;
}

const GAME_STARTERS = STARTER_TEMPLATES.map((template) => ({
  genre: template.id,
  emoji: template.icon,
  label: ENABLE_3D_STUDIO && template.dimension === '3d' ? `${template.shortLabel} 3D` : template.shortLabel,
  prompt: `Make me a 2D ${template.label} game. The theme is ${template.defaultTheme}. I control a ${template.defaultCharacter}. The main challenge is ${
    template.defaultObstacle
  }.`,
}));

function toStarterGameConfig(template: (typeof STARTER_TEMPLATES)[number]): GameConfig {
  return {
    gameType: template.id,
    engineId: template.engineId,
    genreFamily: template.genreFamily,
    starterTemplateId: template.id,
    selectionReason: getStarterRecommendationReason(template, false),
    dimension: template.dimension,
    theme: template.defaultTheme,
    character: template.defaultCharacter,
    obstacles: template.defaultObstacle,
    visualStyle: 'neon',
    customNotes: '',
  };
}

const GAME_STARTER_GROUPS = Object.entries(STARTERS_BY_ENGINE)
  .filter(([engineId]) => ENGINE_SELECTION_GUIDE[engineId])
  .map(([engineId, starters]) => ({
    engineId,
    label: ENGINE_SELECTION_GUIDE[engineId].label,
    description: ENGINE_SELECTION_GUIDE[engineId].runtimeSummary,
    architectureReason: ENGINE_SELECTION_GUIDE[engineId].architectureReason,
    starters,
  }));

const GENERATION_STAGES = ['engine', 'references', 'generating', 'polishing', 'repairing'] as const;

export default function ChatPanel({
  messages,
  activeGameConfig,
  onSendMessage,
  onFeedback,
  isLoading,
  generationStatus,
  activeModel,
  onSwitchModel,
  openaiAvailable,
  lastModelUsed,
  onUseAlternateCode,
  onReplayTutorial,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'thumbsUp' | 'thumbsDown'>>({});
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [expandedAlternate, setExpandedAlternate] = useState<string | null>(null);
  const activeStarter = activeGameConfig
    ? getStarterTemplateById(activeGameConfig.starterTemplateId || activeGameConfig.gameType)
    : null;
  const activeEngineGuide = activeGameConfig?.engineId ? ENGINE_SELECTION_GUIDE[activeGameConfig.engineId] : null;
  const activeFamilyGuide = activeGameConfig?.genreFamily ? getStarterFamilyGuide(activeGameConfig.genreFamily) : null;

  // Detect GitHub URL in input
  const hasGitHubUrl = /github\.com\/[^\s]+/i.test(input);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gotResultRef = useRef(false);

  // Create a fresh SpeechRecognition instance
  const createRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      gotResultRef.current = true;
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }

      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInput((prev) => prev + finalTranscript);
      }
    };

    rec.onerror = (event: Event & { error?: string }) => {
      setIsListening(false);
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      const error = event?.error || 'unknown';
      if (error === 'not-allowed' || error === 'permission-denied') {
        setSpeechError("Mic blocked! Click the 🔒 icon in your browser's address bar → allow Microphone → try again");
      } else if (error === 'audio-capture') {
        setSpeechError('No microphone found — plug one in or check your device settings');
      } else if (error === 'no-speech') {
        setSpeechError("Couldn't hear you — try speaking louder or closer to the mic");
      } else if (error === 'network') {
        setSpeechError('Speech needs an internet connection — check your Wi-Fi');
      } else if (error === 'aborted') {
        // User or code cancelled — no error to show
      } else {
        setSpeechError('Speech not working — try typing instead');
      }
      setTimeout(() => setSpeechError(null), 6000);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    return rec;
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!speechSupported) return;
    setSpeechError(null);

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_e) {
          /* ignore */
        }
      }

      const rec = createRecognition();
      if (!rec) {
        setSpeechError('Speech not available in this browser');
        setTimeout(() => setSpeechError(null), 4000);
        return;
      }
      recognitionRef.current = rec;

      try {
        gotResultRef.current = false;
        rec.start();
        setIsListening(true);

        speechTimeoutRef.current = setTimeout(() => {
          if (!gotResultRef.current) {
            try {
              recognitionRef.current?.stop();
            } catch (_e) {
              /* ignore */
            }
            setIsListening(false);
            setSpeechError("Couldn't hear anything — make sure your mic is allowed (click 🔒 in address bar)");
            setTimeout(() => setSpeechError(null), 6000);
          }
        }, 15000);
      } catch {
        setIsListening(false);
        setSpeechError('Speech not available — try typing instead');
        setTimeout(() => setSpeechError(null), 4000);
      }
    }
  }, [isListening, speechSupported, createRecognition]);

  // Text-to-Speech
  const speakMessage = useCallback(
    (messageId: string, text: string) => {
      window.speechSynthesis.cancel();

      if (speakingMessageId === messageId) {
        setSpeakingMessageId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);

      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    },
    [speakingMessageId],
  );

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || uploadedImage) && !isLoading) {
      onSendMessage(input.trim() || "Here's an image I'd like you to look at", uploadedImage || undefined);
      setInput('');
      setUploadedImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image is too big! Please use an image smaller than 5MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, etc.)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ========== DUAL MODEL QUICK ACTIONS ==========

  const handleAskOtherBuddy = () => {
    if (isLoading) return;
    let next = NEXT_BUDDY_MAP[lastModelUsed || 'claude'] || 'openai';
    if (next === 'openai' && !openaiAvailable) next = 'claude';
    const buddyName = MODEL_INFO[next].name;
    onSendMessage(input.trim() || `Hey ${buddyName}, can you take a look at my game?`, undefined, 'ask-other-buddy');
    setInput('');
  };

  // Get info for the "next" buddy in rotation
  let nextBuddy: AIModel = NEXT_BUDDY_MAP[lastModelUsed || 'claude'] || 'openai';
  if (nextBuddy === 'openai' && !openaiAvailable) nextBuddy = 'claude';
  const otherBuddy = MODEL_INFO[nextBuddy];

  // Loading personality name (defensive: activeModel should always be valid)
  const loadingModelInfo = getModelInfo(activeModel) ?? MODEL_INFO.claude;

  return (
    <div className="panel chat-panel">
      <TipsModal isOpen={showTipsModal} onClose={() => setShowTipsModal(false)} onReplayTutorial={onReplayTutorial} />

      {/* ===== PANEL HEADER WITH MODEL TOGGLE ===== */}
      <div className="panel-header chat-header">
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
            className={`model-toggle-btn ${activeModel === 'openai' ? 'active' : ''} ${!openaiAvailable ? 'unavailable' : ''}`}
            onClick={() => openaiAvailable && onSwitchModel('openai')}
            title={
              openaiAvailable
                ? 'Coach GPT — Competitive coach, levels up your game'
                : 'Coach GPT not available (no API key)'
            }
            disabled={isLoading || !openaiAvailable}
          >
            🏆
          </button>
        </div>
      </div>

      {/* ===== ACTIVE MODEL INDICATOR ===== */}
      <div className={`model-indicator model-indicator-${activeModel}`}>
        <span className="model-indicator-icon">{MODEL_INFO[activeModel].icon}</span>
        <span className="model-indicator-name">{MODEL_INFO[activeModel].name}</span>
        <span className="model-indicator-status">is helping you build</span>
      </div>

      {messages.length > 0 && activeGameConfig && activeEngineGuide && activeFamilyGuide && (
        <div
          className="active-game-config"
          title={
            activeGameConfig.selectionReason || `${activeFamilyGuide.bestFor} ${activeEngineGuide.iterationSweetSpot}`
          }
        >
          <div className="active-game-config-row">
            <span className="active-game-config-label">Path</span>
            <span className="game-config-badge">{activeEngineGuide.label}</span>
            <span className="game-config-badge">{activeFamilyGuide.label}</span>
            {activeStarter && <span className="game-config-badge">{activeStarter.label}</span>}
          </div>
        </div>
      )}

      {/* ===== MESSAGES ===== */}
      <div className="panel-content chat-messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">
              <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="welcome-logo" />
            </div>
            <h3>Let's build something awesome!</h3>
            <p>
              Tell me what kind of 2D game you want to build! For example: "Build a racing game with dinosaurs" or "Make
              a dungeon crawler with dragons" — anything you can imagine!
            </p>

            {/* Model intro cards */}
            <div className="buddy-intro-cards">
              <div className="buddy-card buddy-card-claude">
                <span className="buddy-card-icon">🎓</span>
                <span className="buddy-card-name">Professor Claude</span>
                <span className="buddy-card-desc">Patient teacher. Explains how things work!</span>
              </div>
              {openaiAvailable && (
                <div className="buddy-card buddy-card-openai">
                  <span className="buddy-card-icon">🏆</span>
                  <span className="buddy-card-name">Coach GPT</span>
                  <span className="buddy-card-desc">Game coach. Levels up your gameplay!</span>
                </div>
              )}
            </div>

            {/* Game template starters */}
            <div className="game-starters">
              <p className="game-starters-label">Or pick a starter engine path:</p>
              {GAME_STARTER_GROUPS.map((group) => (
                <div key={group.engineId} className="game-starter-group">
                  <p className="game-starter-group-title">{group.label}</p>
                  <p className="game-starter-group-copy">{group.description}</p>
                  <p className="game-starter-group-copy game-starter-group-reason">{group.architectureReason}</p>
                  <div className="game-starters-grid">
                    {group.starters.map((starter, idx) => {
                      const gameStarter = GAME_STARTERS.find((entry) => entry.genre === starter.id);
                      if (!gameStarter) return null;
                      return (
                        <button
                          key={`${group.engineId}-${starter.id}-${idx}`}
                          className="game-starter-btn"
                          onClick={() =>
                            onSendMessage(gameStarter.prompt, undefined, undefined, toStarterGameConfig(starter))
                          }
                          disabled={isLoading}
                          aria-label={`Build a ${starter.label} game`}
                        >
                          <span className="game-starter-emoji" aria-hidden="true">
                            {starter.icon}
                          </span>
                          <span className="game-starter-label">{starter.shortLabel}</span>
                          <span className="game-starter-copy">
                            {getStarterFamilyGuide(starter.genreFamily).bestFor}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`chat-message ${message.role}`}>
                  <div className="message-avatar">
                    {message.role === 'user' ? '👤' : (getModelInfo(message.modelUsed)?.icon ?? '🤖')}
                  </div>
                  <div className="message-content">
                    {message.image && <img src={message.image} alt="Uploaded" className="message-image" />}
                    <div className="message-text">{message.content ?? ''}</div>
                    <div className="message-footer">
                      <div className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      {/* Model Badge */}
                      {message.role === 'assistant' &&
                        (() => {
                          const info = getModelInfo(message.modelUsed);
                          return info ? (
                            <span className={`model-badge model-badge-${message.modelUsed}`}>
                              {info.icon} {info.name}
                            </span>
                          ) : null;
                        })()}

                      {/* Cache Hit Badge */}
                      {message.isCacheHit && (
                        <span className="cache-badge" title="Served instantly from cache!">
                          ⚡ Instant
                        </span>
                      )}

                      {/* Debug Escalation Badge */}
                      {message.debugInfo && message.debugInfo.finalModel !== 'claude' && (
                        <span
                          className="escalation-badge"
                          title={`${MODEL_INFO[message.debugInfo.finalModel].name} jumped in to help debug!`}
                        >
                          🔧 {MODEL_INFO[message.debugInfo.finalModel].name} helped fix it!
                        </span>
                      )}

                      {message.role === 'assistant' && (
                        <button
                          className={`read-aloud-btn ${speakingMessageId === message.id ? 'speaking' : ''}`}
                          onClick={() => speakMessage(message.id, message.content ?? '')}
                          title={speakingMessageId === message.id ? 'Stop reading' : 'Read aloud'}
                        >
                          {speakingMessageId === message.id ? '⏹️' : '🔊'}
                        </button>
                      )}

                      {/* Thumbs up/down feedback */}
                      {message.role === 'assistant' && onFeedback && (
                        <div className="feedback-buttons">
                          {feedbackGiven[message.id] ? (
                            <span className="feedback-thanks" title="Thanks for your feedback!">
                              {feedbackGiven[message.id] === 'thumbsUp' ? '👍 Thanks!' : '👎 Thanks for the feedback!'}
                            </span>
                          ) : (
                            <>
                              <button
                                className="feedback-btn feedback-thumbs-up"
                                onClick={() => {
                                  onFeedback(message.id, 'thumbsUp', message.modelUsed ?? null, message.generationId);
                                  setFeedbackGiven((prev) => ({ ...prev, [message.id]: 'thumbsUp' }));
                                }}
                                title="This helped!"
                              >
                                👍
                              </button>
                              <button
                                className="feedback-btn feedback-thumbs-down"
                                onClick={() => {
                                  onFeedback(message.id, 'thumbsDown', message.modelUsed ?? null, message.generationId);
                                  setFeedbackGiven((prev) => ({ ...prev, [message.id]: 'thumbsDown' }));
                                }}
                                title="This wasn't helpful"
                              >
                                👎
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ===== ALTERNATE RESPONSE (Side-by-Side from Critic Mode) ===== */}
                {message.alternateResponse &&
                  (() => {
                    const altInfo = getModelInfo(message.alternateResponse.modelUsed);
                    if (!altInfo) return null;
                    return (
                      <div className="alternate-response-section">
                        <button
                          className="alternate-toggle-btn"
                          onClick={() => setExpandedAlternate(expandedAlternate === message.id ? null : message.id)}
                        >
                          <span>{altInfo.icon}</span>
                          <span>
                            {expandedAlternate === message.id ? 'Hide' : 'See'} {altInfo.name}'s version
                          </span>
                          <span className="alternate-arrow">{expandedAlternate === message.id ? '▲' : '▼'}</span>
                        </button>

                        {expandedAlternate === message.id && (
                          <div className={`alternate-response model-bg-${message.alternateResponse.modelUsed}`}>
                            <div className="alternate-header">
                              <span>{altInfo.icon}</span>
                              <span>{altInfo.name}'s Take:</span>
                            </div>
                            <div className="alternate-text">{message.alternateResponse.response}</div>
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
                    );
                  })()}
              </div>
            ))}

            {/* Loading indicator with live generation status */}
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
                    {activeModel === 'openai'
                      ? 'Coach GPT is strategizing... 🏆'
                      : 'Professor Claude is thinking... 🧠'}
                  </div>
                  <div className="loading-sublabel">
                    {generationStatus?.message || 'Finding the best references and building your game...'}
                  </div>
                  {generationStatus && (
                    <ul className="generation-steps">
                      {GENERATION_STAGES.map((stage) => {
                        const currentIdx = GENERATION_STAGES.indexOf(
                          generationStatus.stage as (typeof GENERATION_STAGES)[number],
                        );
                        const stageIdx = GENERATION_STAGES.indexOf(stage);
                        if (stageIdx > currentIdx) return null;
                        const isCurrent = stage === generationStatus.stage;
                        return (
                          <li key={stage} className={isCurrent ? 'generation-step active' : 'generation-step done'}>
                            <span className="generation-step-icon">{isCurrent ? '' : '✓'}</span>
                            {stage === 'engine' && 'Engine selected'}
                            {stage === 'references' && 'Templates loaded'}
                            {stage === 'generating' && 'Writing code'}
                            {stage === 'polishing' && 'Polishing'}
                            {stage === 'repairing' && 'Repairing'}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ===== QUICK ACTION BUTTONS ===== */}
      {messages.length > 0 && !isLoading && openaiAvailable && (
        <div className="quick-actions">
          <button
            className="quick-action-btn action-buddy"
            onClick={handleAskOtherBuddy}
            title={`Ask ${otherBuddy.name} to take a look`}
          >
            {otherBuddy.icon} Ask {otherBuddy.name.split(' ').pop()}
          </button>
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
            <button type="button" className="remove-image-btn" onClick={removeImage} title="Remove image">
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
                ? '🎤 Listening... speak now!'
                : uploadedImage
                  ? 'Describe what you want to do with this image...'
                  : activeModel === 'openai'
                    ? 'Challenge Coach GPT! 🏆💪'
                    : 'What do you want to change? 🎨'
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
              aria-label="Tips and rules"
            >
              <span className="tips-btn-icon" aria-hidden="true">
                💡
              </span>
            </button>

            {/* Image upload button */}
            <button
              type="button"
              className="upload-btn"
              onClick={handleImageClick}
              disabled={isLoading}
              title="Upload a screenshot or image"
              aria-label="Upload image"
            >
              <span className="upload-icon" aria-hidden="true">
                📷
              </span>
            </button>

            {speechSupported && (
              <button
                type="button"
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={isLoading}
                title={isListening ? 'Stop listening' : 'Speak to type'}
                aria-label={isListening ? 'Stop listening' : 'Speak to type'}
              >
                <span className="mic-icon" aria-hidden="true">
                  {isListening ? '🔴' : '🎤'}
                </span>
              </button>
            )}
            <button
              type="submit"
              className={`send-btn send-btn-${activeModel}`}
              disabled={(!input.trim() && !uploadedImage) || isLoading}
              aria-label="Send message"
            >
              <span className="send-icon" aria-hidden="true">
                {activeModel === 'openai' ? '🏆' : '🚀'}
              </span>
              <span className="send-text">Send</span>
            </button>
          </div>
        </div>
        {speechError && <div className="speech-error">{speechError}</div>}
        <div className="input-hint">
          {isListening ? '🎤 Speak clearly, then click Send' : 'Press Enter to send • 🎤 Talk • 📷 Upload image'}
        </div>
      </form>
    </div>
  );
}
