import { useState, useEffect, useRef, useCallback } from 'react'
import { GameConfig, GameType } from '../types'
import './GameSurvey.css'

interface GameSurveyProps {
  onComplete: (config: GameConfig) => void
}

// ========== SURVEY DATA ==========

const GAME_TYPES = [
  { value: 'racing', icon: '🏎️', label: 'Racing' },
  { value: 'shooter', icon: '🔫', label: 'Shooter' },
  { value: 'platformer', icon: '🦘', label: 'Platformer' },
  { value: 'frogger', icon: '🐸', label: 'Frogger' },
  { value: 'puzzle', icon: '🧩', label: 'Puzzle' },
  { value: 'clicker', icon: '👆', label: 'Clicker' },
  { value: 'rpg', icon: '⚔️', label: 'RPG' },
]

const THEMES: Record<string, { icon: string; label: string; value: string }[]> = {
  racing: [
    { icon: '🚀', label: 'Space', value: 'space' },
    { icon: '🏙️', label: 'City', value: 'city' },
    { icon: '🌊', label: 'Underwater', value: 'underwater' },
    { icon: '🌴', label: 'Jungle', value: 'jungle' },
    { icon: '🏜️', label: 'Desert', value: 'desert' },
  ],
  shooter: [
    { icon: '🌌', label: 'Space', value: 'space' },
    { icon: '🧟', label: 'Zombie', value: 'zombie' },
    { icon: '🤖', label: 'Robot', value: 'robot' },
    { icon: '🐉', label: 'Fantasy', value: 'fantasy' },
    { icon: '🌊', label: 'Ocean', value: 'ocean' },
  ],
  platformer: [
    { icon: '🍄', label: 'Mushroom World', value: 'mushroom' },
    { icon: '🏰', label: 'Castle', value: 'castle' },
    { icon: '🌌', label: 'Space', value: 'space' },
    { icon: '🍬', label: 'Candy Land', value: 'candy' },
    { icon: '🌋', label: 'Volcano', value: 'volcano' },
  ],
  frogger: [
    { icon: '🏙️', label: 'Busy Street', value: 'city' },
    { icon: '🌊', label: 'River', value: 'river' },
    { icon: '🚀', label: 'Space', value: 'space' },
    { icon: '🌴', label: 'Jungle', value: 'jungle' },
    { icon: '❄️', label: 'Ice World', value: 'ice' },
  ],
  puzzle: [
    { icon: '🐾', label: 'Animals', value: 'animals' },
    { icon: '🌌', label: 'Space', value: 'space' },
    { icon: '🍕', label: 'Food', value: 'food' },
    { icon: '🎃', label: 'Spooky', value: 'spooky' },
    { icon: '🌈', label: 'Rainbow', value: 'rainbow' },
  ],
  clicker: [
    { icon: '🍪', label: 'Cookie/Food', value: 'food' },
    { icon: '💰', label: 'Money', value: 'money' },
    { icon: '🚀', label: 'Space', value: 'space' },
    { icon: '🧙', label: 'Magic', value: 'magic' },
    { icon: '🏭', label: 'Factory', value: 'factory' },
  ],
  rpg: [
    { icon: '🌲', label: 'Enchanted Forest', value: 'forest' },
    { icon: '🏰', label: 'Castle Kingdom', value: 'castle' },
    { icon: '🌌', label: 'Space', value: 'space' },
    { icon: '🌊', label: 'Underwater', value: 'underwater' },
    { icon: '🏜️', label: 'Desert', value: 'desert' },
  ],
}

const CHARACTERS: Record<string, { icon: string; label: string; value: string }[]> = {
  racing: [
    { icon: '🏎️', label: 'Race Car', value: 'race car' },
    { icon: '🚀', label: 'Spaceship', value: 'spaceship' },
    { icon: '🏍️', label: 'Motorcycle', value: 'motorcycle' },
    { icon: '🦄', label: 'Unicorn', value: 'unicorn' },
    { icon: '🤖', label: 'Robot', value: 'robot' },
  ],
  shooter: [
    { icon: '🚀', label: 'Spaceship', value: 'spaceship' },
    { icon: '🦸', label: 'Hero', value: 'hero' },
    { icon: '🤖', label: 'Mech', value: 'mech' },
    { icon: '🧙', label: 'Wizard', value: 'wizard' },
    { icon: '🐱‍👤', label: 'Ninja', value: 'ninja' },
  ],
  platformer: [
    { icon: '🦊', label: 'Fox', value: 'fox' },
    { icon: '🤖', label: 'Robot', value: 'robot' },
    { icon: '🧑‍🚀', label: 'Astronaut', value: 'astronaut' },
    { icon: '🐱', label: 'Cat', value: 'cat' },
    { icon: '🦸', label: 'Hero', value: 'hero' },
  ],
  frogger: [
    { icon: '🐸', label: 'Frog', value: 'frog' },
    { icon: '🐔', label: 'Chicken', value: 'chicken' },
    { icon: '🐢', label: 'Turtle', value: 'turtle' },
    { icon: '🦄', label: 'Unicorn', value: 'unicorn' },
    { icon: '🐱', label: 'Cat', value: 'cat' },
  ],
  puzzle: [
    { icon: '🃏', label: 'Cards', value: 'cards' },
    { icon: '💎', label: 'Gems', value: 'gems' },
    { icon: '🎨', label: 'Colors', value: 'colors' },
    { icon: '🧩', label: 'Shapes', value: 'shapes' },
    { icon: '⭐', label: 'Stars', value: 'stars' },
  ],
  clicker: [
    { icon: '🍪', label: 'Cookie', value: 'cookie' },
    { icon: '💰', label: 'Coins', value: 'coins' },
    { icon: '⚡', label: 'Energy', value: 'energy' },
    { icon: '🔮', label: 'Magic Orb', value: 'magic orb' },
    { icon: '🌟', label: 'Stars', value: 'stars' },
  ],
  rpg: [
    { icon: '🧙', label: 'Wizard', value: 'wizard' },
    { icon: '⚔️', label: 'Knight', value: 'knight' },
    { icon: '🧝', label: 'Elf', value: 'elf' },
    { icon: '🦸', label: 'Hero', value: 'hero' },
    { icon: '🐉', label: 'Dragon Rider', value: 'dragon rider' },
  ],
}

const OBSTACLES: Record<string, { icon: string; label: string; value: string }[]> = {
  racing: [
    { icon: '🚗', label: 'Cars', value: 'cars' },
    { icon: '☄️', label: 'Asteroids', value: 'asteroids' },
    { icon: '🪨', label: 'Rocks', value: 'rocks' },
    { icon: '🌵', label: 'Cactus', value: 'cactus' },
    { icon: '💣', label: 'Bombs', value: 'bombs' },
  ],
  shooter: [
    { icon: '👾', label: 'Aliens', value: 'aliens' },
    { icon: '🧟', label: 'Zombies', value: 'zombies' },
    { icon: '🤖', label: 'Robots', value: 'robots' },
    { icon: '🐉', label: 'Dragons', value: 'dragons' },
    { icon: '☄️', label: 'Meteors', value: 'meteors' },
  ],
  platformer: [
    { icon: '🦇', label: 'Bats', value: 'bats' },
    { icon: '🌵', label: 'Spikes', value: 'spikes' },
    { icon: '👻', label: 'Ghosts', value: 'ghosts' },
    { icon: '🔥', label: 'Fire', value: 'fire' },
    { icon: '🐍', label: 'Snakes', value: 'snakes' },
  ],
  frogger: [
    { icon: '🚗', label: 'Cars', value: 'cars' },
    { icon: '🚚', label: 'Trucks', value: 'trucks' },
    { icon: '🐊', label: 'Crocodiles', value: 'crocodiles' },
    { icon: '🌊', label: 'Water', value: 'water' },
    { icon: '🚂', label: 'Trains', value: 'trains' },
  ],
  puzzle: [
    { icon: '⏰', label: 'Time Limit', value: 'time limit' },
    { icon: '🔒', label: 'Locked Tiles', value: 'locked tiles' },
    { icon: '💣', label: 'Bombs', value: 'bombs' },
    { icon: '🌀', label: 'Shuffle', value: 'shuffle' },
    { icon: '🧊', label: 'Frozen', value: 'frozen pieces' },
  ],
  clicker: [
    { icon: '⏰', label: 'Cooldowns', value: 'cooldowns' },
    { icon: '💸', label: 'Taxes', value: 'taxes' },
    { icon: '🐛', label: 'Bugs', value: 'bugs' },
    { icon: '⚡', label: 'Power Drain', value: 'power drain' },
    { icon: '🌪️', label: 'Random Events', value: 'random events' },
  ],
  rpg: [
    { icon: '🐺', label: 'Wolves', value: 'wolves' },
    { icon: '💀', label: 'Skeletons', value: 'skeletons' },
    { icon: '🧌', label: 'Trolls', value: 'trolls' },
    { icon: '🐉', label: 'Dragons', value: 'dragons' },
    { icon: '👻', label: 'Ghosts', value: 'ghosts' },
  ],
}

const VISUAL_STYLES = [
  { icon: '💜', label: 'Neon Glow', value: 'neon' },
  { icon: '👾', label: 'Retro Pixel', value: 'retro' },
  { icon: '🌈', label: 'Cute & Colorful', value: 'cute' },
  { icon: '🌙', label: 'Dark & Spooky', value: 'spooky' },
  { icon: '✨', label: 'Clean & Simple', value: 'clean' },
]

// ========== SURVEY STEPS ==========

type SurveyStep = 'gameType' | 'dimension' | 'theme' | 'character' | 'obstacles' | 'visualStyle' | 'done'

const STEP_ORDER: SurveyStep[] = ['gameType', 'dimension', 'theme', 'character', 'obstacles', 'visualStyle', 'done']

const DIMENSION_OPTIONS = [
  { icon: '🖼️', label: '2D (Classic Style)', value: '2d' },
  { icon: '🌐', label: '3D (Inside the Game)', value: '3d' },
]

const BOT_MESSAGES: Record<string, string> = {
  gameType: "Hey there! What kind of game do you want to make today? Pick one or tell me your idea!",
  dimension: "Cool! Do you want your game in 2D (flat, classic style) or 3D (like you're inside the game)?",
  theme: "Awesome choice! Where does your game take place?",
  character: "Cool! Who or what do you control in the game?",
  obstacles: "Nice! What do you have to dodge or fight?",
  visualStyle: "Last one! What style should your game look like?",
  done: "Got it! Let me build your game now!",
}

// ========== COMPONENT ==========

export default function GameSurvey({ onComplete }: GameSurveyProps) {
  const [step, setStep] = useState<SurveyStep>('gameType')
  const [answers, setAnswers] = useState<Partial<GameConfig>>({})
  const [freeText, setFreeText] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: BOT_MESSAGES.gameType }
  ])
  const [isAnimating, setIsAnimating] = useState(false)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Text-to-speech for bot messages
  const speakMessage = useCallback((index: number, text: string) => {
    window.speechSynthesis.cancel()

    if (speakingIndex === index) {
      setSpeakingIndex(null)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.lang = 'en-US'

    utterance.onend = () => setSpeakingIndex(null)
    utterance.onerror = () => setSpeakingIndex(null)

    setSpeakingIndex(index)
    window.speechSynthesis.speak(utterance)
  }, [speakingIndex])

  // Cancel speech on unmount
  useEffect(() => {
    return () => { window.speechSynthesis.cancel() }
  }, [])

  const advanceStep = (userAnswer: string, configKey: keyof GameConfig, configValue: string) => {
    // Add user answer to chat
    const newHistory = [...chatHistory, { role: 'user' as const, text: userAnswer }]
    
    // Update answers
    const newAnswers = { ...answers, [configKey]: configValue }
    setAnswers(newAnswers)
    setFreeText('')
    setIsAnimating(true)

    // Find next step
    const currentIndex = STEP_ORDER.indexOf(step)
    const nextStep = STEP_ORDER[currentIndex + 1]

    // Add bot response after a brief delay
    setTimeout(() => {
      newHistory.push({ role: 'bot', text: BOT_MESSAGES[nextStep] })
      setChatHistory(newHistory)
      setStep(nextStep)
      setIsAnimating(false)

      // If we reached 'done', complete the survey
      if (nextStep === 'done') {
        const finalConfig: GameConfig = {
          gameType: (newAnswers.gameType || 'platformer') as GameType,
          dimension: (newAnswers.dimension || '2d') as '2d' | '3d',
          theme: newAnswers.theme || 'space',
          character: newAnswers.character || 'hero',
          obstacles: newAnswers.obstacles || 'enemies',
          visualStyle: newAnswers.visualStyle || 'neon',
          customNotes: '',
        }
        // Small delay so the kid sees the "building" message
        setTimeout(() => onComplete(finalConfig), 1000)
      }
    }, 600)

    // Update chat immediately with user message
    setChatHistory(newHistory)
  }

  const handleOptionClick = (option: { icon: string; label: string; value: string }) => {
    if (isAnimating) return

    const configKeys: Record<string, keyof GameConfig> = {
      gameType: 'gameType',
      dimension: 'dimension',
      theme: 'theme',
      character: 'character',
      obstacles: 'obstacles',
      visualStyle: 'visualStyle',
    }

    advanceStep(`${option.icon} ${option.label}`, configKeys[step], option.value)
  }

  const handleFreeTextSubmit = () => {
    if (!freeText.trim() || isAnimating) return

    const configKeys: Record<string, keyof GameConfig> = {
      gameType: 'gameType',
      dimension: 'dimension',
      theme: 'theme',
      character: 'character',
      obstacles: 'obstacles',
      visualStyle: 'visualStyle',
    }

    advanceStep(freeText.trim(), configKeys[step], freeText.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleFreeTextSubmit()
    }
  }

  // Get options for current step
  const getCurrentOptions = () => {
    const gameType = answers.gameType || 'racing'
    switch (step) {
      case 'gameType': return GAME_TYPES
      case 'dimension': return DIMENSION_OPTIONS
      case 'theme': return THEMES[gameType] || THEMES.racing
      case 'character': return CHARACTERS[gameType] || CHARACTERS.racing
      case 'obstacles': return OBSTACLES[gameType] || OBSTACLES.racing
      case 'visualStyle': return VISUAL_STYLES
      default: return []
    }
  }

  const stepNumber = STEP_ORDER.indexOf(step) + 1
  const totalSteps = STEP_ORDER.length - 1 // Exclude 'done'

  return (
    <div className="game-survey">
      {/* Progress Bar */}
      <div className="survey-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>
        <span className="progress-text">
          {step === 'done' ? 'Building!' : `Step ${stepNumber} of ${totalSteps}`}
        </span>
      </div>

      {/* Chat-style conversation */}
      <div className="survey-chat">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`survey-msg ${msg.role}`}>
            <div className="survey-msg-avatar">
              {msg.role === 'bot' ? '🤖' : '👤'}
            </div>
            <div className="survey-msg-bubble">
              {msg.text}
              {msg.role === 'bot' && (
                <button
                  className={`survey-read-aloud-btn ${speakingIndex === i ? 'speaking' : ''}`}
                  onClick={() => speakMessage(i, msg.text)}
                  title={speakingIndex === i ? 'Stop reading' : 'Read aloud'}
                >
                  {speakingIndex === i ? '⏹️' : '🔊'}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Options area */}
      {step !== 'done' && (
        <div className="survey-options-area">
          <div className="survey-option-grid">
            {getCurrentOptions().map((opt) => (
              <button
                key={opt.value}
                className="survey-option-btn"
                onClick={() => handleOptionClick(opt)}
                disabled={isAnimating}
              >
                <span className="survey-option-icon">{opt.icon}</span>
                <span className="survey-option-label">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Free text input */}
          <div className="survey-free-text">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Or type your own idea..."
              disabled={isAnimating}
            />
            <button
              className="survey-send-btn"
              onClick={handleFreeTextSubmit}
              disabled={!freeText.trim() || isAnimating}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Building animation when done */}
      {step === 'done' && (
        <div className="survey-building">
          <div className="building-spinner" />
          <p>Building your {answers.theme} {answers.gameType} game...</p>
        </div>
      )}
    </div>
  )
}
