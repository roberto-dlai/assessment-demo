// single_selection widget (SPEC §4, §5, §6).
// Answer payload: the selected option id (string), or undefined when unanswered.

import { el } from "../screens/dom.js";
import { shuffle } from "../util/shuffle.js";

export const noun = "multiple-choice";

export function render(container, { question, app, rng, onChange }) {
  const uid = question.uid;
  const name = `radio-${uid}`;
  const current = app.answers.get(uid);

  const group = el("div", "choices");
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-labelledby", "panel-prompt");

  for (const opt of shuffle(question.options, rng)) {
    const row = el("label", "choice");
    const input = el("input", "choice__input");
    input.type = "radio";
    input.name = name;
    input.value = opt.id;
    if (current === opt.id) input.checked = true;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      app.setAnswer(uid, opt.id);
      onChange();
    });
    row.append(input, el("span", "choice__label", opt.label));
    group.append(row);
  }
  container.append(group);
}

/** @param {string|undefined} answer */
export function statusOf(answer) {
  return answer ? "answered" : "not-answered";
}

/** @returns {number} 0 or 1 */
export function score(answer, question) {
  if (!answer) return 0;
  const opt = question.options.find((o) => o.id === answer);
  return opt && opt.correct ? 1 : 0;
}
