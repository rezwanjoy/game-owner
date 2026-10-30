// Tiny synthesized sound effects, no audio files needed.
import { loadSave, writeSave } from './save.js';

let ctx = null;
let muted = loadSave().muted;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
  if (muted) return;
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
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  hop: (i = 0) => tone(500 + i * 90, 0.12, 'triangle', 0.16, 800 + i * 90),
  land: (i = 0) => tone(700 + i * 120, 0.09, 'sine', 0.2, 1100 + i * 120),
  cheer: () => [660, 830, 990, 1320].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, null, i * 0.07)),
  buzz: () => tone(170, 0.2, 'sawtooth', 0.08, 110),
  warn: () => tone(420, 0.12, 'square', 0.04, 380),
  lose: () => [440, 370, 311, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, f * 0.9, i * 0.14)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, null, i * 0.09)),
  isMuted: () => muted,
  toggleMute() {
    muted = !muted;
    writeSave({ muted });
    return muted;
  },
};
