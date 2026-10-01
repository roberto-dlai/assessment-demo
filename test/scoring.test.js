// M4 tests — score aggregation (grade) over the real assessment.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { normalizeAssessment } from "../src/data/loadAssessment.js";
import { grade } from "../src/scoring.js";
import { widgetFor } from "../src/questions/registry.js";

const raw = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../data/spec-driven-development-assessment.json", import.meta.url)),
    "utf8"
  )
);
const model = normalizeAssessment(raw);

function correctAnswer(q) {
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
const appWith = (answers) => ({ model, answers });

test("grade: all correct → 100%", () => {
  const answers = new Map(model.questions.map((q) => [q.uid, correctAnswer(q)]));
  const r = grade(appWith(answers));
  assert.equal(r.totalEarned, r.totalPossible);
  assert.equal(r.percentage, 100);
  assert.equal(r.counts.correct, model.questions.length);
  assert.equal(r.counts["not-answered"], 0);
});

test("grade: no answers → 0%, all not-answered", () => {
  const r = grade(appWith(new Map()));
  assert.equal(r.totalEarned, 0);
  assert.equal(r.percentage, 0);
  assert.equal(r.counts["not-answered"], model.questions.length);
});

test("grade: per-challenge subtotals sum to the totals", () => {
  const answers = new Map(model.questions.map((q) => [q.uid, correctAnswer(q)]));
  const r = grade(appWith(answers));
  assert.equal(r.byChallenge.reduce((s, c) => s + c.earned, 0), r.totalEarned);
  assert.equal(r.byChallenge.reduce((s, c) => s + c.possible, 0), r.totalPossible);
});

test("grade: outcome classification", () => {
  const singles = model.questions.filter((q) => q.type === "single_selection");
  const grp = model.questions.find((q) => q.type === "grouping");
  const answers = new Map();
  answers.set(singles[0].uid, singles[0].options.find((o) => o.correct).id); // correct
  answers.set(singles[1].uid, singles[1].options.find((o) => !o.correct).id); // incorrect
  answers.set(grp.uid, { [grp.items[0].id]: grp.items[0].correctGroup }); // 1 placed → partial

  const r = grade(appWith(answers));
  assert.equal(r.byUid.get(singles[0].uid).outcome, "correct");
  assert.equal(r.byUid.get(singles[1].uid).outcome, "incorrect");
  assert.equal(r.byUid.get(grp.uid).outcome, "partial");
  const untouched = model.questions.find((q) => !answers.has(q.uid));
  assert.equal(r.byUid.get(untouched.uid).outcome, "not-answered");
});

test("describe helpers return non-empty lines for every type", () => {
  for (const q of model.questions) {
    const mod = widgetFor(q.type);
    assert.ok(mod.describeSolution(q).length > 0, `${q.type} solution`);
    assert.deepEqual(mod.describeAnswer(undefined, q), ["(no answer)"], `${q.type} empty answer`);
  }
});
