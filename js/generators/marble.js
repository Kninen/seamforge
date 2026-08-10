import { createBuffer } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { levels, normalize } from "../core/filters.js";

export const marble = {
  id: "marble",
  name: "Marble",
  hint: "Classic seamless marble veins from warped sine bands.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 1, max: 12, step: 1, value: 4 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 2, step: 0.05, value: 0.85 },
    { key: "veins", label: "Vein freq", type: "range", min: 1, max: 20, step: 1, value: 8 },
    { key: "sharpness", label: "Sharpness", type: "range", min: 0.4, max: 3, step: 0.05, value: 1.4 },
    { key: "octaves", label: "Octaves", type: "range", min: 1, max: 6, step: 1, value: 4 },
  ],
  generate(size, seed, p) {
    const n1 = perlinNoise2D(size, p.scale, seed, p.octaves | 0, 0.5);
    const n2 = perlinNoise2D(size, p.scale, seed + 99, p.octaves | 0, 0.5);
    const out = createBuffer(size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const u = x / size;
        const v = y / size;
        const wx = u + (n1[i] - 0.5) * p.warp;
        const wy = v + (n2[i] - 0.5) * p.warp;
        // Integer vein count keeps sin phase matched on wrap
        const veins = Math.max(1, Math.round(p.veins));
        const band = Math.sin((wx + wy) * Math.PI * 2 * veins);
        out[i] = band * 0.5 + 0.5;
      }
    }

    return levels(normalize(out), 0.15, 0.85, p.sharpness, 0, 1);
  },
};
