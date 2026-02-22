import { useState } from 'react'
import { TierInfo } from '../types'
import './UpgradeModal.css'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier: 'free' | 'creator' | 'pro'
  tiers: Record<string, TierInfo>
  isWelcomePrompt?: boolean
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  currentTier, 
  tiers: _tiers,
  isWelcomePrompt = false
}: UpgradeModalProps) {
  void _tiers
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleUpgrade = async (selectedTier: string) => {
    setLoading(selectedTier)
    setError('')
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setError('Please log in first')
        setLoading(null)
        return
      }
      const response = await fetch('/api/stripe/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tier: selectedTier })
      })

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        throw new Error('Server error — please try again later')
      }
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not start checkout')
      }

      window.location.href = data.checkoutUrl
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setLoading(null)
    }
  }

  const handleMaybeLater = async () => {
    // Dismiss the prompt
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await fetch('/api/stripe/dismiss-prompt', {
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
              <span className="price">$7</span>
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
              <button className="tier-btn primary" onClick={() => handleUpgrade('creator')} disabled={loading !== null}>
                {loading === 'creator' ? 'Redirecting...' : '🚀 Upgrade to Creator'}
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
              <span className="price">$14</span>
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
              <button className="tier-btn secondary" onClick={() => handleUpgrade('pro')} disabled={loading !== null}>
                {loading === 'pro' ? 'Redirecting...' : '👑 Upgrade to Pro'}
              </button>
            )}
            {currentTier === 'pro' && (
              <button className="tier-btn disabled" disabled>
                Current Plan
              </button>
            )}
          </div>
        </div>

        {error && <p className="upgrade-error">{error}</p>}

        {/* Footer */}
        <div className="upgrade-footer">
          {isWelcomePrompt && (
            <button className="maybe-later-btn" onClick={handleMaybeLater}>
              Maybe Later
            </button>
          )}
          <p className="footer-note">
            💳 Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
