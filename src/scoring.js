// Scoring aggregation (SPEC §5). Delegates per-question scoring to the question
// registry and rolls up totals + per-challenge subtotals.

import { widgetFor } from "./questions/registry.js";

/**
 * Grade one question.
 * @returns {{uid,id,type,points,score,earned,outcome}}
 *   outcome ∈ "correct" | "partial" | "incorrect" | "not-answered"
 */
export function gradeQuestion(q, answer) {
  const mod = widgetFor(q.type);
  const status = mod.statusOf(answer, q);
  const score = mod.score(answer, q); // [0, 1]
  const outcome =
    status === "not-answered" ? "not-answered" : score >= 1 ? "correct" : score > 0 ? "partial" : "incorrect";
  return { uid: q.uid, id: q.id, type: q.type, points: q.points, score, earned: score * q.points, outcome };
}

/**
 * Grade the whole assessment from the app's answers.
 * @param {object} app
 * @returns {{results, byUid, totalEarned, totalPossible, percentage, byChallenge, counts}}
 */
export function grade(app) {
  const model = app.model;
  const results = model.questions.map((q) => gradeQuestion(q, app.answers.get(q.uid)));
  const byUid = new Map(results.map((r) => [r.uid, r]));

  const totalEarned = results.reduce((s, r) => s + r.earned, 0);
  const totalPossible = model.questions.reduce((s, q) => s + q.points, 0);
  const percentage = totalPossible ? Math.round((totalEarned / totalPossible) * 100) : 0;

  const byChallenge = model.challenges
    .filter((ch) => ch.questions.length)
    .map((ch) => ({
      challenge: ch.challenge_number,
      scenario: ch.scenario,
      earned: ch.questions.reduce((s, q) => s + byUid.get(q.uid).earned, 0),
      possible: ch.questions.reduce((s, q) => s + q.points, 0),
    }));

  const counts = { correct: 0, partial: 0, incorrect: 0, "not-answered": 0 };
  for (const r of results) counts[r.outcome]++;

  return { results, byUid, totalEarned, totalPossible, percentage, byChallenge, counts };
}
