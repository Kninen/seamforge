import { createBuffer, clamp01 } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { emboss, gaussianBlur, levels, normalize } from "../core/filters.js";

export const triangles = {
  id: "triangles",
  name: "Triangles",
  hint: "Seamless triangular tile mosaic.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 2, max: 20, step: 1, value: 8 },
    { key: "gap", label: "Gap", type: "range", min: 0.01, max: 0.2, step: 0.01, value: 0.06 },
    { key: "variation", label: "Variation", type: "range", min: 0, max: 1, step: 0.05, value: 0.45 },
    { key: "relief", label: "Relief", type: "range", min: 0, max: 2, step: 0.05, value: 0.65 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 10, seed, 3, 0.5);
    const out = createBuffer(size);
    const s = p.scale;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * s;
        const v = (y / size) * s * (Math.sqrt(3) / 2) * 2 / Math.sqrt(3);
        // Equilateral triangle grid
        const row = Math.floor(v);
        const rowV = v - row;
        const offset = (row % 2) * 0.5;
        const col = Math.floor(u + offset);
        const colU = u + offset - col;

        // Which triangle in the pair
        const flip = colU + rowV > 1;
        const idA = col;
        const idB = row;
        const id = hash2(idA, idB * 2 + (flip ? 1 : 0), seed);

        // Distance to edges
        const e1 = colU;
        const e2 = rowV;
        const e3 = 1 - (colU + rowV);
        const edgeDist = flip ? Math.min(1 - colU, 1 - rowV, colU + rowV - 1) : Math.min(e1, e2, e3);

        let val;
        if (edgeDist < p.gap) val = 0.1;
        else val = 0.35 + id * p.variation + (n[y * size + x] - 0.5) * 0.1;
        out[y * size + x] = clamp01(val);
      }
    }

    let result = gaussianBlur(out, 0.35);
    if (p.relief > 0) {
      const e = emboss(result, p.relief);
      for (let i = 0; i < result.length; i++) result[i] = clamp01(result[i] * 0.6 + e[i] * 0.4);
    }
    return levels(normalize(result), 0.05, 0.95, 1.1, 0, 1);
  },
};
