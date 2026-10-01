// App bootstrap + screen router (SPEC §9).
//
// Loads the assessment, restores any saved session (SPEC §7), wires auto-save,
// and routes between screens.

import { loadAssessment } from "./data/loadAssessment.js";
import { createApp, SCREENS } from "./state.js";
import { getOrCreateSeed, loadSession, saveSession, hasSavedProgress } from "./session.js";
import { renderInstructions } from "./screens/instructions.js";
import { renderQuiz } from "./screens/quiz.js";
import { renderResults } from "./screens/results.js";
import { renderError } from "./screens/error.js";

const root = document.getElementById("app");

const app = createApp(render);

function render(a) {
  switch (a.screen) {
    case SCREENS.QUIZ:
      return renderQuiz(root, a);
    case SCREENS.RESULTS:
      return renderResults(root, a);
    case SCREENS.ERROR:
      return renderError(root, a);
    case SCREENS.INSTRUCTIONS:
    default:
      return renderInstructions(root, a);
  }
}

async function boot() {
  try {
    const model = await loadAssessment();
    app.setModel(model);
    document.title = `${model.meta.capability_name} — Assessment`;

    // Own the shuffle seed (mint-or-restore) before first render.
    app.setSessionSeed(getOrCreateSeed(model.fingerprint));

    // Restore a saved session only if it has real progress (so an index-only
    // save from idle navigation doesn't drop a fresh start mid-quiz). Enable
    // auto-save AFTER hydrate so restoring doesn't immediately re-save.
    if (hasSavedProgress(model.fingerprint)) app.hydrate(loadSession(model.fingerprint));
    app.persist = (a) => saveSession(model.fingerprint, a.serialize());

    // A submitted session reloads straight to results; otherwise the instructions
    // screen offers Resume/Start-over when there's saved progress (SPEC §7/§3.1).
    app.go(app.submitted ? SCREENS.RESULTS : SCREENS.INSTRUCTIONS);
  } catch (err) {
    console.error("[assessment] failed to load:", err);
    app.fail(err);
  }
}

boot();
