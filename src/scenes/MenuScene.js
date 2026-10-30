import Phaser from 'phaser';
import { GAME_W, textStyle, drawBackground, makeButton, iconButton, showPanel, addToggles } from '../layout.js';
import { critterKey } from '../art.js';
import { LEVEL_COUNT } from '../levels.js';
import { loadSave } from '../save.js';
import { sfx, music, haptics } from '../sfx.js';
import { purchases } from '../ads.js';

export const VERSION = '1.0.0';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const save = loadSave();
    drawBackground(this);

    this.add.text(GAME_W / 2, 230, 'Belt', textStyle(120, '#ff7eb6', '#ffffff', 16)).setOrigin(0.5);
    this.add.text(GAME_W / 2, 350, 'Buddies', textStyle(120, '#5fb4ff', '#ffffff', 16)).setOrigin(0.5);

    [0, 1, 2, 3, 4].forEach((c, i) => {
      const s = this.add.image(160 + i * 100, 510, critterKey(c)).setScale(0.9);
      this.tweens.add({ targets: s, y: 480, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 120 });
    });

    const next = Math.min(save.unlocked, LEVEL_COUNT);
    const play = makeButton(this, GAME_W / 2, 680, `Play  Level ${next}`, () => this.scene.start('Game', { level: next }), { w: 460, h: 120, size: 46 });
    this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    makeButton(this, GAME_W / 2 - 115, 830, 'Levels', () => this.scene.start('Levels'), { w: 210, h: 100, size: 36, color: 0x5fb4ff });
    makeButton(this, GAME_W / 2 + 115, 830, 'Closet', () => this.scene.start('Closet'), { w: 210, h: 100, size: 36, color: 0xb38cff });

    this.add.text(40, 44, `🪙 ${save.coins}`, textStyle(38, '#ffd447')).setOrigin(0, 0.5);
    iconButton(this, GAME_W - 70, 50, '⚙️', () => this.openSettings());

    this.add.text(GAME_W / 2, 1220, `v${VERSION}`, textStyle(24, '#b58fb5', '#ffffff', 4)).setOrigin(0.5);
  }

  openSettings() {
    sfx.click();
    let panel = null;
    const buttons = [];
    if (!loadSave().noAds) {
      buttons.push(['Remove Ads', async () => {
        if (!purchases.available()) {
          panel.destroy();
          this.notice('Remove Ads', 'Available in the\nAndroid app.');
          return;
        }
        if (await purchases.removeAds()) this.scene.restart();
      }, 0xffd447]);
    }
    buttons.push(['Close', () => panel.destroy(), 0x5fb4ff]);
    panel = showPanel(this, {
      title: 'Settings',
      contentH: 150,
      content: (c, y) => addToggles(this, c, y + 60, [
        ['🔊', '🔇', () => !sfx.isMuted(), () => !sfx.toggleMute()],
        ['🎵', '🚫', music.isOn, music.toggle],
        ['📳', '📴', haptics.isOn, haptics.toggle],
      ]),
      buttons,
    });
  }

  notice(title, text) {
    const p = showPanel(this, { title, subtitle: text, buttons: [['OK', () => p.destroy(), 0x5fb4ff]] });
  }
}
