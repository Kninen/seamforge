import { createBuffer, clamp01 } from "../core/buffer.js";
import { hash2 } from "../core/rng.js";
import { perlinNoise2D } from "../core/noise.js";
import { emboss, gaussianBlur, levels, normalize } from "../core/filters.js";

export const herringbone = {
  id: "herringbone",
  name: "Herringbone",
  hint: "Seamless herringbone parquet / chevron flooring.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 2, max: 20, step: 1, value: 8 },
    { key: "gap", label: "Gap", type: "range", min: 0.02, max: 0.2, step: 0.01, value: 0.07 },
    { key: "variation", label: "Plank var.", type: "range", min: 0, max: 0.8, step: 0.05, value: 0.35 },
    { key: "relief", label: "Relief", type: "range", min: 0, max: 2, step: 0.05, value: 0.75 },
  ],
  generate(size, seed, p) {
    const n = perlinNoise2D(size, 10, seed, 3, 0.5);
    const out = createBuffer(size);
    const s = p.scale;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Map to herringbone lattice
        let u = (x / size) * s;
        let v = (y / size) * s;
        // Rotate 45°
        const r = (u + v) / Math.SQRT2;
        const t = (-u + v) / Math.SQRT2;
        const cellR = Math.floor(r);
        const cellT = Math.floor(t);
        const fr = r - cellR;
        const ft = t - cellT;

        // Alternate plank orientation zig-zag
        const zig = (cellR & 1) === 0;
        const along = zig ? fr : ft;
        const across = zig ? ft : fr;
        const plankId = zig ? cellR * 31 + Math.floor(cellT / 1) : cellT * 31 + cellR;

        const inGap = across < p.gap || across > 1 - p.gap || along < p.gap * 0.5;
        let val;
        if (inGap) val = 0.12;
        else {
          const tone = 0.4 + hash2(plankId, 0, seed) * p.variation;
          const grain = Math.sin(along * Math.PI * 8) * 0.04;
          val = tone + grain + (n[y * size + x] - 0.5) * 0.12;
        }
        out[y * size + x] = clamp01(val);
      }
    }

    let result = gaussianBlur(out, 0.4);
    if (p.relief > 0) {
      const e = emboss(result, p.relief);
      for (let i = 0; i < result.length; i++) result[i] = clamp01(result[i] * 0.6 + e[i] * 0.4);
    }
    return levels(normalize(result), 0.05, 0.95, 1.1, 0, 1);
  },
};
