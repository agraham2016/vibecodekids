import { injectNonceIntoCode } from './cspNonce';

const PREVIEW_SCROLL_STYLE = `
  <style id="vibe-preview-scroll">
    html, body { overflow-y: auto !important; overflow-x: hidden; min-height: 100%; }
  </style>
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

export function enhanceSandboxedPreviewHtml(code: string): string {
  const sanitizedCode = stripThreeLibraryScripts(code);
  const hasFullStructure =
    sanitizedCode.toLowerCase().includes('<!doctype') || sanitizedCode.toLowerCase().includes('<html');
  const headInject = PREVIEW_SCROLL_STYLE + THREE_LIBRARY_SCRIPTS;

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
