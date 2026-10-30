import Phaser from 'phaser';
import { GAME_W, textStyle, drawBackground, iconButton } from '../layout.js';
import { SKINS, previewKey, useSkin } from '../art.js';
import { loadSave, writeSave } from '../save.js';
import { sfx } from '../sfx.js';

// Shop where coins unlock hats that every critter wears.
export class ClosetScene extends Phaser.Scene {
  constructor() { super('Closet'); }

  create() {
    const save = loadSave();
    drawBackground(this);
    iconButton(this, 70, 60, '⬅️', () => this.scene.start('Menu'));
    this.add.text(GAME_W / 2, 60, 'Closet', textStyle(56)).setOrigin(0.5);
    this.add.text(GAME_W - 40, 60, `🪙 ${save.coins}`, textStyle(36, '#ffd447')).setOrigin(1, 0.5);
    this.add.text(GAME_W / 2, 140, 'Unlock outfits for your critters!', textStyle(28, '#ffffff', '#6b3a6b', 4)).setOrigin(0.5);

    SKINS.forEach((skin, i) => {
      const x = GAME_W / 2 + (i % 2 === 0 ? -150 : 150);
      const y = 300 + Math.floor(i / 2) * 230;
      const owned = save.skins.includes(skin.id);
      const worn = save.skin === skin.id;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.1).fillRoundedRect(-130, -96, 260, 200, 30);
      g.fillStyle(worn ? 0xfff4c2 : 0xffffff).fillRoundedRect(-130, -100, 260, 200, 30);
      if (worn) g.lineStyle(6, 0xffc83d).strokeRoundedRect(-130, -100, 260, 200, 30);
      const img = this.add.image(0, -30, previewKey(this, skin.id, i % 8)).setScale(1.05);
      const name = this.add.text(0, 38, skin.name, textStyle(28, '#6b3a6b', '#ffffff', 0)).setOrigin(0.5);
      const label = worn ? 'Wearing' : owned ? 'Wear' : `🪙 ${skin.price}`;
      const tag = this.add.text(0, 76, label, textStyle(28, owned ? '#5fb4ff' : '#ff9f45', '#ffffff', 0)).setOrigin(0.5);
      if (!owned && save.coins < skin.price) c.setAlpha(0.6);
      c.add([g, img, name, tag]);
      c.setSize(260, 200).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.choose(skin, c));
    });
  }

  choose(skin, card) {
    const save = loadSave();
    if (save.skins.includes(skin.id)) {
      if (save.skin === skin.id) return;
      sfx.click();
    } else if (save.coins >= skin.price) {
      writeSave({ coins: save.coins - skin.price, skins: [...save.skins, skin.id] });
      sfx.coin();
      sfx.magic();
    } else {
      sfx.buzz();
      this.tweens.add({ targets: card, x: card.x + 10, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    writeSave({ skin: skin.id });
    useSkin(this, skin.id);
    this.scene.restart();
  }
}
