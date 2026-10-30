# Belt Buddies

A cute conveyor-belt sorting puzzle for mobile browsers. Tap the critter at the
front of a line to put it on the belt; it rides around and hops into the bus of
its color. A bus leaves when its 3 seats are full. Don't let the belt fill up,
or it jams.

Built with Phaser 3 and Vite. Prototype v0.1: 10 levels.

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

## Project layout

- `src/levels.js`: level table, seeded generator and the solver that guarantees every level is beatable.
- `src/scenes/GameScene.js`: belt, lines, buses, win/lose and the rewarded-ad hook (`addSlots`).
- `src/art.js`: all critter art, drawn in code.
- `src/sfx.js`: synthesized sound effects.
