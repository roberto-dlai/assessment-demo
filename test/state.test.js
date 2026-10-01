// M2 tests — the in-quiz state/navigation/mutation API (SPEC §3.2, §6).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp, SCREENS } from "../src/state.js";

function appWith(nQuestions) {
  const app = createApp(() => {});
  const questions = Array.from({ length: nQuestions }, (_, i) => ({
    uid: `q${i}`,
    index: i,
    type: "single_selection",
    options: [
      { id: `q${i}-a`, label: "a", correct: true },
      { id: `q${i}-b`, label: "b", correct: false },
    ],
  }));
  app.setModel({ questions, byUid: new Map(questions.map((q) => [q.uid, q])) });
  return app;
}

test("setIndex clamps to valid range", () => {
  const app = appWith(5);
  assert.equal(app.setIndex(2), 2);
  assert.equal(app.setIndex(-3), 0); // clamp low
  assert.equal(app.setIndex(99), 4); // clamp high
  assert.equal(app.currentIndex, 4);
});

test("setIndex is safe when there are zero questions", () => {
  const app = createApp(() => {});
  app.setModel({ questions: [], byUid: new Map() });
  assert.equal(app.setIndex(0), 0);
  assert.equal(app.setIndex(5), 0);
  assert.equal(app.currentIndex, 0);
});

test("next/back respect bounds", () => {
  const app = appWith(3);
  assert.equal(app.currentIndex, 0);
  assert.equal(app.back(), 0); // already at first
  assert.equal(app.next(), 1);
  assert.equal(app.next(), 2);
  assert.equal(app.next(), 2); // already at last
  assert.equal(app.back(), 1);
});

test("currentQuestion tracks the index", () => {
  const app = appWith(4);
  app.setIndex(2);
  assert.equal(app.currentQuestion().uid, "q2");
});

test("statusOf delegates to the question type; answeredCount counts answered", () => {
  const app = appWith(3);
  assert.equal(app.statusOf("q0"), "not-answered");
  assert.equal(app.answeredCount(), 0);
  app.setAnswer("q0", "q0-a");
  assert.equal(app.statusOf("q0"), "answered");
  assert.equal(app.answers.get("q0"), "q0-a");
  app.setAnswer("q1", "q1-b");
  assert.equal(app.answeredCount(), 2);
});

test("setResolvedOrdering stores per-uid ids", () => {
  const app = appWith(2);
  app.setResolvedOrdering("q0", ["a", "b", "c"]);
  assert.deepEqual(app.resolvedOrderings.get("q0"), ["a", "b", "c"]);
});

test("navigation mutations do NOT trigger the route onChange", () => {
  let routeChanges = 0;
  const app = createApp(() => routeChanges++);
  app.setModel({ questions: [{ uid: "q0", index: 0 }, { uid: "q1", index: 1 }] });
  app.next();
  app.back();
  app.setAnswer("q0", {});
  assert.equal(routeChanges, 0); // in-quiz updates are patched, not re-routed
  app.go(SCREENS.RESULTS);
  assert.equal(routeChanges, 1); // only route changes fire onChange
});
