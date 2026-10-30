// Prints each level's size and the tightest belt it can be solved with.
import { getLevel, solve, LEVEL_COUNT } from '../src/levels.js';

for (let n = 1; n <= LEVEL_COUNT; n++) {
  const lv = getLevel(n);
  let tightest = lv.capacity;
  while (tightest > 1 && solve(lv, tightest - 1)) tightest--;
  const critters = lv.lanes.reduce((s, l) => s + l.length, 0);
  console.log(`Level ${String(n).padStart(2)}: ${critters} critters, ${lv.homes.length} homes, belt ${lv.capacity}, solvable with ${tightest}`);
}
