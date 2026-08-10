import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

export const camo = {
  id: "camo",
  name: "Camo",
  hint: "Seamless camouflage blobs quantized into flat bands.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 1, max: 12, step: 1, value: 4 },
    { key: "bands", label: "Bands", type: "range", min: 2, max: 8, step: 1, value: 4 },
    { key: "soft", label: "Edge soft", type: "range", min: 0, max: 4, step: 0.5, value: 1 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1, step: 0.05, value: 0.35 },
  ],
  generate(size, seed, p) {
    const a = perlinNoise2D(size, p.scale, seed, 5, 0.5);
    const b = perlinNoise2D(size, p.scale, seed + 13, 4, 0.5);
    const out = createBuffer(size);
    const bands = Math.max(2, p.bands | 0);

    for (let i = 0; i < out.length; i++) {
      let v = a[i] * (1 - p.warp * 0.5) + b[i] * p.warp * 0.5;
      v = Math.floor(v * bands) / (bands - 1 || 1);
      out[i] = clamp01(v);
    }

    let result = out;
    if (p.soft > 0) result = gaussianBlur(result, p.soft);
    return levels(normalize(result), 0.05, 0.95, 1.05, 0, 1);
  },
};
