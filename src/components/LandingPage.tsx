import './LandingPage.css'

interface LandingPageProps {
  onLoginClick: () => void
  onSignupClick: () => void
}

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
