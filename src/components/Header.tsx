import './Header.css';
import type { User, MembershipUsage } from '../types';

interface HeaderProps {
  user: User | null;
  membership: MembershipUsage | null;
  onLogout: () => void;
  onUpgradeClick: () => void;
  onDrawerToggle?: () => void;
}

export default function Header({
  user,
  membership: _membership,
  onLogout,
  onUpgradeClick,
  onDrawerToggle,
}: HeaderProps) {
  void _membership;
  const tier = user?.membershipTier || 'free';

  return (
    <header className="header">
      {/* Left: Logo + drawer toggle */}
      <div className="header-left">
        {onDrawerToggle && (
          <button className="drawer-toggle-btn" onClick={onDrawerToggle} aria-label="Toggle projects">
            <span>☰</span>
          </button>
        )}
        <a href="/gallery" className="logo">
          <img src="/images/logo.png?v=3" alt="VibeCode Kidz" className="logo-img" />
        </a>
      </div>

      {/* Right: User Badge & Actions */}
      <div className="header-right">
        <a href="/parent-portal" className="header-parent-link">
          For Parents
        </a>
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
              <span className="user-name" title={`Logged in as @${user.username}`}>
                {user.displayName}
              </span>
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
  );
}
