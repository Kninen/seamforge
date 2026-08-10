import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize, emboss } from "../core/filters.js";

export const checker = {
  id: "checker",
  name: "Checker",
  hint: "Seamless checkerboard with optional warp and bevel.",
  params: [
    { key: "cells", label: "Cells", type: "range", min: 2, max: 24, step: 1, value: 8 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1.5, step: 0.05, value: 0 },
    { key: "soft", label: "Softness", type: "range", min: 0, max: 0.4, step: 0.01, value: 0.04 },
    { key: "bevel", label: "Bevel", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const n1 = perlinNoise2D(size, 3, seed, 3, 0.5);
    const n2 = perlinNoise2D(size, 3, seed + 2, 3, 0.5);
    const out = createBuffer(size);
    const c = p.cells;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let u = x / size + (n1[i] - 0.5) * p.warp * 0.2;
        let v = y / size + (n2[i] - 0.5) * p.warp * 0.2;
        u = ((u % 1) + 1) % 1;
        v = ((v % 1) + 1) % 1;
        const fx = (u * c) % 1;
        const fy = (v * c) % 1;
        const cx = Math.floor(u * c);
        const cy = Math.floor(v * c);
        const on = ((cx + cy) & 1) === 0;

        let val = on ? 1 : 0;
        if (p.soft > 0) {
          const d = Math.min(fx, 1 - fx, fy, 1 - fy);
          const e = clamp01(d / p.soft);
          val = on ? 0.5 + 0.5 * e : 0.5 - 0.5 * e;
        }
        out[i] = val;
      }
    }

    let result = gaussianBlur(out, 0.2);
    if (p.bevel) result = emboss(result, 1.1);
    return levels(normalize(result), 0, 1, 1, 0, 1);
  },
};
