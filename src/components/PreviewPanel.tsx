import { useRef, useEffect, useState, useCallback } from 'react';
import { enhanceSandboxedPreviewHtml } from '../utils/previewHtml';
import './PreviewPanel.css';

interface PreviewPanelProps {
  code: string;
}

export default function PreviewPanel({ code }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);

  const enhancedCode = enhanceSandboxedPreviewHtml(code);

  const focusIframe = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    iframe.setAttribute('tabindex', '0');
    window.setTimeout(() => {
      try {
        iframe.focus();
      } catch {
        // Ignore focus errors from sandboxed iframe timing.
      }
    }, 100);
  }, []);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const handlePlay = () => {
    setIsFullscreen(true);
  };

  const handleExitPlay = () => {
    setIsFullscreen(false);
  };

  return (
    <>
      <div className="panel preview-panel">
        <div className="panel-header preview-header">
          <button className="play-header-btn" onClick={handlePlay}>
            <span className="play-text">Play My Creation!</span>
          </button>
          <button className="preview-control-btn" onClick={handleRefresh} title="Refresh Preview">
            🔄
          </button>
        </div>

        <div className="preview-iframe-wrapper">
          <iframe
            key={key}
            ref={iframeRef}
            srcDoc={enhancedCode}
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            className="preview-iframe"
            onLoad={() => focusIframe(iframeRef.current)}
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
            <button className="exit-play-btn" onClick={handleExitPlay}>
              ✕ Back to Building
            </button>
          </div>
          <div className="play-mode-content">
            <iframe
              ref={fullscreenIframeRef}
              srcDoc={enhancedCode}
              title="Fullscreen Preview"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock"
              className="play-mode-iframe"
              onLoad={() => focusIframe(fullscreenIframeRef.current)}
            />
          </div>
          <div className="play-mode-footer">
            <span>Press the button above or hit Escape to go back</span>
          </div>
        </div>
      )}
    </>
  );
}
