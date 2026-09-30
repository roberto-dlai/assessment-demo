// Error screen (SPEC §10). M0: shows the failure message.
// M6 will add a retry affordance that re-invokes boot().

import { el, mountScreen, heading } from "./dom.js";
import { announce, focusHeading } from "../util/a11y.js";

export function renderError(root, app) {
  const section = mountScreen(root, "error");
  const h1 = heading("Something went wrong");
  const msg = el("p", "", app.error ? app.error.message : "Unknown error.");
  section.append(h1, msg);
  focusHeading(h1);
  announce("Something went wrong loading the assessment.", { assertive: true });
}
