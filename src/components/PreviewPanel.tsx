import { useRef, useEffect, useState } from 'react'
import './PreviewPanel.css'

interface PreviewPanelProps {
  code: string
}

export default function PreviewPanel({ code }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [key, setKey] = useState(0) // Force iframe refresh

  // Update main preview iframe
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (doc) {
        doc.open()
        doc.write(code)
        doc.close()
      }
    }
  }, [code, key])

  // Update fullscreen iframe when opened
  useEffect(() => {
    if (isFullscreen && fullscreenIframeRef.current) {
      const iframe = fullscreenIframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (doc) {
        doc.open()
        doc.write(code)
        doc.close()
      }
    }
  }, [isFullscreen, code])

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const handleRefresh = () => {
    setKey(prev => prev + 1)
  }

  const handlePlay = () => {
    setIsFullscreen(true)
  }

  const handleExitPlay = () => {
    setIsFullscreen(false)
  }

  return (
    <>
      <div className="panel preview-panel">
        <div className="panel-header preview-header">
          <button 
            className="play-header-btn"
            onClick={handlePlay}
          >
            <span className="play-icon">🎮</span>
            <span className="play-text">Play My Creation!</span>
          </button>
          <button 
            className="preview-control-btn"
            onClick={handleRefresh}
            title="Refresh Preview"
          >
            🔄
          </button>
        </div>
        
        <div className="panel-content preview-content">
          <div className="browser-mockup">
            <div className="browser-bar">
              <div className="browser-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="browser-url">
                <span className="url-icon">🔒</span>
                <span className="url-text">my-awesome-project.kidvibe.code</span>
              </div>
            </div>
            
            <div className="preview-iframe-container">
              <iframe
                key={key}
                ref={iframeRef}
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
                className="preview-iframe"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Play Mode Overlay */}
      {isFullscreen && (
        <div className="play-mode-overlay">
          <div className="play-mode-header">
            <div className="play-mode-title">
              <span className="play-icon">🎮</span>
              Now Playing Your Creation!
            </div>
            <button 
              className="exit-play-btn"
              onClick={handleExitPlay}
            >
              ✕ Back to Building
            </button>
          </div>
          <div className="play-mode-content">
            <iframe
              ref={fullscreenIframeRef}
              title="Fullscreen Preview"
              sandbox="allow-scripts allow-same-origin"
              className="play-mode-iframe"
            />
          </div>
          <div className="play-mode-footer">
            <span>Press the button above or hit Escape to go back</span>
          </div>
        </div>
      )}
    </>
  )
}
