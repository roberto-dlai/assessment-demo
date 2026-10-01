// matching widget (SPEC §4, §5, §6).
// Accessible baseline: one labelled <select> per left row choosing a right value
// (drag is a future enhancement). Right values are one-to-one: a value chosen in
// one row is disabled in the others. Auto-matches the final pair.
// Answer payload: { [leftId]: rightId } (JSON-plain).

import { el } from "../screens/dom.js";
import { shuffle } from "../util/shuffle.js";

export const noun = "matching";

export function render(container, { question, app, rng, onChange, announce }) {
  const uid = question.uid;
  const current = { ...(app.answers.get(uid) || {}) };
  const rights = shuffle(question.rights, rng);
  const rightLabel = new Map(question.rights.map((r) => [r.id, r.label]));
  const selects = new Map(); // leftId -> <select>

  function refreshDisabled() {
    for (const [leftId, sel] of selects) {
      const usedElsewhere = new Set(
        Object.entries(current)
          .filter(([l, r]) => l !== leftId && r)
          .map(([, r]) => r)
      );
      for (const opt of sel.options) {
        if (opt.value) opt.disabled = usedElsewhere.has(opt.value) && opt.value !== current[leftId];
      }
    }
  }

  // Fires only on a forward assignment that leaves exactly one left + one right open.
  function maybeAutoMatch() {
    const openLefts = question.lefts.filter((l) => !current[l.id]);
    const usedRights = new Set(Object.values(current).filter(Boolean));
    const freeRights = question.rights.filter((r) => !usedRights.has(r.id));
    if (openLefts.length === 1 && freeRights.length === 1) {
      const l = openLefts[0];
      const r = freeRights[0];
      current[l.id] = r.id;
      const sel = selects.get(l.id);
      if (sel) sel.value = r.id;
      announce(`Last pair matched automatically: ${l.label} with ${rightLabel.get(r.id)}.`);
    }
  }

  const wrap = el("div", "assign");
  for (const left of question.lefts) {
    const row = el("div", "assign__row");
    const selId = `mat-${uid}-${left.id}`;
    const label = el("label", "assign__label", left.label);
    label.setAttribute("for", selId);

    const sel = el("select", "assign__select");
    sel.id = selId;
    const none = el("option", null, "— choose match —");
    none.value = "";
    sel.append(none);
    for (const r of rights) {
      const o = el("option", null, r.label);
      o.value = r.id;
      if (current[left.id] === r.id) o.selected = true;
      sel.append(o);
    }
    sel.addEventListener("change", () => {
      if (sel.value) {
        current[left.id] = sel.value;
        maybeAutoMatch(); // only on forward assignment, never on clear
      } else {
        delete current[left.id];
      }
      app.setAnswer(uid, { ...current });
      refreshDisabled();
      onChange();
    });

    selects.set(left.id, sel);
    row.append(label, sel);
    wrap.append(row);
  }

  refreshDisabled();
  container.append(wrap);
}

/** @param {object|undefined} answer */
export function statusOf(answer, question) {
  const matched = answer ? Object.values(answer).filter(Boolean).length : 0;
  if (matched === 0) return "not-answered";
  return matched >= question.lefts.length ? "answered" : "in-progress";
}

/** Fraction of correctly matched pairs (SPEC §5). */
export function score(answer, question) {
  if (!answer) return 0;
  let correct = 0;
  for (const l of question.lefts) if (answer[l.id] === question.solution[l.id]) correct++;
  return correct / question.lefts.length;
}
