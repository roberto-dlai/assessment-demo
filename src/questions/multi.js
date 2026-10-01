// multiple_selections widget (SPEC §4, §5, §6).
// Answer payload: array of selected option ids (JSON-plain).

import { el } from "../screens/dom.js";
import { shuffle } from "../util/shuffle.js";

export const noun = "multiple-choice";

export function render(container, { question, app, rng, onChange }) {
  const uid = question.uid;
  const selected = new Set(app.answers.get(uid) || []);

  const group = el("div", "choices");
  group.setAttribute("role", "group");
  group.setAttribute("aria-labelledby", "panel-prompt");

  for (const opt of shuffle(question.options, rng)) {
    const row = el("label", "choice");
    const input = el("input", "choice__input");
    input.type = "checkbox";
    input.value = opt.id;
    if (selected.has(opt.id)) input.checked = true;
    input.addEventListener("change", () => {
      if (input.checked) selected.add(opt.id);
      else selected.delete(opt.id);
      app.setAnswer(uid, [...selected]);
      onChange();
    });
    row.append(input, el("span", "choice__label", opt.label));
    group.append(row);
  }
  container.append(group);
}

/** @param {string[]|undefined} answer */
export function statusOf(answer) {
  // SPEC §6: multi-select reads "answered" once ≥1 option is selected.
  return answer && answer.length ? "answered" : "not-answered";
}

/** Partial credit (SPEC §5): (selectedCorrect − selectedIncorrect) / totalCorrect, clamped to [0,1]. */
export function score(answer, question) {
  const sel = new Set(answer || []);
  const totalCorrect = question.options.filter((o) => o.correct).length;
  if (totalCorrect === 0) return 0;
  let selCorrect = 0;
  let selWrong = 0;
  for (const o of question.options) {
    if (!sel.has(o.id)) continue;
    if (o.correct) selCorrect++;
    else selWrong++;
  }
  return Math.max(0, (selCorrect - selWrong) / totalCorrect);
}

// ---- Results review helpers ----
export function describeSolution(question) {
  return question.options.filter((o) => o.correct).map((o) => o.label);
}
export function describeAnswer(answer, question) {
  const sel = new Set(answer || []);
  const labels = question.options.filter((o) => sel.has(o.id)).map((o) => o.label);
  return labels.length ? labels : ["(no answer)"];
}
