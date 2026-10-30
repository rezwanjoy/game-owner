import Phaser from 'phaser';
import { GAME_W, GAME_H, textStyle, drawBackground, makeButton } from '../layout.js';
import { COLORS, critterKey, shade } from '../art.js';
import { getLevel, LEVEL_COUNT, DOCK_COUNT } from '../levels.js';
import { loadSave, writeSave } from '../save.js';
import { sfx } from '../sfx.js';

// Belt is a stadium-shaped loop; critters ride it clockwise.
const BELT = { x1: 200, x2: 520, cy: 500, r: 116 };
BELT.top = BELT.cy - BELT.r;
BELT.bot = BELT.cy + BELT.r;
const STRAIGHT = BELT.x2 - BELT.x1;
const PERIM = 2 * STRAIGHT + 2 * Math.PI * BELT.r;
const ENTRY = { x: GAME_W / 2, y: BELT.bot };

const DOCK_Y = 236;
const DOCK_XS = [160, 360, 560];
const SEATS = 3;

const LANE_TOP = 770;
const ROW_H = 92;
const MAX_ROWS = 5;

const LANE_SCALE = 0.82;
const BELT_SCALE = 0.72;
const SEAT_SCALE = 0.5;

function beltPoint(d) {
  d = ((d % PERIM) + PERIM) % PERIM;
  const { x1, x2, cy, r, top, bot } = BELT;
  if (d < STRAIGHT) return { x: x1 + d, y: top };
  d -= STRAIGHT;
  if (d < Math.PI * r) {
    const a = -Math.PI / 2 + d / r;
    return { x: x2 + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }
  d -= Math.PI * r;
  if (d < STRAIGHT) return { x: x2 - d, y: bot };
  d -= STRAIGHT;
  const a = Math.PI / 2 + d / r;
  return { x: x1 + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create(data) {
    this.levelNum = data.level || 1;
    this.lv = getLevel(this.levelNum);
    this.state = 'playing';
    this.offset = 0;
    this.homesDone = 0;
    this.usedExtraSlots = false;
    this.wasDanger = false;
    this.previewG = null;
    this.tip = null;
    this.panel = null;

    drawBackground(this);
    this.beltG = this.add.graphics();

    this.slots = Array.from({ length: this.lv.capacity }, () => ({ critter: null, state: 'empty' }));
    this.homeQueue = this.lv.homes.slice();
    this.docks = DOCK_XS.slice(0, DOCK_COUNT).map((x) => ({ x, y: DOCK_Y, state: 'empty', color: -1, reserved: 0, filled: 0, container: null, sprites: [] }));
    this.docks.forEach((d, i) => this.spawnDock(d, i * 120));

    this.buildLanes();
    this.buildHud();

    this.confetti = this.add.particles(0, 0, 'confetti', {
      speed: { min: 250, max: 650 }, angle: { min: 200, max: 340 }, gravityY: 900,
      lifespan: 1400, rotate: { min: 0, max: 360 }, scale: { start: 1.2, end: 0.6 },
      tint: COLORS, emitting: false,
    }).setDepth(50);
    this.puffs = this.add.particles(0, 0, 'dot', {
      speed: { min: 80, max: 220 }, lifespan: 450, scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(40);

    this.input.on('pointerdown', this.onPointer, this);

    if (this.lv.tip) this.showTip(this.lv.tip);
  }

  // ---------- Layout pieces ----------

  buildHud() {
    this.add.text(36, 34, `Level ${this.levelNum}`, textStyle(40)).setDepth(60);
    const home = this.add.text(GAME_W - 36, 30, '🏠', { fontSize: '48px' }).setOrigin(1, 0).setDepth(60).setInteractive({ useHandCursor: true });
    home.on('pointerup', () => this.scene.start('Menu'));
    const retry = this.add.text(GAME_W - 116, 30, '🔄', { fontSize: '48px' }).setOrigin(1, 0).setDepth(60).setInteractive({ useHandCursor: true });
    retry.on('pointerup', () => this.scene.restart({ level: this.levelNum }));

    this.add.text(36, 112, 'Next', textStyle(28, '#ffffff')).setOrigin(0, 0.5);
    this.previewG = this.add.graphics();
    this.progressText = this.add.text(GAME_W - 36, 112, '', textStyle(28)).setOrigin(1, 0.5);

    this.beltLabel = this.add.text(GAME_W / 2, BELT.cy - 14, '', textStyle(44, '#ffffff')).setOrigin(0.5).setDepth(5);
    this.beltSub = this.add.text(GAME_W / 2, BELT.cy + 32, 'on belt', textStyle(24, '#ffffff', '#6b3a6b', 4)).setOrigin(0.5).setDepth(5);
    this.refreshPreview();
  }

  refreshPreview() {
    const g = this.previewG.clear();
    this.homeQueue.slice(0, 6).forEach((c, i) => {
      const x = 130 + i * 52;
      g.fillStyle(shade(COLORS[c], -0.35)).fillCircle(x, 114, 19);
      g.fillStyle(COLORS[c]).fillCircle(x, 112, 17);
    });
    if (this.homeQueue.length > 6) g.fillStyle(0xffffff, 0.8).fillCircle(130 + 6 * 52, 112, 6);
    this.progressText.setText(`${this.homesDone}/${this.lv.homes.length} 🚌`);
  }

  buildLanes() {
    const n = this.lv.lanes.length;
    const spacing = Math.min(150, 640 / n);
    this.laneSpacing = spacing;
    this.laneXs = Array.from({ length: n }, (_, i) => GAME_W / 2 + (i - (n - 1) / 2) * spacing);
    const g = this.add.graphics();
    this.laneXs.forEach((x) => {
      g.fillStyle(0xffffff, 0.45).fillRoundedRect(x - spacing / 2 + 8, LANE_TOP - 56, spacing - 16, MAX_ROWS * ROW_H + 70, 34);
    });
    this.lanes = this.lv.lanes.map((lane) => lane.map((c) => ({ color: c.color, sleepy: c.sleepy, sprite: null })));
    this.laneBadges = this.laneXs.map((x) => this.add.text(x, LANE_TOP + MAX_ROWS * ROW_H + 26, '', textStyle(30)).setOrigin(0.5));
    this.lanes.forEach((_, l) => this.refreshLane(l, false));
  }

  refreshLane(l, animate) {
    const lane = this.lanes[l];
    lane.forEach((c, r) => {
      if (r >= MAX_ROWS) return;
      if (r === 0 && c.sleepy) {
        c.sleepy = false;
        if (c.sprite) { c.sprite.setTexture(critterKey(c.color)); this.squash(c.sprite, LANE_SCALE); }
      }
      const x = this.laneXs[l];
      const y = LANE_TOP + r * ROW_H;
      if (!c.sprite) {
        c.sprite = this.add.image(x, y + (animate ? ROW_H : 0), c.sleepy ? 'critter_sleep' : critterKey(c.color)).setScale(LANE_SCALE).setDepth(8);
        if (animate) c.sprite.setAlpha(0);
      }
      if (animate) this.tweens.add({ targets: c.sprite, x, y, alpha: 1, duration: 220, ease: 'Back.easeOut' });
      else c.sprite.setPosition(x, y);
    });
    const hidden = lane.length - MAX_ROWS;
    this.laneBadges[l].setText(hidden > 0 ? `+${hidden}` : '');
  }

  makeDock(color) {
    const c = this.add.container(0, 0).setDepth(6);
    const base = COLORS[color];
    const dark = shade(base, -0.4);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12).fillRoundedRect(-84, -44, 168, 104, 24);
    g.fillStyle(dark).fillCircle(-46, 50, 14).fillCircle(46, 50, 14);
    g.fillStyle(0xeeeeee).fillCircle(-46, 50, 6).fillCircle(46, 50, 6);
    g.fillStyle(dark).fillRoundedRect(-86, -56, 172, 104, 26);
    g.fillStyle(shade(base, 0.2)).fillRoundedRect(-80, -50, 160, 92, 22);
    g.fillStyle(base).fillRoundedRect(-80, -50, 160, 26, { tl: 22, tr: 22, bl: 0, br: 0 });
    for (let k = 0; k < SEATS; k++) {
      g.fillStyle(dark, 0.3).fillCircle((k - 1) * 50, 8, 22);
    }
    c.add(g);
    return c;
  }

  seatPos(d, k) {
    return { x: d.x + (k - 1) * 50, y: d.y + 2 };
  }

  slotPos(i) {
    return beltPoint(this.offset + (i * PERIM) / this.slots.length);
  }

  // ---------- Docks ----------

  spawnDock(d, delay = 0) {
    if (!this.homeQueue.length) {
      d.state = 'empty';
      d.color = -1;
      return;
    }
    d.color = this.homeQueue.shift();
    d.reserved = 0;
    d.filled = 0;
    d.sprites = [];
    d.state = 'arriving';
    d.container = this.makeDock(d.color).setPosition(d.x, d.y - 300).setAlpha(0);
    this.tweens.add({
      targets: d.container, y: d.y, alpha: 1, duration: 420, delay, ease: 'Back.easeOut',
      onComplete: () => { d.state = 'ready'; },
    });
    if (this.previewG) this.refreshPreview();
  }

  deliver(i, d) {
    const slot = this.slots[i];
    const c = slot.critter;
    slot.critter = null;
    slot.state = 'empty';
    const seat = d.reserved++;
    const sp = c.sprite;
    const from = { x: sp.x, y: sp.y };
    const to = this.seatPos(d, seat);
    sp.setTexture(critterKey(c.color, 'joy')).setDepth(30);
    sfx.hop(seat);
    this.tweens.addCounter({
      from: 0, to: 1, duration: 320, ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue();
        sp.setPosition(Phaser.Math.Linear(from.x, to.x, t), Phaser.Math.Linear(from.y, to.y, t) - Math.sin(t * Math.PI) * 80);
        sp.setScale(Phaser.Math.Linear(BELT_SCALE, SEAT_SCALE, t));
      },
      onComplete: () => {
        sp.setDepth(7);
        d.sprites.push(sp);
        d.filled++;
        sfx.land(seat);
        this.puffs.setParticleTint(COLORS[c.color]);
        this.puffs.explode(8, to.x, to.y);
        this.squash(sp, SEAT_SCALE);
        if (d.filled === SEATS) this.departDock(d);
      },
    });
  }

  departDock(d) {
    d.state = 'departing';
    sfx.cheer();
    this.confetti.explode(36, d.x, d.y);
    const pop = this.add.text(d.x, d.y - 90, ['Yay!', 'Woo!', 'Nice!', 'Beep beep!'][Phaser.Math.Between(0, 3)], textStyle(40, '#ffffff')).setOrigin(0.5).setDepth(55);
    this.tweens.add({ targets: pop, y: pop.y - 70, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => pop.destroy() });
    const targets = [d.container, ...d.sprites];
    this.tweens.add({
      targets, scaleX: '*=1.12', scaleY: '*=0.9', duration: 120, yoyo: true,
      onComplete: () => this.tweens.add({
        targets, x: `+=${GAME_W}`, duration: 520, ease: 'Back.easeIn',
        onComplete: () => {
          targets.forEach((t) => t.destroy());
          d.sprites = [];
          this.homesDone++;
          this.refreshPreview();
          if (this.homesDone === this.lv.homes.length) this.win();
          else this.spawnDock(d);
        },
      }),
    });
  }

  // ---------- Input ----------

  onPointer(p) {
    if (this.state !== 'playing' || p.y < LANE_TOP - 70) return;
    let best = -1;
    let bestDx = this.laneSpacing / 2 + 10;
    this.laneXs.forEach((x, l) => {
      const dx = Math.abs(p.x - x);
      if (dx < bestDx) { bestDx = dx; best = l; }
    });
    if (best >= 0) this.tapLane(best);
  }

  tapLane(l) {
    const lane = this.lanes[l];
    if (!lane.length) return;
    const c = lane[0];
    const free = this.slots.map((s, i) => (s.state === 'empty' ? i : -1)).filter((i) => i >= 0);
    if (!free.length) {
      sfx.buzz();
      this.tweens.add({ targets: c.sprite, x: c.sprite.x + 10, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    const target = free.reduce((a, b) => {
      const pa = this.slotPos(a), pb = this.slotPos(b);
      return Phaser.Math.Distance.Between(pb.x, pb.y, ENTRY.x, ENTRY.y) < Phaser.Math.Distance.Between(pa.x, pa.y, ENTRY.x, ENTRY.y) ? b : a;
    });
    lane.shift();
    const slot = this.slots[target];
    slot.state = 'incoming';
    slot.critter = c;
    const sp = c.sprite.setDepth(20);
    const from = { x: sp.x, y: sp.y };
    sfx.hop();
    this.hideTip();
    this.tweens.addCounter({
      from: 0, to: 1, duration: 320, ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue();
        const p = this.slotPos(target);
        sp.setPosition(Phaser.Math.Linear(from.x, p.x, t), Phaser.Math.Linear(from.y, p.y, t) - Math.sin(t * Math.PI) * 100);
        sp.setScale(Phaser.Math.Linear(LANE_SCALE, BELT_SCALE, t));
      },
      onComplete: () => {
        if (slot.critter !== c) return;
        slot.state = 'on';
        sp.setDepth(10);
        this.squash(sp, BELT_SCALE);
      },
    });
    this.refreshLane(l, true);
  }

  // ---------- Loop ----------

  update(time, delta) {
    if (this.state === 'playing') this.offset += this.lv.speed * (delta / 1000);

    const occupied = this.slots.filter((s) => s.state !== 'empty').length;
    const free = this.slots.length - occupied;
    const danger = this.state === 'playing' && free <= 2;
    if (danger && !this.wasDanger) sfx.warn();
    this.wasDanger = danger;

    this.drawBelt(time, danger);
    this.beltLabel.setText(`${occupied}/${this.slots.length}`);
    this.beltLabel.setColor(danger ? '#ff5d5d' : '#ffffff');
    this.beltSub.setText(danger ? 'almost full!' : 'on belt');

    this.slots.forEach((s, i) => {
      if (s.state !== 'on') return;
      const p = this.slotPos(i);
      const sp = s.critter.sprite;
      sp.setPosition(p.x, p.y - 8 + Math.sin(time / 140 + i) * 3);
      const key = critterKey(s.critter.color, danger || this.state === 'lost' ? 'worried' : 'happy');
      if (sp.texture.key !== key) sp.setTexture(key);
      if (this.state !== 'playing' || p.y > BELT.top + 20) return;
      const d = this.docks.find((dk) => dk.state === 'ready' && dk.color === s.critter.color && dk.reserved < SEATS && Math.abs(p.x - dk.x) < 22);
      if (d) this.deliver(i, d);
    });

    this.lanes.forEach((lane, l) => {
      if (lane[0] && lane[0].sprite && !this.tweens.isTweening(lane[0].sprite)) {
        lane[0].sprite.setScale(LANE_SCALE * (1 + 0.04 * Math.sin(time / 180 + l)));
      }
    });

    this.checkJam();
  }

  drawBelt(time, danger) {
    const g = this.beltG.clear();
    const { x1, x2, cy, r, top, bot } = BELT;
    const path = (w, color, alpha = 1) => {
      g.lineStyle(w, color, alpha);
      g.beginPath();
      g.moveTo(x1, top);
      g.lineTo(x2, top);
      g.arc(x2, cy, r, -Math.PI / 2, Math.PI / 2, false);
      g.lineTo(x1, bot);
      g.arc(x1, cy, r, Math.PI / 2, Math.PI * 1.5, false);
      g.closePath();
      g.strokePath();
    };
    const pulse = danger ? 0.5 + 0.5 * Math.sin(time / 90) : 0;
    path(96, 0x000000, 0.1);
    path(88, danger ? Phaser.Display.Color.GetColor(Math.round(150 + 80 * pulse), 70, 90) : 0x8a6f9e);
    path(70, danger ? 0xffd6dc : 0xd9cce6);
    g.fillStyle(0x8a6f9e, 0.35);
    for (let k = 0; k < 28; k++) {
      const p = beltPoint(this.offset + (k * PERIM) / 28);
      g.fillCircle(p.x, p.y, 4);
    }
    this.slots.forEach((s, i) => {
      if (s.state !== 'empty') return;
      const p = this.slotPos(i);
      g.lineStyle(4, 0xffffff, 0.9).strokeCircle(p.x, p.y, 22);
    });
    g.fillStyle(0xffffff, 0.9).fillTriangle(ENTRY.x - 14, BELT.bot + 60, ENTRY.x + 14, BELT.bot + 60, ENTRY.x, BELT.bot + 44);
  }

  checkJam() {
    if (this.state !== 'playing') return;
    if (this.slots.some((s) => s.state !== 'on')) return;
    if (this.docks.some((d) => d.state === 'arriving' || d.state === 'departing')) return;
    const canMove = this.slots.some((s) => this.docks.some((d) => d.state === 'ready' && d.color === s.critter.color && d.reserved < SEATS));
    if (!canMove) this.lose();
  }

  // ---------- Results ----------

  win() {
    this.state = 'won';
    sfx.win();
    const coins = 10 + this.slots.filter((s) => s.state === 'empty').length * 2;
    const save = loadSave();
    writeSave({ unlocked: Math.max(save.unlocked, Math.min(this.levelNum + 1, LEVEL_COUNT)), coins: save.coins + coins });
    for (let k = 0; k < 4; k++) this.time.delayedCall(k * 180, () => this.confetti.explode(40, Phaser.Math.Between(100, GAME_W - 100), 300));
    this.time.delayedCall(700, () => {
      const buttons = [];
      if (this.levelNum < LEVEL_COUNT) buttons.push(['Next Level', () => this.scene.restart({ level: this.levelNum + 1 }), 0x6fdc7a]);
      buttons.push(['Menu', () => this.scene.start('Menu'), 0x5fb4ff]);
      this.showPanel(this.levelNum < LEVEL_COUNT ? 'Level Complete!' : 'All levels done!', `+${coins} 🪙`, buttons);
    });
  }

  lose() {
    this.state = 'lost';
    sfx.lose();
    this.cameras.main.shake(300, 0.01);
    this.time.delayedCall(700, () => {
      const buttons = [];
      if (!this.usedExtraSlots) buttons.push(['+2 Slots (ad)', () => this.addSlots(2), 0xffd447]);
      buttons.push(['Retry', () => this.scene.restart({ level: this.levelNum }), 0xff7eb6]);
      buttons.push(['Menu', () => this.scene.start('Menu'), 0x5fb4ff]);
      this.showPanel('Belt jammed!', 'The belt filled up.', buttons);
    });
  }

  // Rewarded-ad hook. In the prototype it grants the reward right away;
  // the real build will show an ad first.
  addSlots(n) {
    this.usedExtraSlots = true;
    this.closePanel();
    for (let k = 0; k < n; k++) this.slots.push({ critter: null, state: 'empty' });
    this.state = 'playing';
  }

  showPanel(title, subtitle, buttons) {
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x3a2a3a, 0.45).setInteractive();
    const h = 260 + buttons.length * 120;
    const top = GAME_H / 2 - h / 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillRoundedRect(80, top, GAME_W - 160, h, 40);
    const t = this.add.text(GAME_W / 2, top + 80, title, textStyle(56, '#ff7eb6', '#6b3a6b', 8)).setOrigin(0.5);
    const s = this.add.text(GAME_W / 2, top + 160, subtitle, textStyle(36, '#6b3a6b', '#ffffff', 2)).setOrigin(0.5);
    c.add([dim, g, t, s]);
    buttons.forEach(([label, cb, color], i) => c.add(makeButton(this, GAME_W / 2, top + 270 + i * 120, label, cb, { w: 420, color })));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.panel = c;
  }

  closePanel() {
    if (this.panel) this.panel.destroy();
    this.panel = null;
  }

  // ---------- Helpers ----------

  squash(sp, base) {
    this.tweens.add({ targets: sp, scaleX: base * 1.2, scaleY: base * 0.8, duration: 90, yoyo: true, onComplete: () => sp.setScale(base) });
  }

  showTip(text) {
    const c = this.add.container(GAME_W / 2, 1190).setDepth(70);
    const t = this.add.text(0, 0, text, { ...textStyle(30, '#6b3a6b', '#ffffff', 0), align: 'center' }).setOrigin(0.5);
    const g = this.add.graphics();
    const w = t.width + 50, h = t.height + 30;
    g.fillStyle(0xffffff, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    c.add([g, t]);
    this.tweens.add({ targets: c, y: 1178, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tip = c;
  }

  hideTip() {
    if (!this.tip) return;
    const tip = this.tip;
    this.tip = null;
    this.tweens.killTweensOf(tip);
    this.tweens.add({ targets: tip, alpha: 0, duration: 250, onComplete: () => tip.destroy() });
  }
}
