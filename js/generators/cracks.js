import { createBuffer, clamp01, sampleBilinear } from "../core/buffer.js";
import { voronoiSeamless, perlinNoise2D } from "../core/noise.js";
import { blend, gaussianBlur, levels, normalize, invert } from "../core/filters.js";

export const cracks = {
  id: "cracks",
  name: "Cracks",
  hint: "Seamless cracked earth / dried mud from Voronoi ridges.",
  params: [
    { key: "cells", label: "Cells", type: "range", min: 3, max: 20, step: 1, value: 8 },
    { key: "width", label: "Crack width", type: "range", min: 0.02, max: 0.35, step: 0.01, value: 0.1 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 20, step: 0.5, value: 6 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 3, step: 0.05, value: 1.8 },
    { key: "invert", label: "Invert", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const cells = p.cells | 0;
    const { edge } = voronoiSeamless(size, cells, cells, seed, 0.92);
    const n1 = perlinNoise2D(size, 3, seed, 3, 0.5);
    const n2 = perlinNoise2D(size, 3, seed + 4, 3, 0.5);

    // Warp the edge field with wraparound bilinear sampling (avoids NN seam nicks)
    const warped = createBuffer(size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const sx = x + (n1[i] - 0.5) * 2 * p.warp;
        const sy = y + (n2[i] - 0.5) * 2 * p.warp;
        warped[i] = sampleBilinear(edge, size, sx, sy);
      }
    }

    const out = createBuffer(size);
    for (let i = 0; i < out.length; i++) {
      // Cracks where edge distance is low
      out[i] = clamp01(1 - warped[i] / Math.max(0.001, p.width));
    }

    let result = gaussianBlur(out, 0.6);
    result = levels(normalize(result), 0.1, 0.7, p.contrast, 0, 1);
    // Plateaus between cracks
    const plates = createBuffer(size);
    for (let i = 0; i < plates.length; i++) {
      plates[i] = clamp01(warped[i] * 0.5 + 0.35 + (n1[i] - 0.5) * 0.1);
    }
    result = blend(plates, result, "subtract", 0.85);
    result = levels(normalize(result), 0.05, 0.95, 1.1, 0, 1);
    if (p.invert) result = invert(result);
    return result;
  },
};
