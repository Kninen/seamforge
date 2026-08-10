import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

export const sunburst = {
  id: "sunburst",
  name: "Sunburst",
  hint: "Seamless radial rays — works by tiling mirrored polar wedges.",
  params: [
    { key: "rays", label: "Rays", type: "range", min: 4, max: 48, step: 1, value: 16 },
    { key: "twist", label: "Twist", type: "range", min: 0, max: 4, step: 0.05, value: 0.4 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1, step: 0.05, value: 0.25 },
    { key: "soft", label: "Softness", type: "range", min: 0.01, max: 0.5, step: 0.01, value: 0.12 },
    { key: "rings", label: "Rings", type: "range", min: 0, max: 12, step: 0.5, value: 3 },
  ],
  generate(size, seed, p) {
    // Seamless trick: use 4 mirrored quadrants from a toroidal angle field
    // based on domain-warped UV distance to tiled centers.
    const n1 = perlinNoise2D(size, 3, seed, 3, 0.5);
    const n2 = perlinNoise2D(size, 3, seed + 6, 3, 0.5);
    const out = createBuffer(size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        let u = x / size + (n1[i] - 0.5) * p.warp * 0.15;
        let v = y / size + (n2[i] - 0.5) * p.warp * 0.15;
        u = ((u % 1) + 1) % 1;
        v = ((v % 1) + 1) % 1;

        // Distance/angle to nearest of a 2x2 lattice of centers for seamlessness
        let best = Infinity;
        let ang = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const cx = 0.5 + ox;
            const cy = 0.5 + oy;
            const dx = u - cx;
            const dy = v - cy;
            const d = dx * dx + dy * dy;
            if (d < best) {
              best = d;
              ang = Math.atan2(dy, dx);
            }
          }
        }
        const r = Math.sqrt(best);
        const spiral = ang / (Math.PI * 2) + r * p.twist;
        let ray = (spiral * p.rays) % 1;
        if (ray < 0) ray += 1;
        let val = ray < 0.5 ? 1 : 0;
        const edge = Math.min(ray, 1 - ray);
        if (p.soft > 0) val = clamp01(edge / p.soft);

        if (p.rings > 0) {
          const ring = Math.abs(Math.sin(r * Math.PI * 2 * p.rings));
          val = clamp01(val * 0.75 + ring * 0.25);
        }
        out[i] = val;
      }
    }
    return levels(normalize(gaussianBlur(out, 0.4)), 0.05, 0.95, 1.15, 0, 1);
  },
};
