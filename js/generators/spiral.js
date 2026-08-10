import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize, slopeBlur } from "../core/filters.js";

export const spiral = {
  id: "spiral",
  name: "Spiral Weave",
  hint: "Dense seamless spiral / whirlpool field (tiling polar trick).",
  params: [
    { key: "arms", label: "Arms", type: "range", min: 1, max: 12, step: 1, value: 4 },
    { key: "twist", label: "Twist", type: "range", min: 1, max: 20, step: 0.5, value: 8 },
    { key: "scale", label: "Tile scale", type: "range", min: 1, max: 6, step: 1, value: 2 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1, step: 0.05, value: 0.3 },
    { key: "slope", label: "Slope blur", type: "range", min: 0, max: 16, step: 0.5, value: 5 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.4 },
  ],
  generate(size, seed, p) {
    const n1 = perlinNoise2D(size, 3, seed, 3, 0.5);
    const n2 = perlinNoise2D(size, 3, seed + 7, 3, 0.5);
    const out = createBuffer(size);
    const tiles = p.scale | 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let u = x / size + (n1[i] - 0.5) * p.warp * 0.12;
        let v = y / size + (n2[i] - 0.5) * p.warp * 0.12;
        u = ((u % 1) + 1) % 1;
        v = ((v % 1) + 1) % 1;

        // Multi-tile centers for denser coverage
        let acc = 0;
        let wsum = 0;
        for (let ty = 0; ty < tiles; ty++) {
          for (let tx = 0; tx < tiles; tx++) {
            const cx = (tx + 0.5) / tiles;
            const cy = (ty + 0.5) / tiles;
            let dx = u - cx;
            let dy = v - cy;
            if (dx > 0.5) dx -= 1;
            if (dx < -0.5) dx += 1;
            if (dy > 0.5) dy -= 1;
            if (dy < -0.5) dy += 1;
            const r = Math.hypot(dx, dy) * tiles;
            const ang = Math.atan2(dy, dx);
            const spiral = (ang / (Math.PI * 2)) * p.arms + r * p.twist;
            let g = spiral - Math.floor(spiral);
            g = 1 - Math.abs(g * 2 - 1);
            const w = Math.exp(-r * 1.8);
            acc += g * w;
            wsum += w;
          }
        }
        out[i] = clamp01(acc / (wsum || 1));
      }
    }

    let result = gaussianBlur(out, 1);
    if (p.slope > 0) result = slopeBlur(result, p.slope, 8);
    return levels(normalize(result), 0.08, 0.9, p.contrast, 0, 1);
  },
};
