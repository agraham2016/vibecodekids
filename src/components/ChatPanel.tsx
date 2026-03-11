import { useState, useRef, useEffect, useCallback } from 'react';
import type { AIModel, AIMode } from '../types';
import type { ChatMessage } from '../hooks/useChat';
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
  onSendMessage: (content: string, image?: string, modeOverride?: AIMode) => void;
  onFeedback?: (
    messageId: string,
    outcome: 'thumbsUp' | 'thumbsDown',
    modelUsed: AIModel | null,
    details?: string,
  ) => void;
  isLoading: boolean;
  activeModel: AIModel;
  onSwitchModel: (model: AIModel) => void;
  grokAvailable: boolean;
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

const NEXT_BUDDY_MAP: Record<string, AIModel> = { claude: 'grok', grok: 'openai', openai: 'claude' };

/** Safe lookup — handles null/undefined or invalid model names. */
function getModelInfo(model: AIModel | null | undefined) {
  if (!model) return null;
  const info = MODEL_INFO[model as AIModel];
  return info || null;
}

const GAME_STARTERS = [
  {
    genre: 'Platformer',
    emoji: '🏃',
    label: 'Jump & Run',
    prompt: 'Make me a platformer game where I jump across platforms and collect coins!',
  },
  {
    genre: 'Space Blaster',
    emoji: '🚀',
    label: 'Space Blaster',
    prompt: 'Make me a space blaster game where I blast aliens and dodge enemy fire!',
  },
  {
    genre: 'Racing',
    emoji: '🏎️',
    label: 'Speed Racer',
    prompt: 'Make me a racing game where I dodge traffic and race to the finish!',
  },
  {
    genre: 'Frogger',
    emoji: '🐸',
    label: 'Road Crosser',
    prompt: 'Make me a frogger game where I hop across busy roads and rivers to get home!',
  },
  {
    genre: 'Puzzle',
    emoji: '💎',
    label: 'Gem Match',
    prompt: 'Make me a puzzle game where I match colorful gems to score big!',
  },
  {
    genre: 'Clicker',
    emoji: '👆',
    label: 'Tap Frenzy',
    prompt: 'Make me a clicker game where I tap a gem to earn points and buy upgrades!',
  },
  {
    genre: 'RPG',
    emoji: '⚔️',
    label: 'Adventure Quest',
    prompt: 'Make me an RPG adventure game where I explore, find treasure, and talk to NPCs!',
  },
  {
    genre: 'Runner',
    emoji: '🏃‍♂️',
    label: 'Endless Runner',
    prompt: 'Make me an endless runner game where I run, jump over obstacles, and collect coins!',
  },
  {
    genre: 'Strategy',
    emoji: '🏰',
    label: 'Tower Defense',
    prompt: 'Make me a tower defense game where I place towers to stop waves of enemies!',
  },
  {
    genre: 'Fighting',
    emoji: '🥊',
    label: "Beat 'Em Up",
    prompt: 'Make me a fighting game where I punch and kick enemies in waves!',
  },
  {
    genre: 'Classic',
    emoji: '🐍',
    label: 'Snake',
    prompt: 'Make me a snake game where I eat food and grow longer without hitting my tail!',
  },
  {
    genre: 'Sports',
    emoji: '⚽',
    label: 'Soccer',
    prompt: 'Make me a soccer game where I play against an AI opponent and try to score goals!',
  },
  {
    genre: 'Arcade',
    emoji: '🧱',
    label: 'Brick Breaker',
    prompt: 'Make me a brick breaker game with a paddle, bouncing ball, and colorful bricks to smash!',
  },
  {
    genre: 'Casual',
    emoji: '🐦',
    label: 'Flappy Bird',
    prompt: 'Make me a flappy bird game where I tap to fly through pipes!',
  },
  {
    genre: 'Puzzle',
    emoji: '🫧',
    label: 'Bubble Pop',
    prompt: 'Make me a bubble shooter game where I aim and pop matching colored bubbles!',
  },
  {
    genre: 'Puzzle',
    emoji: '🟦',
    label: 'Block Stack',
    prompt: 'Make me a falling blocks game like Tetris where I stack pieces and clear lines!',
  },
  {
    genre: 'Music',
    emoji: '🎵',
    label: 'Rhythm Beats',
    prompt: 'Make me a rhythm game where I tap arrows to the beat of the music!',
  },
  {
    genre: 'Sim',
    emoji: '🐾',
    label: 'Pet Buddy',
    prompt: 'Make me a virtual pet game where I feed, play with, and take care of a cute pet!',
  },
  {
    genre: 'Arcade',
    emoji: '🏓',
    label: 'Paddle Bounce',
    prompt: 'Make me a pong game where I use a paddle to bounce the ball and play against the computer!',
  },
  {
    genre: 'Arcade',
    emoji: '🍎',
    label: 'Catch & Dodge',
    prompt: 'Make me a catching game where I move a basket to catch good things and dodge the bad ones!',
  },
  {
    genre: 'Arcade',
    emoji: '👊',
    label: 'Whack-a-Mole',
    prompt: 'Make me a whack-a-mole game where I tap the targets before they disappear!',
  },
  {
    genre: 'Puzzle',
    emoji: '🃏',
    label: 'Memory Match',
    prompt: 'Make me a memory game where I flip cards to find matching pairs!',
  },
  {
    genre: 'Arcade',
    emoji: '👻',
    label: 'Maze Chase',
    prompt: 'Make me a maze game like Pac-Man where I collect dots and avoid the ghosts!',
  },
  {
    genre: 'Action',
    emoji: '🎯',
    label: 'Top-Down Shooter',
    prompt: 'Make me a top-down shooter game where I move in all directions and shoot enemies!',
  },
  {
    genre: 'Casual',
    emoji: '🎣',
    label: 'Simple Fishing',
    prompt: 'Make me a fishing game where I cast my line and reel in fish!',
  },
  {
    genre: 'Puzzle',
    emoji: '🔮',
    label: 'Simon Says',
    prompt: 'Make me a Simon Says game where I watch and repeat the colored pattern!',
  },
  {
    genre: 'Action',
    emoji: '🤿',
    label: 'Treasure Diver',
    prompt: 'Make me a treasure diver game where I swim underwater to collect gems and dodge jellyfish!',
  },
  {
    genre: 'Reflex',
    emoji: '♻️',
    label: 'Trash Sorter',
    prompt:
      'Make me a trash sorter game where items slide by on a conveyor and I sort them into recycle, compost, and trash bins!',
  },
  {
    genre: 'Arcade',
    emoji: '🍉',
    label: 'Fruit Slice',
    prompt: 'Make me a fruit slicing game where I tap fruit flying across the screen to slice it, but avoid the bombs!',
  },
  {
    genre: 'Precision',
    emoji: '🏗️',
    label: 'Tower Stack',
    prompt: 'Make me a tower stacking game where blocks slide back and forth and I tap to drop them perfectly!',
  },
  {
    genre: 'Seek',
    emoji: '🔍',
    label: 'Find the Friend',
    prompt: 'Make me a hidden object game where I search the scene to find a hidden friend before time runs out!',
  },
];

export default function ChatPanel({
  messages,
  onSendMessage,
  onFeedback,
  isLoading,
  activeModel,
  onSwitchModel,
  grokAvailable,
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
    let next = NEXT_BUDDY_MAP[lastModelUsed || 'claude'] || 'grok';
    if (next === 'grok' && !grokAvailable) next = 'openai';
    if (next === 'openai' && !openaiAvailable) next = 'claude';
    const buddyName = MODEL_INFO[next].name;
    onSendMessage(input.trim() || `Hey ${buddyName}, can you take a look at my game?`, undefined, 'ask-other-buddy');
    setInput('');
  };

  const handleMakeItFun = () => {
    if (isLoading) return;
    onSendMessage('Make it more fun! Add surprises and cool effects!', undefined, 'creative');
    setInput('');
  };

  const handleCriticMode = () => {
    if (isLoading) return;
    onSendMessage(
      input.trim() || 'Can both of you work together to make this the best game ever?',
      undefined,
      'critic',
    );
    setInput('');
  };

  // Get info for the "next" buddy in rotation
  let nextBuddy: AIModel = NEXT_BUDDY_MAP[lastModelUsed || 'claude'] || 'grok';
  if (nextBuddy === 'grok' && !grokAvailable) nextBuddy = 'openai';
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
            className={`model-toggle-btn ${activeModel === 'grok' ? 'active' : ''} ${!grokAvailable ? 'unavailable' : ''}`}
            onClick={() => grokAvailable && onSwitchModel('grok')}
            title={
              grokAvailable ? 'VibeGrok — Hype gamer buddy, adds fun surprises' : 'VibeGrok not available (no API key)'
            }
            disabled={isLoading || !grokAvailable}
          >
            🚀
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

      {/* ===== MESSAGES ===== */}
      <div className="panel-content chat-messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">
              <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="welcome-logo" />
            </div>
            <h3>Let's build something awesome!</h3>
            <p>
              Tell me what kind of game you want to make! For example: "Make me a 3D space blaster" or "Build a racing
              game with dinosaurs" — anything you can imagine!
            </p>

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
              <p className="game-starters-label">Or pick a game to start building:</p>
              <div className="game-starters-grid">
                {GAME_STARTERS.map((g, idx) => (
                  <button
                    key={`${g.genre}-${idx}`}
                    className="game-starter-btn"
                    onClick={() => onSendMessage(g.prompt)}
                    disabled={isLoading}
                    aria-label={`Build a ${g.label} game`}
                  >
                    <span className="game-starter-emoji" aria-hidden="true">
                      {g.emoji}
                    </span>
                    <span className="game-starter-label">{g.label}</span>
                  </button>
                ))}
              </div>
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
                      {message.debugInfo && message.debugInfo.finalModel === 'grok' && (
                        <span className="escalation-badge" title="VibeGrok jumped in to help debug!">
                          🔧 Grok helped fix it!
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
                                  onFeedback(message.id, 'thumbsUp', message.modelUsed ?? null);
                                  setFeedbackGiven((prev) => ({ ...prev, [message.id]: 'thumbsUp' }));
                                }}
                                title="This helped!"
                              >
                                👍
                              </button>
                              <button
                                className="feedback-btn feedback-thumbs-down"
                                onClick={() => {
                                  onFeedback(message.id, 'thumbsDown', message.modelUsed ?? null);
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
                    {activeModel === 'grok'
                      ? 'VibeGrok is cooking... 🔥'
                      : activeModel === 'openai'
                        ? 'Coach GPT is strategizing... 🏆'
                        : 'Professor Claude is thinking... 🧠'}
                  </div>
                  <div className="loading-sublabel">Finding the best references and building your game...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ===== QUICK ACTION BUTTONS ===== */}
      {messages.length > 0 && !isLoading && (grokAvailable || openaiAvailable) && (
        <div className="quick-actions">
          {grokAvailable && (
            <button
              className="quick-action-btn action-fun"
              onClick={handleMakeItFun}
              title="Let VibeGrok add some creative flair!"
            >
              🔥 Make It Fun!
            </button>
          )}
          <button
            className="quick-action-btn action-buddy"
            onClick={handleAskOtherBuddy}
            title={`Ask ${otherBuddy.name} to take a look`}
          >
            {otherBuddy.icon} Ask {otherBuddy.name.split(' ').pop()}
          </button>
          {grokAvailable && (
            <button
              className="quick-action-btn action-critic"
              onClick={handleCriticMode}
              title="Both AIs work together — Claude builds, Grok reviews!"
            >
              🤝 Team Up!
            </button>
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
                  : activeModel === 'grok'
                    ? 'Tell VibeGrok what to build! 🚀🔥'
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
                {activeModel === 'grok' ? '🔥' : activeModel === 'openai' ? '🏆' : '🚀'}
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
