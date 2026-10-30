import Phaser from 'phaser';
import { GAME_W, textStyle, drawBackground, makeButton } from '../layout.js';
import { critterKey } from '../art.js';
import { LEVEL_COUNT } from '../levels.js';
import { loadSave } from '../save.js';
import { sfx } from '../sfx.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const save = loadSave();
    drawBackground(this);

    this.add.text(GAME_W / 2, 190, 'Belt', textStyle(120, '#ff7eb6', '#ffffff', 16)).setOrigin(0.5);
    this.add.text(GAME_W / 2, 310, 'Buddies', textStyle(120, '#5fb4ff', '#ffffff', 16)).setOrigin(0.5);

    [0, 1, 2, 3, 4].forEach((c, i) => {
      const s = this.add.image(160 + i * 100, 470, critterKey(c)).setScale(0.9);
      this.tweens.add({ targets: s, y: 440, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 120 });
    });

    const next = Math.min(save.unlocked, LEVEL_COUNT);
    makeButton(this, GAME_W / 2, 620, `Play  Level ${next}`, () => this.scene.start('Game', { level: next }), { w: 420, h: 110, size: 44 });

    this.add.text(GAME_W / 2, 740, 'Levels', textStyle(40, '#ffffff')).setOrigin(0.5);
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const x = 120 + ((n - 1) % 5) * 120;
      const y = 840 + Math.floor((n - 1) / 5) * 130;
      const open = n <= save.unlocked;
      const b = makeButton(this, x, y, open ? String(n) : '🔒', () => open && this.scene.start('Game', { level: n }),
        { w: 100, h: 100, size: open ? 42 : 34, color: open ? 0x5fb4ff : 0xc9c4dc });
      if (!open) b.disableInteractive();
    }

    this.add.text(40, 40, `🪙 ${save.coins}`, textStyle(36, '#ffd447')).setOrigin(0, 0);
    const mute = this.add.text(GAME_W - 40, 40, sfx.isMuted() ? '🔇' : '🔊', { fontSize: '44px' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    mute.on('pointerup', () => mute.setText(sfx.toggleMute() ? '🔇' : '🔊'));

    this.add.text(GAME_W / 2, 1200, 'Prototype v0.1', textStyle(24, '#b58fb5', '#ffffff', 4)).setOrigin(0.5);
  }
}
