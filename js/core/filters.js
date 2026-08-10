import {
  clamp01,
  createBuffer,
  lerp,
  sample,
  sampleBilinear,
  wrap,
} from "./buffer.js";

export function map(buf, fn) {
  const out = createBuffer(Math.sqrt(buf.length));
  for (let i = 0; i < buf.length; i++) out[i] = fn(buf[i], i);
  return out;
}

export function normalize(buf) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const out = createBuffer(Math.sqrt(buf.length));
  const range = max - min || 1;
  for (let i = 0; i < buf.length; i++) out[i] = (buf[i] - min) / range;
  return out;
}

export function levels(buf, inBlack = 0, inWhite = 1, gamma = 1, outBlack = 0, outWhite = 1) {
  const size = Math.sqrt(buf.length);
  const out = createBuffer(size);
  const ib = inBlack;
  const iw = inWhite <= ib ? ib + 1e-5 : inWhite;
  for (let i = 0; i < buf.length; i++) {
    let v = (buf[i] - ib) / (iw - ib);
    v = clamp01(v);
    if (gamma !== 1) v = Math.pow(v, 1 / gamma);
    out[i] = outBlack + v * (outWhite - outBlack);
  }
  return out;
}

export function multiply(a, b) {
  const size = Math.sqrt(a.length);
  const out = createBuffer(size);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  return out;
}

export function blend(bg, fg, mode = "multiply", opacity = 1) {
  const size = Math.sqrt(bg.length);
  const out = createBuffer(size);
  for (let i = 0; i < bg.length; i++) {
    const a = bg[i];
    const b = fg[i];
    let r;
    switch (mode) {
      case "add":
        r = a + b;
        break;
      case "screen":
        r = 1 - (1 - a) * (1 - b);
        break;
      case "overlay":
        r = a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b);
        break;
      case "max":
        r = Math.max(a, b);
        break;
      case "min":
        r = Math.min(a, b);
        break;
      case "subtract":
        r = a - b;
        break;
      default:
        r = a * b;
    }
    out[i] = clamp01(lerp(a, r, opacity));
  }
  return out;
}

/** Separable box blur with wrap (seamless) */
export function boxBlur(buf, radius) {
  const size = Math.sqrt(buf.length) | 0;
  if (radius <= 0) return buf.slice();
  const r = Math.max(1, Math.round(radius));
  const tmp = createBuffer(size);
  const out = createBuffer(size);
  const w = r * 2 + 1;

  for (let y = 0; y < size; y++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += sample(buf, size, k, y);
    for (let x = 0; x < size; x++) {
      tmp[y * size + x] = acc / w;
      acc += sample(buf, size, x + r + 1, y) - sample(buf, size, x - r, y);
    }
  }

  for (let x = 0; x < size; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += sample(tmp, size, x, k);
    for (let y = 0; y < size; y++) {
      out[y * size + x] = acc / w;
      acc += sample(tmp, size, x, y + r + 1) - sample(tmp, size, x, y - r);
    }
  }
  return out;
}

export function gaussianBlur(buf, radius) {
  // Approximate with 2–3 box blur passes
  let out = buf;
  const r = Math.max(0, radius);
  if (r <= 0) return buf.slice();
  out = boxBlur(out, r);
  out = boxBlur(out, r);
  out = boxBlur(out, Math.max(1, Math.round(r * 0.7)));
  return out;
}

/** Slope blur: warp sample along intensity gradient (Substance-style-ish) */
export function slopeBlur(buf, intensity = 8, samples = 8) {
  const size = Math.sqrt(buf.length) | 0;
  const out = createBuffer(size);
  const amp = intensity;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx =
        sample(buf, size, x + 1, y) - sample(buf, size, x - 1, y);
      const gy =
        sample(buf, size, x, y + 1) - sample(buf, size, x, y - 1);
      let acc = 0;
      for (let s = 0; s < samples; s++) {
        const t = (s / (samples - 1 || 1)) * 2 - 1;
        const sx = x + gx * amp * t;
        const sy = y + gy * amp * t;
        acc += sampleBilinear(buf, size, sx, sy);
      }
      out[y * size + x] = acc / samples;
    }
  }
  return out;
}

export function invert(buf) {
  const size = Math.sqrt(buf.length);
  const out = createBuffer(size);
  for (let i = 0; i < buf.length; i++) out[i] = 1 - buf[i];
  return out;
}

export function warp(buf, warpX, warpY, amount) {
  const size = Math.sqrt(buf.length) | 0;
  const out = createBuffer(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const sx = x + (warpX[i] - 0.5) * 2 * amount;
      const sy = y + (warpY[i] - 0.5) * 2 * amount;
      out[i] = sampleBilinear(buf, size, sx, sy);
    }
  }
  return out;
}

export function emboss(buf, strength = 1) {
  const size = Math.sqrt(buf.length) | 0;
  const out = createBuffer(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = sample(buf, size, x - 1, y - 1);
      const b = sample(buf, size, x + 1, y + 1);
      out[y * size + x] = clamp01(0.5 + (a - b) * strength);
    }
  }
  return out;
}

export function threshold(buf, t = 0.5, soft = 0.02) {
  const size = Math.sqrt(buf.length);
  const out = createBuffer(size);
  for (let i = 0; i < buf.length; i++) {
    if (soft <= 0) out[i] = buf[i] >= t ? 1 : 0;
    else out[i] = clamp01((buf[i] - (t - soft)) / (soft * 2));
  }
  return out;
}

/**
 * Seamless pixelate: snap samples onto a wrapping cell grid.
 * blockSize is approximate pixel size; cell count is derived so tiling stays seamless.
 */
export function pixelate(buf, blockSize = 8) {
  const size = Math.sqrt(buf.length) | 0;
  const block = Math.max(2, Math.round(blockSize));
  if (block <= 1 || size < 2) return buf;

  const cells = Math.max(2, Math.min(size, Math.round(size / block)));
  const out = createBuffer(size);

  for (let y = 0; y < size; y++) {
    const gy = Math.floor((y * cells) / size);
    const sy = Math.min(size - 1, Math.floor(((gy + 0.5) * size) / cells));
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x * cells) / size);
      const sx = Math.min(size - 1, Math.floor(((gx + 0.5) * size) / cells));
      out[y * size + x] = buf[sy * size + sx];
    }
  }
  return out;
}

export function tilePreview(sourceCanvas, tiles = 2) {
  if (typeof document === "undefined") {
    throw new Error("tilePreview requires a DOM document");
  }
  const size = sourceCanvas.width;
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  const cell = size / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.drawImage(sourceCanvas, 0, 0, size, size, x * cell, y * cell, cell, cell);
    }
  }
  return out;
}
