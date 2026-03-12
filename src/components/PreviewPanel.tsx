import { useRef, useEffect, useState } from 'react';
import { injectNonceIntoCode } from '../utils/cspNonce';
import './PreviewPanel.css';

interface PreviewPanelProps {
  code: string;
}

// Inject Three.js and other 3D libraries into the preview
function injectLibraries(code: string): string {
  const hasFullStructure = code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<html');
  const codeLower = code.toLowerCase();

  const previewScrollStyle = `
    <style id="vibe-preview-scroll">
      html, body { overflow-y: auto !important; overflow-x: hidden; min-height: 100%; }
    </style>
  `;

  // Only inject Three.js if the code doesn't already include it (prevents duplicate instance warnings)
  const alreadyHasThree =
    codeLower.includes('three.min.js') ||
    codeLower.includes('three.js') ||
    codeLower.includes('three@') ||
    codeLower.includes('cdn.jsdelivr.net/npm/three') ||
    codeLower.includes('cdnjs.cloudflare.com/ajax/libs/three');

  const libraryScripts = alreadyHasThree
    ? ''
    : `
    <!-- 3D Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script>
      window.THREE = THREE;
      delete window.createImageBitmap;
      (function(){
        if (!window.THREE || !window.THREE.ImageLoader) return;
        var orig = window.THREE.ImageLoader.prototype.load;
        window.THREE.ImageLoader.prototype.load = function(url, onLoad, onProgress, onError) {
          if (typeof url === 'string' && url.indexOf('blob:') === 0) {
            fetch(url).then(function(r){ return r.blob(); }).then(function(blob) {
              return new Promise(function(res, rej) {
                var r = new FileReader();
                r.onload = function() { res(r.result); };
                r.onerror = function() { rej(r.error); };
                r.readAsDataURL(blob);
              });
            }).then(function(dataUrl) {
              orig.call(this, dataUrl, onLoad, onProgress, onError);
            }.bind(this)).catch(function(e) {
              if (onError) onError(e);
            });
          } else {
            orig.call(this, url, onLoad, onProgress, onError);
          }
        };
      })();
    </script>
  `;
  const headInject = previewScrollStyle + libraryScripts;

  if (hasFullStructure) {
    // Inject right AFTER <head> so Three.js loads before any AI-generated scripts
    const headOpenMatch = code.match(/<head[^>]*>/i);
    if (headOpenMatch) {
      const idx = code.indexOf(headOpenMatch[0]) + headOpenMatch[0].length;
      return code.slice(0, idx) + `\n${headInject}\n` + code.slice(idx);
    } else if (code.includes('<body')) {
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);

  // Inject libraries into the code (used as srcdoc for sandboxing)
  // Apply CSP nonce so parent's nonce-based CSP allows inline script/style in iframe
  const enhancedCode = injectNonceIntoCode(injectLibraries(code));

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
            <button className="exit-play-btn" onClick={handleExitPlay}>
              ✕ Back to Building
            </button>
          </div>
          <div className="play-mode-content">
            <iframe
              ref={fullscreenIframeRef}
              srcDoc={enhancedCode}
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
  );
}
