// Assessment picker (shown when more than one assessment is available and none
// is selected via the ?a= URL param). Selecting one calls app.open(entry),
// wired by main.js.

import { el, mountScreen, heading } from "./dom.js";
import { focusHeading } from "./../util/a11y.js";

export function renderPicker(root, app) {
  const section = mountScreen(root, "picker");
  const h1 = heading("Choose an assessment");
  section.append(h1, el("p", "screen__lead", "Select an assessment to begin."));

  const list = el("ul", "picker__list");
  list.setAttribute("aria-label", "Available assessments");
  for (const entry of app.assessments) {
    const li = el("li", "picker__item");
    const card = el("button", "picker__card");
    card.type = "button";
    card.append(el("span", "picker__title", entry.title));
    if (entry.description) card.append(el("span", "picker__desc", entry.description));
    card.addEventListener("click", () => app.open(entry));
    li.append(card);
    list.append(li);
  }
  section.append(list);
  focusHeading(h1);
}
