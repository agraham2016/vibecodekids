import './TipsModal.css'

interface TipsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TipsModal({ isOpen, onClose }: TipsModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="tips-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <div className="tips-header">
          <span className="tips-icon">💡</span>
          <h2>Tips for Creating Awesome Things!</h2>
        </div>

        <div className="tips-content">
          <section className="tips-section">
            <h3>🎯 Best Practices</h3>
            <ul>
              <li>
                <strong>Ask for one thing at a time</strong> - Instead of "make a car game with selection and better graphics", try "make a racing game" first, then ask for changes one by one
              </li>
              <li>
                <strong>Be specific</strong> - Say "make the car blue" instead of "make it look better"
              </li>
              <li>
                <strong>Describe what you see</strong> - If something looks wrong, tell the AI what you're seeing so it can fix it
              </li>
              <li>
                <strong>Start fresh if needed</strong> - If things get messy, click the Start Over button and try again!
              </li>
            </ul>
          </section>

          <section className="tips-section">
            <h3>✨ What You Can Create</h3>
            <div className="create-grid">
              <div className="create-item">
                <span>🎮</span>
                <span>Games</span>
              </div>
              <div className="create-item">
                <span>🎨</span>
                <span>Art</span>
              </div>
              <div className="create-item">
                <span>🎬</span>
                <span>Animations</span>
              </div>
              <div className="create-item">
                <span>📖</span>
                <span>Stories</span>
              </div>
              <div className="create-item">
                <span>🔧</span>
                <span>Tools</span>
              </div>
              <div className="create-item">
                <span>🧮</span>
                <span>Calculators</span>
              </div>
            </div>
          </section>

          <section className="tips-section rules-section">
            <h3>🚫 Community Rules</h3>
            <p className="rules-intro">To keep Vibe Code Studio fun and safe for everyone, some things are not allowed:</p>
            <ul className="rules-list">
              <li>
                <span className="rule-icon">⚔️</span>
                <span>Violence or weapons</span>
              </li>
              <li>
                <span className="rule-icon">👻</span>
                <span>Scary or horror content</span>
              </li>
              <li>
                <span className="rule-icon">🤬</span>
                <span>Bad words or mean content</span>
              </li>
              <li>
                <span className="rule-icon">🔞</span>
                <span>Adult content</span>
              </li>
              <li>
                <span className="rule-icon">🍺</span>
                <span>Drugs or alcohol</span>
              </li>
              <li>
                <span className="rule-icon">🎰</span>
                <span>Gambling</span>
              </li>
            </ul>
            <p className="rules-note">If you try to create something that breaks these rules, the AI helper will politely ask you to try something else!</p>
          </section>
        </div>

        <div className="tips-footer">
          <button className="btn-got-it" onClick={onClose}>
            Got it! Let's create! 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
