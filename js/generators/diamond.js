import { createBuffer, clamp01 } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { emboss, gaussianBlur, levels, normalize } from "../core/filters.js";

export const diamondPlate = {
  id: "diamond",
  name: "Diamond Plate",
  hint: "Seamless industrial diamond / tread plate pattern.",
  params: [
    { key: "cols", label: "Columns", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { key: "rows", label: "Rows", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { key: "size", label: "Lug size", type: "range", min: 0.25, max: 0.7, step: 0.01, value: 0.42 },
    { key: "relief", label: "Relief", type: "range", min: 0.2, max: 2, step: 0.05, value: 1.1 },
    { key: "base", label: "Base noise", type: "range", min: 0, max: 0.5, step: 0.05, value: 0.15 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 10, seed, 3, 0.5);
    const out = createBuffer(size);
    const cols = p.cols | 0;
    const rows = p.rows | 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * cols;
        const v = (y / size) * rows;
        const cx = Math.floor(u) + 0.5;
        const cy = Math.floor(v) + 0.5;
        const dx = u - cx;
        const dy = v - cy;
        // Rotated diamond (manhattan in 45°)
        const d = Math.abs(dx + dy) + Math.abs(dx - dy);
        const lug = d < p.size ? clamp01(1 - d / p.size) : 0;
        const tone = 0.35 + hash2(Math.floor(u), Math.floor(v), seed) * 0.1;
        out[y * size + x] = clamp01(tone + lug * 0.55 + (n[y * size + x] - 0.5) * p.base);
      }
    }

    let result = gaussianBlur(out, 0.5);
    const e = emboss(result, p.relief);
    for (let i = 0; i < result.length; i++) result[i] = clamp01(result[i] * 0.45 + e[i] * 0.55);
    return levels(normalize(result), 0.05, 0.95, 1.15, 0, 1);
  },
};
