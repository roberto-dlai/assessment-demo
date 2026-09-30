// Instructions screen (SPEC §3.1).
// M0: a basic landing that proves routing and data binding work.
// M1 will flesh out the summary, type legend, resume/start-over, and the
// auto-advance toggle.

import { SCREENS } from "../state.js";

export function renderInstructions(root, app) {
  const { meta, counts } = app.model;
  root.innerHTML = "";

  const section = el("section", "screen screen--instructions");
  section.append(
    el("h1", "", meta.capability_name),
    metaLine(meta),
    paragraph(meta.lead_scenario),
    summary(counts)
  );

  const start = el("button", "dl-btn dl-btn--primary", "Start assessment");
  start.type = "button";
  start.addEventListener("click", () => app.go(SCREENS.QUIZ));
  section.append(start);

  root.append(section);
  focusHeading(section);
}

function metaLine(meta) {
  const bits = [meta.audience, meta.estimated_duration ? `${meta.estimated_duration} (estimate)` : ""]
    .filter(Boolean)
    .join(" · ");
  return el("p", "screen__meta", bits);
}

function summary(counts) {
  const p = el(
    "p",
    "screen__summary",
    `${counts.challenges} challenges · ${counts.questions} questions · ${counts.totalPoints} points`
  );
  return p;
}

function paragraph(text) {
  return el("p", "screen__lead", text);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function focusHeading(section) {
  const h = section.querySelector("h1");
  if (h) {
    h.tabIndex = -1;
    h.focus({ preventScroll: false });
  }
}
