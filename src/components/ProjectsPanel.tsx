import { UserProject } from '../types'
import './ProjectsPanel.css'

interface ProjectsPanelProps {
  userProjects: UserProject[]
  isLoadingProjects: boolean
  currentProjectId: string
  projectName: string
  onLoadProject: (projectId: string) => void
  onNewProject: () => void
  onSave: () => void
  onShare: () => void
  onOpenVersionHistory: () => void
  onStartOver: () => void
  onDeleteProject: (projectId: string) => void
  isSaving: boolean
  hasUnsavedChanges: boolean
  isLoggedIn: boolean
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

export default function ProjectsPanel({
  userProjects,
  isLoadingProjects,
  currentProjectId,
  projectName,
  onLoadProject,
  onNewProject,
  onSave,
  onShare,
  onOpenVersionHistory,
  onStartOver,
  onDeleteProject,
  isSaving,
  hasUnsavedChanges,
  isLoggedIn
}: ProjectsPanelProps) {
  return (
    <div className="projects-panel">
      {/* Panel Header */}
      <div className="pp-header">
        <span className="pp-title">📁 My Projects</span>
      </div>

      {/* New Project Button */}
      <button className="pp-new-btn" onClick={onNewProject}>
        <span className="pp-new-icon">➕</span>
        <span>New Project</span>
      </button>

      {/* Current Project Indicator */}
      <div className="pp-current">
        <span className="pp-current-dot">●</span>
        <span className="pp-current-name">
          {currentProjectId === 'new' ? 'New Project' : projectName}
        </span>
        {hasUnsavedChanges && <span className="pp-unsaved-dot" title="Unsaved changes">●</span>}
      </div>

      {/* Projects List */}
      <div className="pp-list">
        {isLoadingProjects ? (
          <div className="pp-empty">Loading...</div>
        ) : userProjects.length === 0 ? (
          <div className="pp-empty">No saved projects yet</div>
        ) : (
          userProjects.map(project => (
            <div
              key={project.id}
              className={`pp-item-wrap ${project.id === currentProjectId ? 'active' : ''}`}
            >
              <button
                type="button"
                className="pp-item"
                onClick={() => onLoadProject(project.id)}
              >
                <span className="pp-item-icon">
                  {CATEGORY_ICONS[project.category] || '✨'}
                </span>
                <div className="pp-item-info">
                  <span className="pp-item-title">{project.title}</span>
                  <span className="pp-item-meta">
                    {project.isPublic ? '🌐' : '🔒'} {project.views} views
                  </span>
                </div>
                {project.id === currentProjectId && (
                  <span className="pp-item-active">●</span>
                )}
              </button>
              <button
                type="button"
                className="pp-item-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteProject(project.id)
                }}
                title="Delete this project (removes from Arcade too)"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="pp-actions">
        {isLoggedIn && (
          <button
            className={`pp-action-btn save ${hasUnsavedChanges ? 'highlight' : ''}`}
            onClick={onSave}
            disabled={isSaving}
            title={hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          >
            <span>{isSaving ? '⏳' : hasUnsavedChanges ? '💾' : '✅'}</span>
            <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
          </button>
        )}
        <button className="pp-action-btn share" onClick={onShare} title="Share to Arcade!">
          <span>🎉</span>
          <span>Share</span>
        </button>
        {isLoggedIn && (
          <button className="pp-action-btn" onClick={onOpenVersionHistory} title="Version History">
            <span>📜</span>
            <span>History</span>
          </button>
        )}
        <button className="pp-action-btn reset" onClick={onStartOver} title="Start Over">
          <span>🔄</span>
          <span>Reset</span>
        </button>
        <a href="/gallery" className="pp-action-btn arcade" title="Visit Arcade">
          <span>🕹️</span>
          <span>Arcade</span>
        </a>
      </div>
    </div>
  )
}
