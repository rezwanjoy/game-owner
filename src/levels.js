// Levels are generated from a seed per level number, then checked with a
// greedy solver so every level is guaranteed to be beatable.

export const DOCK_COUNT = 3;

// colors: critter colors in play, groups: homes per color (3 critters each),
// lanes: waiting lines, capacity: belt slots, need: belt slots the solver
// must need at least (difficulty), noise: how scrambled the critter order
// is, sleepy: chance a non-front critter hides its color.
const TABLE = [
  { colors: 2, groups: 2, lanes: 3, capacity: 8, need: 1, noise: 2, sleepy: 0, speed: 200, tip: 'Tap a critter to put it on the belt.\nIt hops into the bus of its color!' },
  { colors: 3, groups: 2, lanes: 3, capacity: 8, need: 2, noise: 3, sleepy: 0, speed: 200, tip: 'Watch the "Next" buses at the top\nand plan ahead!' },
  { colors: 3, groups: 3, lanes: 4, capacity: 7, need: 2, noise: 4, sleepy: 0, speed: 210, tip: "Don't let the belt fill up,\nor it jams!" },
  { colors: 4, groups: 2, lanes: 4, capacity: 7, need: 3, noise: 4, sleepy: 0, speed: 210, tip: 'Stuck? Use a booster!\n➕ adds a belt slot\n✋ grabs any critter' },
  { colors: 4, groups: 3, lanes: 4, capacity: 7, need: 3, noise: 5, sleepy: 0, speed: 220 },
  { colors: 4, groups: 3, lanes: 4, capacity: 7, need: 3, noise: 5, sleepy: 0.3, speed: 220, tip: 'Sleepy critters wake up\nwhen they reach the front!' },
  { colors: 5, groups: 3, lanes: 5, capacity: 7, need: 4, noise: 6, sleepy: 0.15, speed: 230 },
  { colors: 5, groups: 3, lanes: 5, capacity: 7, need: 4, noise: 6, sleepy: 0.3, speed: 230 },
  { colors: 6, groups: 3, lanes: 5, capacity: 8, need: 5, noise: 7, sleepy: 0.3, speed: 240 },
  { colors: 6, groups: 3, lanes: 5, capacity: 7, need: 5, noise: 7, sleepy: 0.35, speed: 240, hard: true },
];

export const LEVEL_COUNT = 50;

// Levels past the hand-tuned table ramp up colors, sleepiness and speed.
// Every 5th level is a "hard" level with a tighter belt.
function params(n) {
  if (n <= TABLE.length) return TABLE[n - 1];
  const hard = n % 5 === 0;
  const colors = n <= 20 ? 6 : n <= 30 ? 7 : 8;
  return {
    colors,
    groups: 3,
    lanes: colors >= 8 ? 6 : 5,
    capacity: hard ? 7 : 8,
    need: hard ? 6 : 5,
    noise: 7,
    sleepy: Math.min(0.45, 0.3 + (n - 10) * 0.004),
    speed: Math.min(270, 240 + (n - 10)),
    hard,
  };
}

export function isHard(n) {
  return !!params(n).hard;
}

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generate(p, rand, noise) {
  const palette = shuffle([0, 1, 2, 3, 4, 5, 6, 7], rand).slice(0, p.colors);
  const homes = shuffle(palette.flatMap((c) => Array(p.groups).fill(c)), rand);
  // Critters in the order the homes need them, then locally scrambled.
  const order = homes
    .flatMap((c) => [c, c, c])
    .map((c, i) => ({ c, k: i + (rand() - 0.5) * noise * 6 }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.c);
  const lanes = Array.from({ length: p.lanes }, () => []);
  for (const color of order) {
    const min = Math.min(...lanes.map((l) => l.length));
    const open = lanes.filter((l) => l.length <= min + 1);
    open[Math.floor(rand() * open.length)].push({ color, sleepy: false });
  }
  lanes.forEach((l) => l.forEach((c, i) => { c.sleepy = i > 0 && rand() < p.sleepy; }));
  return { homes, lanes };
}

// Abstract play-through: true if a sensible player can clear the level
// without ever needing more than `cap` belt slots.
export function solve(level, cap) {
  const lanes = level.lanes.map((l) => l.map((c) => c.color));
  const queue = level.homes.slice();
  const docks = Array.from({ length: DOCK_COUNT }, () => (queue.length ? { c: queue.shift(), n: 0 } : null));
  const belt = [];
  let remaining = level.homes.length;
  const open = (color) => docks.some((d) => d && d.c === color && d.n < 3);

  const settle = () => {
    for (let i = 0; i < belt.length; i++) {
      const d = docks.find((dk) => dk && dk.c === belt[i] && dk.n < 3);
      if (!d) continue;
      belt.splice(i, 1);
      i = -1;
      if (++d.n === 3) {
        remaining--;
        docks[docks.indexOf(d)] = queue.length ? { c: queue.shift(), n: 0 } : null;
      }
    }
  };

  while (true) {
    settle();
    if (remaining === 0) return true;
    const fronts = lanes.map((l, i) => i).filter((i) => lanes[i].length);
    if (!fronts.length || belt.length >= cap) return false;
    const score = (i) => {
      const l = lanes[i];
      if (open(l[0])) return -2;
      if (l.length > 1 && open(l[1])) return -1;
      const q = queue.indexOf(l[0]);
      return q < 0 ? 1000 : q;
    };
    const pick = fronts.reduce((a, b) => (score(b) < score(a) ? b : a));
    belt.push(lanes[pick].shift());
  }
}

const cache = new Map();

export function getLevel(n) {
  if (cache.has(n)) return cache.get(n);
  const p = params(Math.min(n, LEVEL_COUNT));
  let level = null;
  for (let attempt = 0; attempt < 2000 && !level; attempt++) {
    const candidate = generate(p, mulberry32(n * 7919 + attempt), p.noise);
    // Beatable with a slot to spare, but not trivially.
    if (solve(candidate, p.capacity - 1) && !solve(candidate, p.need - 1)) level = candidate;
  }
  if (!level) throw new Error(`Could not generate level ${n}`);
  const result = { ...level, number: n, capacity: p.capacity, speed: p.speed, tip: p.tip || null, hard: !!p.hard };
  cache.set(n, result);
  return result;
}
