// Quiz screen (SPEC §3.2).
// M0 placeholder — the question panel, navigator, controls, and per-type
// interactions are built in M2/M3. This proves routing into and out of the
// quiz screen works.

import { SCREENS } from "../state.js";

export function renderQuiz(root, app) {
  root.innerHTML = "";
  const section = document.createElement("section");
  section.className = "screen screen--quiz";

  const h = document.createElement("h1");
  h.textContent = "Quiz";
  h.tabIndex = -1;

  const note = document.createElement("p");
  note.textContent = `Question panel and navigator arrive in M2/M3. Loaded ${app.model.counts.questions} questions.`;

  const back = document.createElement("button");
  back.type = "button";
  back.className = "dl-btn dl-btn--secondary";
  back.textContent = "Back to instructions";
  back.addEventListener("click", () => app.go(SCREENS.INSTRUCTIONS));

  section.append(h, note, back);
  root.append(section);
  h.focus();
}
