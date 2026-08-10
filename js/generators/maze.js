import { createBuffer, wrap } from "../core/buffer.js";
import { createRng } from "../core/rng.js";
import { gaussianBlur, levels, normalize } from "../core/filters.js";

export const maze = {
  id: "maze",
  name: "Maze",
  hint: "Seamless labyrinth / maze walls on a wraparound grid.",
  params: [
    { key: "grid", label: "Grid", type: "range", min: 4, max: 32, step: 2, value: 12 },
    { key: "thickness", label: "Wall thick", type: "range", min: 0.1, max: 0.45, step: 0.01, value: 0.22 },
    { key: "contrast", label: "Contrast", type: "range", min: 0.5, max: 2.5, step: 0.05, value: 1.5 },
    { key: "invert", label: "Invert", type: "checkbox", value: false },
  ],
  generate(size, seed, p) {
    const g = p.grid | 0;
    const rng = createRng(seed);
    // Perfect maze via randomized DFS on toroidal grid
    const cells = g * g;
    const visited = new Uint8Array(cells);
    const hWall = new Uint8Array(cells); // wall between (x,y) and (x+1,y) — 1=wall
    const vWall = new Uint8Array(cells); // wall between (x,y) and (x,y+1)
    hWall.fill(1);
    vWall.fill(1);

    const stack = [0];
    visited[0] = 1;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const cx = cur % g;
      const cy = (cur / g) | 0;
      const opts = [];
      for (const [dx, dy] of dirs) {
        const nx = wrap(cx + dx, g);
        const ny = wrap(cy + dy, g);
        const ni = ny * g + nx;
        if (!visited[ni]) opts.push([nx, ny, ni, dx, dy]);
      }
      if (!opts.length) {
        stack.pop();
        continue;
      }
      const pick = opts[(rng() * opts.length) | 0];
      const [nx, ny, ni, dx, dy] = pick;
      visited[ni] = 1;
      stack.push(ni);
      if (dx === 1) hWall[cy * g + cx] = 0;
      else if (dx === -1) hWall[ny * g + nx] = 0;
      else if (dy === 1) vWall[cy * g + cx] = 0;
      else vWall[ny * g + nx] = 0;
    }

    const out = createBuffer(size);
    const cell = size / g;
    const t = p.thickness;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = Math.min(g - 1, (x / cell) | 0);
        const gy = Math.min(g - 1, (y / cell) | 0);
        const fx = (x / cell) - gx;
        const fy = (y / cell) - gy;
        let wall = 0;
        if (fx < t || fy < t) wall = 1;
        if (fx > 1 - t && hWall[gy * g + gx]) wall = 1;
        if (fy > 1 - t && vWall[gy * g + gx]) wall = 1;
        // Left/top shared walls
        if (fx < t && hWall[gy * g + wrap(gx - 1, g)]) wall = 1;
        if (fy < t && vWall[wrap(gy - 1, g) * g + gx]) wall = 1;
        out[y * size + x] = wall;
      }
    }

    let result = levels(normalize(gaussianBlur(out, 0.35)), 0.05, 0.9, p.contrast, 0, 1);
    if (p.invert) {
      for (let i = 0; i < result.length; i++) result[i] = 1 - result[i];
    }
    return result;
  },
};
