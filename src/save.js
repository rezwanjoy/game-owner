// Progress lives in localStorage; storage can be unavailable, so every access is guarded.
const KEY = 'beltbuddies_save_v1';
const DEFAULTS = {
  unlocked: 1,
  coins: 0,
  stars: {},
  muted: false,
  music: true,
  vibrate: true,
  skin: 'classic',
  skins: ['classic'],
  boosters: { slot: 2, wake: 2, grab: 2 },
  noAds: false,
  wins: 0,
};

export function loadSave() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    // Unreadable or blocked storage: start fresh.
  }
  return { ...DEFAULTS, ...stored, boosters: { ...DEFAULTS.boosters, ...stored.boosters } };
}

export function writeSave(patch) {
  const next = { ...loadSave(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: progress just won't persist.
  }
  return next;
}
