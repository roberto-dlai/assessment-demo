// M3 tests — pure statusOf/score per question type (SPEC §5, §6).
// DOM rendering is covered by manual/stub smoke tests; these cover the grading.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { normalizeAssessment } from "../src/data/loadAssessment.js";
import * as single from "../src/questions/single.js";
import * as multi from "../src/questions/multi.js";
import * as grouping from "../src/questions/grouping.js";
import * as matching from "../src/questions/matching.js";
import * as ordering from "../src/questions/ordering.js";

const raw = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../data/spec-driven-development-assessment.json", import.meta.url)),
    "utf8"
  )
);
const model = normalizeAssessment(raw);
const first = (t) => model.questions.find((q) => q.type === t);
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test("single_selection: status + 0/1 score", () => {
  const q = first("single_selection");
  const correctId = q.options.find((o) => o.correct).id;
  const wrongId = q.options.find((o) => !o.correct).id;
  assert.equal(single.statusOf(undefined), "not-answered");
  assert.equal(single.statusOf(correctId), "answered");
  assert.equal(single.score(undefined, q), 0);
  assert.equal(single.score(correctId, q), 1);
  assert.equal(single.score(wrongId, q), 0);
});

test("multiple_selections: status + partial credit incl. select-all and all-wrong", () => {
  const q = first("multiple_selections"); // Q4.3: 3 correct of 5
  const correct = q.options.filter((o) => o.correct).map((o) => o.id);
  const wrong = q.options.filter((o) => !o.correct).map((o) => o.id);
  assert.equal(multi.statusOf(undefined), "not-answered");
  assert.equal(multi.statusOf([]), "not-answered");
  assert.equal(multi.statusOf([correct[0]]), "answered");

  approx(multi.score(correct, q), 1); // all correct
  approx(multi.score(correct.slice(0, 2), q), 2 / 3); // 2 of 3 correct
  approx(multi.score([...correct, ...wrong], q), (correct.length - wrong.length) / correct.length); // select all
  assert.equal(multi.score(wrong, q), 0); // only distractors → clamped to 0
});

test("grouping: not-answered / in-progress / answered + fractional score", () => {
  const q = first("grouping");
  const full = Object.fromEntries(q.items.map((it) => [it.id, it.correctGroup]));
  assert.equal(grouping.statusOf(undefined, q), "not-answered");
  assert.equal(grouping.statusOf({ [q.items[0].id]: q.items[0].correctGroup }, q), "in-progress");
  assert.equal(grouping.statusOf(full, q), "answered");
  approx(grouping.score(full, q), 1);
  // one wrong placement
  const oneWrong = { ...full };
  const otherGroup = q.groupNames.find((g) => g !== q.items[0].correctGroup);
  oneWrong[q.items[0].id] = otherGroup;
  approx(grouping.score(oneWrong, q), (q.items.length - 1) / q.items.length);
});

test("matching: status + fractional score against the solution", () => {
  const q = first("matching");
  const full = { ...q.solution };
  assert.equal(matching.statusOf(undefined, q), "not-answered");
  assert.equal(matching.statusOf({ [q.lefts[0].id]: q.solution[q.lefts[0].id] }, q), "in-progress");
  assert.equal(matching.statusOf(full, q), "answered");
  approx(matching.score(full, q), 1);
  // swap two right assignments → both wrong
  const swapped = { ...full };
  swapped[q.lefts[0].id] = q.solution[q.lefts[1].id];
  swapped[q.lefts[1].id] = q.solution[q.lefts[0].id];
  approx(matching.score(swapped, q), (q.lefts.length - 2) / q.lefts.length);
});

test("ordering: status + absolute-position score", () => {
  const q = first("ordering");
  const correct = [...q.solutionOrder];
  assert.equal(ordering.statusOf(undefined), "not-answered");
  assert.equal(ordering.statusOf(correct), "answered");
  approx(ordering.score(correct, q), 1);
  // swap first two → 2 positions wrong
  const swapped = [...correct];
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  approx(ordering.score(swapped, q), (q.solutionOrder.length - 2) / q.solutionOrder.length);
});
