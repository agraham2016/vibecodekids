/**
 * Favicon Generator
 * Creates favicon-32x32.png and apple-touch-icon.png with branded purple/indigo
 * background and white rocket (triangle) shape.
 * Run: node scripts/generate-favicons.cjs
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public');

// Purple/indigo background: #6366f1
const BG_R = 99, BG_G = 102, BG_B = 241;
const FG_R = 255, FG_G = 255, FG_B = 255;

// ─── Minimal PNG encoder (no dependencies) ───

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function createPNG(w, h, pixels) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4, di = y * (1 + w * 4) + 1 + x * 4;
      raw[di] = pixels[si]; raw[di+1] = pixels[si+1]; raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

// ─── Canvas with triangle (rocket shape) ───

function makeCanvas(w, h) {
  const px = new Uint8Array(w * h * 4);
  return {
    w, h, px,
    set(x, y, r, g, b, a = 255) {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const i = (y * w + x) * 4;
      px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
    },
    rect(x, y, rw, rh, r, g, b, a = 255) {
      for (let dy = 0; dy < rh; dy++) for (let dx = 0; dx < rw; dx++) this.set(x+dx, y+dy, r, g, b, a);
    },
    // Upward-pointing triangle (rocket shape): top point, bottom left, bottom right
    triangleUp(cx, topY, bottomY, halfWidth, r, g, b, a = 255) {
      const height = bottomY - topY;
      for (let y = topY; y <= bottomY; y++) {
        const t = (y - topY) / height;
        const hw = Math.floor(halfWidth * t);
        for (let x = cx - hw; x <= cx + hw; x++) this.set(x, y, r, g, b, a);
      }
    },
    toPNG() { return createPNG(w, h, px); }
  };
}

function generateFavicon(size) {
  const c = makeCanvas(size, size);
  const pad = Math.max(2, Math.floor(size * 0.08));
  const center = size / 2;
  const top = pad;
  const bottom = size - pad;
  const halfWidth = Math.floor((size - pad * 2) * 0.4);

  // Purple background
  c.rect(0, 0, size, size, BG_R, BG_G, BG_B);

  // White rocket triangle
  c.triangleUp(center - 0.5, top, bottom, halfWidth, FG_R, FG_G, FG_B);

  return c.toPNG();
}

function save(filename, buf) {
  const fp = path.join(OUT, filename);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, buf);
  console.log('  ' + filename + ' (' + buf.length + ' bytes)');
}

// ─── Run ───

console.log('Generating favicons...\n');

const favicon32 = generateFavicon(32);
save('favicon-32x32.png', favicon32);

const appleTouch = generateFavicon(180);
save('apple-touch-icon.png', appleTouch);

console.log('\nDone! Favicons written to public/');
