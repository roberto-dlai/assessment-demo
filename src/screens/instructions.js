// Instructions screen (SPEC §3.1).

import { SCREENS } from "../state.js";
import { el, mountScreen, heading } from "./dom.js";
import { announce, focusHeading } from "../util/a11y.js";
import { setAutoAdvance } from "../prefs.js";
import { hasSavedProgress, clearSession, getOrCreateSeed } from "../session.js";

const TYPE_LABELS = {
  single_selection: "Multiple choice — one answer",
  multiple_selections: "Multiple choice — select all that apply",
  grouping: "Grouping — sort items into categories",
  matching: "Matching — pair items across two lists",
  ordering: "Ordering — arrange items in sequence",
};

export function renderInstructions(root, app) {
  const { meta, counts } = app.model;
  const section = mountScreen(root, "instructions");

  const h1 = heading(meta.capability_name);
  section.append(h1, metaLine(meta));
  if (meta.lead_scenario) section.append(el("p", "screen__lead", meta.lead_scenario));

  section.append(
    summary(counts),
    typeLegend(app.model),
    howItWorks(),
    autoAdvanceToggle(app),
    actions(root, app)
  );

  focusHeading(h1);
  announce(`${meta.capability_name}. Instructions.`, { assertive: true });
}

function metaLine(meta) {
  const bits = [
    meta.audience,
    meta.estimated_duration ? `${meta.estimated_duration} (estimated guide)` : "",
  ].filter(Boolean);
  return el("p", "screen__meta", bits.join(" · "));
}

function summary(counts) {
  return el(
    "p",
    "screen__summary",
    `${counts.challenges} challenges · ${counts.questions} questions · ${counts.totalPoints} points`
  );
}

function typeLegend(model) {
  const present = new Map();
  for (const q of model.questions) present.set(q.type, (present.get(q.type) || 0) + 1);

  const wrap = el("section", "legend");
  wrap.append(el("h2", "", "Question types"));
  const list = el("ul", "legend__list");
  for (const [type, count] of present) {
    const label = TYPE_LABELS[type] || type;
    list.append(el("li", "legend__item", `${label} (${count})`));
  }
  wrap.append(list);
  return wrap;
}

function howItWorks() {
  const wrap = el("section", "howto");
  wrap.append(el("h2", "", "How it works"));
  const list = el("ul", "howto__list");
  for (const note of [
    "Move freely between questions — use Back, Next, or the question navigator to jump to any question.",
    "Your progress is saved automatically and survives a page reload.",
    "You can change any answer until you submit.",
    "Each question shows how many points it is worth.",
  ]) {
    list.append(el("li", "", note));
  }
  wrap.append(list);
  return wrap;
}

function autoAdvanceToggle(app) {
  const wrap = el("div", "toggle");
  const input = el("input", "toggle__input");
  input.type = "checkbox";
  input.id = "auto-advance";
  input.checked = Boolean(app.prefs.autoAdvance);

  const label = el("label", "toggle__label", "Auto-advance to the next question when I answer");
  label.setAttribute("for", "auto-advance");

  input.addEventListener("change", () => {
    app.setPrefs(setAutoAdvance(input.checked));
    announce(input.checked ? "Auto-advance on." : "Auto-advance off.");
  });

  wrap.append(input, label);
  return wrap;
}

function actions(root, app) {
  const wrap = el("div", "actions");
  const fingerprint = app.model.fingerprint;

  if (hasSavedProgress(fingerprint)) {
    // Resume is the primary action; starting over is secondary (SPEC §3.1).
    const resume = primaryButton("Resume", () => app.go(SCREENS.QUIZ));
    const startOver = secondaryButton("Start over", () => {
      clearSession(fingerprint);
      app.setSessionSeed(getOrCreateSeed(fingerprint));
      app.go(SCREENS.QUIZ);
    });
    wrap.append(resume, startOver);
  } else {
    wrap.append(primaryButton("Start assessment", () => app.go(SCREENS.QUIZ)));
  }
  return wrap;
}

function primaryButton(text, onClick) {
  const b = el("button", "dl-btn dl-btn--primary", text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function secondaryButton(text, onClick) {
  const b = el("button", "dl-btn dl-btn--secondary", text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}
