import { perlinNoise2D, valueNoise2D } from "../core/noise.js";
import { levels, normalize, emboss } from "../core/filters.js";

export const softNoise = {
  id: "noise",
  name: "Soft Noise",
  hint: "Seamless Perlin / value noise — great base for dirt, clouds, height maps.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      value: "perlin",
      options: [
        { value: "perlin", label: "Perlin" },
        { value: "value", label: "Value" },
      ],
    },
    { key: "scale", label: "Scale", type: "range", min: 1, max: 24, step: 1, value: 6 },
    { key: "octaves", label: "Octaves", type: "range", min: 1, max: 8, step: 1, value: 5 },
    { key: "persistence", label: "Persistence", type: "range", min: 0.2, max: 0.9, step: 0.05, value: 0.5 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.1 },
    { key: "emboss", label: "Emboss", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const fn = p.type === "value" ? valueNoise2D : perlinNoise2D;
    let out = fn(size, p.scale, seed, p.octaves | 0, p.persistence);
    out = levels(normalize(out), 0.05, 0.95, p.contrast, 0, 1);
    if (p.emboss) out = emboss(out, 1.4);
    return out;
  },
};
