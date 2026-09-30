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
import { loadPrefs, savePrefs, setAutoAdvance } from "../src/prefs.js";
import { getOrCreateSeed, loadSession, hasSavedProgress, clearSession } from "../src/session.js";

beforeEach(() => _resetForTests());

test("storage falls back to memory when localStorage is unavailable", () => {
  assert.equal(isPersistent(), false); // no localStorage in Node
  assert.equal(getItem("missing"), null);
  setItem("k", "v");
  assert.equal(getItem("k"), "v");
  removeItem("k");
  assert.equal(getItem("k"), null);
});

test("getJSON/setJSON round-trip and tolerate bad data", () => {
  setJSON("obj", { a: 1, b: [2, 3] });
  assert.deepEqual(getJSON("obj"), { a: 1, b: [2, 3] });
  assert.equal(getJSON("absent"), null);
  setItem("corrupt", "{not json");
  assert.equal(getJSON("corrupt"), null);
});

test("prefs default to auto-advance on, and persist changes", () => {
  assert.deepEqual(loadPrefs(), { autoAdvance: true });
  const updated = setAutoAdvance(false);
  assert.deepEqual(updated, { autoAdvance: false });
  assert.deepEqual(loadPrefs(), { autoAdvance: false });
});

test("prefs merge over defaults and coerce to boolean", () => {
  savePrefs({ autoAdvance: 1 });
  assert.deepEqual(loadPrefs(), { autoAdvance: true });
});

test("getOrCreateSeed mints once then restores the same seed", () => {
  const fp = "abc123";
  const seed = getOrCreateSeed(fp);
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
  assert.equal(getOrCreateSeed(fp), seed); // restored, not re-minted
});

test("different fingerprints get independent seeds and clearing re-mints", () => {
  const a = getOrCreateSeed("fp-A");
  const b = getOrCreateSeed("fp-B");
  // independent keys; equality is astronomically unlikely but not asserted
  assert.equal(loadSession("fp-A").seed, a);
  assert.equal(loadSession("fp-B").seed, b);
  clearSession("fp-A");
  assert.equal(loadSession("fp-A"), null);
  assert.equal(loadSession("fp-B").seed, b); // untouched
});

test("loadSession ignores incompatible schema versions", () => {
  setJSON("assessment:session:fp-X", { schemaVersion: 999, seed: 42 });
  assert.equal(loadSession("fp-X"), null);
});

test("hasSavedProgress is false until answers are persisted (M5)", () => {
  getOrCreateSeed("fp-Y"); // seed alone is not 'progress'
  assert.equal(hasSavedProgress("fp-Y"), false);
});
