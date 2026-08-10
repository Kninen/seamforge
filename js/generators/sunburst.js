import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

export const sunburst = {
  id: "sunburst",
  name: "Sunburst",
  hint: "Seamless radial sunburst / starburst rays — blended tiled centers so wedges wrap cleanly.",
  params: [
    { key: "rays", label: "Rays", type: "range", min: 4, max: 48, step: 2, value: 16 },
    { key: "cells", label: "Cells", type: "range", min: 1, max: 4, step: 1, value: 1 },
    { key: "twist", label: "Twist", type: "range", min: 0, max: 4, step: 0.05, value: 0.35 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1, step: 0.05, value: 0.2 },
    { key: "soft", label: "Softness", type: "range", min: 0.02, max: 0.5, step: 0.01, value: 0.14 },
    { key: "rings", label: "Rings", type: "range", min: 0, max: 12, step: 0.5, value: 2.5 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.35 },
  ],
  generate(size, seed, p) {
    const n1 = perlinNoise2D(size, 3, seed, 3, 0.5);
    const n2 = perlinNoise2D(size, 3, seed + 6, 3, 0.5);
    const out = createBuffer(size);
    const cells = Math.max(1, p.cells | 0);
    const rays = Math.max(2, Math.round(p.rays));
    const soft = Math.max(0.02, p.soft);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let u = x / size + (n1[i] - 0.5) * p.warp * 0.12;
        let v = y / size + (n2[i] - 0.5) * p.warp * 0.12;
        u = ((u % 1) + 1) % 1;
        v = ((v % 1) + 1) % 1;

        // Scale into cell lattice
        const uu = u * cells;
        const vv = v * cells;

        let acc = 0;
        let wsum = 0;

        // Blend neighboring tiled centers (no hard Voronoi angle cracks)
        const cx0 = Math.floor(uu);
        const cy0 = Math.floor(vv);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const cx = cx0 + ox + 0.5;
            const cy = cy0 + oy + 0.5;
            const dx = uu - cx;
            const dy = vv - cy;
            const r = Math.hypot(dx, dy);
            // Influence radius ~ half-diagonal of cell
            const w = Math.exp(-r * r * 3.2);
            if (w < 1e-4) continue;

            const ang = Math.atan2(dy, dx);
            const spiral = ang / (Math.PI * 2) + r * p.twist;
            // Soft square-wave wedges (≈50/50 light/dark, softness = edge width)
            const wave = Math.sin(spiral * rays * Math.PI * 2);
            let rayVal = 0.5 + 0.5 * Math.tanh(wave / (soft * 1.8));

            if (p.rings > 0) {
              const ring = 0.5 + 0.5 * Math.cos(r * Math.PI * 2 * p.rings);
              rayVal = clamp01(rayVal * (0.78 + 0.22 * ring));
            }

            acc += rayVal * w;
            wsum += w;
          }
        }

        out[i] = clamp01(acc / (wsum || 1));
      }
    }

    return levels(normalize(gaussianBlur(out, 0.45)), 0.06, 0.94, p.contrast, 0, 1);
  },
};
