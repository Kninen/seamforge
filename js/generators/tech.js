import { createBuffer, clamp01, wrap } from "../core/buffer.js";
import { createRng, hash2 } from "../core/rng.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

export const tech = {
  id: "tech",
  name: "Tech Circuit",
  hint: "Seamless circuit / PCB style traces on a grid.",
  params: [
    { key: "grid", label: "Grid", type: "range", min: 4, max: 32, step: 2, value: 14 },
    { key: "density", label: "Density", type: "range", min: 0.15, max: 0.95, step: 0.05, value: 0.55 },
    { key: "thickness", label: "Thickness", type: "range", min: 1, max: 6, step: 1, value: 2 },
    { key: "nodes", label: "Nodes", type: "range", min: 0, max: 1, step: 0.05, value: 0.6 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.4 },
  ],
  generate(size, seed, p) {
    const g = Math.max(2, (p.grid | 0) & ~1);
    const out = createBuffer(size);
    const rng = createRng(seed);

    const hEdge = new Uint8Array(g * g);
    const vEdge = new Uint8Array(g * g);
    const node = new Uint8Array(g * g);

    for (let y = 0; y < g; y++) {
      for (let x = 0; x < g; x++) {
        const i = y * g + x;
        hEdge[i] = rng() < p.density ? 1 : 0;
        vEdge[i] = rng() < p.density ? 1 : 0;
        node[i] = rng() < p.nodes ? 1 : 0;
      }
    }

    // Thickness in cell-local units (0..1)
    const thick = Math.max(0.02, Math.min(0.22, (p.thickness * 0.03)));

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * g;
        const v = (y / size) * g;
        const gx = wrap(Math.floor(u), g);
        const gy = wrap(Math.floor(v), g);
        const px = u - Math.floor(u);
        const py = v - Math.floor(v);
        const cx = 0.5;
        const cy = 0.5;

        let on = 0;
        const gi = gy * g + gx;

        if (hEdge[gi] && Math.abs(py - cy) <= thick) on = 1;
        if (vEdge[gi] && Math.abs(px - cx) <= thick) on = 1;

        const left = wrap(gx - 1, g);
        if (hEdge[gy * g + left] && Math.abs(py - cy) <= thick && px < cx) on = 1;
        const up = wrap(gy - 1, g);
        if (vEdge[up * g + gx] && Math.abs(px - cx) <= thick && py < cy) on = 1;

        if (node[gi]) {
          const d = Math.hypot(px - cx, py - cy);
          if (d < thick * 2.4) on = 1;
        }

        const pad = hash2(gx, gy, seed + 99);
        if (pad > 0.88) {
          const d = Math.hypot(px - cx, py - cy);
          if (d < 0.18) on = 1;
        }

        out[y * size + x] = on;
      }
    }

    return levels(normalize(gaussianBlur(out, 0.4)), 0.05, 0.9, p.contrast, 0, 1);
  },
};
