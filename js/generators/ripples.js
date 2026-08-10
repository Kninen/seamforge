import { createBuffer, clamp01 } from "../core/buffer.js";
import { createRng } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { levels, normalize, gaussianBlur } from "../core/filters.js";

export const ripples = {
  id: "ripples",
  name: "Ripples",
  hint: "Seamless water ripples from overlapping circular waves.",
  params: [
    { key: "count", label: "Sources", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { key: "freq", label: "Frequency", type: "range", min: 2, max: 30, step: 0.5, value: 12 },
    { key: "falloff", label: "Falloff", type: "range", min: 0.2, max: 2, step: 0.05, value: 0.85 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1, step: 0.05, value: 0.25 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.3 },
  ],
  generate(size, seed, p) {
    const rng = createRng(seed);
    const sources = [];
    const count = p.count | 0;
    for (let i = 0; i < count; i++) {
      sources.push({ x: rng(), y: rng(), phase: rng() * Math.PI * 2 });
    }
    const n1 = perlinNoise2D(size, 3, seed, 3, 0.5);
    const n2 = perlinNoise2D(size, 3, seed + 11, 3, 0.5);
    const out = createBuffer(size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let u = x / size + (n1[i] - 0.5) * p.warp * 0.15;
        let v = y / size + (n2[i] - 0.5) * p.warp * 0.15;
        u = ((u % 1) + 1) % 1;
        v = ((v % 1) + 1) % 1;

        let sum = 0;
        for (const s of sources) {
          let dx = u - s.x;
          let dy = v - s.y;
          if (dx > 0.5) dx -= 1;
          if (dx < -0.5) dx += 1;
          if (dy > 0.5) dy -= 1;
          if (dy < -0.5) dy += 1;
          const r = Math.hypot(dx, dy);
          const amp = Math.exp(-r * p.falloff * 4);
          sum += Math.sin(r * Math.PI * 2 * p.freq + s.phase) * amp;
        }
        out[i] = clamp01(sum * 0.5 + 0.5);
      }
    }
    return levels(normalize(gaussianBlur(out, 0.5)), 0.1, 0.9, p.contrast, 0, 1);
  },
};
