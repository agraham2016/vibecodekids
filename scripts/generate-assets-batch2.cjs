/**
 * Asset Generator — New Genre Templates (Batch 1 + Batch 2)
 * Run: node scripts/generate-assets-batch2.cjs
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'assets');

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
    toPNG() { return createPNG(w, h, px); }
  };
}

function save(subpath, buf) {
  const fp = path.join(OUT, subpath);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, buf);
  console.log('  ' + subpath + ' (' + buf.length + ' bytes)');
}

// ─── BATCH 1 ───

function genEndlessRunnerSprites() {
  console.log('Endless Runner sprites:');
  let c = makeCanvas(32, 32);
  c.rect(11, 4, 10, 8, 255, 150, 50);
  c.rect(10, 12, 12, 12, 255, 100, 50);
  c.rect(8, 16, 4, 8, 255, 100, 50);
  c.rect(20, 16, 4, 8, 255, 100, 50);
  c.rect(11, 24, 4, 6, 80, 60, 40);
  c.rect(17, 24, 4, 6, 80, 60, 40);
  c.set(13, 8, 40, 40, 40); c.set(18, 8, 40, 40, 40);
  save('sprites/endless-runner/player.png', c.toPNG());

  c = makeCanvas(32, 32);
  c.rect(4, 8, 24, 24, 180, 60, 60);
  c.rect(8, 4, 16, 8, 200, 80, 80);
  c.rect(10, 0, 12, 4, 220, 100, 100);
  save('sprites/endless-runner/obstacle.png', c.toPNG());

  c = makeCanvas(16, 16);
  c.circle(8, 8, 6, 255, 210, 50);
  c.circle(8, 8, 4, 255, 230, 80);
  save('sprites/endless-runner/coin.png', c.toPNG());

  c = makeCanvas(64, 32);
  c.rect(0, 0, 64, 8, 100, 180, 60);
  c.rect(0, 8, 64, 24, 140, 100, 50);
  save('sprites/endless-runner/ground.png', c.toPNG());
}

function genTowerDefenseSprites() {
  console.log('Tower Defense sprites:');
  let c = makeCanvas(32, 32);
  c.rect(8, 16, 16, 16, 100, 100, 120);
  c.rect(12, 8, 8, 12, 120, 120, 140);
  c.rect(14, 2, 4, 8, 80, 80, 100);
  c.circle(16, 4, 3, 200, 50, 50);
  save('sprites/tower-defense/tower.png', c.toPNG());

  c = makeCanvas(24, 24);
  c.circle(12, 12, 9, 200, 60, 60);
  c.circle(12, 10, 7, 230, 90, 90);
  c.set(9, 9, 255, 255, 255); c.set(15, 9, 255, 255, 255);
  c.set(10, 10, 40, 40, 40); c.set(14, 10, 40, 40, 40);
  save('sprites/tower-defense/enemy.png', c.toPNG());

  c = makeCanvas(8, 8);
  c.rect(3, 0, 2, 8, 255, 255, 100);
  c.rect(2, 1, 4, 2, 255, 200, 50);
  save('sprites/tower-defense/bullet.png', c.toPNG());

  c = makeCanvas(40, 40);
  c.rect(0, 0, 40, 40, 160, 140, 100);
  c.rect(4, 4, 32, 32, 180, 160, 120);
  save('sprites/tower-defense/path.png', c.toPNG());
}

function genFightingSprites() {
  console.log('Fighting sprites:');
  let c = makeCanvas(32, 40);
  c.rect(11, 2, 10, 10, 255, 200, 150);
  c.set(14, 6, 40, 40, 40); c.set(18, 6, 40, 40, 40);
  c.rect(10, 12, 12, 14, 50, 120, 200);
  c.rect(6, 14, 4, 10, 50, 120, 200);
  c.rect(22, 14, 4, 10, 50, 120, 200);
  c.rect(11, 26, 4, 12, 60, 60, 140);
  c.rect(17, 26, 4, 12, 60, 60, 140);
  save('sprites/fighting/fighter.png', c.toPNG());

  c = makeCanvas(32, 40);
  c.rect(11, 2, 10, 10, 200, 160, 130);
  c.set(14, 6, 40, 40, 40); c.set(18, 6, 40, 40, 40);
  c.rect(10, 12, 12, 14, 180, 50, 50);
  c.rect(6, 14, 4, 10, 180, 50, 50);
  c.rect(22, 14, 4, 10, 180, 50, 50);
  c.rect(11, 26, 4, 12, 100, 40, 40);
  c.rect(17, 26, 4, 12, 100, 40, 40);
  save('sprites/fighting/enemy.png', c.toPNG());

  c = makeCanvas(16, 16);
  c.circle(8, 8, 6, 255, 255, 100, 180);
  c.circle(8, 8, 3, 255, 255, 200, 220);
  save('sprites/fighting/punch.png', c.toPNG());
}

function genSnakeSprites() {
  console.log('Snake sprites:');
  let c = makeCanvas(20, 20);
  c.rect(2, 2, 16, 16, 0, 184, 148);
  c.rect(4, 4, 12, 12, 0, 210, 170);
  c.set(7, 8, 40, 40, 40); c.set(12, 8, 40, 40, 40);
  save('sprites/snake/head.png', c.toPNG());

  c = makeCanvas(20, 20);
  c.rect(3, 3, 14, 14, 0, 160, 130);
  c.rect(5, 5, 10, 10, 0, 180, 150);
  save('sprites/snake/body.png', c.toPNG());

  c = makeCanvas(20, 20);
  c.circle(10, 10, 7, 255, 80, 80);
  c.circle(10, 10, 4, 255, 120, 120);
  c.circle(8, 8, 2, 255, 200, 200);
  save('sprites/snake/food.png', c.toPNG());
}

function genSportsSprites() {
  console.log('Sports sprites:');
  let c = makeCanvas(24, 24);
  c.rect(8, 2, 8, 8, 255, 200, 150);
  c.set(10, 5, 40, 40, 40); c.set(14, 5, 40, 40, 40);
  c.rect(7, 10, 10, 8, 50, 100, 200);
  c.rect(8, 18, 3, 6, 80, 60, 40);
  c.rect(13, 18, 3, 6, 80, 60, 40);
  save('sprites/sports/player.png', c.toPNG());

  c = makeCanvas(24, 24);
  c.rect(8, 2, 8, 8, 200, 160, 130);
  c.set(10, 5, 40, 40, 40); c.set(14, 5, 40, 40, 40);
  c.rect(7, 10, 10, 8, 200, 60, 60);
  c.rect(8, 18, 3, 6, 80, 60, 40);
  c.rect(13, 18, 3, 6, 80, 60, 40);
  save('sprites/sports/opponent.png', c.toPNG());

  c = makeCanvas(16, 16);
  c.circle(8, 8, 7, 255, 255, 255);
  c.circle(8, 8, 6, 240, 240, 240);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.round(8 + Math.cos(a) * 5);
    const y = Math.round(8 + Math.sin(a) * 5);
    c.set(x, y, 60, 60, 60);
  }
  save('sprites/sports/ball.png', c.toPNG());

  c = makeCanvas(16, 48);
  c.rect(6, 0, 4, 48, 220, 220, 220);
  c.rect(0, 0, 16, 4, 220, 220, 220);
  c.rect(0, 44, 16, 4, 220, 220, 220);
  save('sprites/sports/goal.png', c.toPNG());
}

function genBrickBreakerSprites() {
  console.log('Brick Breaker sprites:');
  let c = makeCanvas(64, 12);
  c.rect(0, 0, 64, 12, 100, 100, 230);
  c.rect(2, 2, 60, 2, 140, 140, 255);
  save('sprites/brick-breaker/paddle.png', c.toPNG());

  c = makeCanvas(12, 12);
  c.circle(6, 6, 5, 240, 240, 240);
  c.circle(5, 4, 2, 255, 255, 255);
  save('sprites/brick-breaker/ball.png', c.toPNG());

  c = makeCanvas(48, 16);
  c.rect(0, 0, 48, 16, 220, 60, 60);
  c.rect(1, 1, 46, 3, 255, 120, 120);
  c.rect(1, 12, 46, 3, 180, 40, 40);
  save('sprites/brick-breaker/brick.png', c.toPNG());

  c = makeCanvas(16, 16);
  c.circle(8, 8, 6, 50, 200, 50);
  c.rect(6, 4, 4, 8, 100, 255, 100);
  c.rect(4, 6, 8, 4, 100, 255, 100);
  save('sprites/brick-breaker/powerup.png', c.toPNG());
}

// ─── BATCH 2 ───

function genFlappySprites() {
  console.log('Flappy sprites:');
  let c = makeCanvas(24, 24);
  c.circle(12, 12, 10, 255, 220, 50);
  c.circle(12, 10, 8, 255, 240, 80);
  c.set(15, 9, 40, 40, 40); c.set(16, 9, 40, 40, 40);
  c.rect(16, 12, 6, 3, 255, 140, 50);
  c.rect(6, 10, 5, 4, 255, 255, 255);
  save('sprites/flappy/bird.png', c.toPNG());

  c = makeCanvas(48, 200);
  c.rect(0, 0, 48, 200, 80, 180, 60);
  c.rect(0, 0, 48, 8, 100, 200, 80);
  c.rect(4, 4, 40, 192, 60, 160, 40);
  save('sprites/flappy/pipe.png', c.toPNG());
}

function genBubbleShooterSprites() {
  console.log('Bubble Shooter sprites:');
  const colors = [
    [255, 80, 80], [80, 150, 255], [80, 220, 80],
    [255, 220, 50], [200, 80, 255], [255, 150, 50]
  ];
  let c = makeCanvas(192, 32);
  colors.forEach(([r, g, b], i) => {
    const cx = i * 32 + 16, cy = 16;
    for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
      if (dx*dx + dy*dy <= 14*14) {
        const bright = 1 - (dx*dx + dy*dy) / (14*14) * 0.4;
        c.set(cx+dx, cy+dy, Math.floor(r*bright), Math.floor(g*bright), Math.floor(b*bright));
      }
    }
    c.circle(cx - 4, cy - 4, 3, Math.min(255, r+60), Math.min(255, g+60), Math.min(255, b+60), 150);
  });
  save('sprites/bubble-shooter/bubbles.png', c.toPNG());

  c = makeCanvas(16, 48);
  c.rect(6, 0, 4, 48, 180, 180, 180);
  c.rect(4, 44, 8, 4, 200, 200, 200);
  save('sprites/bubble-shooter/arrow.png', c.toPNG());
}

function genFallingBlocksSprites() {
  console.log('Falling Blocks sprites:');
  let c = makeCanvas(192, 32);
  const blockColors = [
    [0, 240, 240], [0, 0, 240], [240, 160, 0],
    [240, 240, 0], [0, 240, 0], [160, 0, 240], [240, 0, 0]
  ];
  blockColors.forEach(([r, g, b], i) => {
    const x = i * 28;
    c.rect(x, 0, 28, 28, r, g, b);
    c.rect(x+1, 1, 26, 2, Math.min(255, r+60), Math.min(255, g+60), Math.min(255, b+60));
    c.rect(x+1, 1, 2, 26, Math.min(255, r+60), Math.min(255, g+60), Math.min(255, b+60));
    c.rect(x+1, 25, 26, 2, Math.max(0, r-60), Math.max(0, g-60), Math.max(0, b-60));
    c.rect(x+25, 1, 2, 26, Math.max(0, r-60), Math.max(0, g-60), Math.max(0, b-60));
  });
  save('sprites/falling-blocks/blocks.png', c.toPNG());
}

function genRhythmSprites() {
  console.log('Rhythm sprites:');
  const arrowColors = [[255, 80, 80], [80, 200, 80], [80, 150, 255], [255, 200, 50]];
  let c = makeCanvas(128, 32);
  arrowColors.forEach(([r, g, b], i) => {
    const cx = i * 32 + 16, cy = 16;
    for (let row = 0; row < 12; row++) {
      const w = 12 - row;
      for (let dx = -w; dx <= w; dx++) c.set(cx + dx, cy - 12 + row, r, g, b);
    }
    c.rect(cx - 3, cy, 7, 10, r, g, b);
  });
  save('sprites/rhythm/arrows.png', c.toPNG());

  c = makeCanvas(32, 32);
  c.rect(0, 0, 32, 32, 60, 60, 80);
  c.rect(2, 2, 28, 28, 80, 80, 100);
  c.rect(4, 12, 24, 2, 120, 120, 140);
  c.rect(14, 4, 2, 24, 120, 120, 140);
  save('sprites/rhythm/target.png', c.toPNG());
}

function genPetSimSprites() {
  console.log('Pet Sim sprites:');
  let c = makeCanvas(48, 48);
  c.circle(24, 28, 16, 200, 160, 100);
  c.circle(24, 26, 14, 220, 180, 120);
  c.circle(24, 16, 12, 220, 180, 120);
  c.set(20, 14, 40, 40, 40); c.set(28, 14, 40, 40, 40);
  c.circle(24, 18, 2, 40, 40, 40);
  c.rect(20, 20, 8, 2, 200, 100, 100);
  c.circle(12, 8, 5, 220, 180, 120);
  c.circle(36, 8, 5, 220, 180, 120);
  save('sprites/pet-sim/pet.png', c.toPNG());

  c = makeCanvas(24, 24);
  c.circle(12, 12, 8, 255, 100, 100);
  c.circle(12, 8, 6, 255, 130, 130);
  c.circle(8, 6, 4, 255, 130, 130);
  c.circle(16, 6, 4, 255, 130, 130);
  save('sprites/pet-sim/heart.png', c.toPNG());

  c = makeCanvas(24, 24);
  c.rect(4, 8, 16, 12, 180, 120, 60);
  c.rect(2, 6, 20, 4, 200, 140, 80);
  c.rect(8, 4, 8, 4, 220, 160, 100);
  save('sprites/pet-sim/food.png', c.toPNG());

  c = makeCanvas(24, 24);
  c.circle(12, 12, 10, 80, 150, 255);
  c.circle(12, 10, 8, 100, 170, 255);
  c.circle(10, 8, 3, 200, 230, 255);
  save('sprites/pet-sim/toy.png', c.toPNG());
}

// ─── Run ───
console.log('Generating new genre assets...\n');
genEndlessRunnerSprites();
genTowerDefenseSprites();
genFightingSprites();
genSnakeSprites();
genSportsSprites();
genBrickBreakerSprites();
genFlappySprites();
genBubbleShooterSprites();
genFallingBlocksSprites();
genRhythmSprites();
genPetSimSprites();
console.log('\nDone! New genre assets written to public/assets/');
