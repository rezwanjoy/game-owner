import Phaser from 'phaser';
import { makeTextures } from '../art.js';
import { loadSave } from '../save.js';
import { initAudio } from '../sfx.js';
import { GAME_W, GAME_H, textStyle, drawBackground } from '../layout.js';

// Loading screen: shows the title and a progress bar while textures bake.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    drawBackground(this);
    this.add.text(GAME_W / 2, GAME_H / 2 - 120, 'Belt Buddies', textStyle(84, '#ff7eb6', '#ffffff', 12)).setOrigin(0.5);
    const bar = this.add.graphics();
    const draw = (p) => {
      bar.clear();
      bar.fillStyle(0xffffff).fillRoundedRect(160, GAME_H / 2, 400, 34, 17);
      bar.fillStyle(0x5fb4ff).fillRoundedRect(166, GAME_H / 2 + 6, Math.max(22, 388 * p), 22, 11);
    };
    draw(0.1);
    initAudio();
    // Let the first frame paint before the (brief) texture work.
    this.time.delayedCall(30, () => {
      makeTextures(this, loadSave().skin);
      draw(1);
      this.time.delayedCall(250, () => this.scene.start('Menu'));
    });
  }
}
