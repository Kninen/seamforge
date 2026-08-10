import { perlinNoise2D } from "../core/noise.js";
import { levels, normalize, gaussianBlur } from "../core/filters.js";

export const clouds = {
  id: "clouds",
  name: "Clouds",
  hint: "Soft seamless cloud / smoke billows from fBm noise.",
  params: [
    { key: "scale", label: "Scale", type: "range", min: 1, max: 10, step: 1, value: 3 },
    { key: "octaves", label: "Octaves", type: "range", min: 2, max: 8, step: 1, value: 6 },
    { key: "softness", label: "Softness", type: "range", min: 0, max: 8, step: 0.5, value: 2 },
    { key: "coverage", label: "Coverage", type: "range", min: 0.1, max: 0.9, step: 0.05, value: 0.45 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 3, step: 0.05, value: 1.6 },
  ],
  generate(size, seed, p) {
    let out = perlinNoise2D(size, p.scale, seed, p.octaves | 0, 0.55);
    out = gaussianBlur(out, p.softness);
    const black = Math.max(0, p.coverage - 0.25);
    const white = Math.min(1, p.coverage + 0.35);
    return levels(normalize(out), black, white, p.contrast, 0, 1);
  },
};
