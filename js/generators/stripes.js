import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D } from "../core/noise.js";
import { levels, normalize, gaussianBlur } from "../core/filters.js";

export const stripes = {
  id: "stripes",
  name: "Stripes",
  hint: "Seamless stripes — fabric, awning, or carbon-fiber style.",
  params: [
    { key: "count", label: "Count", type: "range", min: 2, max: 48, step: 1, value: 12 },
    { key: "angle", label: "Angle", type: "range", min: 0, max: 180, step: 1, value: 0 },
    { key: "warp", label: "Warp", type: "range", min: 0, max: 1.5, step: 0.05, value: 0.15 },
    { key: "soft", label: "Softness", type: "range", min: 0.01, max: 0.5, step: 0.01, value: 0.08 },
    {
      key: "style",
      label: "Style",
      type: "select",
      value: "even",
      options: [
        { value: "even", label: "Even" },
        { value: "carbon", label: "Carbon" },
        { value: "uneven", label: "Uneven" },
      ],
    },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 4, seed, 3, 0.5);
    const out = createBuffer(size);
    const ang = (p.angle * Math.PI) / 180;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const u = x / size - 0.5;
        const v = y / size - 0.5;
        let t = u * ca + v * sa + 0.5;
        t += (n[i] - 0.5) * p.warp * 0.2;
        t = ((t % 1) + 1) % 1;

        let val;
        if (p.style === "carbon") {
          // Dual-axis weave feel
          const t2 = (-u * sa + v * ca + 0.5 + (n[i] - 0.5) * p.warp * 0.1);
          const tt2 = ((t2 % 1) + 1) % 1;
          const a = stripe(t * p.count, p.soft);
          const b = stripe(tt2 * p.count, p.soft);
          val = Math.max(a, b) * 0.55 + a * b * 0.45;
        } else if (p.style === "uneven") {
          const f = t * p.count;
          const cell = Math.floor(f);
          const frac = f - cell;
          const width = 0.35 + hashWidth(cell, seed) * 0.4;
          val = frac < width ? 1 - smoothEdge(frac, width, p.soft) : softBand(frac - width, 1 - width, p.soft);
        } else {
          val = stripe(t * p.count, p.soft);
        }
        out[i] = clamp01(val);
      }
    }
    return levels(normalize(gaussianBlur(out, 0.3)), 0, 1, 1.05, 0, 1);
  },
};

function stripe(f, soft) {
  const frac = f - Math.floor(f);
  const d = Math.min(frac, 1 - frac);
  return frac < 0.5 ? 1 - smoothEdge(d, 0.5, soft) : softBand(d, 0.5, soft);
}

function smoothEdge(d, half, soft) {
  return clamp01((half - d) / Math.max(1e-4, soft));
}

function softBand(d, half, soft) {
  return clamp01(d / Math.max(1e-4, soft * half));
}

function hashWidth(i, seed) {
  let n = Math.imul(i + 1, 747796405) ^ (seed * 2891336453);
  n = (n ^ (n >>> 13)) >>> 0;
  return (n % 1000) / 1000;
}
