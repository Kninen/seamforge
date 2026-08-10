import { createBuffer, clamp01 } from "../core/buffer.js";
import { levels, normalize, gaussianBlur } from "../core/filters.js";

export const dots = {
  id: "dots",
  name: "Dots / Grid",
  hint: "Seamless polka dots or grid — useful for patterns and masks.",
  params: [
    { key: "cols", label: "Columns", type: "range", min: 2, max: 32, step: 1, value: 8 },
    { key: "rows", label: "Rows", type: "range", min: 2, max: 32, step: 1, value: 8 },
    { key: "radius", label: "Radius", type: "range", min: 0.05, max: 0.9, step: 0.01, value: 0.35 },
    { key: "soft", label: "Softness", type: "range", min: 0.01, max: 0.5, step: 0.01, value: 0.12 },
    {
      key: "shape",
      label: "Shape",
      type: "select",
      value: "circle",
      options: [
        { value: "circle", label: "Circle" },
        { value: "square", label: "Square" },
        { value: "diamond", label: "Diamond" },
      ],
    },
    { key: "invert", label: "Invert", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const out = createBuffer(size);
    const cols = p.cols | 0;
    const rows = p.rows | 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = ((x / size) * cols) % 1;
        const v = ((y / size) * rows) % 1;
        const dx = u - 0.5;
        const dy = v - 0.5;
        let d;
        if (p.shape === "square") d = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
        else if (p.shape === "diamond") d = (Math.abs(dx) + Math.abs(dy));
        else d = Math.hypot(dx, dy) * 2;

        const edge0 = p.radius;
        const edge1 = p.radius + p.soft;
        let val = 1 - clamp01((d - edge0) / Math.max(1e-5, edge1 - edge0));
        if (p.invert) val = 1 - val;
        out[y * size + x] = val;
      }
    }

    return levels(normalize(gaussianBlur(out, 0.4)), 0, 1, 1, 0, 1);
  },
};
