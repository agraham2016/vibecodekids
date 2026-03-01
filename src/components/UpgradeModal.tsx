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
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Upgrade your plan">
      <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">✕</button>

        {/* Header */}
        <div className="upgrade-header">
          <img src="/images/logo.png" alt="VibeCode Kids" style={{ width: '120px', height: 'auto', marginBottom: '12px', filter: 'drop-shadow(0 0 12px rgba(167,139,250,0.4))' }} />
          {isWelcomePrompt ? (
            <>
              <div className="welcome-badge">🎉 SPECIAL OFFER</div>
              <h2>Welcome to VibeCode Kids!</h2>
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
          {/* Free Trial Tier */}
          <div className={`tier-card ${currentTier === 'free' ? 'current' : ''}`}>
            {currentTier === 'free' && <span className="current-badge">Free Trial</span>}
            <div className="tier-icon">⭐</div>
            <h3 className="tier-name">Free Trial</h3>
            <div className="tier-price">
              <span className="price">$0</span>
              <span className="period">/ 30 days</span>
            </div>
            <ul className="tier-features">
              <li>✅ 3 games per month</li>
              <li>✅ 10 prompts per day</li>
              <li>✅ Share to Arcade</li>
            </ul>
            {currentTier === 'free' && (
              <button className="tier-btn disabled" disabled>
                Trial Active
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
              <span className="price">$13</span>
              <span className="period">/month</span>
            </div>
            <ul className="tier-features">
              <li>✅ 15 games per month</li>
              <li>✅ 50 prompts per day</li>
              <li>✅ Share to Arcade</li>
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
              <span className="price">$21</span>
              <span className="period">/month</span>
            </div>
            <ul className="tier-features">
              <li>✅ 40 games per month</li>
              <li>✅ 80 prompts per day</li>
              <li>✅ Share to Arcade</li>
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
