// grouping widget (SPEC §4, §5, §6).
// Accessible baseline: one labelled <select> per item to choose its group
// (pool/bins drag UI is a future enhancement). Group names come from the data.
// Answer payload: { [itemId]: groupName } (JSON-plain); absent key = unplaced.

import { el } from "../screens/dom.js";
import { shuffle } from "../util/shuffle.js";

export const noun = "grouping";

export function render(container, { question, app, rng, onChange, announce }) {
  const uid = question.uid;
  const current = { ...(app.answers.get(uid) || {}) };

  const wrap = el("div", "assign");
  for (const it of shuffle(question.items, rng)) {
    const row = el("div", "assign__row");
    const selId = `grp-${uid}-${it.id}`;
    const label = el("label", "assign__label", it.label);
    label.setAttribute("for", selId);

    const sel = el("select", "assign__select");
    sel.id = selId;
    const none = el("option", null, "— choose group —");
    none.value = "";
    sel.append(none);
    for (const g of question.groupNames) {
      const o = el("option", null, g);
      o.value = g;
      if (current[it.id] === g) o.selected = true;
      sel.append(o);
    }
    sel.addEventListener("change", () => {
      if (sel.value) current[it.id] = sel.value;
      else delete current[it.id];
      app.setAnswer(uid, { ...current });
      announce(`${Object.keys(current).length} of ${question.items.length} placed.`);
      onChange();
    });

    row.append(label, sel);
    wrap.append(row);
  }
  container.append(wrap);
}

/** @param {object|undefined} answer */
export function statusOf(answer, question) {
  const placed = answer ? Object.keys(answer).length : 0;
  if (placed === 0) return "not-answered";
  return placed >= question.items.length ? "answered" : "in-progress";
}

/** Fraction of items placed in their correct group (SPEC §5). */
export function score(answer, question) {
  if (!answer) return 0;
  let correct = 0;
  for (const it of question.items) if (answer[it.id] === it.correctGroup) correct++;
  return correct / question.items.length;
}
