// Instructions screen (SPEC §3.1).
// M0: a basic landing that proves routing and data binding work.
// M1 will flesh out the summary, type legend, resume/start-over, and the
// auto-advance toggle.

import { SCREENS } from "../state.js";
import { el, mountScreen, heading } from "./dom.js";
import { announce, focusHeading } from "../util/a11y.js";

export function renderInstructions(root, app) {
  const { meta, counts } = app.model;
  const section = mountScreen(root, "instructions");

  const h1 = heading(meta.capability_name);
  section.append(h1, metaLine(meta), el("p", "screen__lead", meta.lead_scenario), summary(counts));

  const start = el("button", "dl-btn dl-btn--primary", "Start assessment");
  start.type = "button";
  start.addEventListener("click", () => app.go(SCREENS.QUIZ));
  section.append(start);

  focusHeading(h1);
  announce(`${meta.capability_name}. Instructions.`, { assertive: true });
}

function metaLine(meta) {
  const bits = [meta.audience, meta.estimated_duration ? `${meta.estimated_duration} (estimate)` : ""]
    .filter(Boolean)
    .join(" · ");
  return el("p", "screen__meta", bits);
}

function summary(counts) {
  return el(
    "p",
    "screen__summary",
    `${counts.challenges} challenges · ${counts.questions} questions · ${counts.totalPoints} points`
  );
}
