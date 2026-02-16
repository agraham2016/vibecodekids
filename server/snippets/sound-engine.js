/**
 * Sound Engine Snippet
 * Web Audio API sound effects without loading external files.
 * Beeps, explosions, jumps, engine sounds, music loops.
 */

export const SOUND_ENGINE_SNIPPET = `
// ===== SOUND ENGINE (Web Audio API — no files needed) =====

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
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + (duration || 0.1));
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
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
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
  for (var i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  var source = ctx.createBufferSource();
  source.buffer = buffer;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
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
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

// --- Engine Hum (for racing games — starts/stops) ---
var engineOsc = null;
function startEngine() {
  if (engineOsc) return;
  var ctx = getAudioCtx();
  engineOsc = ctx.createOscillator();
  var gain = ctx.createGain();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 80;
  gain.gain.value = 0.05;
  engineOsc.connect(gain);
  gain.connect(ctx.destination);
  engineOsc.start();
  engineOsc._gain = gain;
}
function updateEngineSound(speed, maxSpeed) {
  if (engineOsc) {
    engineOsc.frequency.value = 80 + (speed / maxSpeed) * 200;
    engineOsc._gain.gain.value = 0.03 + (speed / maxSpeed) * 0.07;
  }
}
function stopEngine() {
  if (engineOsc) { engineOsc.stop(); engineOsc = null; }
}

// --- Simple Background Music (looping tone) ---
var bgMusic = null;
function startBGMusic(baseFreq) {
  if (bgMusic) return;
  var ctx = getAudioCtx();
  bgMusic = {};
  var notes = [1, 1.25, 1.5, 1.25]; // simple pattern
  var idx = 0;
  bgMusic.interval = setInterval(function() {
    playBeep((baseFreq || 220) * notes[idx % notes.length], 0.2, 'triangle');
    idx++;
  }, 400);
}
function stopBGMusic() {
  if (bgMusic) { clearInterval(bgMusic.interval); bgMusic = null; }
}
`;
