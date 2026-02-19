/**
 * Sound Engine Snippet
 * Web Audio API sound effects without loading external files.
 * Works alongside Phaser games (Phaser doesn't generate sounds procedurally).
 */

export const SOUND_ENGINE_SNIPPET = `
// ===== SOUND ENGINE (Web Audio API — no files needed) =====
// Phaser can play loaded audio, but for procedural sound effects
// (beeps, explosions, jumps) we use Web Audio API directly.
// These functions work inside any Phaser game.

var audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// --- Simple Beep / Blip ---
function playBeep(freq, duration, type) {
  var ctx = getAudioCtx();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq || 440;
  gain.gain.value = 0.15;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.1));
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + (duration || 0.1));
}

// --- Jump Sound (frequency sweep up) ---
function playJump() {
  var ctx = getAudioCtx();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.2);
}

// --- Coin / Pickup Sound ---
function playCoin() {
  playBeep(880, 0.08, 'sine');
  setTimeout(function() { playBeep(1100, 0.08, 'sine'); }, 80);
}

// --- Explosion Sound (white noise burst) ---
function playExplosion() {
  var ctx = getAudioCtx();
  var bufferSize = ctx.sampleRate * 0.3;
  var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  var source = ctx.createBufferSource();
  source.buffer = buffer;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  source.connect(gain); gain.connect(ctx.destination); source.start();
}

// --- Hit / Damage Sound ---
function playHit() {
  var ctx = getAudioCtx();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.15);
}

// --- Usage in Phaser games ---
// Call these directly from Phaser callbacks:
//   function collectCoin(player, coin) { coin.destroy(); playCoin(); score += 10; }
//   function hitEnemy(bullet, enemy) { enemy.destroy(); playExplosion(); }
//   // In update(): if (cursors.up.isDown && player.body.touching.down) { player.setVelocityY(-400); playJump(); }
`;
