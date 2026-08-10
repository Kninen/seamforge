import {
  BLEND_MODES,
  applyColorOverlay,
  drawColorWheel,
  hsvToRgb,
  hsvToWheelPos,
  normalizeHex,
  parseHex,
  rgbToHex,
  rgbToHsv,
  wheelPosToHsv,
} from "./core/color.js";
import { pixelate } from "./core/filters.js";
import { generators, getGenerator, defaultParams } from "./generators/index.js";

const ALLOWED_RESOLUTIONS = new Set([256, 512, 1024]);
const STATUS_CLASSES = new Set(["", "busy", "ok"]);

const els = {
  type: document.getElementById("texture-type"),
  resolution: document.getElementById("resolution"),
  seed: document.getElementById("seed"),
  params: document.getElementById("params"),
  hint: document.getElementById("texture-hint"),
  preview: document.getElementById("preview"),
  status: document.getElementById("status"),
  btnRandom: document.getElementById("btn-random"),
  btnExport: document.getElementById("btn-export"),
  btnSeed: document.getElementById("btn-seed"),
  segs: [...document.querySelectorAll(".seg")],
  pixelateEnabled: document.getElementById("pixelate-enabled"),
  pixelateBody: document.getElementById("pixelate-body"),
  pixelateSize: document.getElementById("pixelate-size"),
  pixelateSizeLabel: document.getElementById("pixelate-size-label"),
  colorEnabled: document.getElementById("color-enabled"),
  colorBody: document.getElementById("color-body"),
  colorWheel: document.getElementById("color-wheel"),
  wheelCursor: document.getElementById("wheel-cursor"),
  colorValue: document.getElementById("color-value"),
  colorOpacity: document.getElementById("color-opacity"),
  colorBlend: document.getElementById("color-blend"),
  colorPicker: document.getElementById("color-picker"),
  colorHex: document.getElementById("color-hex"),
};

const state = {
  type: generators[0].id,
  seed: 42,
  resolution: 512,
  viewTiles: 1,
  params: defaultParams(generators[0]),
  grayBuf: null,
  sourceCanvas: document.createElement("canvas"),
  busy: false,
  pending: false,
  jobId: 0,
  jobStartedAt: 0,
  pixelate: {
    enabled: false,
    size: 8,
  },
  color: {
    enabled: false,
    h: 28,
    s: 0.72,
    v: 0.85,
    opacity: 1,
    mode: "colorize",
  },
};

let genTimer = 0;
let colorTimer = 0;
let wheelDragging = false;
let lastWheelValue = NaN;
let worker = null;
let workerReady = false;

function setStatus(text, cls = "") {
  const safeCls = STATUS_CLASSES.has(cls) ? cls : "";
  els.status.textContent = text;
  els.status.className = "status" + (safeCls ? ` ${safeCls}` : "");
}

function currentRgb() {
  return hsvToRgb(state.color.h, state.color.s, state.color.v);
}

function fillSelect(select, items, selected) {
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    frag.appendChild(opt);
  }
  select.replaceChildren(frag);
  select.value = selected;
}

function syncColorUi({ skipHexInput = false } = {}) {
  const [r, g, b] = currentRgb();
  const hex = rgbToHex(r, g, b);
  els.colorPicker.value = hex;
  if (!skipHexInput) {
    els.colorHex.value = hex;
    els.colorHex.classList.remove("invalid");
  }
  els.colorValue.value = String(state.color.v);
  els.colorOpacity.value = String(state.color.opacity);
  els.colorBlend.value = state.color.mode;
  els.colorEnabled.checked = state.color.enabled;
  els.colorBody.classList.toggle("active", state.color.enabled);

  if (lastWheelValue !== state.color.v) {
    drawColorWheel(els.colorWheel, state.color.v);
    lastWheelValue = state.color.v;
  }

  const pos = hsvToWheelPos(els.colorWheel, state.color.h, state.color.s);
  els.wheelCursor.style.left = `${(pos.x / els.colorWheel.width) * 100}%`;
  els.wheelCursor.style.top = `${(pos.y / els.colorWheel.height) * 100}%`;
  els.wheelCursor.style.backgroundColor = hex;
  els.colorWheel.setAttribute("aria-valuenow", String(Math.round(state.color.h)));
  els.colorWheel.setAttribute(
    "aria-valuetext",
    `Hue ${Math.round(state.color.h)} degrees, saturation ${Math.round(state.color.s * 100)} percent`
  );
}

function applyHexFromInput(commit = false) {
  const raw = els.colorHex.value;
  const rgb = parseHex(raw);
  if (!rgb) {
    els.colorHex.classList.toggle("invalid", raw.trim().length > 0);
    if (commit) syncColorUi();
    return false;
  }
  const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  state.color.h = h;
  state.color.s = s;
  state.color.v = v;
  els.colorHex.classList.remove("invalid");
  if (commit) els.colorHex.value = normalizeHex(raw);
  syncColorUi({ skipHexInput: !commit });
  scheduleColorApply();
  return true;
}

function populateTypes() {
  fillSelect(
    els.type,
    generators.map((g) => ({ value: g.id, label: g.name })),
    state.type
  );
}

function populateBlendModes() {
  fillSelect(
    els.colorBlend,
    BLEND_MODES.map((m) => ({ value: m.value, label: m.label })),
    state.color.mode
  );
}

function renderParams() {
  const gen = getGenerator(state.type);
  els.hint.textContent = gen.hint;
  els.params.replaceChildren();

  for (const def of gen.params) {
    const row = document.createElement("div");
    row.className = "param";

    const label = document.createElement("span");
    label.className = "param-label";
    label.textContent = def.label;

    if (def.type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!state.params[def.key];
      input.addEventListener("change", () => {
        state.params[def.key] = input.checked;
        scheduleGenerate();
      });
      row.append(label, input);
    } else if (def.type === "select") {
      const select = document.createElement("select");
      fillSelect(
        select,
        def.options.map((o) => ({ value: o.value, label: o.label })),
        state.params[def.key]
      );
      select.addEventListener("change", () => {
        state.params[def.key] = select.value;
        scheduleGenerate();
      });
      select.style.gridColumn = "1 / -1";
      row.append(label, select);
    } else {
      const value = document.createElement("span");
      value.className = "value";
      value.textContent = formatVal(state.params[def.key]);

      const input = document.createElement("input");
      input.type = "range";
      input.min = def.min;
      input.max = def.max;
      input.step = def.step;
      input.value = state.params[def.key];
      input.addEventListener("input", () => {
        const v = def.step >= 1 ? parseInt(input.value, 10) : parseFloat(input.value);
        state.params[def.key] = v;
        value.textContent = formatVal(v);
        scheduleGenerate();
      });
      row.append(label, value, input);
    }

    els.params.appendChild(row);
  }
}

function formatVal(v) {
  if (typeof v === "boolean") return v ? "on" : "off";
  if (Number.isInteger(v)) return String(v);
  return Number(v).toFixed(2);
}

function scheduleGenerate() {
  clearTimeout(genTimer);
  setStatus("Updating…", "busy");
  genTimer = setTimeout(() => generate(), 80);
}

function scheduleColorApply() {
  clearTimeout(colorTimer);
  colorTimer = setTimeout(() => {
    if (!state.grayBuf) return;
    bakeSource();
    paintPreview();
    if (!state.busy) {
      setStatus(`${state.resolution}² · seamless${statusExtras()}`, "ok");
    }
  }, 30);
}

function statusExtras() {
  const parts = [];
  if (state.pixelate.enabled) parts.push(`px ${state.pixelate.size}`);
  if (state.color.enabled) parts.push(state.color.mode);
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}

function syncPixelateUi() {
  els.pixelateEnabled.checked = state.pixelate.enabled;
  els.pixelateSize.value = String(state.pixelate.size);
  els.pixelateSizeLabel.textContent = `${state.pixelate.size} px`;
  els.pixelateBody.classList.toggle("active", state.pixelate.enabled);
}

function bakeSource() {
  if (!state.grayBuf) return;
  const size = Math.sqrt(state.grayBuf.length) | 0;
  if (!size || size * size !== state.grayBuf.length) return;

  let buf = state.grayBuf;
  if (state.pixelate.enabled) {
    buf = pixelate(buf, state.pixelate.size);
  }

  const img = applyColorOverlay(buf, size, {
    enabled: state.color.enabled,
    color: currentRgb(),
    opacity: state.color.opacity,
    mode: state.color.mode,
  });
  state.sourceCanvas.width = size;
  state.sourceCanvas.height = size;
  state.sourceCanvas.getContext("2d").putImageData(img, 0, 0);
}

function initWorker() {
  if (worker) return;
  try {
    worker = new Worker(new URL("./worker/generate.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = onWorkerMessage;
    worker.onerror = (err) => {
      console.error(err);
      workerReady = false;
      setStatus("Worker error — see console", "");
      state.busy = false;
    };
    workerReady = true;
  } catch (err) {
    console.error(err);
    workerReady = false;
  }
}

function onWorkerMessage(event) {
  const { jobId, ok, grayBuf, error } = event.data || {};
  if (jobId !== state.jobId) return;

  state.busy = false;

  if (!ok) {
    console.error(error || "Generation failed");
    setStatus("Error — see console", "");
    if (state.pending) scheduleGenerate();
    return;
  }

  state.grayBuf = grayBuf;
  bakeSource();
  paintPreview();
  const ms = Math.max(0, Math.round(performance.now() - state.jobStartedAt));
  setStatus(`${state.resolution}² · ${ms}ms · seamless${statusExtras()}`, "ok");

  if (state.pending) scheduleGenerate();
}

function generateOnMain(size, seed, params) {
  const gen = getGenerator(state.type);
  return gen.generate(size, seed, params);
}

async function generate() {
  if (state.busy) {
    state.pending = true;
    return;
  }

  const size = ALLOWED_RESOLUTIONS.has(state.resolution) ? state.resolution : 512;
  state.resolution = size;
  state.busy = true;
  state.pending = false;
  setStatus("Generating…", "busy");

  const seed = state.seed >>> 0;
  const params = { ...state.params };
  const type = state.type;
  const jobId = ++state.jobId;
  state.jobStartedAt = performance.now();

  initWorker();

  if (workerReady && worker) {
    worker.postMessage({ jobId, type, size, seed, params });
    return;
  }

  // Fallback if workers/modules are unavailable (keeps app usable)
  await new Promise((r) => setTimeout(r, 10));
  try {
    state.grayBuf = generateOnMain(size, seed, params);
    bakeSource();
    paintPreview();
    const ms = Math.round(performance.now() - state.jobStartedAt);
    setStatus(`${size}² · ${ms}ms · seamless${statusExtras()}`, "ok");
  } catch (err) {
    console.error(err);
    setStatus("Error — see console", "");
  } finally {
    state.busy = false;
    if (state.pending) scheduleGenerate();
  }
}

function paintPreview() {
  const tiles = state.viewTiles;
  const size = state.sourceCanvas.width;
  if (!size) return;
  const canvas = els.preview;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = tiles > 1;
  const cell = size / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.drawImage(state.sourceCanvas, 0, 0, size, size, x * cell, y * cell, cell, cell);
    }
  }
}

function exportPng() {
  if (!state.grayBuf || !state.sourceCanvas.width) {
    setStatus("Nothing to export yet", "");
    return;
  }

  try {
    const url = state.sourceCanvas.toDataURL("image/png");
    if (!url || !url.startsWith("data:image/png")) {
      throw new Error("Invalid PNG data");
    }
    const gen = getGenerator(state.type);
    const tint = state.color.enabled ? `-${state.color.mode}` : "";
    const px = state.pixelate.enabled ? `-px${state.pixelate.size}` : "";
    const a = document.createElement("a");
    a.download = `seamforge-${gen.id}-${state.seed}-${state.resolution}${px}${tint}.png`;
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus("Exported PNG", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Export failed — try a smaller size", "");
  }
}

function randomize() {
  state.seed = (Math.random() * 1e9) | 0;
  els.seed.value = state.seed;

  const gen = getGenerator(state.type);
  for (const def of gen.params) {
    if (def.type === "checkbox") {
      state.params[def.key] = Math.random() > 0.7 ? !def.value : def.value;
    } else if (def.type === "select") {
      const opts = def.options;
      state.params[def.key] = opts[(Math.random() * opts.length) | 0].value;
    } else {
      const t = Math.random();
      const raw = def.min + t * (def.max - def.min);
      const stepped = Math.round(raw / def.step) * def.step;
      state.params[def.key] = def.step >= 1 ? Math.round(stepped) : +stepped.toFixed(4);
    }
  }

  if (Math.random() > 0.55) {
    state.pixelate.enabled = true;
    state.pixelate.size = [4, 6, 8, 12, 16, 24, 32][(Math.random() * 7) | 0];
    syncPixelateUi();
  } else {
    state.pixelate.enabled = false;
    syncPixelateUi();
  }

  if (Math.random() > 0.4) {
    state.color.enabled = true;
    state.color.h = Math.random() * 360;
    state.color.s = 0.35 + Math.random() * 0.65;
    state.color.v = 0.45 + Math.random() * 0.55;
    state.color.opacity = 0.55 + Math.random() * 0.45;
    state.color.mode = BLEND_MODES[(Math.random() * BLEND_MODES.length) | 0].value;
    syncColorUi();
  }

  renderParams();
  scheduleGenerate();
}

function bindPixelate() {
  syncPixelateUi();

  els.pixelateEnabled.addEventListener("change", () => {
    state.pixelate.enabled = els.pixelateEnabled.checked;
    els.pixelateBody.classList.toggle("active", state.pixelate.enabled);
    scheduleColorApply();
  });

  els.pixelateSize.addEventListener("input", () => {
    const n = parseInt(els.pixelateSize.value, 10);
    state.pixelate.size = Number.isFinite(n) ? Math.min(64, Math.max(2, n)) : state.pixelate.size;
    els.pixelateSizeLabel.textContent = `${state.pixelate.size} px`;
    if (state.pixelate.enabled) scheduleColorApply();
  });
}

function pickWheel(clientX, clientY) {
  const hsv = wheelPosToHsv(els.colorWheel, clientX, clientY, state.color.v);
  state.color.h = hsv.h;
  state.color.s = hsv.s;
  syncColorUi();
  scheduleColorApply();
}

function nudgeWheel(key, fine) {
  const stepH = fine ? 1 : 4;
  const stepS = fine ? 0.01 : 0.04;
  if (key === "ArrowLeft") state.color.h = (state.color.h - stepH + 360) % 360;
  else if (key === "ArrowRight") state.color.h = (state.color.h + stepH) % 360;
  else if (key === "ArrowUp") state.color.s = Math.min(1, state.color.s + stepS);
  else if (key === "ArrowDown") state.color.s = Math.max(0, state.color.s - stepS);
  else return false;
  syncColorUi();
  scheduleColorApply();
  return true;
}

function bindColor() {
  populateBlendModes();
  syncColorUi();

  els.colorEnabled.addEventListener("change", () => {
    state.color.enabled = els.colorEnabled.checked;
    els.colorBody.classList.toggle("active", state.color.enabled);
    scheduleColorApply();
  });

  els.colorValue.addEventListener("input", () => {
    const v = parseFloat(els.colorValue.value);
    state.color.v = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : state.color.v;
    syncColorUi();
    scheduleColorApply();
  });

  els.colorOpacity.addEventListener("input", () => {
    const v = parseFloat(els.colorOpacity.value);
    state.color.opacity = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : state.color.opacity;
    scheduleColorApply();
  });

  els.colorBlend.addEventListener("change", () => {
    const allowed = BLEND_MODES.some((m) => m.value === els.colorBlend.value);
    if (!allowed) {
      els.colorBlend.value = state.color.mode;
      return;
    }
    state.color.mode = els.colorBlend.value;
    scheduleColorApply();
  });

  els.colorPicker.addEventListener("input", () => {
    const rgb = parseHex(els.colorPicker.value);
    if (!rgb) return;
    const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    state.color.h = h;
    state.color.s = s;
    state.color.v = v;
    syncColorUi();
    scheduleColorApply();
  });

  els.colorHex.addEventListener("input", () => applyHexFromInput(false));
  els.colorHex.addEventListener("change", () => applyHexFromInput(true));
  els.colorHex.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyHexFromInput(true);
      els.colorHex.blur();
    }
  });
  els.colorHex.addEventListener("blur", () => applyHexFromInput(true));

  const onDown = (e) => {
    wheelDragging = true;
    els.colorWheel.setPointerCapture?.(e.pointerId);
    pickWheel(e.clientX, e.clientY);
  };
  const onMove = (e) => {
    if (!wheelDragging) return;
    pickWheel(e.clientX, e.clientY);
  };
  const onUp = () => {
    wheelDragging = false;
  };

  els.colorWheel.addEventListener("pointerdown", onDown);
  els.colorWheel.addEventListener("pointermove", onMove);
  els.colorWheel.addEventListener("pointerup", onUp);
  els.colorWheel.addEventListener("pointercancel", onUp);
  els.colorWheel.addEventListener("keydown", (e) => {
    if (nudgeWheel(e.key, e.shiftKey)) e.preventDefault();
  });
}

function bind() {
  populateTypes();
  renderParams();
  bindPixelate();
  bindColor();
  initWorker();

  els.type.addEventListener("change", () => {
    const next = getGenerator(els.type.value);
    state.type = next.id;
    state.params = defaultParams(next);
    renderParams();
    scheduleGenerate();
  });

  els.resolution.addEventListener("change", () => {
    const n = parseInt(els.resolution.value, 10);
    state.resolution = ALLOWED_RESOLUTIONS.has(n) ? n : 512;
    els.resolution.value = String(state.resolution);
    scheduleGenerate();
  });

  els.seed.addEventListener("change", () => {
    const n = parseInt(els.seed.value, 10);
    state.seed = Number.isFinite(n) ? n >>> 0 : 0;
    els.seed.value = String(state.seed);
    scheduleGenerate();
  });

  els.btnSeed.addEventListener("click", () => {
    state.seed = (Math.random() * 1e9) | 0;
    els.seed.value = state.seed;
    scheduleGenerate();
  });

  els.btnRandom.addEventListener("click", randomize);
  els.btnExport.addEventListener("click", exportPng);

  els.segs.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.segs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tiles = parseInt(btn.dataset.view, 10);
      state.viewTiles = [1, 2, 3].includes(tiles) ? tiles : 1;
      paintPreview();
    });
  });
}

bind();
scheduleGenerate();
