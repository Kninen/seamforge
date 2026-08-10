import { createBuffer, clamp01 } from "../core/buffer.js";
import { createRng, hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize, blend } from "../core/filters.js";

export const stars = {
  id: "stars",
  name: "Stars",
  hint: "Seamless starfield with nebula haze — great for space backgrounds.",
  params: [
    { key: "density", label: "Density", type: "range", min: 0.05, max: 0.8, step: 0.01, value: 0.28 },
    { key: "size", label: "Star size", type: "range", min: 0.5, max: 3, step: 0.1, value: 1.2 },
    { key: "nebula", label: "Nebula", type: "range", min: 0, max: 1, step: 0.05, value: 0.45 },
    { key: "glow", label: "Glow", type: "range", min: 0, max: 4, step: 0.1, value: 1.2 },
  ],
  generate(size, seed, p) {
    const neb = perlinNoise2D(size, 3, seed, 5, 0.55);
    const out = createBuffer(size);
    const rng = createRng(seed);
    const count = Math.floor(size * size * p.density * 0.004);

    // Sparse bright stars
    for (let s = 0; s < count; s++) {
      const sx = (rng() * size) | 0;
      const sy = (rng() * size) | 0;
      const bright = 0.5 + rng() * 0.5;
      const rad = p.size * (0.6 + rng() * 0.8);
      const r = Math.ceil(rad + p.glow * 2);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = (((sx + dx) % size) + size) % size;
          const y = (((sy + dy) % size) + size) % size;
          const d = Math.hypot(dx, dy);
          const core = Math.exp(-(d * d) / Math.max(0.2, rad * rad * 0.5));
          const glow = Math.exp(-(d * d) / Math.max(0.5, (rad + p.glow) * (rad + p.glow)));
          const i = y * size + x;
          out[i] = Math.max(out[i], clamp01(core * bright + glow * bright * 0.35));
        }
      }
    }

    // Tiny dust stars via hash
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const h = hash2(x, y, seed);
        if (h > 1 - p.density * 0.002) {
          out[y * size + x] = Math.max(out[y * size + x], 0.4 + h * 0.4);
        }
      }
    }

    let result = gaussianBlur(out, 0.3);
    const haze = levels(neb, 0.35, 0.85, 1.2, 0, 0.55);
    result = blend(result, haze, "screen", p.nebula);
    return levels(normalize(result), 0, 0.95, 1.1, 0, 1);
  },
};
