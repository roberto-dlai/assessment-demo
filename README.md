# Assessment Demo

A static, single-page web app that delivers a multi-challenge assessment loaded
from JSON — five question types, free navigation, auto-advance, partial-credit
scoring, progress persistence, and a results view, styled to DeepLearning.AI's
brand.

See [`SPEC.md`](SPEC.md) for the full specification and [`PLAN.md`](PLAN.md) for
the milestone plan. This repo is being built milestone by milestone.

## Status

**M0 — Scaffold, data layer & infra: complete.** App shell + screen router,
seeded PRNG/shuffle utilities, and the assessment data layer (load → validate →
normalize → flatten, with stable item ids and a content fingerprint).

**M1 — Instructions screen: complete.** Full instructions screen (summary,
data-derived type legend, how-it-works), a persisted auto-advance toggle,
session-seed ownership (mint-or-restore, fingerprint-scoped), a safe
localStorage wrapper with in-memory fallback, and a GitHub Pages deploy
workflow. Quiz/results remain placeholders until M2–M4.

**Live:** https://roberto-dlai.github.io/assessment-demo/ (auto-deploys from
`main` via `.github/workflows/deploy-pages.yml`).

## Running locally

ES modules and `fetch()` are blocked under `file://`, so you **must** use a
local static server — don't open `index.html` directly.

```bash
# option A (Node)
npm run serve            # runs `npx serve .`

# option B (Python)
python3 -m http.server 8000
```

Then visit the printed URL (e.g. <http://localhost:8000>). Open the browser
console to see the parsed, flattened assessment logged (M0 acceptance).

## Tests

Pure modules (PRNG, shuffle, data normalization) are covered by Node's built-in
test runner — no dependencies:

```bash
npm test                 # node --test
```

Scoring tests arrive with M4.

## Project structure

```
index.html                 # entry; loads fonts, theme.css, styles, src/main.js
theme.css                  # DeepLearning.AI brand tokens
styles/app.css             # app layout/styles
data/
  spec-driven-development-assessment.json   # example assessment
src/
  main.js                  # bootstrap + screen router
  state.js                 # app state + screen keys
  data/loadAssessment.js   # load, validate, normalize, flatten, fingerprint
  util/prng.js             # mulberry32 seeded PRNG + helpers
  util/shuffle.js          # deterministic shuffles
  util/a11y.js             # announce() + focusHeading() live-region helpers
  screens/
    dom.js                 # shared el()/mountScreen()/heading() helpers
    instructions.js        # instructions / quiz / results / error
    quiz.js                #   (screens are placeholders until M1-M4)
    results.js
    error.js
test/
  util.test.js             # M0 unit tests (19)
```

All asset paths are **relative** so the app works from a GitHub Pages project
subpath (`/<repo>/`).

## Deployment

Static site — no backend. Intended for GitHub Pages. Publish source (Actions vs
`/docs`) is finalized in M1's early-deploy step (see `PLAN.md`).
