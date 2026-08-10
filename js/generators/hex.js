import { createBuffer, clamp01 } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

function hexRound(q, r) {
  let x = q;
  let z = r;
  let y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export const hexTiles = {
  id: "hex",
  name: "Hex Tiles",
  hint: "Seamless hexagonal tile grid with mortar and per-cell variation.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 2, max: 18, step: 1, value: 7 },
    { key: "mortar", label: "Mortar", type: "range", min: 0.02, max: 0.28, step: 0.01, value: 0.09 },
    { key: "variation", label: "Cell var.", type: "range", min: 0, max: 1, step: 0.05, value: 0.4 },
    { key: "bevel", label: "Bevel", type: "range", min: 0, max: 0.4, step: 0.01, value: 0.14 },
    { key: "noise", label: "Surface", type: "range", min: 0, max: 0.8, step: 0.05, value: 0.2 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 12, seed, 3, 0.5);
    const out = createBuffer(size);
    const s = p.scale;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * s;
        const v = (y / size) * s;

        // Pointy-top axial coords
        const aq = (Math.sqrt(3) / 3) * u - (1 / 3) * v;
        const ar = (2 / 3) * v;
        const { q, r } = hexRound(aq, ar);

        const cx = Math.sqrt(3) * (q + r / 2);
        const cy = 1.5 * r;
        const dx = u - cx;
        const dy = v - cy;

        const ax = Math.abs(dx);
        const ay = Math.abs(0.5 * dx + (Math.sqrt(3) / 2) * dy);
        const az = Math.abs(0.5 * dx - (Math.sqrt(3) / 2) * dy);
        const dist = Math.max(ax, ay, az) / (Math.sqrt(3) / 2);
        const edge = 1 - dist;

        const idQ = ((q % s) + s) % s | 0;
        const idR = ((r % s) + s) % s | 0;

        let val;
        if (edge < p.mortar) {
          val = 0.12 + n[y * size + x] * 0.08;
        } else {
          const tone = 0.42 + hash2(idQ, idR, seed) * p.variation;
          const bev = p.bevel > 0 ? clamp01((edge - p.mortar) / p.bevel) : 1;
          val = tone * (0.7 + 0.3 * bev) + (n[y * size + x] - 0.5) * p.noise;
        }
        out[y * size + x] = clamp01(val);
      }
    }
    return levels(normalize(gaussianBlur(out, 0.4)), 0.05, 0.95, 1.1, 0, 1);
  },
};
