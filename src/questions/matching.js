// matching widget (SPEC §4, §5, §6).
// Pool of right values + one slot per left item, click-to-place (two-step, no
// native drag). Select a value from the pool, then click a left item's slot to
// match it. Click a filled slot (with nothing selected) to pick its value back
// up. Right values are one-to-one: placing into an occupied slot returns the
// previous value to the pool. Auto-matches the final pair.
// Answer payload: { [leftId]: rightId } (JSON-plain).

import { el } from "../screens/dom.js";
import { shuffle } from "../util/shuffle.js";

export const noun = "matching";

export function render(container, { question, app, rng, onChange, announce }) {
  const uid = question.uid;
  const current = { ...(app.answers.get(uid) || {}) };
  const rLabel = new Map(question.rights.map((r) => [r.id, r.label]));
  const lLabel = new Map(question.lefts.map((l) => [l.id, l.label]));
  const display = shuffle(question.rights, rng); // stable pool order
  let carried = null; // rightId currently selected
  let chipRefs = new Map();
  let slotRefs = new Map();

  const root = el("div", "pickplace");
  root.append(
    el(
      "p",
      "pickplace__hint",
      "Select a value, then choose the item it matches. Select a filled match to pick it up again."
    )
  );
  const pool = el("div", "bin bin--pool");
  const slots = el("ul", "slots");
  root.append(pool, slots);

  const assigned = () => new Set(Object.values(current).filter(Boolean));
  const poolRights = () => {
    const used = assigned();
    return display.filter((r) => !used.has(r.id));
  };

  function selectRight(id) {
    carried = carried === id ? null : id;
    paint();
    if (carried) announce(`Selected "${rLabel.get(id)}". Choose an item to match.`);
    const b = chipRefs.get(id);
    if (b) b.focus();
  }

  // Auto-match the last pair, only after a forward assignment leaves one open.
  function maybeAutoMatch() {
    const openLefts = question.lefts.filter((l) => !current[l.id]);
    const free = poolRights();
    if (openLefts.length === 1 && free.length === 1) {
      current[openLefts[0].id] = free[0].id;
      announce(`Last pair matched automatically: ${openLefts[0].label} with ${rLabel.get(free[0].id)}.`);
    }
  }

  function clickLeft(leftId) {
    if (carried) {
      // place (an occupant, if any, drops back to the pool implicitly)
      current[leftId] = carried;
      const label = rLabel.get(carried);
      carried = null;
      maybeAutoMatch();
      app.setAnswer(uid, { ...current });
      paint();
      announce(`Matched ${lLabel.get(leftId)} with "${label}".`);
      onChange();
      const b = slotRefs.get(leftId);
      if (b) b.focus();
    } else if (current[leftId]) {
      // pick the occupant back up
      carried = current[leftId];
      delete current[leftId];
      app.setAnswer(uid, { ...current });
      paint();
      announce(`Picked up "${rLabel.get(carried)}" from ${lLabel.get(leftId)}.`);
      onChange();
      const b = chipRefs.get(carried);
      if (b) b.focus();
    } else {
      announce("Select a value first.");
    }
  }

  function returnToPool() {
    if (!carried) {
      announce("Select a matched value to move it back.");
      return;
    }
    const label = rLabel.get(carried);
    carried = null;
    paint();
    announce(`Returned "${label}" to the pool.`);
  }

  function paint() {
    chipRefs = new Map();
    slotRefs = new Map();

    pool.innerHTML = "";
    pool.setAttribute("aria-label", "Values to match");
    const poolTarget = el("button", "bin__target", "Values");
    poolTarget.type = "button";
    poolTarget.setAttribute("aria-label", "Return the selected value to the pool");
    poolTarget.addEventListener("click", returnToPool);
    const poolList = el("ul", "bin__items");
    for (const r of poolRights()) {
      const li = el("li", "bin__item");
      const chip = el("button", carried === r.id ? "chip chip--selected" : "chip", r.label);
      chip.type = "button";
      chip.setAttribute("aria-pressed", carried === r.id ? "true" : "false");
      chip.addEventListener("click", () => selectRight(r.id));
      chipRefs.set(r.id, chip);
      li.append(chip);
      poolList.append(li);
    }
    pool.append(poolTarget, poolList);

    slots.innerHTML = "";
    for (const left of question.lefts) {
      const li = el("li", "slot");
      const label = el("span", "slot__label", left.label);
      const filled = current[left.id];
      const target = el(
        "button",
        filled ? "slot__target slot__target--filled" : "slot__target",
        filled ? rLabel.get(filled) : "— choose match —"
      );
      target.type = "button";
      target.setAttribute(
        "aria-label",
        filled
          ? `${left.label}: matched with ${rLabel.get(filled)}. Select to pick it up.`
          : `${left.label}: choose a match`
      );
      target.addEventListener("click", () => clickLeft(left.id));
      slotRefs.set(left.id, target);
      li.append(label, target);
      slots.append(li);
    }
  }

  paint();
  container.append(root);
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
