// Quiz screen (SPEC §3.2).
// M0 placeholder — the question panel, navigator, controls, and per-type
// interactions are built in M2/M3. This proves routing into and out of the
// quiz screen works.

import { SCREENS } from "../state.js";
import { el, mountScreen, heading } from "./dom.js";
import { announce, focusHeading } from "../util/a11y.js";

export function renderQuiz(root, app) {
  const section = mountScreen(root, "quiz");

  const h1 = heading("Quiz");
  const note = el(
    "p",
    "",
    `Question panel and navigator arrive in M2/M3. Loaded ${app.model.counts.questions} questions.`
  );

  const back = el("button", "dl-btn dl-btn--secondary", "Back to instructions");
  back.type = "button";
  back.addEventListener("click", () => app.go(SCREENS.INSTRUCTIONS));

  section.append(h1, note, back);
  focusHeading(h1);
  announce("Quiz.", { assertive: true });
}
