import { createBuffer, clamp01, smoothstep } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize, emboss } from "../core/filters.js";

export const scales = {
  id: "scales",
  name: "Scales",
  hint: "Seamless fish / dragon scale pattern with row offset.",
  params: [
    { key: "cols", label: "Columns", type: "range", min: 3, max: 24, step: 1, value: 10 },
    { key: "rows", label: "Rows", type: "range", min: 3, max: 24, step: 1, value: 12 },
    { key: "roundness", label: "Roundness", type: "range", min: 0.3, max: 1.5, step: 0.05, value: 0.85 },
    { key: "gap", label: "Gap", type: "range", min: 0, max: 0.25, step: 0.01, value: 0.06 },
    { key: "emboss", label: "Emboss", type: "range", min: 0, max: 2, step: 0.05, value: 0.9 },
    { key: "variation", label: "Variation", type: "range", min: 0, max: 0.6, step: 0.05, value: 0.2 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 8, seed, 3, 0.5);
    const out = createBuffer(size);
    const cols = p.cols | 0;
    const rows = p.rows | 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = (y / size) * rows;
        const row = Math.floor(v);
        const rowF = v - row;
        const off = (row % 2) * 0.5;
        const u = (((x / size) * cols + off) % cols + cols) % cols;
        const col = Math.floor(u);
        const colF = u - col;

        // Ellipse scale centered in cell, hanging downward
        const cx = 0.5;
        const cy = 0.35;
        const dx = (colF - cx) * 2;
        const dy = (rowF - cy) * 2 * p.roundness;
        const d = Math.hypot(dx, dy);

        const inside = d < 1 - p.gap;
        const rim = smoothstep(1 - p.gap - 0.15, 1 - p.gap, d);
        let val = inside ? (1 - d * 0.55) * (1 - rim * 0.35) : 0.08;
        val += (hash2(col, row, seed) - 0.5) * p.variation;
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
