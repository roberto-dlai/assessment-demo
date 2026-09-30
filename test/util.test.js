// M0 tests — pure modules only (PRNG, shuffle, data normalization).
// Run with: npm test   (node --test)
// Grading tests arrive in M4.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { mulberry32, hashStringToSeed, questionRng } from "../src/util/prng.js";
import { shuffle, shuffleUntil, sameOrder } from "../src/util/shuffle.js";
import { normalizeAssessment, fingerprintQuestions } from "../src/data/loadAssessment.js";

const DATA_PATH = fileURLToPath(
  new URL("../data/spec-driven-development-assessment.json", import.meta.url)
);
const rawAssessment = JSON.parse(readFileSync(DATA_PATH, "utf8"));

test("mulberry32 is deterministic for a given seed", () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every((n) => n >= 0 && n < 1));
});

test("hashStringToSeed is stable and unsigned", () => {
  assert.equal(hashStringToSeed("1.1"), hashStringToSeed("1.1"));
  assert.notEqual(hashStringToSeed("1.1"), hashStringToSeed("1.2"));
  assert.ok(hashStringToSeed("anything") >= 0);
});

test("questionRng reproduces the same stream from session seed + id", () => {
  const r1 = questionRng(999, "2.1");
  const r2 = questionRng(999, "2.1");
  assert.equal(r1(), r2());
});

test("shuffle is a reproducible permutation", () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8];
  const out1 = shuffle(src, mulberry32(42));
  const out2 = shuffle(src, mulberry32(42));
  assert.deepEqual(out1, out2); // same seed → same result
  assert.deepEqual([...out1].sort((a, b) => a - b), src); // same elements
  assert.notDeepEqual(src, out1); // actually shuffled (with this seed)
});

test("shuffleUntil avoids the disallowed order deterministically", () => {
  const correct = ["a", "b", "c", "d"];
  const rng = mulberry32(7);
  const result = shuffleUntil(correct, rng, (cand) => sameOrder(cand, correct));
  assert.equal(sameOrder(result, correct), false);
  // reproducible
  const again = shuffleUntil(correct, mulberry32(7), (cand) => sameOrder(cand, correct));
  assert.deepEqual(result, again);
});

test("normalizeAssessment flattens challenges and assigns 1 point each", () => {
  const model = normalizeAssessment(rawAssessment);
  assert.equal(model.counts.challenges, rawAssessment.challenges.length);
  const rawQuestionCount = rawAssessment.challenges.reduce((n, c) => n + c.questions.length, 0);
  assert.equal(model.counts.questions, rawQuestionCount);
  assert.equal(model.counts.totalPoints, rawQuestionCount);
  assert.ok(model.questions.every((q) => q.points === 1));
  // global index is contiguous
  model.questions.forEach((q, i) => assert.equal(q.index, i));
});

test("every renderable item gets a unique stable id", () => {
  const model = normalizeAssessment(rawAssessment);
  const ids = [];
  for (const q of model.questions) {
    if (q.options) ids.push(...q.options.map((o) => o.id));
    if (q.groupNames) ids.push(...q.items.map((it) => it.id));
    if (q.lefts) ids.push(...q.lefts.map((l) => l.id), ...q.rights.map((r) => r.id));
    if (q.solutionOrder) ids.push(...q.items.map((it) => it.id));
  }
  assert.equal(new Set(ids).size, ids.length, "item ids must be unique");
});

test("each question type normalizes its answer key", () => {
  const model = normalizeAssessment(rawAssessment);
  const byType = (t) => model.questions.filter((q) => q.type === t);

  for (const q of byType("single_selection")) {
    assert.equal(q.options.filter((o) => o.correct).length, 1);
  }
  for (const q of byType("multiple_selections")) {
    assert.ok(q.options.filter((o) => o.correct).length >= 1);
  }
  for (const q of byType("grouping")) {
    assert.ok(q.groupNames.length >= 2);
    assert.ok(q.items.every((it) => q.groupNames.includes(it.correctGroup)));
  }
  for (const q of byType("matching")) {
    assert.equal(q.lefts.length, q.rights.length);
    assert.equal(Object.keys(q.solution).length, q.lefts.length);
  }
  for (const q of byType("ordering")) {
    assert.deepEqual(q.solutionOrder, q.items.map((it) => it.id));
  }
});

test("fingerprint is stable but changes when content changes", () => {
  const a = normalizeAssessment(rawAssessment);
  const b = normalizeAssessment(JSON.parse(JSON.stringify(rawAssessment)));
  assert.equal(a.fingerprint, b.fingerprint);

  const mutated = JSON.parse(JSON.stringify(rawAssessment));
  mutated.challenges[0].questions[0].prompt += " (edited)";
  assert.notEqual(fingerprintQuestions(normalizeAssessment(mutated).questions), a.fingerprint);
});

test("normalizeAssessment rejects malformed input", () => {
  assert.throws(() => normalizeAssessment(null));
  assert.throws(() => normalizeAssessment({}));
  assert.throws(() => normalizeAssessment({ challenges: [] }));
});
