// Ad bridge. Each platform (Poki, CrazyGames, AdMob on Android) will plug its
// SDK in here. Until then the placeholder shows a short fake ad so the
// reward flows can be tested end to end.
import { loadSave, writeSave } from './save.js';
import { GAME_W, GAME_H, textStyle } from './layout.js';

const INTERSTITIAL_EVERY = 3;
const FIRST_INTERSTITIAL_LEVEL = 5;

function placeholderAd(scene, label) {
  return new Promise((resolve) => {
    const c = scene.add.container(0, 0).setDepth(500);
    const bg = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x221a2a, 0.92).setInteractive();
    const t = scene.add.text(GAME_W / 2, GAME_H / 2 - 40, label, textStyle(44)).setOrigin(0.5);
    const s = scene.add.text(GAME_W / 2, GAME_H / 2 + 40, 'Ad placeholder', textStyle(28, '#c9c4dc', '#221a2a', 2)).setOrigin(0.5);
    c.add([bg, t, s]);
    scene.time.delayedCall(1200, () => { c.destroy(); resolve(); });
  });
}

export const ads = {
  // Resolves true when the player earned the reward.
  async rewarded(scene) {
    await placeholderAd(scene, 'Rewarded ad');
    return true;
  },

  // Shown between levels, never to players who bought Remove Ads.
  async betweenLevels(scene, level) {
    const save = writeSave({ wins: loadSave().wins + 1 });
    if (save.noAds || level < FIRST_INTERSTITIAL_LEVEL || save.wins % INTERSTITIAL_EVERY !== 0) return;
    await placeholderAd(scene, 'Ad break');
  },

  // Platform SDKs want to know when active play starts and stops.
  gameplayStart() {},
  gameplayStop() {},
};

// "Remove Ads" goes through Google Play Billing in the Android app.
export const purchases = {
  available: () => false,
  async removeAds() {
    return false;
  },
};
