// Error screen (SPEC §10): shows the failure message with a retry affordance.

import { el, mountScreen, heading } from "./dom.js";
import { announce, focusHeading } from "../util/a11y.js";

export function renderError(root, app) {
  const section = mountScreen(root, "error");
  const h1 = heading("Something went wrong");
  const msg = el("p", "", app.error ? app.error.message : "Unknown error.");

  const retry = el("button", "dl-btn dl-btn--primary", "Try again");
  retry.type = "button";
  // A reload re-runs boot() from a clean slate — the simplest reliable retry.
  retry.addEventListener("click", () => globalThis.location.reload());

  section.append(h1, msg, retry);
  focusHeading(h1);
  announce("Something went wrong loading the assessment.", { assertive: true });
}
