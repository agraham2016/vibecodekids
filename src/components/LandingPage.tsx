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
