import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize, emboss } from "../core/filters.js";

export const weave = {
  id: "weave",
  name: "Weave",
  hint: "Seamless fabric basket-weave / linen pattern.",
  params: [
    { key: "threads", label: "Threads", type: "range", min: 4, max: 40, step: 1, value: 16 },
    { key: "gap", label: "Gap", type: "range", min: 0.05, max: 0.45, step: 0.01, value: 0.18 },
    { key: "relief", label: "Relief", type: "range", min: 0, max: 2, step: 0.05, value: 0.85 },
    { key: "noise", label: "Fiber noise", type: "range", min: 0, max: 0.6, step: 0.05, value: 0.2 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 20, seed, 2, 0.5);
    const out = createBuffer(size);
    const t = p.threads;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * t;
        const v = (y / size) * t;
        const ix = Math.floor(u);
        const iy = Math.floor(v);
        const fx = u - ix;
        const fy = v - iy;

        // Basket weave: alternate which direction is on top
        const horizOnTop = ((ix + iy) & 1) === 0;
        const threadH = fx > p.gap && fx < 1 - p.gap;
        const threadV = fy > p.gap && fy < 1 - p.gap;

        let val = 0.15;
        if (horizOnTop) {
          if (threadH) val = 0.55 + (0.5 - Math.abs(fy - 0.5)) * 0.7;
          else if (threadV) val = 0.4 + (0.5 - Math.abs(fx - 0.5)) * 0.5;
        } else {
          if (threadV) val = 0.55 + (0.5 - Math.abs(fx - 0.5)) * 0.7;
          else if (threadH) val = 0.4 + (0.5 - Math.abs(fy - 0.5)) * 0.5;
        }
        val += (n[y * size + x] - 0.5) * p.noise;
        out[y * size + x] = clamp01(val);
      }
    }

    let result = gaussianBlur(out, 0.35);
    if (p.relief > 0) {
      const e = emboss(result, p.relief);
      for (let i = 0; i < result.length; i++) {
        result[i] = clamp01(result[i] * 0.6 + e[i] * 0.4);
      }
    }
    return levels(normalize(result), 0.05, 0.95, 1.1, 0, 1);
  },
};
