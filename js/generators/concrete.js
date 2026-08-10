import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D, valueNoise2D } from "../core/noise.js";
import { blend, gaussianBlur, levels, normalize, emboss } from "../core/filters.js";

export const concrete = {
  id: "concrete",
  name: "Concrete",
  hint: "Rough seamless concrete / plaster with pits and large mottling.",
  params: [
    { key: "grain", label: "Grain", type: "range", min: 4, max: 32, step: 1, value: 16 },
    { key: "mottle", label: "Mottle", type: "range", min: 1, max: 8, step: 1, value: 3 },
    { key: "pits", label: "Pits", type: "range", min: 0, max: 1, step: 0.05, value: 0.45 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.2 },
  ],
  generate(size, seed, p) {
    const grain = valueNoise2D(size, p.grain, seed, 3, 0.5);
    const mottle = perlinNoise2D(size, p.mottle, seed + 5, 4, 0.55);
    const fine = perlinNoise2D(size, p.grain * 1.5, seed + 17, 2, 0.5);

    const out = createBuffer(size);
    for (let i = 0; i < out.length; i++) {
      let v = mottle[i] * 0.55 + grain[i] * 0.35 + fine[i] * 0.15;
      // Pits: dark speckles
      if (fine[i] > 1 - p.pits * 0.25) v -= (fine[i] - (1 - p.pits * 0.25)) * 2;
      out[i] = clamp01(v);
    }

    let result = gaussianBlur(out, 0.4);
    result = blend(result, emboss(result, 0.6), "overlay", 0.35);
    return levels(normalize(result), 0.1, 0.9, p.contrast, 0, 1);
  },
};
