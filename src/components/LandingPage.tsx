import { useState, useEffect, useCallback } from 'react'
import './LandingPage.css'

interface LandingPageProps {
  onLoginClick: () => void
  onSignupClick: () => void
}

const DEMO_SCENARIOS = [
  {
    prompt: 'Make me a platformer with a dinosaur that collects gems!',
    aiReply: "Let's build it! Here's your dino platformer with gem collecting, jumping physics, and a score counter!",
    label: 'Platformer',
    bg: 'linear-gradient(180deg, #87CEEB 0%, #87CEEB 60%, #5B8C3E 60%, #4a7a30 100%)',
    elements: [
      { emoji: '🦕', className: 'demo-player demo-bounce', style: { bottom: '42%', left: '22%', fontSize: '2.4rem' } },
      { emoji: '💎', className: 'demo-item demo-float', style: { bottom: '62%', left: '55%', fontSize: '1.4rem' } },
      { emoji: '💎', className: 'demo-item demo-float-delay', style: { bottom: '72%', left: '75%', fontSize: '1.4rem' } },
      { emoji: '💎', className: 'demo-item demo-float', style: { bottom: '55%', left: '35%', fontSize: '1.2rem' } },
      { emoji: '☁️', className: 'demo-cloud demo-drift', style: { top: '10%', left: '15%', fontSize: '2rem' } },
      { emoji: '☁️', className: 'demo-cloud demo-drift-delay', style: { top: '5%', left: '65%', fontSize: '1.6rem' } },
    ],
    platforms: [
      { style: { bottom: '38%', left: '10%', width: '30%' } },
      { style: { bottom: '50%', left: '45%', width: '25%' } },
      { style: { bottom: '62%', left: '68%', width: '22%' } },
    ],
    scoreText: 'GEMS: 3  LIVES: 3',
  },
  {
    prompt: 'I want a space shooter where I blast aliens!',
    aiReply: "Launching your space shooter! Fly your ship, blast alien waves, and rack up your high score!",
    label: 'Space Shooter',
    bg: 'linear-gradient(180deg, #0a0a20 0%, #1a0a40 100%)',
    elements: [
      { emoji: '🚀', className: 'demo-player demo-hover', style: { bottom: '15%', left: '45%', fontSize: '2.4rem' } },
      { emoji: '👾', className: 'demo-enemy demo-sway', style: { top: '15%', left: '20%', fontSize: '1.8rem' } },
      { emoji: '👾', className: 'demo-enemy demo-sway-delay', style: { top: '12%', left: '50%', fontSize: '1.8rem' } },
      { emoji: '👾', className: 'demo-enemy demo-sway', style: { top: '18%', left: '75%', fontSize: '1.8rem' } },
      { emoji: '✦', className: 'demo-star demo-twinkle', style: { top: '30%', left: '10%', fontSize: '0.5rem', color: '#fff' } },
      { emoji: '✦', className: 'demo-star demo-twinkle-delay', style: { top: '50%', left: '80%', fontSize: '0.4rem', color: '#fff' } },
      { emoji: '✦', className: 'demo-star demo-twinkle', style: { top: '70%', left: '30%', fontSize: '0.3rem', color: '#fff' } },
      { emoji: '✦', className: 'demo-star demo-twinkle-delay', style: { top: '25%', left: '90%', fontSize: '0.6rem', color: '#fff' } },
    ],
    platforms: [],
    scoreText: 'SCORE: 2400  WAVE: 3',
  },
  {
    prompt: 'Make a snake game where I eat apples and grow!',
    aiReply: "Classic snake coming up! Arrow keys to move, eat apples to grow longer, and don't hit your tail!",
    label: 'Snake',
    bg: 'linear-gradient(180deg, #0f1923 0%, #1a2a3a 100%)',
    elements: [
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '35%', fontSize: '1.2rem' } },
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '40%', fontSize: '1.2rem' } },
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '45%', fontSize: '1.2rem' } },
      { emoji: '🟢', className: 'demo-static', style: { top: '40%', left: '50%', fontSize: '1.2rem' } },
      { emoji: '🟩', className: 'demo-static', style: { top: '40%', left: '55%', fontSize: '1.3rem' } },
      { emoji: '🍎', className: 'demo-item demo-pulse', style: { top: '25%', left: '70%', fontSize: '1.4rem' } },
    ],
    platforms: [],
    scoreText: 'LENGTH: 5  SCORE: 40',
  },
]

const GAME_TEMPLATES = [
  {
    title: 'Jump & Run',
    genre: 'Platformer',
    description: 'Hop across platforms and collect coins',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    sprite: '/assets/sprites/platformer/player.png',
    emoji: '🏃',
  },
  {
    title: 'Space Blaster',
    genre: 'Shooter',
    description: 'Blast aliens and dodge enemy fire',
    gradient: 'linear-gradient(180deg, #0a0a20 0%, #1a0a50 100%)',
    sprite: '/assets/sprites/shooter/ship.png',
    emoji: '🚀',
  },
  {
    title: 'Speed Racer',
    genre: 'Racing',
    description: 'Dodge traffic and race to the finish',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    sprite: '/assets/sprites/racing/car-player.png',
    emoji: '🏎️',
  },
  {
    title: 'Road Crosser',
    genre: 'Frogger',
    description: 'Hop across busy lanes to safety',
    gradient: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 50%, #40916c 100%)',
    sprite: '/assets/sprites/frogger/frog.png',
    emoji: '🐸',
  },
  {
    title: 'Gem Match',
    genre: 'Puzzle',
    description: 'Match colorful gems to score big',
    gradient: 'linear-gradient(135deg, #4a1a6b 0%, #2a1040 50%, #6b21a8 100%)',
    sprite: '/assets/sprites/puzzle/gems.png',
    emoji: '💎',
  },
  {
    title: 'Tap Frenzy',
    genre: 'Clicker',
    description: 'Click the gem, buy upgrades, go wild',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #4c1d95 100%)',
    sprite: '/assets/sprites/clicker/gem.png',
    emoji: '👆',
  },
  {
    title: 'Adventure Quest',
    genre: 'RPG',
    description: 'Explore, find treasure, talk to NPCs',
    gradient: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #52b788 100%)',
    sprite: '/assets/sprites/rpg/hero.png',
    emoji: '⚔️',
  },
  {
    title: 'Endless Runner',
    genre: 'Runner',
    description: 'Run, jump, and dodge obstacles at top speed',
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7c948 50%, #1a1a2e 100%)',
    sprite: '/assets/sprites/endless-runner/player.png',
    emoji: '🏃‍♂️',
  },
  {
    title: 'Tower Defense',
    genre: 'Strategy',
    description: 'Place towers and defend against enemy waves',
    gradient: 'linear-gradient(135deg, #2d3436 0%, #636e72 50%, #00b894 100%)',
    sprite: '/assets/sprites/tower-defense/tower.png',
    emoji: '🏰',
  },
  {
    title: 'Beat Em Up',
    genre: 'Fighting',
    description: 'Punch and kick your way through enemies',
    gradient: 'linear-gradient(135deg, #d63031 0%, #e17055 50%, #2d3436 100%)',
    sprite: '/assets/sprites/fighting/fighter.png',
    emoji: '🥊',
  },
  {
    title: 'Snake',
    genre: 'Classic',
    description: 'Eat food, grow longer, avoid your tail',
    gradient: 'linear-gradient(135deg, #00b894 0%, #00cec9 50%, #0984e3 100%)',
    sprite: '/assets/sprites/snake/head.png',
    emoji: '🐍',
  },
  {
    title: 'Soccer',
    genre: 'Sports',
    description: 'Score goals and beat the AI opponent',
    gradient: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 50%, #1abc9c 100%)',
    sprite: '/assets/sprites/sports/ball.png',
    emoji: '⚽',
  },
  {
    title: 'Brick Breaker',
    genre: 'Arcade',
    description: 'Smash bricks with a bouncing ball',
    gradient: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #fd79a8 100%)',
    sprite: '/assets/sprites/brick-breaker/paddle.png',
    emoji: '🧱',
  },
  {
    title: 'Flappy Bird',
    genre: 'Casual',
    description: 'Tap to fly through the pipes',
    gradient: 'linear-gradient(135deg, #74b9ff 0%, #a29bfe 50%, #55efc4 100%)',
    sprite: '/assets/sprites/flappy/bird.png',
    emoji: '🐦',
  },
  {
    title: 'Bubble Pop',
    genre: 'Puzzle',
    description: 'Aim and pop matching colored bubbles',
    gradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 50%, #6c5ce7 100%)',
    sprite: '/assets/sprites/bubble-shooter/bubbles.png',
    emoji: '🫧',
  },
  {
    title: 'Block Stack',
    genre: 'Puzzle',
    description: 'Stack falling blocks and clear full lines',
    gradient: 'linear-gradient(135deg, #0984e3 0%, #6c5ce7 50%, #00cec9 100%)',
    sprite: '/assets/sprites/falling-blocks/blocks.png',
    emoji: '🟦',
  },
  {
    title: 'Rhythm Beats',
    genre: 'Music',
    description: 'Hit the arrows to the beat of the music',
    gradient: 'linear-gradient(135deg, #e84393 0%, #fd79a8 50%, #fdcb6e 100%)',
    sprite: '/assets/sprites/rhythm/arrows.png',
    emoji: '🎵',
  },
  {
    title: 'Pet Buddy',
    genre: 'Sim',
    description: 'Feed, play with, and care for your pet',
    gradient: 'linear-gradient(135deg, #fdcb6e 0%, #f39c12 50%, #e17055 100%)',
    sprite: '/assets/sprites/pet-sim/pet.png',
    emoji: '🐾',
  },
]

export default function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps) {
  const [demoIndex, setDemoIndex] = useState(0)
  const [typedPrompt, setTypedPrompt] = useState('')
  const [showAiReply, setShowAiReply] = useState(false)
  const [typedReply, setTypedReply] = useState('')
  const [phase, setPhase] = useState<'typing' | 'building' | 'done'>('typing')

  const scenario = DEMO_SCENARIOS[demoIndex]

  const startScenario = useCallback((index: number) => {
    setDemoIndex(index)
    setTypedPrompt('')
    setTypedReply('')
    setShowAiReply(false)
    setPhase('typing')
  }, [])

  useEffect(() => {
    const prompt = DEMO_SCENARIOS[demoIndex].prompt
    if (phase !== 'typing') return
    if (typedPrompt.length < prompt.length) {
      const speed = 25 + Math.random() * 20
      const timer = setTimeout(() => setTypedPrompt(prompt.slice(0, typedPrompt.length + 1)), speed)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      setShowAiReply(true)
      setPhase('building')
    }, 400)
    return () => clearTimeout(timer)
  }, [typedPrompt, phase, demoIndex])

  useEffect(() => {
    const reply = DEMO_SCENARIOS[demoIndex].aiReply
    if (phase !== 'building') return
    if (typedReply.length < reply.length) {
      const speed = 18 + Math.random() * 12
      const timer = setTimeout(() => setTypedReply(reply.slice(0, typedReply.length + 1)), speed)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => setPhase('done'), 300)
    return () => clearTimeout(timer)
  }, [typedReply, phase, demoIndex])

  useEffect(() => {
    if (phase !== 'done') return
    const timer = setTimeout(() => {
      startScenario((demoIndex + 1) % DEMO_SCENARIOS.length)
    }, 5000)
    return () => clearTimeout(timer)
  }, [phase, demoIndex, startScenario])

  return (
    <div className="landing-page">
      <div className="landing-bg">
        <div className="floating-shapes">
          <div className="shape shape-1">🎮</div>
          <div className="shape shape-2">🚀</div>
          <div className="shape shape-3">⭐</div>
          <div className="shape shape-4">🎨</div>
          <div className="shape shape-5">💻</div>
          <div className="shape shape-6">🌟</div>
        </div>
      </div>

      <div className="landing-content">
        <div className="landing-hero">
          <div className="hero-badge">For Kids Ages 7-18</div>
          <h1 className="hero-title">
            <span className="title-icon">🚀</span>
            <span className="title-text">Vibe Code Kidz</span>
          </h1>
          <p className="hero-subtitle">
            Vibecode awesome games just by describing them!
            <br />
            No coding experience needed.
          </p>

          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Chat with AI</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <span>Make Games</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <span>Share & Play</span>
            </div>
          </div>

          <div className="hero-buttons">
            <button className="btn-signup" onClick={onSignupClick}>
              <span>✨</span> Get Started Free
            </button>
            <button className="btn-login" onClick={onLoginClick}>
              <span>🔑</span> Log In
            </button>
          </div>

          <p className="hero-note">
            Free account includes 3 games/month and 30 prompts/day
          </p>
        </div>

        {/* Live Demo — Before & After */}
        <div className="live-demo-section">
          <h2 className="demo-section-title">See It In Action</h2>
          <p className="demo-section-subtitle">Describe a game. Vibecode it to life.</p>

          <div className="demo-tabs">
            {DEMO_SCENARIOS.map((s, i) => (
              <button
                key={s.label}
                className={`demo-tab ${i === demoIndex ? 'active' : ''}`}
                onClick={() => startScenario(i)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="demo-window">
            <div className="demo-window-header">
              <div className="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="preview-title">vibe-code-studio</span>
            </div>

            <div className="demo-split">
              {/* Left: Chat */}
              <div className="demo-chat-panel">
                <div className="demo-chat-label">Your Idea</div>
                <div className="demo-chat-messages">
                  <div className="demo-bubble demo-bubble-user">
                    <span className="demo-avatar">🧒</span>
                    <div className="demo-bubble-text">
                      {typedPrompt}
                      {phase === 'typing' && <span className="demo-cursor">|</span>}
                    </div>
                  </div>

                  {showAiReply && (
                    <div className="demo-bubble demo-bubble-ai">
                      <span className="demo-avatar">🤖</span>
                      <div className="demo-bubble-text">
                        {typedReply}
                        {phase === 'building' && <span className="demo-cursor">|</span>}
                      </div>
                    </div>
                  )}

                  {phase === 'building' && typedReply.length < 3 && (
                    <div className="demo-building">
                      <div className="demo-spinner" />
                      <span>Building your game...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Game preview */}
              <div className="demo-game-panel" style={{ background: scenario.bg }}>
                <div className={`demo-game-scene ${phase === 'done' ? 'demo-scene-active' : 'demo-scene-building'}`}>
                  {phase !== 'done' && (
                    <div className="demo-game-loading">
                      <div className="demo-loader-ring" />
                      <span>Generating...</span>
                    </div>
                  )}
                  {phase === 'done' && (
                    <>
                      <div className="demo-hud">{scenario.scoreText}</div>
                      {scenario.platforms.map((p, i) => (
                        <div key={i} className="demo-platform" style={p.style} />
                      ))}
                      {scenario.elements.map((el, i) => (
                        <span key={i} className={el.className} style={el.style}>
                          {el.emoji}
                        </span>
                      ))}
                      <div className="demo-game-badge">Playable Game</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button className="demo-cta" onClick={onSignupClick}>
            Try It Yourself — Free
          </button>
        </div>

        {/* Template Showcase */}
        <div className="template-showcase">
          <h2 className="showcase-title">18 Game Types to Vibecode</h2>
          <p className="showcase-subtitle">Pick a template and vibecode it into your own game in seconds</p>
          <div className="template-grid">
            {GAME_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.title}
                className="template-card"
                onClick={onSignupClick}
              >
                <div
                  className="template-card-bg"
                  style={{ background: tmpl.gradient }}
                >
                  <img
                    src={tmpl.sprite}
                    alt={tmpl.title}
                    className="template-card-sprite"
                  />
                  <span className="template-card-emoji">{tmpl.emoji}</span>
                </div>
                <div className="template-card-info">
                  <span className="template-card-genre">{tmpl.genre}</span>
                  <span className="template-card-title">{tmpl.title}</span>
                  <span className="template-card-desc">{tmpl.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Vibecode From Scratch */}
        <div className="scratch-section">
          <div className="scratch-divider">
            <span className="scratch-divider-line" />
            <span className="scratch-divider-text">OR</span>
            <span className="scratch-divider-line" />
          </div>

          <h2 className="scratch-title">Vibecode Something From Scratch</h2>
          <p className="scratch-subtitle">
            Don't see what you want? Just describe it. Your AI buddy will vibecode any game you can imagine.
          </p>

          <div className="scratch-examples">
            <div className="scratch-card" onClick={onSignupClick}>
              <span className="scratch-card-icon">🏰</span>
              <span className="scratch-card-quote">"A castle defense game with dragons and wizards"</span>
            </div>
            <div className="scratch-card" onClick={onSignupClick}>
              <span className="scratch-card-icon">🧟</span>
              <span className="scratch-card-quote">"Zombie survival where I build walls and craft weapons"</span>
            </div>
            <div className="scratch-card" onClick={onSignupClick}>
              <span className="scratch-card-icon">🐱</span>
              <span className="scratch-card-quote">"A cat cafe simulator where customers order treats"</span>
            </div>
            <div className="scratch-card" onClick={onSignupClick}>
              <span className="scratch-card-icon">🌌</span>
              <span className="scratch-card-quote">"An asteroid mining game in outer space"</span>
            </div>
            <div className="scratch-card" onClick={onSignupClick}>
              <span className="scratch-card-icon">🎃</span>
              <span className="scratch-card-quote">"A haunted house escape room with puzzles"</span>
            </div>
            <div className="scratch-card" onClick={onSignupClick}>
              <span className="scratch-card-icon">🏴‍☠️</span>
              <span className="scratch-card-quote">"A pirate ship battle game on the ocean"</span>
            </div>
          </div>

          <div className="scratch-bottom">
            <p className="scratch-hint">Type anything you want — the only limit is your imagination</p>
            <button className="scratch-cta" onClick={onSignupClick}>
              Start Vibecoding — Free
            </button>
          </div>
        </div>
      </div>

      <div className="landing-footer">
        <a href="/gallery" className="footer-link">
          <span>🕹️</span> Browse the Arcade
        </a>
      </div>
    </div>
  )
}
