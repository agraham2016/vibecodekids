import './Header.css'
import { MembershipUsage } from '../types'

interface User {
  id: string
  username: string
  displayName: string
  status: string
  membershipTier?: 'free' | 'creator' | 'pro'
}

interface HeaderProps {
  projectName: string
  onStartOver: () => void
  onShare: () => void
  showCode: boolean
  onToggleCode: () => void
  user: User | null
  membership: MembershipUsage | null
  onLoginClick: () => void
  onLogout: () => void
  onUpgradeClick: () => void
}

// Tier badge colors and icons
const TIER_STYLES = {
  free: { icon: '⭐', color: '#94a3b8', label: 'Free' },
  creator: { icon: '🚀', color: '#8b5cf6', label: 'Creator' },
  pro: { icon: '👑', color: '#fbbf24', label: 'Pro' }
}

export default function Header({ 
  projectName: _projectName, // Reserved for future use
  onStartOver, 
  onShare, 
  showCode, 
  onToggleCode,
  user,
  membership,
  onLoginClick,
  onLogout,
  onUpgradeClick
}: HeaderProps) {
  void _projectName // Suppress unused variable warning
  const tier = user?.membershipTier || 'free'
  const tierStyle = TIER_STYLES[tier]
  
  return (
    <header className="header">
      <div className="header-left">
        <a href="/gallery" className="logo">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">Vibe Code Studio</span>
        </a>
      </div>
      
      <div className="header-center">
        <a href="/gallery" className="btn-nav-sm" title="Arcade">
          🕹️
        </a>
        <a href="/admin" className="btn-nav-sm" title="Admin">
          ⚙️
        </a>
        <button 
          className={`btn-nav-sm ${showCode ? 'active' : ''}`}
          onClick={onToggleCode}
          title={showCode ? 'Hide Code' : 'Show Code'}
        >
          👨‍💻
        </button>
        <button className="btn-nav-sm" onClick={onStartOver} title="Start Over">
          🔄
        </button>
      </div>
      
      <div className="header-right">
        <button className="btn-primary" onClick={onShare}>
          <span>🎉</span> Share
        </button>
        
        {user ? (
          <div className="user-section">
            {/* Membership Badge */}
            <div className="membership-badge" style={{ borderColor: tierStyle.color }}>
              <span className="tier-icon">{tierStyle.icon}</span>
              <span className="tier-name" style={{ color: tierStyle.color }}>{tierStyle.label}</span>
              {membership && tier === 'free' && (
                <span className="usage-indicator">
                  {membership.gamesRemaining}/{membership.gamesLimit}
                </span>
              )}
            </div>
            
            {/* Upgrade Button for Free Users */}
            {tier === 'free' && (
              <button className="btn-upgrade" onClick={onUpgradeClick}>
                <span>✨</span> Upgrade
              </button>
            )}
            
            <div className="user-menu">
              <span className="user-avatar">👤</span>
              <span className="user-name">{user.displayName}</span>
              <button className="btn-logout" onClick={onLogout}>
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-login" onClick={onLoginClick}>
            <span>🔑</span> Log In
          </button>
        )}
      </div>
    </header>
  )
}
