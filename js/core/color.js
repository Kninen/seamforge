import { clamp01 } from "./buffer.js";

export const BLEND_MODES = [
  { value: "colorize", label: "Colorize (tint)" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft Light" },
  { value: "hard-light", label: "Hard Light" },
  { value: "color-burn", label: "Color Burn" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "linear-burn", label: "Linear Burn" },
  { value: "linear-dodge", label: "Linear Dodge (Add)" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "vivid-light", label: "Vivid Light" },
  { value: "linear-light", label: "Linear Light" },
  { value: "pin-light", label: "Pin Light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "color", label: "Color" },
  { value: "luminosity", label: "Luminosity" },
];

export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  v = clamp01(v);
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m), (g + m), (b + m)];
}

export function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

/** Parse #RGB / #RRGGBB (with or without #). Returns null if invalid. */
export function parseHex(hex) {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (/^[a-f\d]{3}$/i.test(raw)) {
    const r = raw[0] + raw[0];
    const g = raw[1] + raw[1];
    const b = raw[2] + raw[2];
    return [
      parseInt(r, 16) / 255,
      parseInt(g, 16) / 255,
      parseInt(b, 16) / 255,
    ];
  }
  if (/^[a-f\d]{6}$/i.test(raw)) {
    return [
      parseInt(raw.slice(0, 2), 16) / 255,
      parseInt(raw.slice(2, 4), 16) / 255,
      parseInt(raw.slice(4, 6), 16) / 255,
    ];
  }
  return null;
}

export function hexToRgb(hex) {
  return parseHex(hex) || [1, 1, 1];
}

export function normalizeHex(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

export function rgbToHex(r, g, b) {
  const to = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function lum(r, g, b) {
  return 0.3 * r + 0.59 * g + 0.11 * b;
}

function clipColor(r, g, b) {
  const l = lum(r, g, b);
  const n = Math.min(r, g, b);
  const x = Math.max(r, g, b);
  if (n < 0) {
    r = l + ((r - l) * l) / (l - n);
    g = l + ((g - l) * l) / (l - n);
    b = l + ((b - l) * l) / (l - n);
  }
  if (x > 1) {
    r = l + ((r - l) * (1 - l)) / (x - l);
    g = l + ((g - l) * (1 - l)) / (x - l);
    b = l + ((b - l) * (1 - l)) / (x - l);
  }
  return [r, g, b];
}

function setLum(r, g, b, L) {
  const d = L - lum(r, g, b);
  return clipColor(r + d, g + d, b + d);
}

function setSat(r, g, b, S) {
  const arr = [
    { c: r, i: 0 },
    { c: g, i: 1 },
    { c: b, i: 2 },
  ].sort((a, b) => a.c - b.c);
  const min = arr[0];
  const mid = arr[1];
  const max = arr[2];
  if (max.c > min.c) {
    mid.c = ((mid.c - min.c) * S) / (max.c - min.c);
    max.c = S;
  } else {
    mid.c = 0;
    max.c = 0;
  }
  min.c = 0;
  const out = [0, 0, 0];
  out[min.i] = min.c;
  out[mid.i] = mid.c;
  out[max.i] = max.c;
  return out;
}

function channelBlend(mode, Cb, Cs) {
  switch (mode) {
    case "multiply":
      return Cb * Cs;
    case "screen":
      return 1 - (1 - Cb) * (1 - Cs);
    case "overlay":
      return Cb < 0.5 ? 2 * Cb * Cs : 1 - 2 * (1 - Cb) * (1 - Cs);
    case "hard-light":
      return Cs < 0.5 ? 2 * Cb * Cs : 1 - 2 * (1 - Cb) * (1 - Cs);
    case "soft-light":
      if (Cs <= 0.5) return Cb - (1 - 2 * Cs) * Cb * (1 - Cb);
      {
        const d = Cb <= 0.25 ? ((16 * Cb - 12) * Cb + 4) * Cb : Math.sqrt(Cb);
        return Cb + (2 * Cs - 1) * (d - Cb);
      }
    case "color-burn":
      if (Cs === 0) return 0;
      return 1 - Math.min(1, (1 - Cb) / Cs);
    case "color-dodge":
      if (Cs === 1) return 1;
      return Math.min(1, Cb / (1 - Cs));
    case "linear-burn":
      return clamp01(Cb + Cs - 1);
    case "linear-dodge":
      return clamp01(Cb + Cs);
    case "darken":
      return Math.min(Cb, Cs);
    case "lighten":
      return Math.max(Cb, Cs);
    case "vivid-light":
      return Cs <= 0.5
        ? channelBlend("color-burn", Cb, Math.max(0, 2 * Cs))
        : channelBlend("color-dodge", Cb, Math.min(1, 2 * (Cs - 0.5)));
    case "linear-light":
      return clamp01(Cb + 2 * Cs - 1);
    case "pin-light":
      return Cs <= 0.5 ? Math.min(Cb, 2 * Cs) : Math.max(Cb, 2 * Cs - 1);
    case "difference":
      return Math.abs(Cb - Cs);
    case "exclusion":
      return Cb + Cs - 2 * Cb * Cs;
    default:
      return Cs;
  }
}

function blendPixel(mode, br, bg, bb, sr, sg, sb) {
  if (mode === "colorize") {
    // Tint: keep base luminosity, apply overlay hue/sat
    const L = lum(br, bg, bb);
    return setLum(sr, sg, sb, L);
  }
  if (mode === "hue" || mode === "saturation" || mode === "color" || mode === "luminosity") {
    const bHSL = rgbToHsl(br, bg, bb);
    const sHSL = rgbToHsl(sr, sg, sb);
    if (mode === "hue") {
      const rgb = hslToRgb(sHSL[0], bHSL[1], bHSL[2]);
      return setLum(rgb[0], rgb[1], rgb[2], lum(br, bg, bb));
    }
    if (mode === "saturation") {
      const sat = setSat(br, bg, bb, sHSL[1]);
      return setLum(sat[0], sat[1], sat[2], lum(br, bg, bb));
    }
    if (mode === "color") return setLum(sr, sg, sb, lum(br, bg, bb));
    return setLum(br, bg, bb, lum(sr, sg, sb));
  }
  return [
    channelBlend(mode, br, sr),
    channelBlend(mode, bg, sg),
    channelBlend(mode, bb, sb),
  ];
}

/**
 * Apply solid color overlay onto grayscale float buffer → ImageData RGBA
 */
export function applyColorOverlay(gray, size, {
  enabled = false,
  color = [0.85, 0.55, 0.25],
  opacity = 1,
  mode = "colorize",
} = {}) {
  const data = new Uint8ClampedArray(size * size * 4);
  const [sr, sg, sb] = color;
  const op = clamp01(opacity);

  for (let i = 0; i < gray.length; i++) {
    const g = clamp01(gray[i]);
    let r = g, gg = g, b = g;

    if (enabled && op > 0) {
      const [br, bg, bb] = blendPixel(mode, g, g, g, sr, sg, sb);
      r = g + (br - g) * op;
      gg = g + (bg - g) * op;
      b = g + (bb - g) * op;
    }

    const o = i * 4;
    data[o] = (clamp01(r) * 255 + 0.5) | 0;
    data[o + 1] = (clamp01(gg) * 255 + 0.5) | 0;
    data[o + 2] = (clamp01(b) * 255 + 0.5) | 0;
    data[o + 3] = 255;
  }
  return new ImageData(data, size, size);
}

/** Draw HSV color wheel onto canvas (value fixed separately) */
export function drawColorWheel(canvas, value = 1) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(cx, cy) - 2;
  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const o = (y * w + x) * 4;
      if (dist > radius) {
        data[o + 3] = 0;
        continue;
      }
      let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (hue < 0) hue += 360;
      const sat = dist / radius;
      const [r, g, b] = hsvToRgb(hue, sat, value);
      data[o] = (r * 255) | 0;
      data[o + 1] = (g * 255) | 0;
      data[o + 2] = (b * 255) | 0;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function wheelPosToHsv(canvas, x, y, value) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (x - rect.left) * scaleX;
  const py = (y - rect.top) * scaleY;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const radius = Math.min(cx, cy) - 2;
  let dist = Math.hypot(dx, dy);
  if (dist > radius) {
    const s = radius / dist;
    dist = radius;
    return {
      h: (((Math.atan2(dy, dx) * 180) / Math.PI) + 360) % 360,
      s: 1,
      v: value,
      cx: cx + dx * s,
      cy: cy + dy * s,
    };
  }
  let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  return { h: hue, s: dist / radius, v: value, cx: px, cy: py };
}

export function hsvToWheelPos(canvas, h, s) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 2;
  const rad = (h * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * s * radius,
    y: cy + Math.sin(rad) * s * radius,
  };
}
