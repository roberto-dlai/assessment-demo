// M5 tests — session blob persistence: serialize/hydrate + save/restore.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { _resetForTests } from "../src/util/storage.js";
import { saveSession, loadSession, hasSavedProgress, clearSession } from "../src/session.js";
import { createApp } from "../src/state.js";
import { normalizeAssessment } from "../src/data/loadAssessment.js";

const raw = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../data/spec-driven-development-assessment.json", import.meta.url)),
    "utf8"
  )
);
const model = normalizeAssessment(raw);
const FP = model.fingerprint;

beforeEach(() => {
  delete globalThis.localStorage;
  _resetForTests();
});

function app() {
  const a = createApp(() => {});
  a.setModel(model);
  return a;
}
function correctFor(q) {
  switch (q.type) {
    case "single_selection":
      return q.options.find((o) => o.correct).id;
    case "multiple_selections":
      return q.options.filter((o) => o.correct).map((o) => o.id);
    case "grouping":
      return Object.fromEntries(q.items.map((it) => [it.id, it.correctGroup]));
    case "matching":
      return { ...q.solution };
    case "ordering":
      return [...q.solutionOrder];
    default:
      return undefined;
  }
}

test("saveSession/loadSession round-trip stamps the schema version", () => {
  saveSession("fp", { answers: { a: 1 }, submitted: false });
  const s = loadSession("fp");
  assert.equal(s.schemaVersion, 1);
  assert.deepEqual(s.answers, { a: 1 });
});

test("serialize produces a JSON-plain blob; hydrate restores in-quiz state", () => {
  const a = app();
  const q = model.questions.find((x) => x.type === "single_selection");
  a.setAnswer(q.uid, correctFor(q));
  a.setIndex(3);

  const blob = a.serialize();
  assert.doesNotThrow(() => JSON.stringify(blob)); // no Maps/Sets leaked
  assert.equal(JSON.parse(JSON.stringify(blob)).currentIndex, 3);

  const b = app();
  b.hydrate(blob);
  assert.equal(b.currentIndex, 3);
  assert.equal(b.answers.get(q.uid), correctFor(q));
  assert.equal(b.statusOf(q.uid), "answered");
});

test("auto-save via the persist hook; a fresh app restores the same state", () => {
  const a = app();
  a.persist = (self) => saveSession(FP, self.serialize());
  const q = model.questions[0];
  a.setAnswer(q.uid, correctFor(q)); // triggers _save -> saveSession
  assert.equal(hasSavedProgress(FP), true);

  const b = app();
  b.hydrate(loadSession(FP));
  assert.equal(b.statusOf(q.uid), a.statusOf(q.uid));
});

test("hydrating a submitted blob recomputes results", () => {
  const a = app();
  for (const q of model.questions) a.answers.set(q.uid, correctFor(q));
  a.submitted = true;
  const b = app();
  b.hydrate(a.serialize());
  assert.ok(b.results);
  assert.equal(b.results.percentage, 100);
});

test("clearSession wipes saved progress (Retake / Start over)", () => {
  saveSession(FP, { answers: { x: 1 }, submitted: true });
  assert.equal(hasSavedProgress(FP), true);
  clearSession(FP);
  assert.equal(hasSavedProgress(FP), false);
});

test("an empty (no-answers) blob is not treated as resumable progress", () => {
  const a = app();
  saveSession(FP, a.serialize()); // all empty
  assert.equal(hasSavedProgress(FP), false);
});
