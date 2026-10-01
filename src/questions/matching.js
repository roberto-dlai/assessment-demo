// matching widget (SPEC §4, §5, §6).
// Two columns — items on the left, options on the right. Click an item on either
// side, then click its match on the other side (click-to-match, no drag). Matched
// pairs show a shared number badge on both sides; a corner × on a matched left
// unmatches it. Right values are one-to-one (re-using one frees its old pair).
// Answer payload: { [leftId]: rightId } (JSON-plain).

import { el } from "../screens/dom.js";
import { shuffle } from "../util/shuffle.js";

export function render(container, { question, app, rng, onChange, announce }) {
  const uid = question.uid;
  const current = { ...(app.answers.get(uid) || {}) };
  const lLabel = new Map(question.lefts.map((l) => [l.id, l.label]));
  const rLabel = new Map(question.rights.map((r) => [r.id, r.label]));
  const rightOrder = shuffle(question.rights, rng);
  let selected = null; // { side: "left"|"right", id }
  let itemRefs = new Map(); // "side:id" -> button

  const root = el("div", "pickplace");
  root.append(
    el(
      "p",
      "pickplace__hint",
      "Select an item on the left and its match on the right (either order)."
    )
  );
  const cols = el("div", "match");
  const leftCol = el("ul", "match__col");
  leftCol.setAttribute("aria-label", "Items");
  const rightCol = el("ul", "match__col");
  rightCol.setAttribute("aria-label", "Options to match");
  cols.append(leftCol, rightCol);
  root.append(cols);

  function pairNumbers() {
    const num = new Map(); // "side:id" -> pair number
    let n = 0;
    for (const l of question.lefts) {
      const r = current[l.id];
      if (r) {
        n++;
        num.set("left:" + l.id, n);
        num.set("right:" + r, n);
      }
    }
    return num;
  }
  const leftMatchedTo = (rightId) => question.lefts.find((l) => current[l.id] === rightId);

  function maybeAutoMatch() {
    const openLefts = question.lefts.filter((l) => !current[l.id]);
    const used = new Set(Object.values(current).filter(Boolean));
    const freeRights = question.rights.filter((r) => !used.has(r.id));
    if (openLefts.length === 1 && freeRights.length === 1) {
      current[openLefts[0].id] = freeRights[0].id;
      announce(
        `Last pair matched automatically: ${lLabel.get(openLefts[0].id)} with ${rLabel.get(freeRights[0].id)}.`,
        { assertive: true } // system event (SPEC §4.6) + separate region avoids clobbering the "Matched" message
      );
    }
  }

  function pair(leftId, rightId) {
    // one-to-one: free any other left using this right, then (over)write
    for (const l of question.lefts) if (l.id !== leftId && current[l.id] === rightId) delete current[l.id];
    current[leftId] = rightId;
    maybeAutoMatch();
    app.setAnswer(uid, { ...current });
    announce(`Matched ${lLabel.get(leftId)} with ${rLabel.get(rightId)}.`);
    onChange();
  }

  function removeMatch(leftId) {
    selected = null; // avoid a stranded selection after repaint
    delete current[leftId];
    app.setAnswer(uid, { ...current });
    announce(`Unmatched ${lLabel.get(leftId)}.`);
    onChange();
    paint();
    focusItem("left", leftId);
  }

  function clickItem(side, id) {
    if (selected && selected.side !== side) {
      const leftId = side === "left" ? id : selected.id;
      const rightId = side === "right" ? id : selected.id;
      selected = null;
      pair(leftId, rightId);
      paint();
      focusItem(side, id);
    } else if (selected && selected.side === side && selected.id === id) {
      selected = null;
      paint();
      focusItem(side, id);
    } else {
      selected = { side, id };
      const label = side === "left" ? lLabel.get(id) : rLabel.get(id);
      const other = side === "left" ? "right" : "left";
      announce(`Selected "${label}". Now choose its match in the ${other} column.`);
      paint();
      focusItem(side, id);
    }
  }

  function focusItem(side, id) {
    const b = itemRefs.get(side + ":" + id);
    if (b) b.focus();
  }

  function makeItem(side, id, label, num, ariaSuffix) {
    const isSel = selected && selected.side === side && selected.id === id;
    const cls =
      "match__item" + (isSel ? " match__item--selected" : "") + (num != null ? " match__item--matched" : "");
    const btn = el("button", cls);
    btn.type = "button";
    if (num != null) {
      const badge = el("span", "match__num", String(num));
      badge.setAttribute("aria-hidden", "true");
      btn.append(badge);
    }
    btn.append(el("span", "match__label", label));
    btn.setAttribute("aria-pressed", isSel ? "true" : "false");
    btn.setAttribute("aria-label", `${label}${ariaSuffix}`);
    btn.addEventListener("click", () => clickItem(side, id));
    itemRefs.set(side + ":" + id, btn);
    return btn;
  }

  function paint() {
    itemRefs = new Map();
    const num = pairNumbers();

    leftCol.innerHTML = "";
    for (const l of question.lefts) {
      const n = num.get("left:" + l.id);
      const suffix = n != null ? `, matched with ${rLabel.get(current[l.id])} (pair ${n})` : ", not matched";
      const li = el("li", "match__row");
      const holder = el("span", "match__holder");
      holder.append(makeItem("left", l.id, l.label, n, suffix));
      if (n != null) {
        const rm = el("button", "chip__remove", "×");
        rm.type = "button";
        rm.setAttribute("aria-label", `Unmatch "${l.label}"`);
        rm.addEventListener("click", () => removeMatch(l.id));
        holder.append(rm);
      }
      li.append(holder);
      leftCol.append(li);
    }

    rightCol.innerHTML = "";
    for (const r of rightOrder) {
      const n = num.get("right:" + r.id);
      const left = n != null ? leftMatchedTo(r.id) : null;
      const suffix = left
        ? `, matched with ${lLabel.get(left.id)} (pair ${n}); unmatch it from the Items column`
        : ", not matched";
      const li = el("li", "match__row");
      li.append(makeItem("right", r.id, r.label, n, suffix));
      rightCol.append(li);
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

// ---- Results review helpers ----
export function describeSolution(question) {
  const rl = new Map(question.rights.map((r) => [r.id, r.label]));
  return question.lefts.map((l) => `${l.label} → ${rl.get(question.solution[l.id])}`);
}
export function describeAnswer(answer, question) {
  if (!answer || !Object.keys(answer).length) return ["(no answer)"];
  const rl = new Map(question.rights.map((r) => [r.id, r.label]));
  return question.lefts.map((l) => `${l.label} → ${answer[l.id] ? rl.get(answer[l.id]) : "(none)"}`);
}
