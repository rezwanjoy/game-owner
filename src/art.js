// All art is drawn in code and baked into textures at boot.
export const COLORS = [0xff7eb6, 0x5fb4ff, 0xffd447, 0x6fdc7a, 0xb38cff, 0xff9f45, 0x3fd6c8, 0xff5d5d];
export const COLOR_NAMES = ['Pink', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'Teal', 'Red'];
const INK = 0x3a2a3a;
const SIZE = 96;

export function shade(color, amt) {
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

function drawEars(g, color, variant) {
  const dark = shade(color, -0.35);
  g.fillStyle(color).lineStyle(4, dark);
  switch (variant % 4) {
    case 0: // cat
      g.fillTriangle(18, 38, 24, 8, 44, 26).strokeTriangle(18, 38, 24, 8, 44, 26);
      g.fillTriangle(78, 38, 72, 8, 52, 26).strokeTriangle(78, 38, 72, 8, 52, 26);
      break;
    case 1: // bunny
      g.fillEllipse(34, 20, 18, 38).strokeEllipse(34, 20, 18, 38);
      g.fillEllipse(62, 20, 18, 38).strokeEllipse(62, 20, 18, 38);
      break;
    case 2: // antenna
      g.lineStyle(4, dark).lineBetween(48, 26, 48, 8);
      g.fillStyle(shade(color, 0.4)).fillCircle(48, 9, 8).strokeCircle(48, 9, 8);
      break;
    default: // bear
      g.fillCircle(24, 26, 13).strokeCircle(24, 26, 13);
      g.fillCircle(72, 26, 13).strokeCircle(72, 26, 13);
  }
}

function drawBody(g, color) {
  const cx = 48, cy = 56;
  g.fillStyle(0x000000, 0.12).fillEllipse(cx, 90, 64, 10);
  g.fillStyle(shade(color, -0.35)).fillEllipse(cx, cy + 1, 84, 76);
  g.fillStyle(color).fillEllipse(cx, cy, 78, 70);
  g.fillStyle(0xffffff, 0.35).fillEllipse(cx - 16, cy - 20, 24, 14);
  g.fillStyle(0xff6f91, 0.45).fillEllipse(24, 64, 14, 8).fillEllipse(72, 64, 14, 8);
}

function drawFace(g, mood) {
  if (mood === 'sleep' || mood === 'joy') {
    g.lineStyle(4, INK);
    // sleep = eyes curved down, joy = ^ ^
    const [a0, a1] = mood === 'sleep' ? [0.1 * Math.PI, 0.9 * Math.PI] : [1.1 * Math.PI, 1.9 * Math.PI];
    [34, 62].forEach((x) => { g.beginPath(); g.arc(x, mood === 'sleep' ? 46 : 54, 8, a0, a1, false); g.strokePath(); });
  } else {
    const py = mood === 'worried' ? 46 : 52;
    g.fillStyle(0xffffff).fillCircle(34, 50, 11).fillCircle(62, 50, 11);
    g.fillStyle(INK).fillCircle(35, py, 6).fillCircle(61, py, 6);
    g.fillStyle(0xffffff).fillCircle(37, py - 2, 2.5).fillCircle(63, py - 2, 2.5);
  }
  if (mood === 'worried') {
    g.lineStyle(3.5, INK).lineBetween(24, 38, 40, 33).lineBetween(72, 38, 56, 33);
    g.fillStyle(INK).fillEllipse(48, 68, 10, 12);
    g.fillStyle(0x9fd8ff).fillCircle(80, 40, 5).fillTriangle(75, 39, 85, 39, 80, 30);
  } else if (mood === 'joy') {
    g.fillStyle(INK); g.beginPath(); g.arc(48, 62, 9, 0, Math.PI, false); g.closePath(); g.fillPath();
  } else if (mood === 'sleep') {
    g.lineStyle(3, INK).lineBetween(44, 66, 52, 66);
    g.lineStyle(3, 0x7d7d9a).lineBetween(70, 14, 80, 14).lineBetween(80, 14, 70, 24).lineBetween(70, 24, 80, 24);
  } else {
    g.lineStyle(3.5, INK); g.beginPath(); g.arc(48, 61, 7, 0.15 * Math.PI, 0.85 * Math.PI, false); g.strokePath();
  }
}

function bake(scene, key, color, variant, mood) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  drawEars(g, color, variant);
  drawBody(g, color);
  drawFace(g, mood);
  g.generateTexture(key, SIZE, SIZE);
  g.destroy();
}

export function critterKey(color, mood = 'happy') {
  return `critter_${color}_${mood}`;
}

export function makeTextures(scene) {
  COLORS.forEach((c, i) => ['happy', 'worried', 'joy'].forEach((m) => bake(scene, critterKey(i, m), c, i, m)));
  bake(scene, 'critter_sleep', 0xc9c4dc, 3, 'sleep');
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff).fillCircle(8, 8, 8);
  g.generateTexture('dot', 16, 16);
  g.clear().fillStyle(0xffffff).fillRect(0, 0, 14, 8);
  g.generateTexture('confetti', 14, 8);
  g.destroy();
}
