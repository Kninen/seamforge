import { createBuffer, clamp01, wrap } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

/**
 * Seamless hex tiles on a staggered rectangular lattice.
 * Centers live on an integer-periodic grid (no √3 in the global period).
 */
export const hexTiles = {
  id: "hex",
  name: "Hex Tiles",
  hint: "Seamless hexagonal tile grid with mortar and per-cell variation.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 2, max: 18, step: 2, value: 8 },
    { key: "mortar", label: "Mortar", type: "range", min: 0.02, max: 0.28, step: 0.01, value: 0.09 },
    { key: "variation", label: "Cell var.", type: "range", min: 0, max: 1, step: 0.05, value: 0.4 },
    { key: "bevel", label: "Bevel", type: "range", min: 0, max: 0.4, step: 0.01, value: 0.14 },
    { key: "noise", label: "Surface", type: "range", min: 0, max: 0.8, step: 0.05, value: 0.2 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 12, seed, 3, 0.5);
    const out = createBuffer(size);
    const cols = Math.max(2, (p.scale | 0) & ~1);
    const rows = cols;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * cols;
        const v = (y / size) * rows;

        let best = Infinity;
        let bq = 0;
        let br = 0;

        const r0 = Math.floor(v);
        const q0 = Math.floor(u);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dq = -1; dq <= 1; dq++) {
            const r = r0 + dr;
            const q = q0 + dq;
            const rr = wrap(r, rows);
            const qq = wrap(q, cols);
            // Centers on integer-periodic staggered grid
            const cx = q + 0.5 * (r & 1) + 0.5;
            const cy = r + 0.5;

            let dx = u - cx;
            let dy = v - cy;
            dx -= cols * Math.round(dx / cols);
            dy -= rows * Math.round(dy / rows);

            // Flat-top-ish hex distance in cell units
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            const hexDist = Math.max(ay, ax * 0.8660254 + ay * 0.5);
            if (hexDist < best) {
              best = hexDist;
              bq = qq;
              br = rr;
            }
          }
        }

        // Radius to flat side ≈ 0.5
        const edge = 1 - best / 0.5;
        let val;
        if (edge < p.mortar) {
          val = 0.12 + n[y * size + x] * 0.08;
        } else {
          const tone = 0.42 + hash2(bq, br, seed) * p.variation;
          const bev = p.bevel > 0 ? clamp01((edge - p.mortar) / p.bevel) : 1;
          val = tone * (0.7 + 0.3 * bev) + (n[y * size + x] - 0.5) * p.noise;
        }
        out[y * size + x] = clamp01(val);
      }
    }
    return levels(normalize(gaussianBlur(out, 0.4)), 0.05, 0.95, 1.1, 0, 1);
  },
};
