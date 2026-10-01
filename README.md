# Assessment Demo

A static, single-page web app that delivers a multi-challenge assessment loaded
from JSON — five question types, free navigation, partial-credit
scoring, progress persistence, and a results view, styled to DeepLearning.AI's
brand.

See [`SPEC.md`](SPEC.md) for the full specification and [`PLAN.md`](PLAN.md) for
the milestone plan. This repo is being built milestone by milestone.

## Status

**M0 — Scaffold, data layer & infra: complete.** App shell + screen router,
seeded PRNG/shuffle utilities, and the assessment data layer (load → validate →
normalize → flatten, with stable item ids and a content fingerprint).

**M1 — Instructions screen: complete.** Full instructions screen (summary,
data-derived type legend, how-it-works), session-seed ownership
(mint-or-restore, fingerprint-scoped), a safe localStorage wrapper with
in-memory fallback, and a GitHub Pages deploy workflow.

**M2 — Quiz shell & navigation: complete.** Keyed state-mutation API
(currentIndex/answers/interacted/resolvedOrderings, patched in place — no
full re-render), question panel (scenario banner, challenge/point meta,
prompt), Back/Next + a compact full-width horizontal navigator (grouped by
challenge, roving tabindex, status icons, jump-to), and a progress indicator.
**M3 — Question types: core complete.** Per-type module registry
(`src/questions/*`) with a uniform `render`/`statusOf`/`score` interface, mounted
through a lazy mount-once-and-cache widget lifecycle in the quiz screen
(answers rehydrate from `app.answers` on revisit). All five types are
interactive: single/multi-select (radios/checkboxes); grouping (group bins + an
"unplaced" chip pool, click-to-place); matching (two columns — items vs options
— click-to-match, one-to-one, auto-matches the final pair); and ordering (move
up/down). All click-to-select-then-place — no native drag, so it's keyboard- and
touch-operable. Per-type status (not-answered / in-progress / answered) and
partial-credit scoring are implemented and unit tested.

**M4 — Scoring & results: complete.** Submit appears on the last question and
opens a confirmation modal (warns about incomplete questions; focus-trapped,
Escape/backdrop to cancel). On confirm, `scoring.js` grades every question
(delegating to the per-type `score`), rolls up totals, percentage, and
per-challenge subtotals, and the results screen shows a score summary plus a
per-question review (your answer, the canonical correct answer, and outcome as
shape+label — ✓ correct / ◐ partial / ✕ incorrect / ○ not answered). Retake
clears state and returns to the start. Persistence of progress/results across
reloads is M5.

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
  state.js                 # app state + in-quiz answer state (status via registry)
  session.js               # per-assessment session seed (fingerprint-scoped)
  data/loadAssessment.js   # load, validate, normalize, flatten, fingerprint
  util/prng.js             # mulberry32 seeded PRNG + helpers
  util/shuffle.js          # deterministic shuffles
  util/storage.js          # safe localStorage wrapper (in-memory fallback)
  util/a11y.js             # announce / focusHeading / createFocusTrap
  questions/               # per-type modules: render / statusOf / score
    registry.js            #   type -> module
    single.js  multi.js  grouping.js  matching.js  ordering.js
  screens/
    dom.js                 # shared el()/mountScreen()/heading() helpers
    instructions.js  quiz.js  results.js  error.js
test/
  util.test.js  state.test.js  persistence.test.js  questions.test.js  (42 tests)
```

All asset paths are **relative** so the app works from a GitHub Pages project
subpath (`/<repo>/`).

## Deployment

Static site — no backend. Intended for GitHub Pages. Publish source (Actions vs
`/docs`) is finalized in M1's early-deploy step (see `PLAN.md`).
