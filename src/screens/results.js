// Results screen (SPEC §3.4).
// M0 placeholder — scoring and the per-question review are built in M4.

import { SCREENS } from "../state.js";

export function renderResults(root, app) {
  root.innerHTML = "";
  const section = document.createElement("section");
  section.className = "screen screen--results";

  const h = document.createElement("h1");
  h.textContent = "Results";
  h.tabIndex = -1;

  const note = document.createElement("p");
  note.textContent = "Scoring and per-question review arrive in M4.";

  const retake = document.createElement("button");
  retake.type = "button";
  retake.className = "dl-btn dl-btn--primary";
  retake.textContent = "Back to start";
  retake.addEventListener("click", () => app.go(SCREENS.INSTRUCTIONS));

  section.append(h, note, retake);
  root.append(section);
  h.focus();
}
