import { createBuffer, clamp01, wrap } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

export const bricks = {
  id: "bricks",
  name: "Bricks",
  hint: "Seamless brick / tile wall with mortar and per-brick variation.",
  params: [
    { key: "cols", label: "Columns", type: "range", min: 2, max: 16, step: 2, value: 6 },
    { key: "rows", label: "Rows", type: "range", min: 2, max: 16, step: 2, value: 8 },
    { key: "mortar", label: "Mortar", type: "range", min: 0.02, max: 0.25, step: 0.01, value: 0.08 },
    { key: "offset", label: "Row offset", type: "range", min: 0, max: 1, step: 0.05, value: 0.5 },
    { key: "variation", label: "Brick var.", type: "range", min: 0, max: 1, step: 0.05, value: 0.35 },
    { key: "noise", label: "Surface", type: "range", min: 0, max: 1, step: 0.05, value: 0.25 },
    { key: "bevel", label: "Bevel", type: "range", min: 0, max: 0.2, step: 0.01, value: 0.06 },
  ],
  generate(size, seed, p) {
    // Even rows so running-bond offset parity closes on vertical wrap
    const cols = Math.max(2, (p.cols | 0) & ~1);
    const rows = Math.max(2, (p.rows | 0) & ~1);
    const n = perlinNoise2D(size, 10, seed, 3, 0.5);
    const out = createBuffer(size);
    const mortar = p.mortar;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = y / size;
        const row = Math.floor(v * rows);
        const rowF = v * rows - row;
        const off = (row & 1) * p.offset;
        const u = wrap(x / size + off / cols, 1);
        const col = Math.floor(u * cols);
        const colF = u * cols - col;

        const inMortar =
          colF < mortar ||
          colF > 1 - mortar ||
          rowF < mortar ||
          rowF > 1 - mortar;

        let val;
        if (inMortar) {
          val = 0.15 + n[y * size + x] * 0.1;
        } else {
          const tone = 0.45 + hash2(wrap(col, cols), wrap(row, rows), seed) * p.variation;
          const d = Math.min(colF - mortar, 1 - mortar - colF, rowF - mortar, 1 - mortar - rowF);
          const bev = p.bevel > 0 ? clamp01(d / p.bevel) : 1;
          val = tone * (0.65 + 0.35 * bev) + (n[y * size + x] - 0.5) * p.noise;
        }
        out[y * size + x] = clamp01(val);
      }
    }

    return levels(normalize(gaussianBlur(out, 0.5)), 0.05, 0.95, 1.1, 0, 1);
  },
};
