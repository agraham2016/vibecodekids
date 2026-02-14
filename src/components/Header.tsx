import './Header.css'
import type { User, MembershipUsage } from '../types'

interface HeaderProps {
  user: User | null
  membership: MembershipUsage | null
  onLogout: () => void
  onUpgradeClick: () => void
}

export default function Header({ 
  user,
  membership: _membership,
  onLogout,
  onUpgradeClick,
}: HeaderProps) {
  void _membership
  const tier = user?.membershipTier || 'free'
  
  return (
    <header className="header">
      {/* Left: Logo */}
      <div className="header-left">
        <a href="/gallery" className="logo">
          <span className="logo-icon">🕹️</span>
          <span className="logo-text">Vibe Code Kidz</span>
        </a>
      </div>
      
      {/* Right: User Badge & Actions */}
      <div className="header-right">
        {user ? (
          <div className="user-section">
            {/* Upgrade Button for Free Users */}
            {tier === 'free' && (
              <button className="btn-upgrade" onClick={onUpgradeClick}>
                ✨ Upgrade
              </button>
            )}
            
            {/* User Avatar & Logout */}
            <div className="user-menu">
              <span className="user-avatar">👤</span>
              <span className="user-name">{user.displayName}</span>
              <button className="btn-logout" onClick={onLogout}>
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <div className="guest-badge">Guest</div>
        )}
      </div>
    </header>
  )
}
