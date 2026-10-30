// All art is drawn in code and baked into textures at boot.
export const COLORS = [0xff7eb6, 0x5fb4ff, 0xffd447, 0x6fdc7a, 0xb38cff, 0xff9f45, 0x3fd6c8, 0xff5d5d];
export const COLOR_NAMES = ['Pink', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'Teal', 'Red'];
const INK = 0x3a2a3a;
const SIZE = 96;

// Hats and accessories every critter wears once unlocked in the Closet.
export const SKINS = [
  { id: 'classic', name: 'Classic', price: 0 },
  { id: 'party', name: 'Party Hat', price: 60 },
  { id: 'bow', name: 'Bow', price: 100 },
  { id: 'flower', name: 'Flower', price: 150 },
  { id: 'shades', name: 'Shades', price: 200 },
  { id: 'chef', name: 'Chef Hat', price: 260 },
  { id: 'phones', name: 'Headphones', price: 330 },
  { id: 'crown', name: 'Crown', price: 400 },
];

let currentSkin = 'classic';

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

function drawAccessory(g, skin) {
  switch (skin) {
    case 'party':
      g.fillStyle(0xfff6d8).lineStyle(3, INK).fillTriangle(29, 30, 67, 30, 48, 4).strokeTriangle(29, 30, 67, 30, 48, 4);
      g.fillStyle(0xff5d8f).fillCircle(42, 22, 3.5).fillCircle(53, 15, 3.5);
      g.fillStyle(0x3fa7ff).fillCircle(55, 24, 3.5).fillCircle(46, 11, 3);
      g.fillStyle(0xffc83d).fillCircle(48, 6, 6).strokeCircle(48, 6, 6);
      break;
    case 'bow':
      g.fillStyle(0xff3d6e).lineStyle(3, INK);
      g.fillTriangle(66, 24, 52, 13, 52, 35).strokeTriangle(66, 24, 52, 13, 52, 35);
      g.fillTriangle(66, 24, 80, 13, 80, 35).strokeTriangle(66, 24, 80, 13, 80, 35);
      g.fillStyle(0xffd0dc).fillCircle(66, 24, 5).strokeCircle(66, 24, 5);
      break;
    case 'flower':
      g.fillStyle(0xffffff).lineStyle(2.5, INK);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.fillCircle(66 + Math.cos(a) * 8, 22 + Math.sin(a) * 8, 6).strokeCircle(66 + Math.cos(a) * 8, 22 + Math.sin(a) * 8, 6);
      }
      g.fillStyle(0xffc83d).fillCircle(66, 22, 6).strokeCircle(66, 22, 6);
      break;
    case 'shades':
      g.fillStyle(0x2a2233).fillRoundedRect(20, 41, 26, 18, 7).fillRoundedRect(50, 41, 26, 18, 7);
      g.lineStyle(4, 0x2a2233).lineBetween(44, 47, 52, 47);
      g.fillStyle(0xffffff, 0.5).fillRect(25, 44, 8, 3).fillRect(55, 44, 8, 3);
      break;
    case 'chef':
      g.fillStyle(0xffffff).lineStyle(3, INK);
      g.fillRect(34, 20, 28, 12).strokeRect(34, 20, 28, 12);
      [[38, 17], [48, 12], [58, 17]].forEach(([x, y]) => g.fillCircle(x, y, 10).strokeCircle(x, y, 10));
      g.fillRect(37, 17, 22, 10);
      break;
    case 'phones':
      g.lineStyle(6, 0x4a4458);
      g.beginPath(); g.arc(48, 52, 38, Math.PI * 1.08, Math.PI * 1.92, false); g.strokePath();
      g.fillStyle(0xff5d8f).lineStyle(3, INK).fillRoundedRect(4, 40, 16, 26, 7).fillRoundedRect(76, 40, 16, 26, 7);
      g.strokeRoundedRect(4, 40, 16, 26, 7).strokeRoundedRect(76, 40, 16, 26, 7);
      break;
    case 'crown':
      g.fillStyle(0xffc83d).lineStyle(3, INK);
      g.fillPoints([{ x: 30, y: 28 }, { x: 30, y: 10 }, { x: 39, y: 19 }, { x: 48, y: 4 }, { x: 57, y: 19 }, { x: 66, y: 10 }, { x: 66, y: 28 }], true);
      g.strokePoints([{ x: 30, y: 28 }, { x: 30, y: 10 }, { x: 39, y: 19 }, { x: 48, y: 4 }, { x: 57, y: 19 }, { x: 66, y: 10 }, { x: 66, y: 28 }], true);
      g.fillStyle(0xff5d8f).fillCircle(48, 20, 4);
      break;
    default:
  }
}

function bake(scene, key, color, variant, mood, skin = currentSkin) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  drawEars(g, color, variant);
  drawBody(g, color);
  drawFace(g, mood);
  drawAccessory(g, skin);
  g.generateTexture(key, SIZE, SIZE);
  g.destroy();
}

export function critterKey(color, mood = 'happy') {
  return `critter_${currentSkin}_${color}_${mood}`;
}

export function sleepKey() {
  return `critter_${currentSkin}_sleep`;
}

// Bakes every critter texture for a skin (once) and makes it the current one.
export function useSkin(scene, skin) {
  currentSkin = skin;
  COLORS.forEach((c, i) => ['happy', 'worried', 'joy'].forEach((m) => bake(scene, critterKey(i, m), c, i, m)));
  bake(scene, sleepKey(), 0xc9c4dc, 3, 'sleep');
}

// One small preview per skin for the Closet.
export function previewKey(scene, skin, color) {
  const key = `preview_${skin}_${color}`;
  bake(scene, key, COLORS[color], color, 'happy', skin);
  return key;
}

export function makeTextures(scene, skin) {
  useSkin(scene, skin);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff).fillCircle(8, 8, 8);
  g.generateTexture('dot', 16, 16);
  g.clear().fillStyle(0xffffff).fillRect(0, 0, 14, 8);
  g.generateTexture('confetti', 14, 8);
  g.destroy();
}
