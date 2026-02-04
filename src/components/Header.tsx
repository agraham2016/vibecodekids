import { useState, useRef, useEffect } from 'react'
import './Header.css'
import { MembershipUsage, UserProject } from '../types'

interface User {
  id: string
  username: string
  displayName: string
  status: string
  membershipTier?: 'free' | 'creator' | 'pro'
}

interface HeaderProps {
  projectName: string
  currentProjectId: string
  user: User | null
  membership: MembershipUsage | null
  onLogout: () => void
  onUpgradeClick: () => void
  userProjects: UserProject[]
  isLoadingProjects: boolean
  onLoadProject: (projectId: string) => void
  onNewProject: () => void
}

// Tier badge colors and icons
const TIER_STYLES = {
  free: { icon: '⭐', color: '#94a3b8', label: 'Free' },
  creator: { icon: '🚀', color: '#8b5cf6', label: 'Creator' },
  pro: { icon: '👑', color: '#fbbf24', label: 'Pro' }
}

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  game: '🎮',
  animation: '🎬',
  art: '🎨',
  tool: '🔧',
  story: '📖',
  music: '🎵',
  other: '✨'
}

export default function Header({ 
  projectName,
  currentProjectId,
  user,
  membership,
  onLogout,
  onUpgradeClick,
  userProjects,
  isLoadingProjects,
  onLoadProject,
  onNewProject
}: HeaderProps) {
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const tier = user?.membershipTier || 'free'
  const tierStyle = TIER_STYLES[tier]
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProjectsDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleProjectClick = (projectId: string) => {
    onLoadProject(projectId)
    setShowProjectsDropdown(false)
  }
  
  const handleNewProjectClick = () => {
    onNewProject()
    setShowProjectsDropdown(false)
  }
  
  return (
    <header className="header">
      {/* Left: Logo */}
      <div className="header-left">
        <a href="/gallery" className="logo">
          <span className="logo-icon">🕹️</span>
          <span className="logo-text">Vibe Code</span>
        </a>
      </div>
      
      {/* Center: Project Selector */}
      <div className="header-center">
        {user && (
          <div className="projects-dropdown-container" ref={dropdownRef}>
            <button 
              className="btn-projects"
              onClick={() => setShowProjectsDropdown(!showProjectsDropdown)}
            >
              <span className="project-icon">📁</span>
              <span className="project-name">{currentProjectId === 'new' ? 'New Project' : projectName}</span>
              <span className="dropdown-arrow">{showProjectsDropdown ? '▲' : '▼'}</span>
            </button>
            
            {showProjectsDropdown && (
              <div className="projects-dropdown">
                <div className="dropdown-header">My Projects</div>
                
                <button 
                  className="dropdown-item new-project"
                  onClick={handleNewProjectClick}
                >
                  <span className="item-icon">➕</span>
                  <span className="item-title">New Project</span>
                </button>
                
                <div className="dropdown-divider"></div>
                
                {isLoadingProjects ? (
                  <div className="dropdown-loading">Loading...</div>
                ) : userProjects.length === 0 ? (
                  <div className="dropdown-empty">No saved projects yet</div>
                ) : (
                  <div className="dropdown-list">
                    {userProjects.map(project => (
                      <button
                        key={project.id}
                        className={`dropdown-item ${project.id === currentProjectId ? 'active' : ''}`}
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <span className="item-icon">
                          {CATEGORY_ICONS[project.category] || '✨'}
                        </span>
                        <div className="item-content">
                          <span className="item-title">{project.title}</span>
                          <span className="item-meta">
                            {project.isPublic ? '🌐' : '🔒'} 
                            {' '}
                            {project.views} views
                          </span>
                        </div>
                        {project.id === currentProjectId && (
                          <span className="item-current">●</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Right: User Badge & Actions */}
      <div className="header-right">
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
          <div className="guest-badge">Guest Mode</div>
        )}
      </div>
    </header>
  )
}
