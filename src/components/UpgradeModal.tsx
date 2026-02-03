import { TierInfo } from '../types'
import './UpgradeModal.css'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier: 'free' | 'creator' | 'pro'
  tiers: Record<string, TierInfo>
  isWelcomePrompt?: boolean  // Show special messaging for first login
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  currentTier, 
  tiers,
  isWelcomePrompt = false
}: UpgradeModalProps) {
  if (!isOpen) return null

  const handleUpgrade = async (tier: string) => {
    // TODO: Integrate with Stripe
    alert(`Payment coming soon! For now, enjoy the free tier. 🚀`)
    onClose()
  }

  const handleMaybeLater = async () => {
    // Dismiss the prompt
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await fetch('/api/membership/dismiss-prompt', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
    } catch (e) {
      // Ignore errors
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="upgrade-header">
          {isWelcomePrompt ? (
            <>
              <div className="welcome-badge">🎉 SPECIAL OFFER</div>
              <h2>Welcome to Vibe Code Studio!</h2>
              <p>Unlock your full creative potential with a membership</p>
            </>
          ) : (
            <>
              <h2>✨ Upgrade Your Experience</h2>
              <p>Create more, do more, unlock AI features</p>
            </>
          )}
        </div>

        {/* Tier Comparison */}
        <div className="tier-grid">
          {/* Free Tier */}
          <div className={`tier-card ${currentTier === 'free' ? 'current' : ''}`}>
            {currentTier === 'free' && <span className="current-badge">Current Plan</span>}
            <div className="tier-icon">⭐</div>
            <h3 className="tier-name">Free</h3>
            <div className="tier-price">
              <span className="price">$0</span>
              <span className="period">/month</span>
            </div>
            <ul className="tier-features">
              <li>✅ 3 games per month</li>
              <li>✅ 30 prompts per day</li>
              <li>✅ Share to Arcade</li>
              <li>❌ AI Cover Art</li>
              <li>❌ AI Game Sprites</li>
              <li>❌ Premium Assets</li>
            </ul>
            {currentTier === 'free' && (
              <button className="tier-btn disabled" disabled>
                Current Plan
              </button>
            )}
          </div>

          {/* Creator Tier */}
          <div className={`tier-card featured ${currentTier === 'creator' ? 'current' : ''}`}>
            {currentTier !== 'creator' && <span className="popular-badge">MOST POPULAR</span>}
            {currentTier === 'creator' && <span className="current-badge">Current Plan</span>}
            <div className="tier-icon">🚀</div>
            <h3 className="tier-name">Creator</h3>
            <div className="tier-price">
              <span className="price">$5</span>
              <span className="period">/month</span>
            </div>
            <ul className="tier-features">
              <li>✅ 25 games per month</li>
              <li>✅ 150 prompts per day</li>
              <li>✅ Share to Arcade</li>
              <li>✅ 5 AI Cover Arts</li>
              <li>❌ AI Game Sprites</li>
              <li>✅ Premium Assets</li>
            </ul>
            {currentTier === 'free' && (
              <button className="tier-btn primary" onClick={() => handleUpgrade('creator')}>
                🚀 Upgrade to Creator
              </button>
            )}
            {currentTier === 'creator' && (
              <button className="tier-btn disabled" disabled>
                Current Plan
              </button>
            )}
          </div>

          {/* Pro Tier */}
          <div className={`tier-card ${currentTier === 'pro' ? 'current' : ''}`}>
            {currentTier === 'pro' && <span className="current-badge">Current Plan</span>}
            <div className="tier-icon">👑</div>
            <h3 className="tier-name">Pro</h3>
            <div className="tier-price">
              <span className="price">$10</span>
              <span className="period">/month</span>
            </div>
            <ul className="tier-features">
              <li>✅ 50 games per month</li>
              <li>✅ 300 prompts per day</li>
              <li>✅ Share to Arcade</li>
              <li>✅ 20 AI Cover Arts</li>
              <li>✅ 10 AI Sprite Sets</li>
              <li>✅ Premium Assets</li>
            </ul>
            {currentTier !== 'pro' && (
              <button className="tier-btn secondary" onClick={() => handleUpgrade('pro')}>
                👑 Upgrade to Pro
              </button>
            )}
            {currentTier === 'pro' && (
              <button className="tier-btn disabled" disabled>
                Current Plan
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="upgrade-footer">
          {isWelcomePrompt && (
            <button className="maybe-later-btn" onClick={handleMaybeLater}>
              Maybe Later
            </button>
          )}
          <p className="footer-note">
            💳 Secure payment powered by Stripe (coming soon)
          </p>
        </div>
      </div>
    </div>
  )
}
