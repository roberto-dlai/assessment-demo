// Safe localStorage wrapper (SPEC §7 availability guard).
//
// All persistence goes through here so a single try/catch covers the cases where
// storage throws or is disabled (Safari private mode, blocked cookies, Node).
// When unavailable we transparently fall back to an in-memory Map, so callers
// never crash — progress just won't survive a reload.

const memory = new Map();
let available = null;

function storageAvailable() {
  if (available !== null) return available;
  try {
    const ls = globalThis.localStorage;
    const probe = "__assessment_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

/** @returns {boolean} true if writes will survive a reload */
export function isPersistent() {
  return storageAvailable();
}

/** @param {string} key @returns {string|null} */
export function getItem(key) {
  if (storageAvailable()) {
    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      /* fall through to memory */
    }
  }
  return memory.has(key) ? memory.get(key) : null;
}

/** @param {string} key @param {string} value */
export function setItem(key, value) {
  if (storageAvailable()) {
    try {
      globalThis.localStorage.setItem(key, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memory.set(key, value);
}

/** @param {string} key */
export function removeItem(key) {
  if (storageAvailable()) {
    try {
      globalThis.localStorage.removeItem(key);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memory.delete(key);
}

/** @param {string} key @returns {any|null} parsed JSON, or null if absent/invalid */
export function getJSON(key) {
  const raw = getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {string} key @param {any} obj */
export function setJSON(key, obj) {
  setItem(key, JSON.stringify(obj));
}

// Test-only: reset the availability probe + in-memory store between cases.
export function _resetForTests() {
  memory.clear();
  available = null;
}
