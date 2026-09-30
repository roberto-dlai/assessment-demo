// Seeded pseudo-random number generation (SPEC §2.5, §9).
//
// We never use Math.random() for anything that must survive a reload —
// shuffles must be reproducible from a persisted seed. mulberry32 is a
// small, fast, deterministic 32-bit PRNG. The one place we do want real
// entropy is minting a fresh session seed, which uses crypto.

/**
 * mulberry32 — deterministic PRNG. Returns a function producing floats in [0, 1).
 * @param {number} seed - unsigned 32-bit integer seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * xfnv1a-style string hash → unsigned 32-bit integer.
 * Deterministic: the same string always yields the same seed, so a
 * per-question sub-seed derived from `sessionSeed + question.id` is stable.
 * @param {string} str
 * @returns {number} unsigned 32-bit integer
 */
export function hashStringToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Derive a stable per-question PRNG from the session seed and a question id.
 * @param {number} sessionSeed
 * @param {string} questionId
 * @returns {() => number}
 */
export function questionRng(sessionSeed, questionId) {
  return mulberry32((hashStringToSeed(questionId) ^ (sessionSeed >>> 0)) >>> 0);
}

/**
 * Mint a fresh random session seed. Uses crypto when available (browser /
 * modern Node), falling back to a time-free deterministic-ish source only
 * if crypto is entirely absent.
 * @returns {number} unsigned 32-bit integer
 */
export function makeSessionSeed() {
  const g = globalThis;
  if (g.crypto && typeof g.crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    g.crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  // Last-resort fallback; callers should persist the resulting seed anyway.
  return hashStringToSeed(String(g.performance && g.performance.now ? g.performance.now() : ""));
}
