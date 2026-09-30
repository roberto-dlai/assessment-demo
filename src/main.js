// App bootstrap + screen router (SPEC §9).
//
// M0 deliverable: load the assessment from a relative path, log the parsed +
// flattened model, and route between the (placeholder) screens.

import { loadAssessment } from "./data/loadAssessment.js";
import { createApp, SCREENS } from "./state.js";
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

    // M0 acceptance: prove the parse + flatten worked.
    console.log("[assessment] loaded:", model.meta.capability_name);
    console.log("[assessment] fingerprint:", model.fingerprint);
    console.log("[assessment] counts:", model.counts);
    console.table(
      model.questions.map((q) => ({
        index: q.index,
        challenge: q.challengeNumber,
        id: q.id,
        type: q.type,
        points: q.points,
      }))
    );

    app.go(SCREENS.INSTRUCTIONS);
  } catch (err) {
    console.error("[assessment] failed to load:", err);
    app.fail(err);
  }
}

boot();
