import { createBuffer, wrap } from "../core/buffer.js";
import { voronoiSeamless } from "../core/noise.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";
import { hash2 } from "../core/rng.js";

export const cellular = {
  id: "cellular",
  name: "Cellular",
  hint: "Seamless Voronoi cells — walls, cracks, or soft organic patches.",
  params: [
    { key: "cellsX", label: "Cells X", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { key: "cellsY", label: "Cells Y", type: "range", min: 2, max: 16, step: 1, value: 6 },
    { key: "jitter", label: "Jitter", type: "range", min: 0, max: 1, step: 0.01, value: 0.9 },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      value: "edges",
      options: [
        { value: "edges", label: "Edges" },
        { value: "fill", label: "Fill" },
        { value: "cracks", label: "Cracks" },
      ],
    },
    { key: "thickness", label: "Edge thick", type: "range", min: 1, max: 12, step: 1, value: 3 },
    { key: "blur", label: "Blur", type: "range", min: 0, max: 8, step: 0.5, value: 1 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.2 },
  ],
  generate(size, seed, p) {
    const { dist, id } = voronoiSeamless(size, p.cellsX | 0, p.cellsY | 0, seed, p.jitter);
    const out = createBuffer(size);
    const thick = Math.max(1, p.thickness | 0);

    if (p.mode === "fill") {
      for (let i = 0; i < out.length; i++) {
        out[i] = hash2(id[i], 0, seed);
      }
    } else if (p.mode === "cracks") {
      // Distance-from-center ridges inverted → dark centers, bright walls
      for (let i = 0; i < out.length; i++) out[i] = dist[i];
    } else {
      // Edges from cell-id discontinuities (with thickness)
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const me = id[i];
          let edge = 0;
          for (let k = 1; k <= thick; k++) {
            if (id[y * size + wrap(x + k, size)] !== me) edge = 1;
            if (id[y * size + wrap(x - k, size)] !== me) edge = 1;
            if (id[wrap(y + k, size) * size + x] !== me) edge = 1;
            if (id[wrap(y - k, size) * size + x] !== me) edge = 1;
          }
          out[i] = edge;
        }
      }
    }

    let result = out;
    if (p.blur > 0) result = gaussianBlur(result, p.blur);
    return levels(normalize(result), 0.05, 0.95, p.contrast, 0, 1);
  },
};
