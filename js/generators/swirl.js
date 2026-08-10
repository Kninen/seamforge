import { createBuffer, clamp01, smoothstep } from "../core/buffer.js";
import { voronoiSeamless } from "../core/noise.js";
import { blend, gaussianBlur, levels, normalize, slopeBlur } from "../core/filters.js";

/**
 * Recreates the reference pipeline:
 * Voronoi → Islands UV → Polar → Spiral Gradient × Shape → Blur → Levels → Slope Blur
 */
export const swirlIslands = {
  id: "swirl",
  name: "Swirl Islands",
  hint: "Organic interlocking swirls from Voronoi cells + polar UVs — like the Substance graph.",
  params: [
    { key: "cellsX", label: "Cells X", type: "range", min: 2, max: 12, step: 1, value: 5 },
    { key: "cellsY", label: "Cells Y", type: "range", min: 2, max: 12, step: 1, value: 5 },
    { key: "jitter", label: "Jitter", type: "range", min: 0, max: 1, step: 0.01, value: 0.9 },
    { key: "arms", label: "Spiral arms", type: "range", min: 1, max: 10, step: 1, value: 3 },
    { key: "twist", label: "Twist", type: "range", min: 0.5, max: 16, step: 0.1, value: 5.5 },
    { key: "padding", label: "Island pad", type: "range", min: 0.02, max: 0.55, step: 0.01, value: 0.18 },
    { key: "blur", label: "Blur", type: "range", min: 0, max: 12, step: 0.5, value: 2 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.4, max: 2.5, step: 0.05, value: 1.45 },
    { key: "slope", label: "Slope blur", type: "range", min: 0, max: 24, step: 0.5, value: 9 },
    { key: "invert", label: "Invert", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const cellsX = p.cellsX | 0;
    const cellsY = p.cellsY | 0;
    const { uvX, uvY, edge } = voronoiSeamless(size, cellsX, cellsY, seed, p.jitter);

    const gradient = createBuffer(size);
    const shape = createBuffer(size);

    for (let i = 0; i < size * size; i++) {
      const lx = uvX[i];
      const ly = uvY[i];
      const r = Math.hypot(lx, ly);
      const theta = Math.atan2(ly, lx);

      // Spiral in polar UV
      const spiral = (theta / (Math.PI * 2)) * p.arms + r * p.twist;
      let g = spiral - Math.floor(spiral);
      g = 1 - Math.abs(g * 2 - 1);
      gradient[i] = Math.pow(clamp01(g), 0.75);

      // Full Voronoi island body (padding = soft edge inset)
      const body = smoothstep(0, p.padding, edge[i]);
      shape[i] = body;
    }

    let out = blend(gradient, shape, "multiply", 1);
    out = gaussianBlur(out, p.blur);
    out = levels(out, 0.1, 0.82, p.contrast, 0, 1);
    if (p.slope > 0) out = slopeBlur(out, p.slope, 10);
    out = levels(normalize(out), 0.04, 0.9, 1.2, 0, 1);

    if (p.invert) {
      for (let i = 0; i < out.length; i++) out[i] = 1 - out[i];
    }
    return out;
  },
};
