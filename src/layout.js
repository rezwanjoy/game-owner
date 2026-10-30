export const GAME_W = 720;
export const GAME_H = 1280;
export const FONT = '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export function textStyle(size, color = '#ffffff', stroke = '#6b3a6b', strokeW = Math.round(size / 6)) {
  return { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke, strokeThickness: strokeW };
}

export function drawBackground(scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0xfde8f4, 0xfde8f4, 0xe3f0ff, 0xe3f0ff, 1);
  g.fillRect(0, 0, GAME_W, GAME_H);
  g.fillStyle(0xffffff, 0.35);
  [[90, 160, 70], [640, 90, 50], [620, 700, 90], [70, 980, 60], [400, 1210, 80]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
  return g;
}

// Rounded button: returns a container that calls onTap on release.
export function makeButton(scene, x, y, label, onTap, { w = 300, h = 96, color = 0xff7eb6, size = 40 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.15).fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 30);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 30);
  g.fillStyle(0xffffff, 0.25).fillRoundedRect(-w / 2 + 12, -h / 2 + 8, w - 24, h / 3, 18);
  const t = scene.add.text(0, -2, label, textStyle(size)).setOrigin(0.5);
  c.add([g, t]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.94));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); onTap(); });
  return c;
}
