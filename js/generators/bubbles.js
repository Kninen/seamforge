import { createBuffer, clamp01 } from "../core/buffer.js";
import { createRng } from "../core/rng.js";
import { gaussianBlur, levels, normalize, emboss, blend } from "../core/filters.js";

export const bubbles = {
  id: "bubbles",
  name: "Bubbles",
  hint: "Seamless foam / soap-bubble pack with soft highlights.",
  params: [
    { key: "count", label: "Count", type: "range", min: 8, max: 80, step: 1, value: 28 },
    { key: "minR", label: "Min radius", type: "range", min: 0.02, max: 0.15, step: 0.005, value: 0.04 },
    { key: "maxR", label: "Max radius", type: "range", min: 0.06, max: 0.35, step: 0.005, value: 0.14 },
    { key: "rim", label: "Rim", type: "range", min: 0.02, max: 0.3, step: 0.01, value: 0.1 },
    { key: "relief", label: "Relief", type: "range", min: 0, max: 2, step: 0.05, value: 0.7 },
  ],
  generate(size, seed, p) {
    const rng = createRng(seed);
    const balls = [];
    const count = p.count | 0;
    for (let i = 0; i < count; i++) {
      balls.push({
        x: rng(),
        y: rng(),
        r: p.minR + rng() * Math.max(0.001, p.maxR - p.minR),
      });
    }

    const out = createBuffer(size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        let best = 0;
        for (const b of balls) {
          let dx = u - b.x;
          let dy = v - b.y;
          if (dx > 0.5) dx -= 1;
          if (dx < -0.5) dx += 1;
          if (dy > 0.5) dy -= 1;
          if (dy < -0.5) dy += 1;
          const d = Math.hypot(dx, dy) / b.r;
          if (d < 1) {
            const body = (1 - d) * (1 - d);
            const rim = Math.exp(-Math.pow((d - (1 - p.rim)) / Math.max(0.02, p.rim), 2));
            best = Math.max(best, body * 0.65 + rim * 0.55);
          }
        }
        out[y * size + x] = clamp01(best);
      }
    }

    let result = gaussianBlur(out, 0.7);
    if (p.relief > 0) {
      const e = emboss(result, p.relief);
      result = blend(result, e, "screen", 0.45);
    }
    return levels(normalize(result), 0.05, 0.9, 1.2, 0, 1);
  },
};
