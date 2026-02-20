import './LandingPage.css'

interface LandingPageProps {
  onLoginClick: () => void
  onSignupClick: () => void
}

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
]

export default function LandingPage({ onLoginClick, onSignupClick }: LandingPageProps) {
  return (
    <div className="landing-page">
      {/* Animated background */}
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

      {/* Main content */}
      <div className="landing-content">
        <div className="landing-hero">
          <div className="hero-badge">For Kids Ages 7-18</div>
          <h1 className="hero-title">
            <span className="title-icon">🚀</span>
            <span className="title-text">Vibe Code Kidz</span>
          </h1>
          <p className="hero-subtitle">
            Create awesome games just by describing them!
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

        {/* Template Showcase */}
        <div className="template-showcase">
          <h2 className="showcase-title">Pick a Game to Start Building</h2>
          <p className="showcase-subtitle">Choose a style and our AI builds it in seconds</p>
          <div className="template-grid">
            {GAME_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.genre}
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

        {/* Preview section */}
        <div className="landing-preview">
          <div className="preview-window">
            <div className="preview-header">
              <div className="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="preview-title">my-awesome-game.kidvibe.code</span>
            </div>
            <div className="preview-content">
              <div className="preview-chat">
                <div className="chat-bubble user">
                  "Make me a space shooter game with aliens!"
                </div>
                <div className="chat-bubble ai">
                  "Awesome idea! I'm creating a space shooter with your ship at the bottom, aliens coming from above, and laser blasts!"
                </div>
              </div>
              <div className="preview-game">
                <div className="game-placeholder">
                  <span className="game-icon">🚀</span>
                  <span className="game-text">Your Game Here!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <a href="/gallery" className="footer-link">
          <span>🕹️</span> Browse the Arcade
        </a>
      </div>
    </div>
  )
}
