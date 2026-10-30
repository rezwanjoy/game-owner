// Progress lives in localStorage; storage can be unavailable, so every access is guarded.
const KEY = 'beltbuddies_save_v1';
const DEFAULTS = { unlocked: 1, coins: 0, muted: false };

export function loadSave() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
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
