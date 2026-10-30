import Phaser from 'phaser';
import { GAME_W, textStyle, drawBackground, makeButton, iconButton } from '../layout.js';
import { LEVEL_COUNT, isHard } from '../levels.js';
import { loadSave } from '../save.js';

const PER_PAGE = 25;

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('Levels'); }

  create(data) {
    const save = loadSave();
    const pages = Math.ceil(LEVEL_COUNT / PER_PAGE);
    const page = data.page ?? Math.floor((Math.min(save.unlocked, LEVEL_COUNT) - 1) / PER_PAGE);
    drawBackground(this);

    iconButton(this, 70, 60, '⬅️', () => this.scene.start('Menu'));
    this.add.text(GAME_W / 2, 60, 'Levels', textStyle(56)).setOrigin(0.5);
    const total = Object.values(save.stars).reduce((a, b) => a + b, 0);
    this.add.text(GAME_W / 2, 130, `⭐ ${total} / ${LEVEL_COUNT * 3}`, textStyle(32, '#ffd447')).setOrigin(0.5);

    for (let k = 0; k < PER_PAGE; k++) {
      const n = page * PER_PAGE + k + 1;
      if (n > LEVEL_COUNT) break;
      const x = 120 + (k % 5) * 120;
      const y = 260 + Math.floor(k / 5) * 160;
      const open = n <= save.unlocked;
      const color = !open ? 0xc9c4dc : isHard(n) ? 0xff5d5d : 0x5fb4ff;
      const b = makeButton(this, x, y, open ? String(n) : '🔒', () => open && this.scene.start('Game', { level: n }), { w: 104, h: 104, size: open ? 40 : 32, color });
      if (!open) b.disableInteractive();
      const stars = save.stars[n] || 0;
      if (open) this.add.text(x, y + 72, '★'.repeat(stars) + '☆'.repeat(3 - stars), textStyle(26, '#ffc83d', '#6b3a6b', 4)).setOrigin(0.5);
    }

    this.add.text(GAME_W / 2, 1080, 'Red levels are hard levels', textStyle(26, '#ffffff', '#6b3a6b', 4)).setOrigin(0.5);
    if (page > 0) iconButton(this, 120, 1180, '◀️', () => this.scene.restart({ page: page - 1 }), { size: 100 });
    if (page < pages - 1) iconButton(this, GAME_W - 120, 1180, '▶️', () => this.scene.restart({ page: page + 1 }), { size: 100 });
    this.add.text(GAME_W / 2, 1180, `${page + 1} / ${pages}`, textStyle(34)).setOrigin(0.5);
  }
}
