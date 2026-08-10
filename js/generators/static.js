import { createBuffer, clamp01 } from "../core/buffer.js";
import { hash3 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { levels, normalize, gaussianBlur } from "../core/filters.js";

export const tvStatic = {
  id: "static",
  name: "TV Static",
  hint: "Seamless noise static with optional scanlines and bands.",
  params: [
    { key: "grain", label: "Grain", type: "range", min: 0.2, max: 1, step: 0.05, value: 0.85 },
    { key: "scanlines", label: "Scanlines", type: "range", min: 0, max: 1, step: 0.05, value: 0.35 },
    { key: "bands", label: "Bands", type: "range", min: 0, max: 1, step: 0.05, value: 0.25 },
    { key: "soft", label: "Softness", type: "range", min: 0, max: 2, step: 0.1, value: 0 },
  ],
  generate(size, seed, p) {
    const bandNoise = perlinNoise2D(size, 2, seed, 2, 0.5);
    const out = createBuffer(size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const grain = hash3(x, y, seed & 255, seed) * p.grain + (1 - p.grain) * 0.5;
        const scan = (y % 2 === 0 ? 1 : 1 - p.scanlines * 0.5);
        const band = 1 - Math.abs(bandNoise[i] - 0.5) * 2 * p.bands;
        out[i] = clamp01(grain * scan * (0.7 + 0.3 * band));
      }
    }

    let result = out;
    if (p.soft > 0) result = gaussianBlur(result, p.soft);
    return levels(normalize(result), 0, 1, 1, 0, 1);
  },
};
