import { createBuffer, clamp01, wrap } from "../core/buffer.js";
import { createRng } from "../core/rng.js";

/** Signed-distance helpers in local unit space (≈ radius 1). Negative = inside. */
function sdCircle(x, y, r = 1) {
  return Math.hypot(x, y) - r;
}

function sdBox(x, y, hx, hy) {
  const dx = Math.abs(x) - hx;
  const dy = Math.abs(y) - hy;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
}

function sdRoundBox(x, y, hx, hy, rad) {
  return sdBox(x, y, hx - rad, hy - rad) - rad;
}

function sdDiamond(x, y, r = 1) {
  return (Math.abs(x) + Math.abs(y)) / r - 1;
}

function sdStar(x, y, points = 5, rOuter = 1, rInner = 0.42) {
  const ang = Math.atan2(y, x);
  const sector = (Math.PI * 2) / points;
  const a = ((ang % sector) + sector) % sector;
  const edge = a > sector * 0.5 ? sector - a : a;
  const t = edge / (sector * 0.5);
  const r = rOuter + (rInner - rOuter) * t;
  return Math.hypot(x, y) - r;
}

function sdCross(x, y, arm = 0.28, len = 1) {
  return Math.min(sdBox(x, y, len, arm), sdBox(x, y, arm, len));
}

function sdPetal(x, y, len = 1, width = 0.35) {
  const cx = clamp01(x / Math.max(1e-5, len)) * len;
  return Math.hypot(x - cx, y) - width * (0.55 + 0.45 * Math.sin(Math.PI * clamp01(x / len)));
}

function sdFlower(x, y) {
  let d = sdCircle(x, y, 0.28);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * (Math.PI / 2);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const lx = x * c + y * s;
    const ly = -x * s + y * c;
    d = Math.min(d, sdPetal(lx, ly, 0.95, 0.32));
  }
  return d;
}

function sdDice(x, y, pips) {
  let d = sdRoundBox(x, y, 0.92, 0.92, 0.22);
  const pipR = 0.14;
  const slots = [
    [0, 0],
    [-0.42, -0.42],
    [0.42, 0.42],
    [-0.42, 0.42],
    [0.42, -0.42],
    [-0.42, 0],
    [0.42, 0],
  ];
  const use = [
    [0],
    [1, 2],
    [0, 1, 2],
    [1, 2, 3, 4],
    [0, 1, 2, 3, 4],
    [1, 2, 3, 4, 5, 6],
  ][Math.max(0, Math.min(5, (pips | 0) - 1))];

  for (const idx of use) {
    const [px, py] = slots[idx];
    const pip = sdCircle(x - px, y - py, pipR);
    d = Math.max(d, -pip);
  }
  return d;
}

function rotate(x, y, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

function motifDistance(kind, x, y, detail) {
  switch (kind) {
    case "star":
      return sdStar(x, y, 5, 1, 0.4 + detail * 0.15);
    case "diamond":
      return sdDiamond(x, y, 1);
    case "square":
      return sdRoundBox(x, y, 0.85, 0.85, 0.08 + detail * 0.2);
    case "cross":
      return sdCross(x, y, 0.22 + detail * 0.12, 1);
    case "flower":
      return sdFlower(x, y);
    case "dice":
      return sdDice(x, y, 1 + ((detail * 5) | 0));
    case "circle":
    default:
      return sdCircle(x, y, 1);
  }
}

function stampMotif(out, size, cx, cy, radiusPx, kind, rotDeg, soft, detail) {
  const pad = Math.ceil(radiusPx * (1.35 + soft * 2) + 2);
  const softDist = Math.max(1e-4, soft * 0.35);

  for (let dy = -pad; dy <= pad; dy++) {
    for (let dx = -pad; dx <= pad; dx++) {
      const [lx, ly] = rotate(dx / radiusPx, dy / radiusPx, rotDeg);
      const d = motifDistance(kind, lx, ly, detail);
      let v;
      if (soft <= 0.001) v = d <= 0 ? 1 : 0;
      else v = clamp01(0.5 - d / softDist);

      if (v <= 0) continue;
      const x = wrap(Math.round(cx + dx), size);
      const y = wrap(Math.round(cy + dy), size);
      const i = y * size + x;
      if (v > out[i]) out[i] = v;
    }
  }
}

function fillDiagonalStripes(out, size, bands, duty) {
  const period = size / Math.max(1, bands);
  const cut = clamp01(duty) * period;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (((x + y) % period) + period) % period;
      out[y * size + x] = t < cut ? 1 : 0;
    }
  }
}

function fillNestedDiamonds(out, size, rings, thick) {
  const cx = size * 0.5;
  const cy = size * 0.5;
  const maxR = size * 0.72;
  const ringW = maxR / Math.max(1, rings);
  const t = clamp01(thick) * ringW * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let best = Infinity;
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const d = Math.abs(x - cx + ox) + Math.abs(y - cy + oy);
          if (d < best) best = d;
        }
      }
      const phase = best % ringW;
      out[y * size + x] = phase < t || phase > ringW - t ? 1 : 0;
    }
  }
}

function xorStamp(out, size, cx, cy, radiusPx, kind, rotDeg, soft, detail) {
  const mask = createBuffer(size);
  stampMotif(mask, size, cx, cy, radiusPx, kind, rotDeg, soft, detail);
  for (let i = 0; i < out.length; i++) {
    if (mask[i] > 0.5) out[i] = 1 - out[i];
  }
}

export const graphicMotifs = {
  id: "motifs",
  name: "Graphic Motifs",
  hint: "Hard-edged seamless stamps — stars, dice, flowers, stripes — like classic B/W tile packs. Pair with Pixelate for crunchy pixels.",
  params: [
    {
      key: "motif",
      label: "Motif",
      type: "select",
      value: "star",
      options: [
        { value: "star", label: "Star" },
        { value: "circle", label: "Circle" },
        { value: "diamond", label: "Diamond" },
        { value: "square", label: "Rounded square" },
        { value: "cross", label: "Cross" },
        { value: "flower", label: "Flower / X" },
        { value: "dice", label: "Dice" },
        { value: "stripes", label: "Diagonal stripes" },
        { value: "rings", label: "Diamond rings" },
      ],
    },
    {
      key: "layout",
      label: "Layout",
      type: "select",
      value: "scatter",
      options: [
        { value: "scatter", label: "Scatter" },
        { value: "grid", label: "Grid" },
        { value: "bands", label: "On diagonal bands" },
      ],
    },
    { key: "scale", label: "Scale", type: "range", min: 0.15, max: 1.2, step: 0.05, value: 0.45 },
    { key: "density", label: "Density", type: "range", min: 0.15, max: 1, step: 0.05, value: 0.55 },
    { key: "soft", label: "Edge soft", type: "range", min: 0, max: 0.35, step: 0.01, value: 0 },
    { key: "jitter", label: "Jitter", type: "range", min: 0, max: 1, step: 0.05, value: 0.35 },
    { key: "detail", label: "Detail", type: "range", min: 0, max: 1, step: 0.05, value: 0.5 },
    { key: "invert", label: "Invert", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const out = createBuffer(size);
    const rng = createRng(seed ^ 0x6d07f1);

    if (p.motif === "stripes") {
      fillDiagonalStripes(out, size, 2 + Math.round(p.density * 10), 0.35 + p.detail * 0.3);
    } else if (p.motif === "rings") {
      fillNestedDiamonds(out, size, 2 + Math.round(p.density * 6), 0.25 + p.detail * 0.35);
    } else if (p.layout === "grid") {
      const cells = Math.max(2, Math.round(2 + p.density * 10));
      const cell = size / cells;
      const radius = cell * p.scale * 0.48;
      for (let gy = 0; gy < cells; gy++) {
        for (let gx = 0; gx < cells; gx++) {
          const jx = (rng() - 0.5) * cell * p.jitter;
          const jy = (rng() - 0.5) * cell * p.jitter;
          const cx = (gx + 0.5) * cell + jx;
          const cy = (gy + 0.5) * cell + jy;
          const rot = p.jitter > 0 ? (rng() - 0.5) * 50 * p.jitter : 0;
          const rScale = radius * (0.75 + rng() * 0.5 * (0.35 + p.jitter));
          const detail = p.motif === "dice" ? rng() : p.detail;
          stampMotif(out, size, cx, cy, rScale, p.motif, rot, p.soft, detail);
        }
      }
    } else if (p.layout === "bands") {
      fillDiagonalStripes(out, size, 3 + Math.round(p.density * 5), 0.5);
      const count = Math.max(4, Math.round(8 + p.density * 40));
      const radius = size * p.scale * 0.12;
      for (let i = 0; i < count; i++) {
        const cx = rng() * size;
        const cy = rng() * size;
        const rad = radius * (0.65 + rng() * 0.7);
        xorStamp(out, size, cx, cy, rad, "diamond", 45, p.soft, p.detail);
      }
    } else {
      // Scatter — classic B/W pack feel
      const count = Math.max(3, Math.round(4 + p.density * 48));
      const baseR = size * p.scale * 0.18;
      for (let i = 0; i < count; i++) {
        const cx = rng() * size;
        const cy = rng() * size;
        const r = baseR * (0.45 + rng() * 0.9);
        const rot = rng() * 360 * Math.max(0.05, p.jitter);
        const detail = p.motif === "dice" ? rng() : p.detail;
        stampMotif(out, size, cx, cy, r, p.motif, rot, p.soft, detail);
        if (p.motif === "star" && rng() < 0.4) {
          stampMotif(
            out,
            size,
            wrap(cx + (rng() - 0.5) * r * 3, size),
            wrap(cy + (rng() - 0.5) * r * 3, size),
            r * (0.35 + rng() * 0.35),
            "star",
            rng() * 360,
            p.soft,
            detail
          );
        }
      }
    }

    if (p.invert) {
      for (let i = 0; i < out.length; i++) out[i] = 1 - out[i];
    }

    if (p.soft <= 0.02) {
      for (let i = 0; i < out.length; i++) out[i] = out[i] >= 0.5 ? 1 : 0;
    }

    return out;
  },
};
