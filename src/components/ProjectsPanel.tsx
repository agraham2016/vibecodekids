import { useEffect, useRef, useState } from 'react';
import type { GameConfig, StudioAsset, StudioAssetCategory, UserProject } from '../types';
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
  assetCatalogSlot?: React.ReactNode;
  dashboardMode?: 'free' | 'premium';
  assetCatalog?: StudioAsset[];
  assetCategories?: StudioAssetCategory[];
  selectedAssets?: StudioAsset[];
  selectedAssetIds?: string[];
  onToggleAssetSelection?: (assetId: string) => void;
  onClearSelectedAssets?: () => void;
  isLoadingAssetCatalog?: boolean;
  isLoadingMoreAssets?: boolean;
  assetCatalogError?: string;
  assetSelectionLimit?: number;
  assetSearch?: string;
  onAssetSearchChange?: (value: string) => void;
  assetGenreFilter?: string;
  onAssetGenreFilterChange?: (value: string) => void;
  assetTotalCount?: number;
  assetHasMore?: boolean;
  onLoadMoreAssets?: () => void;
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
  'vibe-2d': { label: '2D', className: 'engine-2d' },
  'vibe-3d': { label: '3D (Legacy)', className: 'engine-3d' },
};

interface AssetCardProps {
  asset: StudioAsset;
  isSelected: boolean;
  isDisabled: boolean;
  onToggleAssetSelection?: (assetId: string) => void;
}

function AssetCard({ asset, isSelected, isDisabled, onToggleAssetSelection }: AssetCardProps) {
  const [previewFailed, setPreviewFailed] = useState(false);

  return (
    <button
      type="button"
      className={`pp-asset-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onToggleAssetSelection?.(asset.id)}
      disabled={isDisabled}
      title={asset.note || asset.label}
    >
      <div className="pp-asset-preview">
        {previewFailed ? (
          <div className="pp-asset-preview-fallback">{asset.label.slice(0, 2).toUpperCase()}</div>
        ) : (
          <img
            src={asset.path}
            alt={asset.label}
            className="pp-asset-preview-image"
            loading="lazy"
            onError={() => setPreviewFailed(true)}
          />
        )}
        <span className={`pp-asset-pill ${isSelected ? 'selected' : ''}`}>
          {isSelected ? 'Picked' : isDisabled ? 'Shelf full' : 'Pick this'}
        </span>
      </div>
      <div className="pp-asset-body">
        <span className="pp-asset-title">{asset.label}</span>
        <span className="pp-asset-meta">
          {asset.genreLabel} · {asset.packLabel}
        </span>
        {(asset.width || asset.height || asset.note) && (
          <span className="pp-asset-note">
            {asset.width && asset.height ? `${asset.width}x${asset.height}` : 'Sprite'}
            {asset.note ? ` · ${asset.note}` : ''}
          </span>
        )}
      </div>
    </button>
  );
}

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
  assetCatalogSlot,
  dashboardMode = 'free',
  assetCatalog = [],
  assetCategories = [],
  selectedAssets = [],
  selectedAssetIds = [],
  onToggleAssetSelection,
  onClearSelectedAssets,
  isLoadingAssetCatalog = false,
  isLoadingMoreAssets = false,
  assetCatalogError = '',
  assetSelectionLimit = 6,
  assetSearch = '',
  onAssetSearchChange,
  assetGenreFilter = 'all',
  onAssetGenreFilterChange,
  assetTotalCount = 0,
  assetHasMore = false,
  onLoadMoreAssets,
}: ProjectsPanelProps) {
  const currentFamilyLabel = currentProjectGameConfig?.genreFamily
    ? getStarterFamilyGuide(currentProjectGameConfig.genreFamily).label
    : null;
  const isPremiumDashboard = dashboardMode === 'premium';
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'projects' | 'assets'>(isPremiumDashboard ? 'assets' : 'projects');
  const moreActionsRef = useRef<HTMLDivElement | null>(null);
  const activeDashboardTab = dashboardTab;

  useEffect(() => {
    if (!showMoreActions) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!moreActionsRef.current?.contains(event.target as Node)) {
        setShowMoreActions(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showMoreActions]);

  return (
    <div className={`projects-panel ${isPremiumDashboard ? 'premium' : ''}`}>
      {/* Panel Header */}
      <div className="pp-header">
        <span className="pp-title" title={username ? `Projects for @${username}` : undefined}>
          {isPremiumDashboard ? 'Create Something' : `My Projects${username ? ` (@${username})` : ''}`}
        </span>
        {isPremiumDashboard && <span className="pp-subtitle">Pick art, ask AI, and create.</span>}
      </div>

      {/* New Project Button */}
      <button className="pp-new-btn" onClick={onNewProject} aria-label="Create new project">
        <span className="pp-new-icon" aria-hidden="true">
          ➕
        </span>
        <span>{isPremiumDashboard ? 'Start New' : 'New Project'}</span>
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

      {isPremiumDashboard && (
        <>
          <div className="pp-premium-banner">
            <div>
              <span className="pp-premium-badge">Picked Art</span>
              <p className="pp-premium-copy">
                Choose up to {assetSelectionLimit} pictures for the AI to use in your creation.
              </p>
            </div>
            <div className="pp-premium-count">
              {selectedAssets.length}/{assetSelectionLimit}
            </div>
          </div>

          <div className="pp-dashboard-tabs" role="tablist" aria-label="Studio dashboard sections">
            <button
              type="button"
              className={`pp-dashboard-tab ${activeDashboardTab === 'projects' ? 'active' : ''}`}
              onClick={() => setDashboardTab('projects')}
              role="tab"
              aria-selected={activeDashboardTab === 'projects'}
            >
              My Stuff
            </button>
            <button
              type="button"
              className={`pp-dashboard-tab ${activeDashboardTab === 'assets' ? 'active' : ''}`}
              onClick={() => setDashboardTab('assets')}
              role="tab"
              aria-selected={activeDashboardTab === 'assets'}
            >
              Pick Art
            </button>
          </div>
        </>
      )}

      {(!isPremiumDashboard || activeDashboardTab === 'projects') && (
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
      )}

      {isPremiumDashboard && activeDashboardTab === 'assets' && (
        <div className="pp-assets-panel">
          <div className="pp-assets-toolbar">
            <input
              type="search"
              value={assetSearch}
              onChange={(e) => onAssetSearchChange?.(e.target.value)}
              className="pp-assets-search"
              placeholder="Find art"
              aria-label="Search premium assets"
            />
            <select
              value={assetGenreFilter}
              onChange={(e) => onAssetGenreFilterChange?.(e.target.value)}
              className="pp-assets-filter"
              aria-label="Filter premium assets by category"
            >
              <option value="all">All picture types</option>
              {assetCategories.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.label}
                </option>
              ))}
            </select>
          </div>

          {selectedAssets.length > 0 && (
            <div className="pp-selected-assets">
              <div className="pp-selected-assets-header">
                <span>Your art shelf</span>
                {onClearSelectedAssets && (
                  <button type="button" className="pp-selected-assets-clear" onClick={onClearSelectedAssets}>
                    Clear
                  </button>
                )}
              </div>
              <div className="pp-selected-assets-list">
                {selectedAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="pp-selected-asset-chip"
                    onClick={() => onToggleAssetSelection?.(asset.id)}
                    title={`Remove ${asset.label}`}
                  >
                    {asset.label} ✕
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pp-assets-helper">
            {currentProjectGameConfig?.dimension === '3d'
              ? 'These flat pictures work best for 2D projects.'
              : 'Tap pictures to keep them ready for the AI.'}
          </div>

          <div className="pp-assets-results">
            {isLoadingAssetCatalog && assetCatalog.length === 0 ? (
              <div className="pp-empty">Loading pictures...</div>
            ) : assetCatalogError && assetCatalog.length === 0 ? (
              <div className="pp-empty">{assetCatalogError}</div>
            ) : assetCatalog.length === 0 ? (
              <div className="pp-empty">No pictures matched that search.</div>
            ) : (
              <>
                <div className="pp-assets-status">
                  <span>
                    {selectedAssets.length} picked · {assetTotalCount.toLocaleString()} pictures found
                  </span>
                  {assetCatalogError && <span className="pp-assets-status-error">{assetCatalogError}</span>}
                </div>
                <div className="pp-asset-grid">
                  {assetCatalog.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    const isDisabled = !isSelected && selectedAssetIds.length >= assetSelectionLimit;

                    return (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        isSelected={isSelected}
                        isDisabled={isDisabled}
                        onToggleAssetSelection={onToggleAssetSelection}
                      />
                    );
                  })}
                </div>
                {(assetHasMore || isLoadingMoreAssets) && (
                  <div className="pp-assets-footer">
                    <button
                      type="button"
                      className="pp-assets-load-more"
                      onClick={onLoadMoreAssets}
                      disabled={isLoadingMoreAssets}
                    >
                      {isLoadingMoreAssets ? 'Loading more...' : 'Show more pictures'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
        {assetCatalogSlot}
        <div className="pp-actions-menu" ref={moreActionsRef}>
          <button
            className={`pp-action-btn pp-action-btn-more ${showMoreActions ? 'open' : ''}`}
            onClick={() => setShowMoreActions((current) => !current)}
            aria-expanded={showMoreActions}
            aria-haspopup="menu"
            title="More actions"
          >
            <span>⋯</span>
            <span>More</span>
          </button>

          {showMoreActions && (
            <div className="pp-actions-dropdown" role="menu" aria-label="More project actions">
              {isLoggedIn && (
                <button
                  className="pp-action-btn pp-action-btn-menu-item"
                  onClick={() => {
                    setShowMoreActions(false);
                    onOpenVersionHistory();
                  }}
                  title="Version History"
                  role="menuitem"
                >
                  <span>📜</span>
                  <span>History</span>
                </button>
              )}
              <button
                className="pp-action-btn pp-action-btn-menu-item reset"
                onClick={() => {
                  setShowMoreActions(false);
                  onStartOver();
                }}
                title="Start Over"
                role="menuitem"
              >
                <span>🔄</span>
                <span>Reset</span>
              </button>
              <a
                href="/gallery"
                className="pp-action-btn pp-action-btn-menu-item arcade"
                title="Visit Arcade"
                role="menuitem"
                onClick={() => setShowMoreActions(false)}
              >
                <span>🕹️</span>
                <span>Arcade</span>
              </a>
              {onOpenLearn && (
                <button
                  className="pp-action-btn pp-action-btn-menu-item learn"
                  onClick={() => {
                    setShowMoreActions(false);
                    onOpenLearn();
                  }}
                  title="Tips & Tutorial"
                  role="menuitem"
                >
                  <span>📖</span>
                  <span>Learn</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
