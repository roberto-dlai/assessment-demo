// grouping widget (SPEC §4, §5, §6).
// Pool + bins, click-to-place (two-step, no native drag so it stays keyboard-
// and touch-operable): select an item chip, then click a group's target to place
// it. Items live in the "Unplaced" pool or in a group bin.
// Answer payload: { [itemId]: groupName } (JSON-plain); absent key = unplaced.

import { el } from "../screens/dom.js";
import { shuffle } from "../util/shuffle.js";

export const noun = "grouping";
const POOL = "__pool__";

export function render(container, { question, app, rng, onChange, announce }) {
  const uid = question.uid;
  const current = { ...(app.answers.get(uid) || {}) };
  const byId = new Map(question.items.map((it) => [it.id, it]));
  const display = shuffle(question.items, rng); // stable pool order
  let selectedId = null;
  let itemRefs = new Map();

  const root = el("div", "pickplace");
  root.append(el("p", "pickplace__hint", "Select an item, then choose a group to place it in."));
  const bins = el("div", "bins");
  const pool = el("ul", "pool"); // unplaced items as loose chips (no box/label)
  pool.setAttribute("aria-label", "Unplaced items");
  root.append(bins, pool); // groups above, unplaced items below

  const itemsIn = (group) => display.filter((it) => (current[it.id] || POOL) === group);

  function selectItem(id) {
    selectedId = selectedId === id ? null : id;
    paint();
    if (selectedId) announce(`Selected "${byId.get(id).label}". Choose a group.`);
    focusItem(id);
  }

  function placeInto(group) {
    if (!selectedId) {
      announce("Select an item first.");
      return;
    }
    const movedId = selectedId;
    const label = byId.get(movedId).label;
    if (group === POOL) delete current[movedId];
    else current[movedId] = group;
    selectedId = null;
    app.setAnswer(uid, { ...current });
    paint();
    const placed = Object.keys(current).length;
    announce(
      group === POOL
        ? `Returned "${label}" to unplaced.`
        : `Placed "${label}" in ${group}. ${placed} of ${question.items.length} placed.`
    );
    onChange();
    focusItem(movedId);
  }

  function removeItem(id) {
    const label = byId.get(id).label;
    delete current[id];
    if (selectedId === id) selectedId = null;
    app.setAnswer(uid, { ...current });
    paint();
    announce(`Removed "${label}" from its group.`);
    onChange();
    focusItem(id); // focus the chip, now back in the pool
  }

  function focusItem(id) {
    const b = itemRefs.get(id);
    if (b) b.focus();
  }

  function makeChip(it) {
    const chip = el("button", selectedId === it.id ? "chip chip--selected" : "chip", it.label);
    chip.type = "button";
    chip.setAttribute("aria-pressed", selectedId === it.id ? "true" : "false");
    chip.addEventListener("click", () => selectItem(it.id));
    itemRefs.set(it.id, chip);
    return chip;
  }

  function makeGroupBin(group) {
    const sec = el("section", "bin");
    sec.setAttribute("aria-label", `Group: ${group}`);
    // Clicking anywhere on the box places the selected item. Clicks that land on
    // an inner button (a placed chip, its ×, or the title) are handled by that
    // button instead, so selecting/removing a placed item still works.
    sec.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      placeInto(group);
    });
    const target = el("button", "bin__target", group);
    target.type = "button";
    target.setAttribute("aria-label", `Place the selected item in ${group}`);
    target.addEventListener("click", () => placeInto(group));
    const list = el("ul", "bin__items");
    for (const it of itemsIn(group)) {
      const li = el("li", "bin__item");
      const holder = el("span", "placed");
      holder.append(makeChip(it));
      const remove = el("button", "chip__remove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove "${it.label}" from ${group}`);
      remove.addEventListener("click", () => removeItem(it.id));
      holder.append(remove);
      li.append(holder);
      list.append(li);
    }
    sec.append(target, list);
    return sec;
  }

  function paint() {
    itemRefs = new Map();
    pool.innerHTML = "";
    for (const it of itemsIn(POOL)) {
      const li = el("li", "pool__item");
      li.append(makeChip(it));
      pool.append(li);
    }
    bins.innerHTML = "";
    for (const g of question.groupNames) bins.append(makeGroupBin(g));
  }

  paint();
  container.append(root);
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

// ---- Results review helpers ----
export function describeSolution(question) {
  return question.items.map((it) => `${it.label} → ${it.correctGroup}`);
}
export function describeAnswer(answer, question) {
  if (!answer || !Object.keys(answer).length) return ["(no answer)"];
  return question.items.map((it) => `${it.label} → ${answer[it.id] || "(unplaced)"}`);
}
