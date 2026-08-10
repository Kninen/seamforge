import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

export const crosshatch = {
  id: "crosshatch",
  name: "Crosshatch",
  hint: "Seamless pen crosshatch / engraving lines.",
  params: [
    { key: "density", label: "Density", type: "range", min: 4, max: 40, step: 1, value: 16 },
    { key: "layers", label: "Layers", type: "range", min: 1, max: 4, step: 1, value: 2 },
    { key: "thickness", label: "Thickness", type: "range", min: 0.05, max: 0.45, step: 0.01, value: 0.18 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1, step: 0.05, value: 0.2 },
    { key: "invert", label: "Invert", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const n1 = perlinNoise2D(size, 3, seed, 3, 0.5);
    const n2 = perlinNoise2D(size, 3, seed + 5, 3, 0.5);
    const out = createBuffer(size);
    const layers = p.layers | 0;
    const angles = [25, -25, 70, -70];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let u = x / size + (n1[i] - 0.5) * p.warp * 0.12;
        let v = y / size + (n2[i] - 0.5) * p.warp * 0.12;
        let ink = 0;
        for (let L = 0; L < layers; L++) {
          const ang = (angles[L] * Math.PI) / 180;
          const t = u * Math.cos(ang) + v * Math.sin(ang);
          let f = ((t * p.density) % 1 + 1) % 1;
          const d = Math.min(f, 1 - f);
          if (d < p.thickness * 0.5) ink = 1;
        }
        out[i] = ink;
      }
    }

    let result = levels(normalize(gaussianBlur(out, 0.3)), 0.05, 0.9, 1.3, 0, 1);
    if (p.invert) {
      for (let i = 0; i < result.length; i++) result[i] = 1 - result[i];
    }
    return result;
  },
};
