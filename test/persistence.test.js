// M1 tests — storage wrapper, preferences, and per-assessment session seed.
// In Node there is no localStorage, so these exercise the in-memory fallback
// (SPEC §7 availability guard).

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  getItem,
  setItem,
  removeItem,
  getJSON,
  setJSON,
  isPersistent,
  _resetForTests,
} from "../src/util/storage.js";
import {
  getOrCreateSeed,
  loadSession,
  hasSavedProgress,
  clearSession,
  startFresh,
} from "../src/session.js";

// A minimal in-test localStorage stub. `throwOnWrite` throws on real writes
// (not the availability probe) to simulate quota-exceeded / private mode.
function fakeLocalStorage({ throwOnWrite = false } = {}) {
  const map = new Map();
  const PROBE = "__assessment_probe__";
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (throwOnWrite && k !== PROBE) throw new Error("QuotaExceeded");
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
  };
}

beforeEach(() => {
  delete globalThis.localStorage;
  _resetForTests();
});

test("storage falls back to memory when localStorage is unavailable", () => {
  assert.equal(isPersistent(), false); // no localStorage in Node
  assert.equal(getItem("missing"), null);
  setItem("k", "v");
  assert.equal(getItem("k"), "v");
  removeItem("k");
  assert.equal(getItem("k"), null);
});

test("storage uses real localStorage when available", () => {
  globalThis.localStorage = fakeLocalStorage();
  _resetForTests();
  assert.equal(isPersistent(), true);
  setItem("k", "v");
  assert.equal(getItem("k"), "v");
  setJSON("o", { a: 1 });
  assert.deepEqual(getJSON("o"), { a: 1 });
});

test("storage degrades gracefully when a write throws after the probe passes", () => {
  globalThis.localStorage = fakeLocalStorage({ throwOnWrite: true });
  _resetForTests();
  assert.equal(isPersistent(), true); // probe write is allowed, so it looks available
  // A real write throws internally but must be caught, not propagated.
  assert.doesNotThrow(() => setItem("k", "v"));
  assert.doesNotThrow(() => setJSON("o", { a: 1 }));
});

test("getJSON/setJSON round-trip and tolerate bad data", () => {
  setJSON("obj", { a: 1, b: [2, 3] });
  assert.deepEqual(getJSON("obj"), { a: 1, b: [2, 3] });
  assert.equal(getJSON("absent"), null);
  setItem("corrupt", "{not json");
  assert.equal(getJSON("corrupt"), null);
});

test("getOrCreateSeed mints once then restores the same seed", () => {
  const fp = "abc123";
  const seed = getOrCreateSeed(fp);
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
  assert.equal(getOrCreateSeed(fp), seed); // restored, not re-minted
});

test("minting a seed does not create a resumable session blob (isolation)", () => {
  getOrCreateSeed("fp-A");
  assert.equal(loadSession("fp-A"), null); // seed lives in its own key
  assert.equal(hasSavedProgress("fp-A"), false); // seed alone is not progress
});

test("clearing one assessment's state leaves another's seed intact", () => {
  getOrCreateSeed("fp-A");
  const b = getOrCreateSeed("fp-B");
  clearSession("fp-A");
  assert.equal(getOrCreateSeed("fp-B"), b); // untouched
  assert.ok(Number.isInteger(getOrCreateSeed("fp-A"))); // fp-A re-mints a fresh seed
});

test("loadSession ignores incompatible schema versions", () => {
  setJSON("assessment:session:fp-X", { schemaVersion: 999, answers: { a: 1 } });
  assert.equal(loadSession("fp-X"), null);
});

test("hasSavedProgress reflects the session blob's answers/submitted, not the seed", () => {
  getOrCreateSeed("fp-Y");
  assert.equal(hasSavedProgress("fp-Y"), false);
  // Simulate an M5 blob with a substantive answer.
  setJSON("assessment:session:fp-Y", { schemaVersion: 1, answers: { q0: "optA" } });
  assert.equal(hasSavedProgress("fp-Y"), true);
  setJSON("assessment:session:fp-Y", { schemaVersion: 1, answers: {}, submitted: true });
  assert.equal(hasSavedProgress("fp-Y"), true);
  // An empty-payload answer is NOT resumable progress.
  setJSON("assessment:session:fp-Y", { schemaVersion: 1, answers: { q0: {} } });
  assert.equal(hasSavedProgress("fp-Y"), false);
});

test("startFresh clears the session blob and re-mints a seed", () => {
  setJSON("assessment:session:fp-Z", { schemaVersion: 1, answers: { q0: "optA" } });
  assert.equal(hasSavedProgress("fp-Z"), true);
  const seed = startFresh("fp-Z");
  assert.ok(Number.isInteger(seed));
  assert.equal(hasSavedProgress("fp-Z"), false); // blob cleared
  assert.equal(getOrCreateSeed("fp-Z"), seed); // new seed persisted
});
