import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { emboss, gaussianBlur, levels, normalize, blend } from "../core/filters.js";

export const terrain = {
  id: "terrain",
  name: "Terrain",
  hint: "Seamless heightmap terrain with ridges and valleys.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 1, max: 10, step: 1, value: 3 },
    { key: "octaves", label: "Octaves", type: "range", min: 2, max: 8, step: 1, value: 6 },
    { key: "ridges", label: "Ridges", type: "range", min: 0, max: 1, step: 0.05, value: 0.55 },
    { key: "relief", label: "Relief", type: "range", min: 0, max: 2, step: 0.05, value: 0.9 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.2 },
  ],
  generate(size, seed, p) {
    const base = perlinNoise2D(size, p.scale, seed, p.octaves | 0, 0.5);
    const ridgeSrc = perlinNoise2D(size, p.scale, seed + 21, Math.max(2, (p.octaves - 1) | 0), 0.5);
    const out = createBuffer(size);

    for (let i = 0; i < out.length; i++) {
      const ridge = 1 - Math.abs(ridgeSrc[i] * 2 - 1);
      const ridged = Math.pow(ridge, 1.4);
      out[i] = clamp01(base[i] * (1 - p.ridges) + ridged * p.ridges);
    }

    let result = gaussianBlur(out, 0.5);
    if (p.relief > 0) {
      result = blend(result, emboss(result, p.relief), "overlay", 0.4);
    }
    return levels(normalize(result), 0.05, 0.95, p.contrast, 0, 1);
  },
};
