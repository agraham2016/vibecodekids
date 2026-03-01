import { useRef, useEffect, useState } from 'react'
import './PreviewPanel.css'

interface PreviewPanelProps {
  code: string
}

// Inject Three.js and other 3D libraries into the preview
function injectLibraries(code: string): string {
  // Check if code already has doctype/html structure
  const hasFullStructure = code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<html');
  
  // Preview scrollbar: so the full game is visible when the iframe is shorter than the game
  const previewScrollStyle = `
    <style id="vibe-preview-scroll">
      html, body { overflow-y: auto !important; overflow-x: hidden; min-height: 100%; }
    </style>
  `;
  // Libraries to inject
  const libraryScripts = `
    <!-- 3D Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
      // Make Three.js globally available
      window.THREE = THREE;
    </script>
  `;
  const headInject = previewScrollStyle + libraryScripts;

  if (hasFullStructure) {
    // Inject into the <head> if it exists
    if (code.includes('</head>')) {
      return code.replace('</head>', `${headInject}</head>`);
    } else if (code.includes('<body')) {
      // Insert before body if no head
      return code.replace(/<body/i, `${previewScrollStyle}<body`);
    }
  }
  
  // If no structure, wrap the code
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${previewScrollStyle}
  ${libraryScripts}
</head>
<body>
${code}
</body>
</html>`;
}

export default function PreviewPanel({ code }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [key, setKey] = useState(0) // Force iframe refresh

  // Inject libraries into the code
  const enhancedCode = injectLibraries(code)

  // Update main preview iframe
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (doc) {
        doc.open()
        doc.write(enhancedCode)
        doc.close()
      }
    }
  }, [enhancedCode, key])

  // Update fullscreen iframe when opened
  useEffect(() => {
    if (isFullscreen && fullscreenIframeRef.current) {
      const iframe = fullscreenIframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (doc) {
        doc.open()
        doc.write(enhancedCode)
        doc.close()
      }
    }
  }, [isFullscreen, enhancedCode])

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
        
        <div className="preview-iframe-wrapper">
          <iframe
            key={key}
            ref={iframeRef}
            title="Preview"
            sandbox="allow-scripts allow-pointer-lock"
            className="preview-iframe"
          />
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
              sandbox="allow-scripts allow-pointer-lock"
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
