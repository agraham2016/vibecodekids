import { useState } from 'react'
import './FloatingActions.css'

type DrawerState = 'minimized' | 'half' | 'full'

interface FloatingActionsProps {
  onShare: () => void
  onSave: () => void
  onOpenVersionHistory: () => void
  onToggleCode: () => void
  onStartOver: () => void
  showCode: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  isLoggedIn: boolean
  drawerState: DrawerState
}

export default function FloatingActions({
  onShare,
  onSave,
  onOpenVersionHistory,
  onToggleCode,
  onStartOver,
  showCode,
  isSaving,
  hasUnsavedChanges,
  isLoggedIn,
  drawerState
}: FloatingActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Calculate bottom offset based on drawer state
  const getBottomOffset = () => {
    switch (drawerState) {
      case 'minimized': return 120
      case 'half': return 400
      case 'full': return 'calc(85vh + 20px)'
      default: return 400
    }
  }
  
  return (
    <div 
      className={`floating-actions ${isExpanded ? 'expanded' : ''}`}
      style={{ bottom: getBottomOffset() }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Secondary Actions (hidden when collapsed) */}
      <div className="fab-secondary">
        {/* Start Over */}
        <button 
          className="fab fab-sm"
          onClick={onStartOver}
          title="Start Over"
        >
          <span className="fab-icon">🔄</span>
          <span className="fab-label">Reset</span>
        </button>
        
        {/* Arcade Gallery */}
        <a 
          href="/gallery"
          className="fab fab-sm"
          title="Visit Arcade"
        >
          <span className="fab-icon">🕹️</span>
          <span className="fab-label">Arcade</span>
        </a>
        
        {/* Toggle Code */}
        <button 
          className={`fab fab-sm ${showCode ? 'active' : ''}`}
          onClick={onToggleCode}
          title={showCode ? 'Hide Code' : 'Show Code'}
        >
          <span className="fab-icon">👨‍💻</span>
          <span className="fab-label">Code</span>
        </button>
        
        {/* Version History (only if logged in) */}
        {isLoggedIn && (
          <button 
            className="fab fab-sm"
            onClick={onOpenVersionHistory}
            title="Version History"
          >
            <span className="fab-icon">📜</span>
            <span className="fab-label">History</span>
          </button>
        )}
        
        {/* Save (only if logged in) */}
        {isLoggedIn && (
          <button 
            className={`fab fab-sm ${hasUnsavedChanges ? 'highlight' : ''}`}
            onClick={onSave}
            disabled={isSaving}
            title={hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          >
            <span className="fab-icon">{isSaving ? '⏳' : hasUnsavedChanges ? '💾' : '✅'}</span>
            <span className="fab-label">{isSaving ? 'Saving' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
          </button>
        )}
      </div>
      
      {/* Primary FAB - Share */}
      <button 
        className="fab fab-primary"
        onClick={onShare}
        title="Share to Arcade!"
      >
        <span className="fab-icon">🎉</span>
        <span className="fab-label">Share</span>
      </button>
      
      {/* Expand Indicator */}
      <div className="fab-expand-hint">
        <span>{isExpanded ? '▼' : '▲'}</span>
      </div>
    </div>
  )
}
