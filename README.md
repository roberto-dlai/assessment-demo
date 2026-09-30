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
normalize → flatten, with stable item ids and a content fingerprint) are in
place. Screens are placeholders until M1–M4.

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
  screens/                 # instructions / quiz / results (placeholders for now)
test/
  util.test.js             # M0 unit tests
```

All asset paths are **relative** so the app works from a GitHub Pages project
subpath (`/<repo>/`).

## Deployment

Static site — no backend. Intended for GitHub Pages. Publish source (Actions vs
`/docs`) is finalized in M1's early-deploy step (see `PLAN.md`).
