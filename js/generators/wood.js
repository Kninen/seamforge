import { createBuffer } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { levels, normalize } from "../core/filters.js";

export const wood = {
  id: "wood",
  name: "Wood",
  hint: "Seamless wood grain — vertical bands warped by noise.",
  params: [
    { key: "rings", label: "Grain dens.", type: "range", min: 2, max: 40, step: 1, value: 16 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1.5, step: 0.05, value: 0.65 },
    { key: "wave", label: "Wave", type: "range", min: 0, max: 2, step: 0.05, value: 0.35 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.35 },
  ],
  generate(size, seed, p) {
    const n1 = perlinNoise2D(size, 3, seed, 4, 0.55);
    const n2 = perlinNoise2D(size, 5, seed + 7, 3, 0.5);
    const out = createBuffer(size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const u = x / size;
        const v = y / size;
        const warped = u + (n1[i] - 0.5) * p.warp + Math.sin(v * Math.PI * 2) * p.wave * 0.08;
        const grain = Math.sin(warped * Math.PI * 2 * p.rings + (n2[i] - 0.5) * 2);
        out[i] = grain * 0.5 + 0.5;
      }
    }

    return levels(normalize(out), 0.1, 0.9, p.contrast, 0, 1);
  },
};
