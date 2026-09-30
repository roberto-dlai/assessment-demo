// Quiz screen (SPEC §3.2).
//
// Built ONCE on route entry, then patched in place — navigation and (in M3)
// answer changes mutate existing DOM nodes rather than re-rendering, so focus,
// inputs, and the auto-advance timer are never destroyed. The type-specific
// answer widgets are placeholders here and land in M3.

import { SCREENS } from "../state.js";
import { el, mountScreen, heading } from "./dom.js";
import { announce, focusHeading, createFocusTrap } from "../util/a11y.js";

const TYPE_NOUN = {
  single_selection: "multiple-choice",
  multiple_selections: "multiple-choice",
  grouping: "grouping",
  matching: "matching",
  ordering: "ordering",
};

// Status shapes carry meaning without relying on color (SPEC §6).
const STATUS = {
  "not-answered": { shape: "○", label: "not answered" },
  "in-progress": { shape: "◐", label: "in progress" },
  answered: { shape: "✓", label: "answered" },
};

export function renderQuiz(root, app) {
  const { model } = app;
  const total = model.questions.length;

  // Per-question display meta (challenge grouping + position within challenge).
  const qMeta = new Map();
  for (const ch of model.challenges) {
    ch.questions.forEach((q, i) =>
      qMeta.set(q.uid, {
        pos: i + 1,
        size: ch.questions.length,
        scenario: ch.scenario,
        challenge: ch.challenge_number,
      })
    );
  }

  const section = mountScreen(root, "quiz");
  const h1 = heading(model.meta.capability_name);
  h1.className = "quiz__title";

  // ---- Question panel (built once, patched by showQuestion) ----
  const scenario = el("p", "panel__scenario");
  const scenarioWrap = el("div", "panel__scenario-wrap");
  scenarioWrap.setAttribute("role", "note");
  scenarioWrap.setAttribute("aria-label", "Scenario");
  scenarioWrap.append(scenario);

  const metaLine = el("p", "panel__meta");
  const badge = el("span", "dl-tag panel__badge");
  const metaRow = el("div", "panel__meta-row");
  metaRow.append(metaLine, badge);

  const prompt = el("h2", "panel__prompt");
  prompt.id = "panel-prompt";
  prompt.tabIndex = -1;
  const answerArea = el("div", "panel__answer");
  // M3 widgets render here; label the group by the prompt so AT reads it in context.
  answerArea.setAttribute("aria-labelledby", "panel-prompt");

  const panel = el("section", "panel");
  panel.append(scenarioWrap, metaRow, prompt, answerArea);

  // ---- Controls ----
  const backBtn = ctlButton("Back", "secondary");
  const nextBtn = ctlButton("Next", "secondary");
  const submitBtn = ctlButton("Submit", "primary");
  const controls = el("div", "controls");
  controls.append(backBtn, nextBtn, submitBtn);

  // ---- Top bar: progress + mobile navigator toggle ----
  const progress = el("p", "quiz__progress");
  const navToggle = ctlButton("Questions", "secondary");
  navToggle.classList.add("quiz__nav-toggle");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-controls", "question-navigator");
  const topBar = el("div", "quiz__topbar");
  topBar.append(progress, navToggle);

  // ---- Navigator (grouped by challenge) ----
  const navigator = el("nav", "navigator");
  navigator.id = "question-navigator";
  navigator.setAttribute("aria-label", "Question navigator");
  const navRefs = new Map(); // uid -> { btn, icon }
  for (const ch of model.challenges) {
    if (ch.questions.length === 0) continue; // §10: empty challenge skipped
    const group = el("div", "navigator__group");
    group.append(el("h3", "navigator__group-title", `Challenge ${ch.challenge_number}`));
    const ul = el("ul", "navigator__list");
    ch.questions.forEach((q, i) => {
      const btn = ctlButton("", "");
      btn.className = "nav-item";
      const num = el("span", "nav-item__num", String(i + 1));
      const icon = el("span", "nav-item__icon");
      icon.setAttribute("aria-hidden", "true");
      btn.append(num, icon);
      btn.addEventListener("click", () => {
        // Close first so the trap's focus-restore doesn't override the focus
        // that goTo() then puts on the target question's heading.
        if (isDrawerOpen()) closeDrawer();
        goTo(q.index, { reason: "navigator" });
      });
      const li = el("li", "navigator__item");
      li.append(btn);
      ul.append(li);
      navRefs.set(q.uid, { btn, icon });
    });
    group.append(ul);
    navigator.append(group);
  }

  // ---- Assemble ----
  const backdrop = el("div", "quiz__backdrop");
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");
  const main = el("div", "quiz__main");
  main.append(topBar, panel, controls);
  const layout = el("div", "quiz");
  layout.append(main, navigator);
  section.append(h1, layout, backdrop);

  // ---- Patch functions ----
  function refreshNav(uid) {
    const ref = navRefs.get(uid);
    if (!ref) return;
    const status = app.statusOf(uid);
    const s = STATUS[status];
    ref.icon.textContent = s.shape;
    ref.icon.className = `nav-item__icon nav-item__icon--${status}`;
    const m = qMeta.get(uid);
    ref.btn.setAttribute("aria-label", `Challenge ${m.challenge}, question ${m.pos}, ${s.label}`);
  }
  function refreshAllNav() {
    for (const q of model.questions) refreshNav(q.uid);
    progress.textContent = `${app.answeredCount()} of ${total} answered`;
  }

  function showQuestion(index) {
    const q = model.questions[index];
    const m = qMeta.get(q.uid);
    scenario.textContent = m.scenario;
    scenarioWrap.hidden = !m.scenario;
    metaLine.textContent = `Challenge ${m.challenge} · Question ${m.pos} of ${m.size}`;
    badge.textContent = `${q.points} point${q.points === 1 ? "" : "s"}`;
    prompt.textContent = q.prompt;
    answerArea.textContent = `Answer options for this ${TYPE_NOUN[q.type]} question appear here (M3).`;

    for (const [uid, ref] of navRefs) {
      const active = uid === q.uid;
      if (active) ref.btn.setAttribute("aria-current", "true");
      else ref.btn.removeAttribute("aria-current");
      ref.btn.classList.toggle("nav-item--active", active);
    }
    backBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;

    focusHeading(prompt);
  }

  function goTo(index, { reason = "nav" } = {}) {
    app.setIndex(index);
    showQuestion(app.currentIndex);
    // Auto-advance (M3) owns its own assertive announcement and calls goTo with
    // reason "auto-advance"; manual/initial navigation announces POLITELY so it
    // doesn't fight the focus-driven heading read.
    if (reason !== "auto-advance") {
      const m = qMeta.get(model.questions[app.currentIndex].uid);
      announce(`Question ${app.currentIndex + 1} of ${total}. Challenge ${m.challenge}.`);
    }
  }

  // ---- Mobile drawer ----
  let trap = null;
  // navigator already carries aria-label="Question navigator" (set at build), so
  // it keeps an accessible name once role=dialog is applied.
  const desktopMq = globalThis.matchMedia ? globalThis.matchMedia("(min-width: 800px)") : null;
  const isDrawerOpen = () => navigator.classList.contains("navigator--open");
  function onDesktopChange(e) {
    // Force-close if the viewport grows to desktop while the drawer is open, so
    // dialog/modal/trap state can't leak onto the sidebar layout.
    if (e.matches && isDrawerOpen()) closeDrawer();
  }
  function openDrawer() {
    navigator.classList.add("navigator--open");
    navigator.setAttribute("role", "dialog");
    navigator.setAttribute("aria-modal", "true");
    navigator.tabIndex = -1; // so the dialog container can take initial focus
    backdrop.hidden = false;
    navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden"; // scroll lock behind the modal
    if (desktopMq && desktopMq.addEventListener) desktopMq.addEventListener("change", onDesktopChange);
    // Focus the container first so the dialog's name/role is announced before the
    // learner tabs into a grid of question buttons.
    trap = createFocusTrap(navigator, { onEscape: closeDrawer, focusContainer: true });
    trap.activate();
  }
  function closeDrawer() {
    navigator.classList.remove("navigator--open");
    navigator.removeAttribute("role");
    navigator.removeAttribute("aria-modal");
    backdrop.hidden = true;
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (desktopMq && desktopMq.removeEventListener) desktopMq.removeEventListener("change", onDesktopChange);
    if (trap) {
      trap.release();
      trap = null;
    }
  }
  navToggle.addEventListener("click", () => (isDrawerOpen() ? closeDrawer() : openDrawer()));
  backdrop.addEventListener("click", closeDrawer);

  // ---- Wire controls ----
  backBtn.addEventListener("click", () => goTo(app.currentIndex - 1, { reason: "nav" }));
  nextBtn.addEventListener("click", () => goTo(app.currentIndex + 1, { reason: "nav" }));
  submitBtn.addEventListener("click", () => app.go(SCREENS.RESULTS));

  // ---- Initial paint ----
  refreshAllNav();
  goTo(app.currentIndex, { reason: "initial" });
}

function ctlButton(text, variant) {
  const cls = variant ? `dl-btn dl-btn--${variant}` : "dl-btn";
  const b = el("button", cls, text || null);
  b.type = "button";
  return b;
}
