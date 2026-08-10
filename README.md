# SeamForge

Procedural **seamless textures** in the browser — generate, tint, pixelate, and export PNGs with no build step.

A single-page lab (`index.html`) that runs fully client-side. Generators tile without seams; preview modes show 1× / 2× / 3× tiling so you can verify wraparound instantly.

## Features

- **30+ generators** — marble, wood, bricks, Voronoi, terrain, stars, camo, maze, and more
- **Deterministic seeds** — same seed + settings always produce the same texture
- **Resolutions** — 256², 512², or 1024²
- **Color overlay** — HSV wheel, hex/color pickers, opacity, and many blend modes (colorize, multiply, overlay, hue, …)
- **Pixelate** — seamless blocky post-process with adjustable block size
- **Randomize** — shuffles seed, params, and optional FX
- **Export PNG** — downloads the baked texture (including FX)
- **Off-main-thread generation** — Web Worker keeps the UI responsive
- **No dependencies** — plain HTML / CSS / ES modules, self-hosted fonts

## Quick start

Serve the folder over HTTP (required for ES modules and the worker). Do **not** open `index.html` as a `file://` URL.

**XAMPP** (this project lives under `htdocs`):

```text
http://localhost/seamforge/
```

**Or any static server:**

```bash
# Python
python -m http.server 8080
# then visit http://localhost:8080
```

```bash
# Node (if you have npx)
npx --yes serve .
```

## Usage

1. Pick a **Texture** type and tweak its parameters.
2. Set **Seed** / **Resolution**, or hit **Randomize**.
3. Use **1× / 2× / 3× tile** to check seamlessness.
4. Optionally enable **Pixelate** and/or **Color Overlay**.
5. **Export PNG** when it looks right.

## Project layout

```text
seamforge/
├── index.html           # App shell
├── css/style.css        # UI + self-hosted @font-face
├── fonts/               # Outfit + IBM Plex Mono (woff2)
├── js/
│   ├── main.js          # UI, bake pipeline, export
│   ├── worker/
│   │   └── generate.js  # Texture generation worker
│   ├── core/            # RNG, noise, filters, color
│   └── generators/      # One module per texture type
├── .htaccess            # CSP + security headers (Apache)
└── README.md
```

## How it works

1. A generator fills a grayscale `Float32Array` of size × size (seamless by construction — wrap noise, toroidal grids, etc.).
2. Optional **pixelate** snaps samples onto a wrapping cell grid.
3. Optional **color overlay** maps gray → RGBA with the chosen blend mode.
4. The result is drawn to a canvas for preview / PNG export.

Heavy generation runs in `js/worker/generate.js` so sliders stay interactive.

## Adding a generator

1. Create `js/generators/mytexture.js` exporting an object with `id`, `name`, `hint`, `params`, and `generate(size, seed, params)`.
2. Register it in `js/generators/index.js`.

`generate` must return a `Float32Array` of length `size * size` with values roughly in `0..1`.

## License

Use freely for personal or commercial projects. Attribution appreciated but not required.
