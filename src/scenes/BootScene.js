import Phaser from 'phaser';
import { makeTextures } from '../art.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    makeTextures(this);
    this.scene.start('Menu');
  }
}
