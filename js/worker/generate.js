import { getGenerator } from "../generators/index.js";

self.onmessage = (event) => {
  const { jobId, type, size, seed, params } = event.data || {};
  try {
    if (!Number.isInteger(size) || size < 16 || size > 2048) {
      throw new Error("Invalid resolution");
    }
    const gen = getGenerator(type);
    if (!gen || typeof gen.generate !== "function") {
      throw new Error("Unknown generator");
    }
    const grayBuf = gen.generate(size, seed >>> 0, params || {});
    if (!(grayBuf instanceof Float32Array) || grayBuf.length !== size * size) {
      throw new Error("Generator returned invalid buffer");
    }
    self.postMessage({ jobId, ok: true, grayBuf }, [grayBuf.buffer]);
  } catch (err) {
    self.postMessage({
      jobId,
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
};
