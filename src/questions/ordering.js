// ordering widget (SPEC §4, §5, §6).
// Accessible baseline: Move up / Move down buttons (drag is a future enhancement).
// Answer payload: array of item ids in the learner's current order (JSON-plain).

import { el } from "../screens/dom.js";
import { shuffleUntil, sameOrder } from "../util/shuffle.js";

export const noun = "ordering";

export function render(container, { question, app, rng, onChange, announce }) {
  const uid = question.uid;
  const byId = new Map(question.items.map((it) => [it.id, it]));

  // Current order: the saved answer; else the persisted resolved presentation
  // order (so restore can't diverge from the reshuffle rule, SPEC §2.5/§7); else
  // a fresh seeded shuffle guaranteed != correct.
  let order = app.answers.get(uid);
  if (order) {
    order = [...order];
  } else if (app.resolvedOrderings.get(uid)) {
    order = [...app.resolvedOrderings.get(uid)];
  } else {
    order = shuffleUntil(question.items, rng, (c) => sameOrder(c, question.items, (it) => it.id)).map(
      (it) => it.id
    );
    app.setResolvedOrdering(uid, order);
  }

  const list = el("ol", "ordering");

  function move(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    app.setAnswer(uid, [...order]);
    paint();
    announce(`Moved "${byId.get(order[j]).label}" to position ${j + 1} of ${order.length}.`);
    onChange();
    // keep focus on the moved item's same-direction button
    const li = list.children[j];
    const btn = li && li.querySelector(delta < 0 ? ".ordering__btn--up" : ".ordering__btn--down");
    if (btn && !btn.disabled) btn.focus();
    else if (li) {
      const fallback = li.querySelector("button:not([disabled])");
      if (fallback) fallback.focus();
    }
  }

  function paint() {
    list.innerHTML = "";
    order.forEach((id, i) => {
      const it = byId.get(id);
      const li = el("li", "ordering__item");
      const pos = el("span", "ordering__pos", String(i + 1));
      const label = el("span", "ordering__label", it.label);
      const up = el("button", "ordering__btn ordering__btn--up", "↑");
      up.type = "button";
      up.setAttribute("aria-label", `Move "${it.label}" up`);
      up.disabled = i === 0;
      up.addEventListener("click", () => move(i, -1));
      const down = el("button", "ordering__btn ordering__btn--down", "↓");
      down.type = "button";
      down.setAttribute("aria-label", `Move "${it.label}" down`);
      down.disabled = i === order.length - 1;
      down.addEventListener("click", () => move(i, 1));
      li.append(pos, label, up, down);
      list.append(li);
    });
  }

  paint();
  container.append(list);
}

/** @param {string[]|undefined} answer */
export function statusOf(answer) {
  return answer ? "answered" : "not-answered";
}

/** Absolute-position credit (SPEC §5): fraction of items in their correct slot. */
export function score(answer, question) {
  if (!answer) return 0;
  const sol = question.solutionOrder;
  let correct = 0;
  for (let i = 0; i < sol.length; i++) if (answer[i] === sol[i]) correct++;
  return correct / sol.length;
}

// ---- Results review helpers ----
export function describeSolution(question) {
  // question.items are already in the correct order
  return question.items.map((it, i) => `${i + 1}. ${it.label}`);
}
export function describeAnswer(answer, question) {
  if (!answer) return ["(no answer)"];
  const byId = new Map(question.items.map((it) => [it.id, it.label]));
  return answer.map((id, i) => `${i + 1}. ${byId.get(id)}`);
}
