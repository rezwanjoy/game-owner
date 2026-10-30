// Synthesized sound effects, background music and vibration. No audio files needed.
import { loadSave, writeSave } from './save.js';

let ctx = null;
let master = null;
const settings = (() => {
  const s = loadSave();
  return { muted: s.muted, music: s.music, vibrate: s.vibrate };
})();

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0, out = null) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(out || master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const fx = (fn) => (...args) => { if (!settings.muted) fn(...args); };

export const sfx = {
  hop: fx((i = 0) => tone(500 + i * 90, 0.12, 'triangle', 0.16, 800 + i * 90)),
  land: fx((i = 0) => tone(700 + i * 120, 0.09, 'sine', 0.2, 1100 + i * 120)),
  cheer: fx(() => [660, 830, 990, 1320].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, null, i * 0.07))),
  buzz: fx(() => tone(170, 0.2, 'sawtooth', 0.08, 110)),
  warn: fx(() => tone(420, 0.12, 'square', 0.04, 380)),
  click: fx(() => tone(900, 0.05, 'sine', 0.12, 1200)),
  coin: fx(() => [1320, 1760].forEach((f, i) => tone(f, 0.1, 'square', 0.05, null, i * 0.06))),
  magic: fx(() => [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, f * 1.5, i * 0.05))),
  lose: fx(() => [440, 370, 311, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, f * 0.9, i * 0.14))),
  win: fx(() => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, null, i * 0.09))),
  isMuted: () => settings.muted,
  toggleMute() {
    settings.muted = !settings.muted;
    writeSave({ muted: settings.muted });
    return settings.muted;
  },
};

// Short vibration on phones that support it.
export const haptics = {
  buzz(ms = 15) {
    if (settings.vibrate && navigator.vibrate) navigator.vibrate(ms);
  },
  isOn: () => settings.vibrate,
  toggle() {
    settings.vibrate = !settings.vibrate;
    writeSave({ vibrate: settings.vibrate });
    return settings.vibrate;
  },
};

// A gentle looping tune, scheduled a little ahead of time with Web Audio.
const BPM = 104;
const STEP = 60 / BPM / 2;
const MELODY = [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 12, 9, 7, 4, -1, 5, 9, 12, 9, 7, 4, 2, 4, 0, 2, 4, 7, 4, 2, 0, -1];
const BASS = [0, 0, 5, 5, 7, 7, 0, 0];
const ROOT = 392; // G4
let musicGain = null;
let timer = null;
let nextTime = 0;
let step = 0;

const freq = (semi, base = ROOT) => base * Math.pow(2, semi / 12);

function schedule() {
  const a = audio();
  while (nextTime < a.currentTime + 0.25) {
    const delay = Math.max(0, nextTime - a.currentTime);
    const m = MELODY[step % MELODY.length];
    if (m >= 0) tone(freq(m), STEP * 1.6, 'triangle', 0.05, null, delay, musicGain);
    if (step % 4 === 0) tone(freq(BASS[(step / 4) % BASS.length], ROOT / 4), STEP * 3.5, 'sine', 0.09, null, delay, musicGain);
    nextTime += STEP;
    step++;
  }
}

export const music = {
  start() {
    if (!settings.music || timer) return;
    const a = audio();
    if (!a) return;
    musicGain = a.createGain();
    musicGain.gain.value = 0.8;
    musicGain.connect(master);
    nextTime = a.currentTime + 0.05;
    timer = setInterval(schedule, 60);
  },
  stop() {
    clearInterval(timer);
    timer = null;
    if (musicGain) musicGain.disconnect();
    musicGain = null;
  },
  isOn: () => settings.music,
  toggle() {
    settings.music = !settings.music;
    writeSave({ music: settings.music });
    if (settings.music) music.start();
    else music.stop();
    return settings.music;
  },
};

// Browsers only allow sound after the player interacts, and music should
// pause while the tab is hidden.
export function initAudio() {
  const unlock = () => {
    audio();
    music.start();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}
