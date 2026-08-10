import { createBuffer, clamp01, smoothstep, wrap } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize, emboss } from "../core/filters.js";

export const scales = {
  id: "scales",
  name: "Scales",
  hint: "Seamless fish / dragon scale pattern with row offset.",
  params: [
    { key: "cols", label: "Columns", type: "range", min: 4, max: 24, step: 2, value: 10 },
    { key: "rows", label: "Rows", type: "range", min: 4, max: 24, step: 2, value: 12 },
    { key: "roundness", label: "Roundness", type: "range", min: 0.3, max: 1.5, step: 0.05, value: 0.85 },
    { key: "gap", label: "Gap", type: "range", min: 0, max: 0.25, step: 0.01, value: 0.06 },
    { key: "emboss", label: "Emboss", type: "range", min: 0, max: 2, step: 0.05, value: 0.9 },
    { key: "variation", label: "Variation", type: "range", min: 0, max: 0.6, step: 0.05, value: 0.2 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 8, seed, 3, 0.5);
    const out = createBuffer(size);
    const cols = Math.max(2, (p.cols | 0) & ~1);
    const rows = Math.max(2, (p.rows | 0) & ~1);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * cols;
        const v = (y / size) * rows;

        let best = Infinity;
        let bCol = 0;
        let bRow = 0;

        const r0 = Math.floor(v);
        const c0 = Math.floor(u);
        // Scales hang into neighbors — search nearby cells with wrap
        for (let dr = -1; dr <= 1; dr++) {
          for (let dq = -1; dq <= 1; dq++) {
            const row = r0 + dr;
            const col = c0 + dq;
            const rr = wrap(row, rows);
            const cc = wrap(col, cols);
            const off = (row & 1) * 0.5;
            const cx = col + 0.5 + off;
            const cy = row + 0.35;

            let dx = u - cx;
            let dy = v - cy;
            dx -= cols * Math.round(dx / cols);
            dy -= rows * Math.round(dy / rows);

            const d = Math.hypot(dx * 2, dy * 2 * p.roundness);
            if (d < best) {
              best = d;
              bCol = cc;
              bRow = rr;
            }
          }
        }

        const inside = best < 1 - p.gap;
        const rim = smoothstep(1 - p.gap - 0.15, 1 - p.gap, best);
        let val = inside ? (1 - best * 0.55) * (1 - rim * 0.35) : 0.08;
        val += (hash2(bCol, bRow, seed) - 0.5) * p.variation;
        val += (n[y * size + x] - 0.5) * 0.08;
        out[y * size + x] = clamp01(val);
      }
    }

    let result = gaussianBlur(out, 0.6);
    if (p.emboss > 0) {
      const e = emboss(result, p.emboss);
      for (let i = 0; i < result.length; i++) {
        result[i] = clamp01(result[i] * 0.55 + e[i] * 0.45);
      }
    }
    return levels(normalize(result), 0.05, 0.95, 1.15, 0, 1);
  },
};
