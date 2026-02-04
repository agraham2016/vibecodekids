import { useState, useEffect } from 'react'
import './VersionHistoryModal.css'

interface Version {
  versionId: string
  title: string
  savedAt: string
  versionNumber: number
  isCurrent?: boolean
}

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  authToken: string | null
  onRestoreVersion: (code: string) => void
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  projectId,
  authToken,
  onRestoreVersion
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Fetch versions when modal opens
  useEffect(() => {
    if (isOpen && projectId && projectId !== 'new' && authToken) {
      fetchVersions()
    }
  }, [isOpen, projectId, authToken])

  const fetchVersions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load versions')
      }
      
      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load version history')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVersionClick = async (versionId: string) => {
    if (selectedVersion === versionId) {
      setSelectedVersion(null)
      setPreviewCode(null)
      return
    }
    
    setSelectedVersion(versionId)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreviewCode(data.code)
      }
    } catch {
      // Silently fail preview
    }
  }

  const handleRestore = async () => {
    if (!selectedVersion || !previewCode) return
    
    const version = versions.find(v => v.versionId === selectedVersion)
    if (version?.isCurrent) {
      onClose()
      return
    }
    
    setIsRestoring(true)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/versions/${selectedVersion}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        onRestoreVersion(data.code || previewCode)
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to restore version')
      }
    } catch {
      setError('Could not restore version')
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000))
      return mins <= 1 ? 'Just now' : `${mins} minutes ago`
    }
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    }
    
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days} day${days === 1 ? '' : 's'} ago`
    }
    
    // Otherwise show date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  if (!isOpen) return null

  // Show message if project hasn't been saved yet
  if (projectId === 'new') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="version-modal" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>✕</button>
          
          <div className="version-header">
            <span className="version-icon">📜</span>
            <h2>Version History</h2>
          </div>
          
          <div className="version-empty">
            <span className="empty-icon">💾</span>
            <p>Save your project first to start tracking versions!</p>
            <p className="empty-hint">Click the Save button to create your first version.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="version-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <div className="version-header">
          <span className="version-icon">📜</span>
          <h2>Version History</h2>
        </div>

        {error && (
          <div className="version-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="version-content">
          {isLoading ? (
            <div className="version-loading">
              <div className="loading-spinner"></div>
              <p>Loading versions...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="version-empty">
              <span className="empty-icon">📝</span>
              <p>No versions saved yet</p>
              <p className="empty-hint">Versions are automatically created when you save changes.</p>
            </div>
          ) : (
            <div className="version-list">
              {versions.map(version => (
                <button
                  key={version.versionId}
                  className={`version-item ${selectedVersion === version.versionId ? 'selected' : ''} ${version.isCurrent ? 'current' : ''}`}
                  onClick={() => handleVersionClick(version.versionId)}
                >
                  <div className="version-item-icon">
                    {version.isCurrent ? '🟢' : '📄'}
                  </div>
                  <div className="version-item-content">
                    <span className="version-item-title">
                      {version.isCurrent ? 'Current Version' : `Version ${version.versionNumber}`}
                    </span>
                    <span className="version-item-date">
                      {formatDate(version.savedAt)}
                    </span>
                  </div>
                  {version.isCurrent && (
                    <span className="version-badge">Current</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedVersion && previewCode && (
            <div className="version-preview">
              <div className="preview-header">
                <span>👀 Preview</span>
              </div>
              <div className="preview-iframe-container">
                <iframe
                  srcDoc={previewCode}
                  title="Version Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          )}
        </div>

        {selectedVersion && (
          <div className="version-footer">
            {versions.find(v => v.versionId === selectedVersion)?.isCurrent ? (
              <button className="btn-close-modal" onClick={onClose}>
                Close
              </button>
            ) : (
              <button 
                className="btn-restore"
                onClick={handleRestore}
                disabled={isRestoring}
              >
                {isRestoring ? '⏳ Restoring...' : '⏪ Restore This Version'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
