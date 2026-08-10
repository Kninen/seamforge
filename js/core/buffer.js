export function createBuffer(size) {
  return new Float32Array(size * size);
}

export function createIntBuffer(size) {
  return new Int32Array(size * size);
}

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function wrap(i, n) {
  return ((i % n) + n) % n;
}

export function sample(buf, size, x, y) {
  const ix = wrap(Math.floor(x), size);
  const iy = wrap(Math.floor(y), size);
  return buf[iy * size + ix];
}

export function sampleBilinear(buf, size, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = sample(buf, size, x0, y0);
  const b = sample(buf, size, x0 + 1, y0);
  const c = sample(buf, size, x0, y0 + 1);
  const d = sample(buf, size, x0 + 1, y0 + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/** Convert grayscale float buffer (0..1) to ImageData RGBA */
export function toImageData(buf, size, { invert = false } = {}) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < buf.length; i++) {
    let v = clamp01(buf[i]);
    if (invert) v = 1 - v;
    const c = (v * 255 + 0.5) | 0;
    const o = i * 4;
    data[o] = c;
    data[o + 1] = c;
    data[o + 2] = c;
    data[o + 3] = 255;
  }
  return new ImageData(data, size, size);
}

export function fill(buf, value = 0) {
  buf.fill(value);
  return buf;
}
