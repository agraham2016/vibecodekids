import { injectNonceIntoCode } from './cspNonce';

const PREVIEW_SCROLL_STYLE = `
  <style id="vibe-preview-scroll">
    html, body { overflow-y: auto !important; overflow-x: hidden; min-height: 100%; }
  </style>
`;

const MOBILE_TOUCH_CONTROLS = `
  <style id="vibe-mobile-controls-css">
    .vibe-touch-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .vibe-dpad {
      position: absolute;
      left: max(10px, env(safe-area-inset-left, 0px));
      bottom: max(10px, env(safe-area-inset-bottom, 0px));
      width: 150px;
      height: 150px;
    }
    .vibe-action-area {
      position: absolute;
      right: max(10px, env(safe-area-inset-right, 0px));
      bottom: max(10px, env(safe-area-inset-bottom, 0px));
    }
    .vibe-btn {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 14px;
      background: rgba(0,0,0,0.38);
      color: #fff;
      font: 700 18px/1 system-ui, sans-serif;
      pointer-events: auto;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    .vibe-btn.active {
      background: rgba(59,130,246,0.55);
      border-color: rgba(255,255,255,0.5);
    }
    .vibe-up    { left:50px; top:0; }
    .vibe-left  { left:0;   top:50px; }
    .vibe-right { left:100px; top:50px; }
    .vibe-down  { left:50px; top:100px; }
    .vibe-a {
      position: relative;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      font-size: 22px;
      font-weight: 800;
    }
  </style>
`;

const MOBILE_TOUCH_SCRIPT = `
  <script id="vibe-mobile-controls-js">
  document.addEventListener('DOMContentLoaded', function () {
    if (window.__vibeTouchReady) return;
    window.__vibeTouchReady = true;

    var isTouch = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (matchMedia && matchMedia('(pointer:coarse)').matches);
    if (!isTouch) return;

    var el = document.createElement('div');
    el.className = 'vibe-touch-overlay';
    el.innerHTML =
      '<div class="vibe-dpad">' +
        '<div class="vibe-btn vibe-up" data-k="ArrowUp">&#9650;</div>' +
        '<div class="vibe-btn vibe-left" data-k="ArrowLeft">&#9668;</div>' +
        '<div class="vibe-btn vibe-right" data-k="ArrowRight">&#9658;</div>' +
        '<div class="vibe-btn vibe-down" data-k="ArrowDown">&#9660;</div>' +
      '</div>' +
      '<div class="vibe-action-area">' +
        '<div class="vibe-btn vibe-a" data-k="Space">A</div>' +
      '</div>';
    document.body.appendChild(el);

    var map = {
      ArrowUp:    {key:'ArrowUp',    code:'ArrowUp',    kc:38},
      ArrowLeft:  {key:'ArrowLeft',  code:'ArrowLeft',  kc:37},
      ArrowRight: {key:'ArrowRight', code:'ArrowRight', kc:39},
      ArrowDown:  {key:'ArrowDown',  code:'ArrowDown',  kc:40},
      Space:      {key:' ',          code:'Space',      kc:32}
    };
    var held = {};

    function fire(type, k) {
      var m = map[k]; if (!m) return;
      var e = new KeyboardEvent(type, {key:m.key, code:m.code, bubbles:true, cancelable:true});
      try { Object.defineProperty(e,'keyCode',{get:function(){return m.kc}}); } catch(_){}
      try { Object.defineProperty(e,'which',{get:function(){return m.kc}}); } catch(_){}
      window.dispatchEvent(e);
      document.dispatchEvent(e);
    }

    function down(k, btn) {
      if (held[k]) return;
      held[k] = true;
      if (btn) btn.classList.add('active');
      fire('keydown', k);
    }
    function up(k, btn) {
      if (!held[k]) return;
      held[k] = false;
      if (btn) btn.classList.remove('active');
      fire('keyup', k);
    }

    el.querySelectorAll('[data-k]').forEach(function (btn) {
      var k = btn.getAttribute('data-k');
      btn.addEventListener('pointerdown',  function(e){ e.preventDefault(); down(k,btn); });
      btn.addEventListener('pointerup',    function(e){ e.preventDefault(); up(k,btn); });
      btn.addEventListener('pointercancel', function(e){ e.preventDefault(); up(k,btn); });
      btn.addEventListener('pointerleave',  function(e){ e.preventDefault(); up(k,btn); });
    });
  });
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
  return /nipplejs|joystick-zone|touchstart|touchmove|ontouchstart|touchleft|touchright|touchjump|touch-btn|virtual joystick/i.test(
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

function needsThreeJs(code: string): boolean {
  return /THREE\.|GLTFLoader|OrbitControls/i.test(code);
}

export function enhanceSandboxedPreviewHtml(code: string): string {
  const sanitizedCode = stripThreeLibraryScripts(code);
  const hasFullStructure =
    sanitizedCode.toLowerCase().includes('<!doctype') || sanitizedCode.toLowerCase().includes('<html');
  const shouldInjectMobileControls =
    looksLikeKeyboardDrivenGame(sanitizedCode) && !hasBuiltInTouchControls(sanitizedCode);
  const shouldInjectThreeJs = needsThreeJs(sanitizedCode);
  const headInject =
    PREVIEW_SCROLL_STYLE +
    (shouldInjectThreeJs ? THREE_LIBRARY_SCRIPTS : '') +
    (shouldInjectMobileControls ? MOBILE_TOUCH_CONTROLS + MOBILE_TOUCH_SCRIPT : '');

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
