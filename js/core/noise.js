import { createRng, hash2 } from "./rng.js";
import { createBuffer, lerp, wrap } from "./buffer.js";

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad2(ix, iy, seed) {
  const h = hash2(ix, iy, seed) * Math.PI * 2;
  return [Math.cos(h), Math.sin(h)];
}

/** Seamless value noise via domain wrapping on a grid */
export function valueNoise2D(size, scale, seed, octaves = 1, persistence = 0.5) {
  const out = createBuffer(size);
  let amp = 1;
  let freq = scale;
  let maxAmp = 0;

  for (let o = 0; o < octaves; o++) {
    const period = Math.max(2, Math.round(freq));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * period;
        const v = (y / size) * period;
        const x0 = Math.floor(u);
        const y0 = Math.floor(v);
        const fx = fade(u - x0);
        const fy = fade(v - y0);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const a = hash2(wrap(x0, period), wrap(y0, period), seed + o * 101);
        const b = hash2(wrap(x1, period), wrap(y0, period), seed + o * 101);
        const c = hash2(wrap(x0, period), wrap(y1, period), seed + o * 101);
        const d = hash2(wrap(x1, period), wrap(y1, period), seed + o * 101);
        const n = lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
        out[y * size + x] += n * amp;
      }
    }
    maxAmp += amp;
    amp *= persistence;
    freq *= 2;
  }

  for (let i = 0; i < out.length; i++) out[i] /= maxAmp;
  return out;
}

export function perlinNoise2D(size, scale, seed, octaves = 4, persistence = 0.5) {
  const out = createBuffer(size);
  let amp = 1;
  let freq = scale;
  let maxAmp = 0;

  for (let o = 0; o < octaves; o++) {
    const period = Math.max(2, Math.round(freq));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * period;
        const v = (y / size) * period;
        const x0 = Math.floor(u);
        const y0 = Math.floor(v);
        const fx = u - x0;
        const fy = v - y0;
        const ux = fade(fx);
        const uy = fade(fy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const g00 = grad2(wrap(x0, period), wrap(y0, period), seed + o * 17);
        const g10 = grad2(wrap(x1, period), wrap(y0, period), seed + o * 17);
        const g01 = grad2(wrap(x0, period), wrap(y1, period), seed + o * 17);
        const g11 = grad2(wrap(x1, period), wrap(y1, period), seed + o * 17);

        const n00 = g00[0] * fx + g00[1] * fy;
        const n10 = g10[0] * (fx - 1) + g10[1] * fy;
        const n01 = g01[0] * fx + g01[1] * (fy - 1);
        const n11 = g11[0] * (fx - 1) + g11[1] * (fy - 1);

        const n = lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy);
        out[y * size + x] += (n * 0.5 + 0.5) * amp;
      }
    }
    maxAmp += amp;
    amp *= persistence;
    freq *= 2;
  }

  for (let i = 0; i < out.length; i++) out[i] /= maxAmp;
  return out;
}

/**
 * Seamless Voronoi. Returns:
 * - dist: F1 distance field (0..1-ish normalized later)
 * - id: nearest site index
 * - uvX/uvY: local offset to site center in tile space (-0.5..0.5-ish)
 * - sites: [{x,y}] in pixel coords
 */
export function voronoiSeamless(size, cellsX, cellsY, seed, jitter = 0.85) {
  const rng = createRng(seed);
  const sites = [];
  const cellW = size / cellsX;
  const cellH = size / cellsY;

  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      const jx = (rng() - 0.5) * jitter;
      const jy = (rng() - 0.5) * jitter;
      sites.push({
        x: (cx + 0.5 + jx) * cellW,
        y: (cy + 0.5 + jy) * cellH,
        id: cy * cellsX + cx,
      });
    }
  }

  const dist = createBuffer(size);
  const edge = createBuffer(size);
  const id = new Int32Array(size * size);
  const uvX = createBuffer(size);
  const uvY = createBuffer(size);

  const wrapDelta = (d, n) => {
    if (d > n * 0.5) d -= n;
    if (d < -n * 0.5) d += n;
    return d;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let best = Infinity;
      let second = Infinity;
      let bestId = 0;
      let bestDx = 0;
      let bestDy = 0;

      const cx0 = Math.floor(x / cellW);
      const cy0 = Math.floor(y / cellH);

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const cx = wrap(cx0 + ox, cellsX);
          const cy = wrap(cy0 + oy, cellsY);
          const s = sites[cy * cellsX + cx];
          for (const sx of [s.x, s.x - size, s.x + size]) {
            for (const sy of [s.y, s.y - size, s.y + size]) {
              const dx = x - sx;
              const dy = y - sy;
              const d = dx * dx + dy * dy;
              if (d < best) {
                second = best;
                best = d;
                bestId = s.id;
                bestDx = wrapDelta(x - s.x, size);
                bestDy = wrapDelta(y - s.y, size);
              } else if (d < second) {
                second = d;
              }
            }
          }
        }
      }

      const i = y * size + x;
      const f1 = Math.sqrt(best);
      const f2 = Math.sqrt(second);
      dist[i] = f1;
      // Distance to cell border (F2-F1): high in center, 0 at edges
      edge[i] = f2 - f1;
      id[i] = bestId;
      uvX[i] = bestDx / cellW;
      uvY[i] = bestDy / cellH;
    }
  }

  let maxD = 0;
  let maxE = 0;
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] > maxD) maxD = dist[i];
    if (edge[i] > maxE) maxE = edge[i];
  }
  if (maxD > 0) for (let i = 0; i < dist.length; i++) dist[i] /= maxD;
  if (maxE > 0) for (let i = 0; i < edge.length; i++) edge[i] /= maxE;

  return { dist, edge, id, uvX, uvY, sites, cellW, cellH };
}
