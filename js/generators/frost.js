import { createBuffer, clamp01 } from "../core/buffer.js";
import { voronoiSeamless, perlinNoise2D } from "../core/noise.js";
import { blend, gaussianBlur, levels, normalize, emboss } from "../core/filters.js";

export const frost = {
  id: "frost",
  name: "Frost",
  hint: "Seamless ice / frost crystals from sharp Voronoi + sparkle.",
  params: [
    { key: "cells", label: "Crystals", type: "range", min: 3, max: 18, step: 1, value: 7 },
    { key: "sharp", label: "Sharpness", type: "range", min: 0.5, max: 3, step: 0.05, value: 1.7 },
    { key: "sparkle", label: "Sparkle", type: "range", min: 0, max: 1, step: 0.05, value: 0.4 },
    { key: "glow", label: "Glow", type: "range", min: 0, max: 4, step: 0.5, value: 1.5 },
  ],
  generate(size, seed, p) {
    const cells = p.cells | 0;
    const { dist, edge } = voronoiSeamless(size, cells, cells, seed, 0.85);
    const n = perlinNoise2D(size, 16, seed + 2, 2, 0.5);
    const out = createBuffer(size);

    for (let i = 0; i < out.length; i++) {
      const ridges = Math.pow(clamp01(1 - edge[i] * 2.2), 2);
      const facets = Math.pow(dist[i], 0.7);
      let v = facets * 0.55 + ridges * 0.7;
      if (n[i] > 1 - p.sparkle * 0.15) v += (n[i] - (1 - p.sparkle * 0.15)) * 4;
      out[i] = clamp01(v);
    }

    let result = gaussianBlur(out, p.glow * 0.4);
    result = blend(result, emboss(result, 0.8), "screen", 0.35);
    return levels(normalize(result), 0.08, 0.85, p.sharp, 0, 1);
  },
};
