# Belt Buddies

A cute conveyor-belt sorting puzzle for mobile browsers. Tap the critter at the
front of a line to put it on the belt; it rides around and hops into the bus of
its color. A bus leaves when its 3 seats are full. Don't let the belt fill up,
or it jams.

Built with Phaser 3 and Vite. Version 1.0.0: 50 levels.

## Features

- 50 generated levels, each checked by a solver so it can always be beaten. Every 5th level from 10 on is a hard level.
- Sleepy critters (from level 6) hide their color until they reach the front.
- Boosters: Extra Slot, Wake Up and Grab. Earned with coins or a rewarded ad.
- 1–3 stars per level and coins to spend in the Closet on 8 outfits.
- Settings for sound, music and vibration; pause menu; first-level hand hint and tips.
- Synthesized sound effects and music, and code-drawn art, so there are no asset files.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open the printed address on your phone (same Wi-Fi) or in a desktop browser.

## Other commands

- `npm run build`: production build into `dist/` (works from any folder, for web portals).
- `npm run check-levels`: prints each level's size and how many belt slots it needs.

## Ads and purchases

`src/ads.js` is the single place where platform SDKs plug in: Poki and
CrazyGames on the web, AdMob and Google Play Billing on Android. Until they are
added, a placeholder shows a short fake ad so the reward flows can be tested.

## Project layout

- `src/levels.js`: level settings, seeded generator and solver.
- `src/scenes/GameScene.js`: belt, lines, buses, boosters, pause, win/lose.
- `src/scenes/MenuScene.js`, `LevelSelectScene.js`, `ClosetScene.js`: menus and shop.
- `src/art.js`: critters and outfits, drawn in code.
- `src/sfx.js`: sound effects, music and vibration.
- `src/save.js`: saved progress.
