/**
 * Asset Generator
 * Creates pixel art sprites (PNG) and sound effects (WAV) for the game library.
 * Run: node scripts/generate-assets.js
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'assets');

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

// ─── Drawing helpers ───

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
    circle(cx, cy, rad, r, g, b, a = 255) {
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++)
        if (dx*dx + dy*dy <= rad*rad) this.set(cx+dx, cy+dy, r, g, b, a);
    },
    outline(x, y, rw, rh, r, g, b) {
      for (let dx = 0; dx < rw; dx++) { this.set(x+dx, y, r, g, b); this.set(x+dx, y+rh-1, r, g, b); }
      for (let dy = 0; dy < rh; dy++) { this.set(x, y+dy, r, g, b); this.set(x+rw-1, y+dy, r, g, b); }
    },
    toPNG() { return createPNG(w, h, px); }
  };
}

function save(subpath, buf) {
  const fp = path.join(OUT, subpath);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, buf);
  console.log('  ' + subpath + ' (' + buf.length + ' bytes)');
}

// ─── Sprite generation ───

function genPlatformerSprites() {
  console.log('Platformer sprites:');
  // Player 32x32 — little character with hat
  let c = makeCanvas(32, 32);
  c.rect(11, 2, 10, 8, 50, 100, 200);   // hat
  c.rect(10, 8, 12, 10, 255, 200, 150);  // face
  c.set(13, 12, 40, 40, 40); c.set(18, 12, 40, 40, 40); // eyes
  c.rect(12, 18, 8, 10, 50, 100, 200);   // body
  c.rect(8, 20, 4, 6, 50, 100, 200);     // left arm
  c.rect(20, 20, 4, 6, 50, 100, 200);    // right arm
  c.rect(12, 28, 3, 4, 80, 60, 40);      // left leg
  c.rect(17, 28, 3, 4, 80, 60, 40);      // right leg
  save('sprites/platformer/player.png', c.toPNG());

  // Tiles 64x16 (4 tiles: grass, dirt, stone, brick)
  c = makeCanvas(64, 16);
  c.rect(0, 0, 16, 4, 80, 180, 60);  c.rect(0, 4, 16, 12, 140, 100, 50);  // grass+dirt
  c.rect(16, 0, 16, 16, 140, 100, 50); c.rect(18, 2, 4, 3, 120, 85, 40);  // dirt
  c.rect(32, 0, 16, 16, 160, 160, 160); c.rect(34, 2, 5, 5, 140, 140, 140); c.rect(38, 8, 6, 5, 140, 140, 140); // stone
  c.rect(48, 0, 16, 16, 180, 80, 60); c.rect(48, 7, 16, 1, 140, 60, 40); c.rect(56, 0, 1, 16, 140, 60, 40); // brick
  save('sprites/platformer/tiles.png', c.toPNG());

  // Coin 16x16
  c = makeCanvas(16, 16);
  c.circle(8, 8, 6, 255, 210, 50); c.circle(8, 8, 4, 255, 230, 80); c.circle(6, 6, 2, 255, 255, 180);
  save('sprites/platformer/coin.png', c.toPNG());

  // Enemy 32x32 — red blob
  c = makeCanvas(32, 32);
  c.circle(16, 18, 10, 220, 60, 60); c.circle(16, 16, 10, 240, 80, 80);
  c.set(12, 14, 255, 255, 255); c.set(13, 14, 255, 255, 255); c.set(13, 15, 40, 40, 40);
  c.set(19, 14, 255, 255, 255); c.set(20, 14, 255, 255, 255); c.set(19, 15, 40, 40, 40);
  save('sprites/platformer/enemy.png', c.toPNG());

  // Platform 64x16
  c = makeCanvas(64, 16);
  c.rect(0, 0, 64, 16, 100, 160, 80); c.rect(0, 0, 64, 3, 120, 200, 100);
  c.rect(1, 1, 62, 1, 140, 220, 120);
  save('sprites/platformer/platform.png', c.toPNG());
}

function genShooterSprites() {
  console.log('Shooter sprites:');
  // Ship 32x48 — cyan triangle
  let c = makeCanvas(32, 48);
  for (let y = 0; y < 40; y++) { const hw = Math.floor((y / 40) * 14) + 1;
    for (let x = 16 - hw; x <= 16 + hw; x++) c.set(x, y, 60, 200, 240); }
  c.rect(13, 35, 2, 10, 255, 150, 50); c.rect(17, 35, 2, 10, 255, 150, 50); // engines
  c.circle(16, 20, 3, 100, 230, 255); // cockpit
  save('sprites/shooter/ship.png', c.toPNG());

  // Enemy 28x28 — angular red
  c = makeCanvas(28, 28);
  for (let y = 4; y < 24; y++) { const hw = Math.floor(Math.abs(14 - y) < 8 ? 10 : 6);
    for (let x = 14 - hw; x <= 14 + hw; x++) c.set(x, y, 200, 50, 60); }
  c.set(10, 12, 255, 255, 100); c.set(18, 12, 255, 255, 100); // eyes
  save('sprites/shooter/enemy.png', c.toPNG());

  // Bullet 8x16
  c = makeCanvas(8, 16);
  c.rect(2, 0, 4, 16, 255, 255, 100); c.rect(3, 0, 2, 16, 255, 255, 200);
  save('sprites/shooter/bullet.png', c.toPNG());

  // Explosion spritesheet 256x64 (4 frames)
  c = makeCanvas(256, 64);
  [12, 20, 26, 18].forEach((r, i) => {
    const cx = i * 64 + 32, cy = 32;
    c.circle(cx, cy, r, 255, 100 + i * 30, 0, 200 - i * 40);
    c.circle(cx, cy, Math.floor(r * 0.6), 255, 200, 50, 220 - i * 40);
    c.circle(cx, cy, Math.floor(r * 0.3), 255, 255, 150, 240 - i * 50);
  });
  save('sprites/shooter/explosion.png', c.toPNG());
}

function genRacingSprites() {
  console.log('Racing sprites:');
  // Player car 24x40 (top-down, red)
  let c = makeCanvas(24, 40);
  c.rect(4, 4, 16, 32, 220, 50, 50);   // body
  c.rect(6, 6, 12, 8, 180, 210, 240);  // windshield
  c.rect(2, 8, 3, 8, 40, 40, 40);      // left wheel
  c.rect(19, 8, 3, 8, 40, 40, 40);     // right wheel
  c.rect(2, 28, 3, 8, 40, 40, 40);     // rear left
  c.rect(19, 28, 3, 8, 40, 40, 40);    // rear right
  c.rect(8, 32, 3, 4, 255, 200, 50);   // left taillight
  c.rect(13, 32, 3, 4, 255, 200, 50);  // right taillight
  save('sprites/racing/car-player.png', c.toPNG());

  // Obstacle car 24x40 (blue)
  c = makeCanvas(24, 40);
  c.rect(4, 4, 16, 32, 50, 80, 200);
  c.rect(6, 6, 12, 8, 180, 210, 240);
  c.rect(2, 8, 3, 8, 40, 40, 40); c.rect(19, 8, 3, 8, 40, 40, 40);
  c.rect(2, 28, 3, 8, 40, 40, 40); c.rect(19, 28, 3, 8, 40, 40, 40);
  save('sprites/racing/car-obstacle.png', c.toPNG());

  // Road tile 16x16
  c = makeCanvas(16, 16);
  c.rect(0, 0, 16, 16, 100, 100, 100);
  c.rect(7, 0, 2, 6, 255, 255, 255); c.rect(7, 10, 2, 6, 255, 255, 255); // dashes
  save('sprites/racing/road.png', c.toPNG());
}

function genRPGSprites() {
  console.log('RPG sprites:');
  // Hero 32x32
  let c = makeCanvas(32, 32);
  c.circle(16, 8, 6, 255, 200, 150);    // head
  c.set(14, 7, 40, 40, 40); c.set(18, 7, 40, 40, 40); // eyes
  c.rect(12, 14, 8, 10, 40, 120, 60);   // green tunic
  c.rect(8, 16, 4, 6, 40, 120, 60);     // left arm
  c.rect(20, 16, 4, 6, 40, 120, 60);    // right arm
  c.rect(24, 14, 2, 12, 180, 180, 180); // sword blade
  c.rect(23, 12, 4, 2, 200, 170, 50);   // sword hilt
  c.rect(13, 24, 3, 6, 60, 50, 40);     // left leg
  c.rect(17, 24, 3, 6, 60, 50, 40);     // right leg
  save('sprites/rpg/hero.png', c.toPNG());

  // NPC 32x32
  c = makeCanvas(32, 32);
  c.circle(16, 8, 6, 255, 200, 150);
  c.set(14, 7, 40, 40, 40); c.set(18, 7, 40, 40, 40);
  c.rect(12, 14, 8, 10, 140, 60, 140);  // purple robe
  c.rect(8, 16, 4, 8, 140, 60, 140);
  c.rect(20, 16, 4, 8, 140, 60, 140);
  c.rect(13, 24, 3, 6, 100, 40, 100);
  c.rect(17, 24, 3, 6, 100, 40, 100);
  c.rect(10, 2, 12, 4, 200, 170, 50);   // crown
  c.rect(14, 0, 4, 3, 200, 170, 50);
  save('sprites/rpg/npc.png', c.toPNG());

  // Wall tile 16x16
  c = makeCanvas(16, 16);
  c.rect(0, 0, 16, 16, 120, 110, 100);
  c.rect(1, 1, 6, 7, 140, 130, 115); c.rect(9, 1, 6, 7, 140, 130, 115);
  c.rect(5, 9, 6, 6, 140, 130, 115); c.rect(13, 9, 2, 6, 140, 130, 115);
  save('sprites/rpg/wall.png', c.toPNG());

  // Treasure 16x16
  c = makeCanvas(16, 16);
  c.rect(2, 6, 12, 10, 160, 120, 40);   // chest body
  c.rect(2, 6, 12, 3, 180, 140, 50);    // lid
  c.rect(6, 8, 4, 3, 255, 220, 80);     // lock
  c.rect(3, 7, 10, 1, 200, 160, 60);    // trim
  save('sprites/rpg/treasure.png', c.toPNG());
}

function genPuzzleSprites() {
  console.log('Puzzle sprites:');
  // Gems spritesheet 192x32 (6 gems, each 32x32)
  const colors = [[255,60,80],[60,160,255],[60,220,80],[255,180,40],[200,60,220],[60,220,200]];
  let c = makeCanvas(192, 32);
  colors.forEach(([r,g,b], i) => {
    const cx = i * 32 + 16, cy = 16;
    // Diamond shape
    for (let dy = -10; dy <= 10; dy++) {
      const hw = 10 - Math.abs(dy);
      for (let dx = -hw; dx <= hw; dx++) {
        const shade = 1.0 - Math.abs(dx) / (hw + 1) * 0.3;
        c.set(cx+dx, cy+dy, Math.floor(r*shade), Math.floor(g*shade), Math.floor(b*shade));
      }
    }
    c.circle(cx - 2, cy - 3, 2, Math.min(255, r+80), Math.min(255, g+80), Math.min(255, b+80), 180); // shine
  });
  save('sprites/puzzle/gems.png', c.toPNG());
}

function genClickerSprites() {
  console.log('Clicker sprites:');
  // Large gem 64x64
  let c = makeCanvas(64, 64);
  for (let dy = -24; dy <= 24; dy++) {
    const hw = 24 - Math.abs(dy);
    for (let dx = -hw; dx <= hw; dx++) {
      const shade = 1.0 - Math.abs(dx) / (hw + 1) * 0.3;
      c.set(32+dx, 32+dy, Math.floor(200*shade), Math.floor(100*shade), Math.floor(255*shade));
    }
  }
  c.circle(24, 24, 6, 240, 180, 255, 150); // shine
  c.circle(22, 22, 3, 255, 220, 255, 200); // bright spot
  save('sprites/clicker/gem.png', c.toPNG());

  // Sparkle 16x16
  c = makeCanvas(16, 16);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, len = (i % 2 === 0) ? 7 : 4;
    for (let d = 0; d < len; d++) {
      const x = Math.round(8 + Math.cos(a) * d), y = Math.round(8 + Math.sin(a) * d);
      c.set(x, y, 255, 255, 200, 255 - d * 30);
    }
  }
  save('sprites/clicker/sparkle.png', c.toPNG());
}

function genFroggerSprites() {
  console.log('Frogger sprites:');
  // Frog 24x24
  let c = makeCanvas(24, 24);
  c.circle(12, 12, 9, 60, 180, 60);  // body
  c.circle(12, 10, 7, 80, 200, 80);  // lighter belly area
  c.circle(7, 6, 3, 80, 200, 80); c.circle(17, 6, 3, 80, 200, 80); // eye bumps
  c.set(7, 5, 20, 20, 20); c.set(17, 5, 20, 20, 20); // pupils
  save('sprites/frogger/frog.png', c.toPNG());

  // Car 48x24
  c = makeCanvas(48, 24);
  c.rect(4, 4, 40, 16, 220, 60, 60);
  c.rect(10, 6, 14, 10, 180, 210, 240); // windows
  c.rect(0, 8, 5, 8, 40, 40, 40); c.rect(43, 8, 5, 8, 40, 40, 40); // wheels
  c.rect(4, 4, 4, 4, 255, 230, 80); // headlight
  save('sprites/frogger/car.png', c.toPNG());

  // Truck 72x24
  c = makeCanvas(72, 24);
  c.rect(4, 2, 64, 20, 60, 100, 200);  // trailer
  c.rect(56, 4, 10, 14, 180, 210, 240); // cab window
  c.rect(0, 8, 5, 8, 40, 40, 40); c.rect(30, 8, 5, 8, 40, 40, 40); c.rect(60, 8, 5, 8, 40, 40, 40);
  save('sprites/frogger/truck.png', c.toPNG());

  // Log 64x24
  c = makeCanvas(64, 24);
  c.rect(2, 4, 60, 16, 140, 90, 40);
  c.circle(4, 12, 7, 120, 80, 30); c.circle(60, 12, 7, 120, 80, 30); // ends
  c.rect(10, 7, 20, 2, 160, 110, 55); c.rect(35, 11, 15, 2, 160, 110, 55); // wood grain
  save('sprites/frogger/log.png', c.toPNG());
}

function genCommonSprites() {
  console.log('Common sprites:');
  // Heart 16x16
  let c = makeCanvas(16, 16);
  c.circle(5, 5, 4, 240, 50, 60); c.circle(11, 5, 4, 240, 50, 60);
  for (let y = 6; y < 15; y++) { const hw = Math.max(0, 8 - (y - 6));
    for (let dx = -hw; dx <= hw; dx++) c.set(8+dx, y, 240, 50, 60); }
  c.circle(4, 4, 1, 255, 150, 160, 180); // shine
  save('sprites/common/heart.png', c.toPNG());

  // Star 16x16
  c = makeCanvas(16, 16);
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 === 0 ? 7 : 3;
    pts.push([8 + Math.cos(a) * r, 8 + Math.sin(a) * r]);
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (pointInPoly(x, y, pts)) c.set(x, y, 255, 220, 50);
  }
  save('sprites/common/star.png', c.toPNG());

  // Particle 8x8
  c = makeCanvas(8, 8);
  c.circle(4, 4, 3, 255, 255, 255); c.circle(4, 4, 2, 255, 255, 255, 200);
  save('sprites/common/particle.png', c.toPNG());
}

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ─── Sound generation (WAV) ───

function createWAV(samples, sampleRate = 22050) {
  const numSamples = samples.length;
  const buf = Buffer.alloc(44 + numSamples * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + numSamples * 2, 4);
  buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(samples[i] * 32767))), 44 + i * 2);
  }
  return buf;
}

function genSounds() {
  console.log('Sound effects:');
  const SR = 22050;

  // Jump — ascending sine sweep
  let s = new Float32Array(SR * 0.2);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = 1 - t / 0.2;
    s[i] = Math.sin(2 * Math.PI * (400 + t * 2000) * t) * env * 0.5;
  }
  save('sounds/jump.wav', createWAV(s, SR));

  // Coin — two-tone blip
  s = new Float32Array(SR * 0.15);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = 1 - t / 0.15;
    const freq = t < 0.07 ? 880 : 1320;
    s[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.4;
  }
  save('sounds/coin.wav', createWAV(s, SR));

  // Explosion — noise burst with decay
  s = new Float32Array(SR * 0.4);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = Math.exp(-t * 8);
    s[i] = (Math.random() * 2 - 1) * env * 0.6;
  }
  save('sounds/explosion.wav', createWAV(s, SR));

  // Hit — short low thud
  s = new Float32Array(SR * 0.12);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = Math.exp(-t * 20);
    s[i] = Math.sin(2 * Math.PI * (150 - t * 400) * t) * env * 0.5;
  }
  save('sounds/hit.wav', createWAV(s, SR));

  // Powerup — ascending arpeggio
  s = new Float32Array(SR * 0.3);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = 1 - t / 0.3;
    const notes = [523, 659, 784, 1047];
    const noteIdx = Math.min(3, Math.floor(t / 0.075));
    s[i] = Math.sin(2 * Math.PI * notes[noteIdx] * t) * env * 0.35;
  }
  save('sounds/powerup.wav', createWAV(s, SR));

  // Click — very short tick
  s = new Float32Array(SR * 0.05);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = Math.exp(-t * 60);
    s[i] = Math.sin(2 * Math.PI * 1000 * t) * env * 0.3;
  }
  save('sounds/click.wav', createWAV(s, SR));

  // Win — happy ascending tones
  s = new Float32Array(SR * 0.6);
  const winNotes = [523, 659, 784, 1047, 1047];
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = Math.max(0, 1 - ((t % 0.15) / 0.15) * 0.5);
    const noteIdx = Math.min(4, Math.floor(t / 0.12));
    s[i] = Math.sin(2 * Math.PI * winNotes[noteIdx] * t) * env * 0.3;
  }
  save('sounds/win.wav', createWAV(s, SR));

  // Lose — descending sad tones
  s = new Float32Array(SR * 0.5);
  const loseNotes = [400, 350, 300, 250];
  for (let i = 0; i < s.length; i++) {
    const t = i / SR, env = Math.max(0, 1 - t / 0.5);
    const noteIdx = Math.min(3, Math.floor(t / 0.125));
    s[i] = Math.sin(2 * Math.PI * loseNotes[noteIdx] * t) * env * 0.3;
  }
  save('sounds/lose.wav', createWAV(s, SR));
}

// ─── Run ───
console.log('Generating game assets...\n');
genPlatformerSprites();
genShooterSprites();
genRacingSprites();
genRPGSprites();
genPuzzleSprites();
genClickerSprites();
genFroggerSprites();
genCommonSprites();
genSounds();
console.log('\nDone! Assets written to public/assets/');
