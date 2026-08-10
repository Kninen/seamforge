import { swirlIslands } from "./swirl.js";
import { marble } from "./marble.js";
import { cellular } from "./cellular.js";
import { softNoise } from "./noise.js";
import { wood } from "./wood.js";
import { bricks } from "./bricks.js";
import { dots } from "./dots.js";
import { hexTiles } from "./hex.js";
import { ripples } from "./ripples.js";
import { clouds } from "./clouds.js";
import { stripes } from "./stripes.js";
import { scales } from "./scales.js";
import { leather } from "./leather.js";
import { concrete } from "./concrete.js";
import { weave } from "./weave.js";
import { tech } from "./tech.js";
import { cracks } from "./cracks.js";
import { stars } from "./stars.js";
import { checker } from "./checker.js";
import { diamondPlate } from "./diamond.js";
import { bubbles } from "./bubbles.js";
import { brushed } from "./brushed.js";
import { camo } from "./camo.js";
import { herringbone } from "./herringbone.js";
import { sunburst } from "./sunburst.js";
import { maze } from "./maze.js";
import { frost } from "./frost.js";
import { triangles } from "./triangles.js";
import { tvStatic } from "./static.js";
import { terrain } from "./terrain.js";
import { crosshatch } from "./crosshatch.js";
import { spiral } from "./spiral.js";

/** Registry — add new generators here when requested */
export const generators = [
  swirlIslands,
  spiral,
  marble,
  cellular,
  softNoise,
  terrain,
  wood,
  bricks,
  herringbone,
  hexTiles,
  triangles,
  diamondPlate,
  dots,
  checker,
  stripes,
  crosshatch,
  weave,
  scales,
  bubbles,
  ripples,
  clouds,
  stars,
  frost,
  leather,
  concrete,
  brushed,
  camo,
  tech,
  cracks,
  maze,
  sunburst,
  tvStatic,
];

export function getGenerator(id) {
  return generators.find((g) => g.id === id) || generators[0];
}

export function defaultParams(gen) {
  const params = {};
  for (const p of gen.params) params[p.key] = p.value;
  return params;
}
