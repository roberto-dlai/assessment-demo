// Results screen (SPEC §3.4).
// M0 placeholder — scoring and the per-question review are built in M4.

import { SCREENS } from "../state.js";
import { el, mountScreen, heading } from "./dom.js";
import { announce, focusHeading } from "../util/a11y.js";

export function renderResults(root, app) {
  const section = mountScreen(root, "results");

  const h1 = heading("Results");
  const note = el("p", "", "Scoring and per-question review arrive in M4.");

  const retake = el("button", "dl-btn dl-btn--primary", "Back to start");
  retake.type = "button";
  retake.addEventListener("click", () => app.go(SCREENS.INSTRUCTIONS));

  section.append(h1, note, retake);
  focusHeading(h1);
  announce("Results.", { assertive: true });
}
