import type { GameConfig, UserProject } from '../types';
import { getStarterFamilyGuide } from '../config/gameCatalog';
import './ProjectsPanel.css';

interface ProjectsPanelProps {
  userProjects: UserProject[];
  isLoadingProjects: boolean;
  currentProjectId: string;
  projectName: string;
  currentProjectGameConfig?: GameConfig | null;
  onLoadProject: (projectId: string) => void;
  onNewProject: () => void;
  onSave: () => void;
  onShare: () => void;
  onOpenVersionHistory: () => void;
  onStartOver: () => void;
  onDeleteProject: (projectId: string) => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isLoggedIn: boolean;
  lastAutoSavedAt: Date | null;
  username?: string;
  onOpenLearn?: () => void;
}

function formatAutoSaveTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  game: '🎮',
  animation: '🎬',
  art: '🎨',
  tool: '🔧',
  story: '📖',
  music: '🎵',
  other: '✨',
};

const ENGINE_TAGS: Record<string, { label: string; className: string }> = {
  'vibe-2d': { label: 'Vibe 2D', className: 'engine-2d' },
  'vibe-3d': { label: 'Vibe 3D', className: 'engine-3d' },
};

export default function ProjectsPanel({
  userProjects,
  isLoadingProjects,
  currentProjectId,
  projectName,
  currentProjectGameConfig,
  onLoadProject,
  onNewProject,
  onSave,
  onShare,
  onOpenVersionHistory,
  onStartOver,
  onDeleteProject,
  isSaving,
  hasUnsavedChanges,
  isLoggedIn,
  lastAutoSavedAt,
  username,
  onOpenLearn,
}: ProjectsPanelProps) {
  const currentFamilyLabel = currentProjectGameConfig?.genreFamily
    ? getStarterFamilyGuide(currentProjectGameConfig.genreFamily).label
    : null;

  return (
    <div className="projects-panel">
      {/* Panel Header */}
      <div className="pp-header">
        <span className="pp-title" title={username ? `Projects for @${username}` : undefined}>
          My Projects{username ? ` (@${username})` : ''}
        </span>
      </div>

      {/* New Project Button */}
      <button className="pp-new-btn" onClick={onNewProject} aria-label="Create new project">
        <span className="pp-new-icon" aria-hidden="true">
          ➕
        </span>
        <span>New Project</span>
      </button>

      {/* Current Project Indicator */}
      <div className="pp-current">
        <div className="pp-current-main">
          <span className="pp-current-dot">●</span>
          <span className="pp-current-name">{currentProjectId === 'new' ? 'New Project' : projectName}</span>
          {hasUnsavedChanges && (
            <span className="pp-unsaved-dot" title="Unsaved changes">
              ●
            </span>
          )}
        </div>
        {(currentProjectGameConfig?.engineId || currentFamilyLabel) && (
          <div className="pp-current-tags">
            {currentProjectGameConfig?.engineId && (
              <span className={`pp-item-engine-tag ${ENGINE_TAGS[currentProjectGameConfig.engineId]?.className || ''}`}>
                {ENGINE_TAGS[currentProjectGameConfig.engineId]?.label || currentProjectGameConfig.engineId}
              </span>
            )}
            {currentFamilyLabel && <span className="pp-item-family-tag">{currentFamilyLabel}</span>}
          </div>
        )}
      </div>

      {/* Auto-save status */}
      {isLoggedIn && lastAutoSavedAt && !hasUnsavedChanges && (
        <div className="pp-autosave-status" title={`Auto-saved at ${lastAutoSavedAt.toLocaleTimeString()}`}>
          <span className="pp-autosave-icon">☁️</span>
          <span className="pp-autosave-text">Auto-saved {formatAutoSaveTime(lastAutoSavedAt)}</span>
        </div>
      )}

      {/* Projects List */}
      <div className="pp-list">
        {isLoadingProjects ? (
          <div className="pp-empty">Loading...</div>
        ) : userProjects.length === 0 ? (
          <div className="pp-empty">No saved projects yet</div>
        ) : (
          userProjects.map((project) => (
            <div key={project.id} className={`pp-item-wrap ${project.id === currentProjectId ? 'active' : ''}`}>
              <button type="button" className="pp-item" onClick={() => onLoadProject(project.id)}>
                <span className="pp-item-icon">{CATEGORY_ICONS[project.category] || '✨'}</span>
                <div className="pp-item-info">
                  <span className="pp-item-title">{project.title}</span>
                  {(project.engineId || project.genreFamily) && (
                    <div className="pp-item-tags">
                      {project.engineId && (
                        <span className={`pp-item-engine-tag ${ENGINE_TAGS[project.engineId]?.className || ''}`}>
                          {ENGINE_TAGS[project.engineId]?.label || project.engineId}
                        </span>
                      )}
                      {project.genreFamily && (
                        <span className="pp-item-family-tag">{getStarterFamilyGuide(project.genreFamily).label}</span>
                      )}
                    </div>
                  )}
                  <span className="pp-item-meta">
                    {project.isPublic ? '🌐' : '🔒'} {project.views} views
                  </span>
                </div>
                {project.id === currentProjectId && <span className="pp-item-active">●</span>}
              </button>
              <button
                type="button"
                className="pp-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject(project.id);
                }}
                title="Delete this project (removes from Arcade too)"
                aria-label={`Delete project ${project.title || 'Untitled'}`}
              >
                <span aria-hidden="true">🗑️</span>
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
        {onOpenLearn && (
          <button className="pp-action-btn learn" onClick={onOpenLearn} title="Tips & Tutorial">
            <span>📖</span>
            <span>Learn</span>
          </button>
        )}
      </div>
    </div>
  );
}
