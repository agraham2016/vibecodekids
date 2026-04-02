import { injectNonceIntoCode } from './cspNonce';

const PREVIEW_SCROLL_STYLE = `
  <style id="vibe-preview-scroll">
    html, body { overflow-y: auto !important; overflow-x: hidden; min-height: 100%; }
  </style>
`;

const MOBILE_PREVIEW_CONTROLS_STYLE = `
  <style id="vibe-preview-mobile-controls">
    body.vibe-mobile-controls-enabled {
      overscroll-behavior: none;
      touch-action: none;
    }

    .vibe-mobile-controls {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      pointer-events: none;
      display: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .vibe-mobile-controls.vibe-mobile-controls-visible {
      display: block;
    }

    .vibe-mobile-dpad {
      position: absolute;
      left: max(16px, calc(env(safe-area-inset-left) + 12px));
      bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
      width: 168px;
      height: 168px;
    }

    .vibe-mobile-action-stack {
      position: absolute;
      right: max(16px, calc(env(safe-area-inset-right) + 12px));
      bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }

    .vibe-mobile-control-btn {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 18px;
      background: rgba(17, 24, 39, 0.42);
      color: #fff;
      font: 800 22px/1 system-ui, sans-serif;
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.24);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      pointer-events: auto;
      touch-action: none;
    }

    .vibe-mobile-control-btn:active,
    .vibe-mobile-control-btn.vibe-mobile-control-active {
      transform: scale(0.97);
      background: rgba(59, 130, 246, 0.52);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .vibe-mobile-up { left: 56px; top: 0; }
    .vibe-mobile-left { left: 0; top: 56px; }
    .vibe-mobile-right { right: 0; top: 56px; }
    .vibe-mobile-down { left: 56px; bottom: 0; }

    .vibe-mobile-action {
      position: relative;
      width: 76px;
      height: 76px;
      border-radius: 999px;
      font-size: 20px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    @media (max-width: 420px) {
      .vibe-mobile-dpad {
        width: 152px;
        height: 152px;
      }

      .vibe-mobile-control-btn {
        width: 52px;
        height: 52px;
        font-size: 20px;
      }

      .vibe-mobile-up { left: 50px; }
      .vibe-mobile-left { top: 50px; }
      .vibe-mobile-right { top: 50px; }
      .vibe-mobile-down { left: 50px; }

      .vibe-mobile-action {
        width: 72px;
        height: 72px;
        font-size: 18px;
      }
    }
  </style>
`;

const MOBILE_PREVIEW_CONTROLS_SCRIPT = `
  <script id="vibe-preview-mobile-controls-script">
    (function () {
      if (window.__vibeMobileControlsInstalled) return;
      window.__vibeMobileControlsInstalled = true;

      var isTouchDevice =
        'ontouchstart' in window ||
        (navigator && navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

      if (!isTouchDevice || !document.body) return;

      function focusCanvas() {
        var canvas = document.querySelector('canvas');
        if (!canvas || typeof canvas.focus !== 'function') return;
        try {
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
        } catch (_err) {
          // Ignore sandbox timing issues.
        }
      }

      function defineReadonly(event, prop, value) {
        try {
          Object.defineProperty(event, prop, {
            configurable: true,
            get: function () {
              return value;
            },
          });
        } catch (_err) {
          // Ignore readonly property failures.
        }
      }

      function dispatchKey(type, key, code, keyCode) {
        focusCanvas();
        var event = new KeyboardEvent(type, {
          key: key,
          code: code,
          bubbles: true,
          cancelable: true,
        });

        defineReadonly(event, 'keyCode', keyCode);
        defineReadonly(event, 'which', keyCode);

        window.dispatchEvent(event);
        document.dispatchEvent(event);

        var activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body && typeof activeElement.dispatchEvent === 'function') {
          activeElement.dispatchEvent(event);
        }
      }

      var overlay = document.createElement('div');
      overlay.className = 'vibe-mobile-controls vibe-mobile-controls-visible';
      overlay.innerHTML =
        '<div class="vibe-mobile-dpad">' +
        '<button type="button" class="vibe-mobile-control-btn vibe-mobile-up" data-key="ArrowUp" aria-label="Move up">▲</button>' +
        '<button type="button" class="vibe-mobile-control-btn vibe-mobile-left" data-key="ArrowLeft" aria-label="Move left">◀</button>' +
        '<button type="button" class="vibe-mobile-control-btn vibe-mobile-right" data-key="ArrowRight" aria-label="Move right">▶</button>' +
        '<button type="button" class="vibe-mobile-control-btn vibe-mobile-down" data-key="ArrowDown" aria-label="Move down">▼</button>' +
        '</div>' +
        '<div class="vibe-mobile-action-stack">' +
        '<button type="button" class="vibe-mobile-control-btn vibe-mobile-action" data-key="Space" aria-label="Action button">A</button>' +
        '</div>';

      document.body.classList.add('vibe-mobile-controls-enabled');
      document.body.appendChild(overlay);
      focusCanvas();

      var keyMap = {
        ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
        ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
        ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
        ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
        Space: { key: ' ', code: 'Space', keyCode: 32 },
      };
      var activeKeys = {};

      function pressKey(keyName, button) {
        var keyDef = keyMap[keyName];
        if (!keyDef || activeKeys[keyName]) return;
        activeKeys[keyName] = true;
        if (button) button.classList.add('vibe-mobile-control-active');
        dispatchKey('keydown', keyDef.key, keyDef.code, keyDef.keyCode);
      }

      function releaseKey(keyName, button) {
        var keyDef = keyMap[keyName];
        if (!keyDef || !activeKeys[keyName]) return;
        activeKeys[keyName] = false;
        if (button) button.classList.remove('vibe-mobile-control-active');
        dispatchKey('keyup', keyDef.key, keyDef.code, keyDef.keyCode);
      }

      function releaseAllKeys() {
        Object.keys(activeKeys).forEach(function (keyName) {
          if (!activeKeys[keyName]) return;
          var button = overlay.querySelector('[data-key="' + keyName + '"]');
          releaseKey(keyName, button);
        });
      }

      overlay.querySelectorAll('[data-key]').forEach(function (button) {
        var keyName = button.getAttribute('data-key');
        var start = function (event) {
          event.preventDefault();
          event.stopPropagation();
          pressKey(keyName, button);
        };
        var end = function (event) {
          event.preventDefault();
          event.stopPropagation();
          releaseKey(keyName, button);
        };

        button.addEventListener('pointerdown', start);
        button.addEventListener('pointerup', end);
        button.addEventListener('pointercancel', end);
        button.addEventListener('pointerleave', end);
      });

      window.addEventListener('blur', releaseAllKeys);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) releaseAllKeys();
      });
    })();
  </script>
`;

const THREE_LIBRARY_SCRIPTS = `
  <!-- 3D Libraries -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    window.THREE = THREE;
    delete window.createImageBitmap;
    (function () {
      if (!window.THREE || !window.THREE.ImageLoader) return;
      var originalLoad = window.THREE.ImageLoader.prototype.load;
      window.THREE.ImageLoader.prototype.load = function (url, onLoad, onProgress, onError) {
        if (typeof url === 'string' && url.indexOf('blob:') === 0) {
          fetch(url)
            .then(function (response) { return response.blob(); })
            .then(function (blob) {
              return new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload = function () { resolve(reader.result); };
                reader.onerror = function () { reject(reader.error); };
                reader.readAsDataURL(blob);
              });
            })
            .then(function (dataUrl) {
              originalLoad.call(this, dataUrl, onLoad, onProgress, onError);
            }.bind(this))
            .catch(function (error) {
              if (onError) onError(error);
            });
          return this;
        }

        return originalLoad.call(this, url, onLoad, onProgress, onError);
      };
    })();
  </script>
`;

function stripThreeLibraryScripts(code: string): string {
  return String(code || '').replace(
    /<script[^>]+src=["'][^"']*(?:three(?:\.min)?\.js|GLTFLoader\.js|OrbitControls\.js)[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    '',
  );
}

function hasBuiltInTouchControls(code: string): boolean {
  return /nipplejs|joystick-zone|touchstart|touchmove|ontouchstart|touchleft|touchright|touchjump|touch-btn|action-btn|virtual joystick/i.test(
    code,
  );
}

function looksLikeKeyboardDrivenGame(code: string): boolean {
  const hasGameShell = /new\s+Phaser\.Game|THREE\.|requestAnimationFrame|<canvas|id=["']game-container["']/i.test(code);
  const hasKeyboardControls =
    /createCursorKeys|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|keydown|keyup|addKey\(['"]SPACE['"]|keydown-SPACE/i.test(
      code,
    );

  return hasGameShell && hasKeyboardControls;
}

export function enhanceSandboxedPreviewHtml(code: string): string {
  const sanitizedCode = stripThreeLibraryScripts(code);
  const hasFullStructure =
    sanitizedCode.toLowerCase().includes('<!doctype') || sanitizedCode.toLowerCase().includes('<html');
  const shouldInjectMobileControls =
    looksLikeKeyboardDrivenGame(sanitizedCode) && !hasBuiltInTouchControls(sanitizedCode);
  const headInject =
    PREVIEW_SCROLL_STYLE +
    THREE_LIBRARY_SCRIPTS +
    (shouldInjectMobileControls ? MOBILE_PREVIEW_CONTROLS_STYLE + MOBILE_PREVIEW_CONTROLS_SCRIPT : '');

  let enhanced = sanitizedCode;

  if (hasFullStructure) {
    const headOpenMatch = sanitizedCode.match(/<head[^>]*>/i);
    if (headOpenMatch) {
      const idx = sanitizedCode.indexOf(headOpenMatch[0]) + headOpenMatch[0].length;
      enhanced = sanitizedCode.slice(0, idx) + `\n${headInject}\n` + sanitizedCode.slice(idx);
    } else if (/<body[^>]*>/i.test(sanitizedCode)) {
      enhanced = sanitizedCode.replace(/<body/i, `<head>${headInject}</head><body`);
    } else {
      enhanced = `${headInject}${sanitizedCode}`;
    }
  } else {
    enhanced = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${headInject}
</head>
<body>
${sanitizedCode}
</body>
</html>`;
  }

  return injectNonceIntoCode(enhanced);
}
