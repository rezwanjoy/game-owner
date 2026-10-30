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

// Round icon button with an emoji label.
export function iconButton(scene, x, y, icon, onTap, { size = 88, color = 0xffffff } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.12).fillCircle(0, 5, size / 2);
  g.fillStyle(color, 0.95).fillCircle(0, 0, size / 2);
  const t = scene.add.text(0, 0, icon, { fontSize: `${Math.round(size * 0.5)}px` }).setOrigin(0.5);
  c.add([g, t]);
  c.setSize(size, size).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.9));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); onTap(); });
  c.label = t;
  return c;
}

// Modal card with a title, optional subtitle, optional custom content and
// a column of buttons ([label, onTap, color]). Returns the container.
export function showPanel(scene, { title, subtitle = null, buttons = [], titleColor = '#ff7eb6', content = null, contentH = 0 }) {
  const c = scene.add.container(0, 0).setDepth(200);
  const dim = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x3a2a3a, 0.5).setInteractive();
  const h = 150 + (subtitle ? 70 : 0) + contentH + buttons.length * 118 + 30;
  const top = GAME_H / 2 - h / 2;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff).fillRoundedRect(70, top, GAME_W - 140, h, 44);
  c.add([dim, g]);
  c.add(scene.add.text(GAME_W / 2, top + 80, title, textStyle(54, titleColor, '#6b3a6b', 8)).setOrigin(0.5));
  let y = top + 150;
  if (subtitle) {
    c.add(scene.add.text(GAME_W / 2, y + 10, subtitle, { ...textStyle(34, '#6b3a6b', '#ffffff', 2), align: 'center' }).setOrigin(0.5));
    y += 70;
  }
  if (content) {
    content(c, y);
    y += contentH;
  }
  buttons.forEach(([label, cb, color], i) => c.add(makeButton(scene, GAME_W / 2, y + 50 + i * 118, label, cb, { w: 440, color })));
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, duration: 180 });
  return c;
}

// A row of on/off toggles (sound, music, vibration) for settings and pause panels.
export function addToggles(scene, container, y, toggles) {
  const spacing = 150;
  toggles.forEach(([onIcon, offIcon, isOn, toggle], i) => {
    const x = GAME_W / 2 + (i - (toggles.length - 1) / 2) * spacing;
    const b = iconButton(scene, x, y, isOn() ? onIcon : offIcon, () => {
      b.label.setText(toggle() ? onIcon : offIcon);
    }, { size: 104, color: 0xf3e8f7 });
    container.add(b);
  });
}
