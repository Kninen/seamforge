import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D, voronoiSeamless } from "../core/noise.js";
import { blend, gaussianBlur, levels, normalize, emboss } from "../core/filters.js";

export const leather = {
  id: "leather",
  name: "Leather",
  hint: "Seamless leather grain — fine pores + soft cellular wrinkles.",
  params: [
    { key: "pores", label: "Pores", type: "range", min: 4, max: 28, step: 1, value: 14 },
    { key: "wrinkles", label: "Wrinkles", type: "range", min: 2, max: 12, step: 1, value: 5 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.25 },
    { key: "emboss", label: "Relief", type: "range", min: 0, max: 2, step: 0.05, value: 0.7 },
  ],
  generate(size, seed, p) {
    const fine = perlinNoise2D(size, p.pores, seed, 4, 0.55);
    const { dist } = voronoiSeamless(size, p.wrinkles | 0, p.wrinkles | 0, seed + 3, 0.95);
    const mid = perlinNoise2D(size, Math.max(2, (p.wrinkles / 2) | 0), seed + 9, 3, 0.5);

    const pores = createBuffer(size);
    for (let i = 0; i < pores.length; i++) {
      // Speckle pores
      const speck = fine[i] > 0.62 ? (fine[i] - 0.62) * 3 : 0;
      pores[i] = clamp01(0.55 + mid[i] * 0.25 - speck * 0.45 - dist[i] * 0.15);
    }

    let out = gaussianBlur(pores, 0.8);
    out = blend(out, mid, "overlay", 0.35);
    if (p.emboss > 0) {
      const e = emboss(out, p.emboss);
      out = blend(out, e, "overlay", 0.5);
    }
    return levels(normalize(out), 0.08, 0.92, p.contrast, 0, 1);
  },
};
