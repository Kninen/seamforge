import { createBuffer, clamp01 } from "../core/buffer.js";
import { perlinNoise2D, valueNoise2D } from "../core/noise.js";
import { gaussianBlur, levels, normalize, emboss, blend } from "../core/filters.js";

export const brushed = {
  id: "brushed",
  name: "Brushed Metal",
  hint: "Seamless brushed / scratched metal grain.",
  params: [
    { key: "direction", label: "Angle", type: "range", min: 0, max: 180, step: 1, value: 0 },
    { key: "streaks", label: "Streaks", type: "range", min: 4, max: 40, step: 1, value: 18 },
    { key: "scratch", label: "Scratches", type: "range", min: 0, max: 1, step: 0.05, value: 0.45 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.25 },
  ],
  generate(size, seed, p) {
    const ang = (p.direction * Math.PI) / 180;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    // Stretch noise heavily along brush direction
    const n1 = perlinNoise2D(size, p.streaks, seed, 4, 0.55);
    const n2 = valueNoise2D(size, p.streaks * 2, seed + 8, 2, 0.5);
    const out = createBuffer(size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const u = x / size - 0.5;
        const v = y / size - 0.5;
        const along = u * ca + v * sa;
        const across = -u * sa + v * ca;
        // Sample stretched: more variation across, less along
        const sx = ((across + 0.5) * size) | 0;
        const sy = ((((along * 0.08 + across * 0.02) % 1) + 1) % 1 * size) | 0;
        const ii = ((sy + size) % size) * size + ((sx + size) % size);
        let val = n1[ii] * 0.7 + n2[i] * 0.3;
        // Occasional bright scratches
        if (n2[i] > 1 - p.scratch * 0.12) val += (n2[i] - (1 - p.scratch * 0.12)) * 3;
        out[i] = clamp01(val);
      }
    }

    let result = gaussianBlur(out, 0.35);
    result = blend(result, emboss(result, 0.5), "overlay", 0.35);
    return levels(normalize(result), 0.1, 0.9, p.contrast, 0, 1);
  },
};
