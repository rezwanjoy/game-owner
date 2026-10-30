import Phaser from 'phaser';
import { GAME_W, GAME_H, textStyle, drawBackground, iconButton, showPanel, addToggles } from '../layout.js';
import { COLORS, critterKey, sleepKey, shade } from '../art.js';
import { getLevel, LEVEL_COUNT, DOCK_COUNT } from '../levels.js';
import { loadSave, writeSave } from '../save.js';
import { sfx, music, haptics } from '../sfx.js';
import { ads } from '../ads.js';

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

const LANE_TOP = 762;
const ROW_H = 90;
const MAX_ROWS = 4;

const LANE_SCALE = 0.82;
const BELT_SCALE = 0.72;
const SEAT_SCALE = 0.5;

const BOOSTER_Y = 1196;
const BOOSTER_LEVEL = 3;
const BOOSTER_PRICE = 40;
const MAX_EXTRA_SLOTS = 3;
const BOOSTERS = [
  { id: 'slot', icon: '➕', name: 'Extra Slot', desc: 'Adds one slot\nto the belt.' },
  { id: 'wake', icon: '☀️', name: 'Wake Up', desc: 'Wakes up every\nsleepy critter.' },
  { id: 'grab', icon: '✋', name: 'Grab', desc: 'Send any critter,\nnot just the front one.' },
];

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
    this.offset = 0;
    this.homesDone = 0;
    this.peak = 0;
    this.extraSlots = 0;
    this.usedRescue = false;
    this.wasDanger = false;
    this.grabMode = false;
    this.previewG = null;
    this.panel = null;
    this.hand = null;
    this.state = 'intro';

    drawBackground(this);
    this.beltG = this.add.graphics();

    this.slots = Array.from({ length: this.lv.capacity }, () => ({ critter: null, state: 'empty' }));
    this.homeQueue = this.lv.homes.slice();
    this.docks = DOCK_XS.slice(0, DOCK_COUNT).map((x) => ({ x, y: DOCK_Y, state: 'empty', color: -1, reserved: 0, filled: 0, container: null, sprites: [] }));
    this.docks.forEach((d, i) => this.spawnDock(d, i * 120));

    this.buildLanes();
    this.buildHud();
    if (this.levelNum >= BOOSTER_LEVEL) this.buildBoosters();

    this.confetti = this.add.particles(0, 0, 'confetti', {
      speed: { min: 250, max: 650 }, angle: { min: 200, max: 340 }, gravityY: 900,
      lifespan: 1400, rotate: { min: 0, max: 360 }, scale: { start: 1.2, end: 0.6 },
      tint: COLORS, emitting: false,
    }).setDepth(150);
    this.puffs = this.add.particles(0, 0, 'dot', {
      speed: { min: 80, max: 220 }, lifespan: 450, scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(40);

    this.input.on('pointerdown', this.onPointer, this);
    this.events.once('shutdown', () => ads.gameplayStop());

    if (this.lv.tip) {
      this.panel = showPanel(this, {
        title: this.levelNum === 1 ? 'How to play' : 'Tip',
        subtitle: this.lv.tip,
        buttons: [["Let's go!", () => this.begin(), 0x6fdc7a]],
      });
    } else {
      this.time.delayedCall(450, () => this.begin());
    }
  }

  begin() {
    this.closePanel();
    this.state = 'playing';
    ads.gameplayStart();
    if (this.lv.hard) this.banner('Hard level!', '#ff5d5d');
    if (this.levelNum === 1) this.showHand();
  }

  // ---------- Layout pieces ----------

  buildHud() {
    this.add.text(36, 50, `Level ${this.levelNum}`, textStyle(40, this.lv.hard ? '#ff5d5d' : '#ffffff')).setOrigin(0, 0.5).setDepth(60);
    iconButton(this, GAME_W - 66, 54, '⏸️', () => this.pause(), { size: 84 }).setDepth(60);

    this.add.text(36, 118, 'Next', textStyle(28, '#ffffff')).setOrigin(0, 0.5);
    this.previewG = this.add.graphics();
    this.progressText = this.add.text(GAME_W - 36, 118, '', textStyle(28)).setOrigin(1, 0.5);

    this.beltLabel = this.add.text(GAME_W / 2, BELT.cy - 14, '', textStyle(44, '#ffffff')).setOrigin(0.5).setDepth(5);
    this.beltSub = this.add.text(GAME_W / 2, BELT.cy + 32, 'on belt', textStyle(24, '#ffffff', '#6b3a6b', 4)).setOrigin(0.5).setDepth(5);
    this.refreshPreview();
  }

  refreshPreview() {
    const g = this.previewG.clear();
    this.homeQueue.slice(0, 6).forEach((c, i) => {
      const x = 130 + i * 52;
      g.fillStyle(shade(COLORS[c], -0.35)).fillCircle(x, 120, 19);
      g.fillStyle(COLORS[c]).fillCircle(x, 118, 17);
    });
    if (this.homeQueue.length > 6) g.fillStyle(0xffffff, 0.8).fillCircle(130 + 6 * 52, 118, 6);
    this.progressText.setText(`${this.homesDone}/${this.lv.homes.length} 🚌`);
  }

  buildLanes() {
    const n = this.lv.lanes.length;
    const spacing = Math.min(150, 660 / n);
    this.laneSpacing = spacing;
    this.laneXs = Array.from({ length: n }, (_, i) => GAME_W / 2 + (i - (n - 1) / 2) * spacing);
    const g = this.add.graphics();
    this.laneXs.forEach((x) => {
      g.fillStyle(0xffffff, 0.45).fillRoundedRect(x - spacing / 2 + 6, LANE_TOP - 56, spacing - 12, MAX_ROWS * ROW_H + 64, 32);
    });
    this.lanes = this.lv.lanes.map((lane) => lane.map((c) => ({ color: c.color, sleepy: c.sleepy, sprite: null })));
    this.laneBadges = this.laneXs.map((x) => this.add.text(x, LANE_TOP + MAX_ROWS * ROW_H - 22, '', textStyle(28)).setOrigin(0.5));
    this.lanes.forEach((_, l) => this.refreshLane(l, false));
  }

  refreshLane(l, animate) {
    const lane = this.lanes[l];
    lane.forEach((c, r) => {
      if (r >= MAX_ROWS) return;
      if (r === 0 && c.sleepy) this.wake(c);
      const x = this.laneXs[l];
      const y = LANE_TOP + r * ROW_H;
      if (!c.sprite) {
        c.sprite = this.add.image(x, y + (animate ? ROW_H : 0), c.sleepy ? sleepKey() : critterKey(c.color)).setScale(LANE_SCALE).setDepth(8);
        if (animate) c.sprite.setAlpha(0);
      }
      if (animate) this.tweens.add({ targets: c.sprite, x, y, alpha: 1, duration: 220, ease: 'Back.easeOut' });
      else c.sprite.setPosition(x, y);
    });
    const hidden = lane.length - MAX_ROWS;
    this.laneBadges[l].setText(hidden > 0 ? `+${hidden}` : '');
  }

  wake(c) {
    c.sleepy = false;
    if (!c.sprite) return;
    c.sprite.setTexture(critterKey(c.color));
    this.squash(c.sprite, LANE_SCALE);
  }

  buildBoosters() {
    this.boosterButtons = {};
    BOOSTERS.forEach((b, i) => {
      const x = GAME_W / 2 + (i - 1) * 170;
      const btn = iconButton(this, x, BOOSTER_Y, b.icon, () => this.useBooster(b), { size: 108 }).setDepth(60);
      const badge = this.add.graphics();
      const count = this.add.text(38, -38, '', textStyle(26)).setOrigin(0.5);
      btn.add([badge, count]);
      btn.badge = badge;
      btn.count = count;
      this.boosterButtons[b.id] = btn;
    });
    this.refreshBoosters();
  }

  refreshBoosters() {
    if (!this.boosterButtons) return;
    const owned = loadSave().boosters;
    BOOSTERS.forEach((b) => {
      const btn = this.boosterButtons[b.id];
      const n = owned[b.id];
      btn.badge.clear().fillStyle(n > 0 ? 0xff7eb6 : 0x6fdc7a).fillCircle(38, -38, 22);
      btn.count.setText(n > 0 ? String(n) : '+');
    });
    const grab = this.boosterButtons.grab;
    this.tweens.killTweensOf(grab);
    grab.setScale(1);
    if (this.grabMode) this.tweens.add({ targets: grab, scale: 1.15, duration: 300, yoyo: true, repeat: -1 });
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
        haptics.buzz(10);
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
    haptics.buzz(25);
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
    if (this.state !== 'playing' || p.y < LANE_TOP - 70 || p.y > BOOSTER_Y - 70) return;
    if (this.grabMode) {
      this.tryGrab(p);
      return;
    }
    let best = -1;
    let bestDx = this.laneSpacing / 2 + 10;
    this.laneXs.forEach((x, l) => {
      const dx = Math.abs(p.x - x);
      if (dx < bestDx) { bestDx = dx; best = l; }
    });
    if (best >= 0) this.sendToBelt(best, 0);
  }

  tryGrab(p) {
    let hit = null;
    let bestD = 56;
    this.lanes.forEach((lane, l) => lane.forEach((c, r) => {
      if (r >= MAX_ROWS || !c.sprite) return;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, c.sprite.x, c.sprite.y);
      if (dist < bestD) { bestD = dist; hit = { l, r }; }
    }));
    if (!hit) return;
    if (this.sendToBelt(hit.l, hit.r)) {
      this.grabMode = false;
      this.spendBooster('grab');
      this.clearBanner();
    }
  }

  // Moves the critter at row `r` of lane `l` onto the nearest free belt slot.
  sendToBelt(l, r) {
    const lane = this.lanes[l];
    const c = lane[r];
    if (!c) return false;
    const free = this.slots.map((s, i) => (s.state === 'empty' ? i : -1)).filter((i) => i >= 0);
    if (!free.length) {
      sfx.buzz();
      haptics.buzz(40);
      this.tweens.add({ targets: c.sprite, x: c.sprite.x + 10, duration: 50, yoyo: true, repeat: 3 });
      return false;
    }
    const target = free.reduce((a, b) => {
      const pa = this.slotPos(a), pb = this.slotPos(b);
      return Phaser.Math.Distance.Between(pb.x, pb.y, ENTRY.x, ENTRY.y) < Phaser.Math.Distance.Between(pa.x, pa.y, ENTRY.x, ENTRY.y) ? b : a;
    });
    lane.splice(r, 1);
    if (c.sleepy) this.wake(c);
    const slot = this.slots[target];
    slot.state = 'incoming';
    slot.critter = c;
    const sp = c.sprite.setDepth(20);
    this.tweens.killTweensOf(sp);
    const from = { x: sp.x, y: sp.y };
    sfx.hop();
    this.hideHand();
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
    return true;
  }

  // ---------- Boosters ----------

  useBooster(b) {
    if (this.state !== 'playing') return;
    sfx.click();
    if (b.id === 'grab' && this.grabMode) {
      this.grabMode = false;
      this.clearBanner();
      this.refreshBoosters();
      return;
    }
    if (loadSave().boosters[b.id] <= 0) {
      this.offerBooster(b);
      return;
    }
    if (b.id === 'slot') {
      if (this.extraSlots >= MAX_EXTRA_SLOTS) return this.banner('Belt is as long as it gets!', '#ffffff');
      this.addSlots(1);
      this.spendBooster('slot');
      sfx.magic();
    } else if (b.id === 'wake') {
      const sleepy = this.lanes.flat().filter((c) => c.sleepy);
      if (!sleepy.length) return this.banner('Everyone is awake!', '#ffffff');
      sleepy.forEach((c) => this.wake(c));
      this.spendBooster('wake');
      sfx.magic();
    } else {
      this.grabMode = true;
      this.banner('Tap any critter!', '#ffffff', true);
      this.refreshBoosters();
    }
  }

  spendBooster(id) {
    const save = loadSave();
    writeSave({ boosters: { ...save.boosters, [id]: Math.max(0, save.boosters[id] - 1) } });
    this.refreshBoosters();
  }

  grantBooster(id, cost = 0) {
    const save = loadSave();
    writeSave({ coins: save.coins - cost, boosters: { ...save.boosters, [id]: save.boosters[id] + 1 } });
    this.refreshBoosters();
  }

  offerBooster(b) {
    this.state = 'menu';
    const resume = () => { this.closePanel(); this.state = 'playing'; };
    const buttons = [['Watch ad: get 1', async () => {
      this.closePanel();
      if (await ads.rewarded(this)) { this.grantBooster(b.id); sfx.coin(); }
      this.state = 'playing';
    }, 0xffd447]];
    if (loadSave().coins >= BOOSTER_PRICE) {
      buttons.push([`Buy 1 for ${BOOSTER_PRICE} 🪙`, () => { this.grantBooster(b.id, BOOSTER_PRICE); sfx.coin(); resume(); }, 0x6fdc7a]);
    }
    buttons.push(['Not now', resume, 0xc9c4dc]);
    this.panel = showPanel(this, { title: `${b.icon} ${b.name}`, subtitle: b.desc, buttons });
  }

  // ---------- Loop ----------

  update(time, delta) {
    if (this.state === 'playing') this.offset += this.lv.speed * (delta / 1000);

    const occupied = this.slots.filter((s) => s.state !== 'empty').length;
    if (this.state === 'playing') this.peak = Math.max(this.peak, occupied);
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

  // ---------- Pause ----------

  pause() {
    if (this.state !== 'playing') return;
    sfx.click();
    this.state = 'paused';
    this.tweens.pauseAll();
    ads.gameplayStop();
    this.panel = showPanel(this, {
      title: 'Paused',
      contentH: 150,
      content: (c, y) => addToggles(this, c, y + 60, [
        ['🔊', '🔇', () => !sfx.isMuted(), () => !sfx.toggleMute()],
        ['🎵', '🚫', music.isOn, music.toggle],
        ['📳', '📴', haptics.isOn, haptics.toggle],
      ]),
      buttons: [
        ['Resume', () => { this.closePanel(); this.tweens.resumeAll(); this.state = 'playing'; ads.gameplayStart(); }, 0x6fdc7a],
        ['Restart', () => this.leave('Game', { level: this.levelNum }), 0xff7eb6],
        ['Menu', () => this.leave('Menu'), 0x5fb4ff],
      ],
    });
  }

  leave(scene, data) {
    this.tweens.resumeAll();
    if (scene === 'Game') this.scene.restart(data);
    else this.scene.start(scene, data);
  }

  // ---------- Results ----------

  win() {
    this.state = 'won';
    ads.gameplayStop();
    sfx.win();
    const cap = this.slots.length;
    const stars = this.peak <= cap - 3 ? 3 : this.peak <= cap - 1 ? 2 : 1;
    let coins = 10 + stars * 5 + (this.lv.hard ? 10 : 0);
    const save = loadSave();
    writeSave({
      unlocked: Math.max(save.unlocked, Math.min(this.levelNum + 1, LEVEL_COUNT)),
      coins: save.coins + coins,
      stars: { ...save.stars, [this.levelNum]: Math.max(stars, save.stars[this.levelNum] || 0) },
    });
    for (let k = 0; k < 4; k++) this.time.delayedCall(k * 180, () => this.confetti.explode(40, Phaser.Math.Between(100, GAME_W - 100), 300));

    const last = this.levelNum >= LEVEL_COUNT;
    const show = (doubled) => {
      this.closePanel();
      const buttons = [];
      if (!doubled) {
        buttons.push(['Double coins (ad)', async () => {
          this.closePanel();
          if (await ads.rewarded(this)) {
            writeSave({ coins: loadSave().coins + coins });
            coins *= 2;
            sfx.coin();
          }
          show(true);
        }, 0xffd447]);
      }
      if (!last) {
        buttons.push(['Next Level', async () => {
          this.closePanel();
          await ads.betweenLevels(this, this.levelNum);
          this.scene.restart({ level: this.levelNum + 1 });
        }, 0x6fdc7a]);
      }
      buttons.push(['Menu', () => this.scene.start('Menu'), 0x5fb4ff]);
      this.panel = showPanel(this, {
        title: last ? 'You beat them all!' : 'Level Complete!',
        contentH: 170,
        content: (c, y) => {
          for (let k = 0; k < 3; k++) {
            const s = this.add.text(GAME_W / 2 + (k - 1) * 110, y + 40, '★', textStyle(110, k < stars ? '#ffc83d' : '#e6dff0', '#6b3a6b', 8)).setOrigin(0.5);
            c.add(s);
            if (!doubled && k < stars) {
              s.setScale(0);
              this.tweens.add({ targets: s, scale: 1, duration: 300, delay: 200 + k * 220, ease: 'Back.easeOut', onStart: () => sfx.land(k) });
            }
          }
          c.add(this.add.text(GAME_W / 2, y + 135, `+${coins} 🪙`, textStyle(40, '#ff9f45', '#ffffff', 0)).setOrigin(0.5));
        },
        buttons,
      });
    };
    this.time.delayedCall(700, () => show(false));
  }

  lose() {
    this.state = 'lost';
    ads.gameplayStop();
    sfx.lose();
    haptics.buzz(200);
    this.cameras.main.shake(300, 0.01);
    this.time.delayedCall(700, () => {
      const buttons = [];
      const owned = loadSave().boosters.slot;
      if (owned > 0 && this.extraSlots < MAX_EXTRA_SLOTS) {
        buttons.push([`Use ➕ Slot (${owned} left)`, () => { this.spendBooster('slot'); this.continueAfterJam(1); }, 0x6fdc7a]);
      }
      if (!this.usedRescue) {
        buttons.push(['+2 Slots (ad)', async () => {
          this.closePanel();
          this.usedRescue = true;
          if (await ads.rewarded(this)) this.continueAfterJam(2);
          else this.lose();
        }, 0xffd447]);
      }
      buttons.push(['Retry', () => this.scene.restart({ level: this.levelNum }), 0xff7eb6]);
      buttons.push(['Menu', () => this.scene.start('Menu'), 0x5fb4ff]);
      this.panel = showPanel(this, { title: 'Belt jammed!', subtitle: 'The belt filled up.', buttons });
    });
  }

  continueAfterJam(n) {
    this.closePanel();
    this.addSlots(n);
    this.state = 'playing';
    ads.gameplayStart();
    sfx.magic();
  }

  addSlots(n) {
    this.extraSlots += n;
    for (let k = 0; k < n; k++) this.slots.push({ critter: null, state: 'empty' });
  }

  closePanel() {
    if (this.panel) this.panel.destroy();
    this.panel = null;
  }

  // ---------- Helpers ----------

  squash(sp, base) {
    this.tweens.add({ targets: sp, scaleX: base * 1.2, scaleY: base * 0.8, duration: 90, yoyo: true, onComplete: () => sp.setScale(base) });
  }

  // Short message across the middle of the belt; `sticky` keeps it up until cleared.
  banner(text, color, sticky = false) {
    this.clearBanner();
    const t = this.add.text(GAME_W / 2, 690, text, textStyle(40, color)).setOrigin(0.5).setDepth(90).setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.easeOut' });
    if (!sticky) this.time.delayedCall(1400, () => this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }));
    this.bannerText = t;
  }

  clearBanner() {
    if (this.bannerText && this.bannerText.active) this.bannerText.destroy();
    this.bannerText = null;
  }

  // First-level hint: a hand tapping the line whose front critter has a bus waiting.
  showHand() {
    const ready = this.docks.map((d) => d.color);
    const l = Math.max(0, this.lanes.findIndex((lane) => lane[0] && ready.includes(lane[0].color)));
    this.hand = this.add.text(this.laneXs[l] + 20, LANE_TOP + 60, '👆', { fontSize: '72px' }).setOrigin(0.5).setDepth(95);
    this.tweens.add({ targets: this.hand, y: LANE_TOP + 30, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  hideHand() {
    if (!this.hand) return;
    this.hand.destroy();
    this.hand = null;
  }
}
