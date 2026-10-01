# Project Plan — Assessment Tool

**Companion to:** `SPEC.md`
**Status:** ✅ M0–M6 all shipped and deployed (live on GitHub Pages; CI green).
**Approach:** Build-free static app (HTML/CSS/vanilla JS ES modules), deployable to GitHub Pages. Vertical-slice milestones so there's a runnable app early, then depth per feature.

---

## Milestones

### M0 — Scaffold, data layer & infra decisions
Goal: repo runs locally (via a static server) and loads the assessment.
- [x] Project structure (`index.html`, `/src`, `/styles`, `/data`, `theme.css` from brand skill). **All paths relative** (GitHub Pages subpath-safe).
- [x] **Dev server documented** in README (`npx serve` / `python3 -m http.server`) — ES modules + `fetch()` fail under `file://`.
- [x] **Decide test runner now:** `node --test` on pure scoring/util modules (zero-dep). Wire an empty test file so Definition of Done is enforceable.
- [x] Google Fonts embed (Poppins, Open Sans); drop in brand tokens.
- [x] `data/loadAssessment.js`: load + parse + validate shape; flatten challenges → global sequence; assign stable synthetic ids to every item; friendly error on malformed JSON.
- [x] `mulberry32` seeded PRNG + shuffle helpers with per-question sub-seeds (§2.5).
- [x] App shell + screen router (instructions / quiz / results).
**Deliverable:** app boots from a local server, logs a parsed, flattened assessment.

### M1 — Instructions screen + early deploy
- [x] Render `capability_name`, `audience`, `estimated_duration` (marked "informational guide"), `lead_scenario`.
- [x] Summary (challenge/question counts, total points, type legend).
- [x] Start CTA → quiz; Resume/Start-over when saved state exists (stub until M5).
- [x] **Throwaway GitHub Pages deploy of the skeleton** to shake out base-path/subpath issues early (decide publish source: Actions or `/docs`).
**Deliverable:** branded landing screen that launches the quiz, verified live on GitHub Pages.

### M2 — Quiz shell & navigation
- [x] Question panel scaffold: challenge label, point badge, scenario header, prompt.
- [x] Back/Next controls + global index management.
- [x] Challenge-grouped horizontal navigator across the top (wraps on narrow screens) with jump-to + roving tabindex.
- [x] Progress indicator (answered/total).
**Deliverable:** navigate an empty-answer quiz across all questions in any order.

### M3 — Question types (the core)
One vertical slice per type: render (shuffled) → capture answer → status → grade fn.
- [x] `single_selection`.
- [x] `multiple_selections` ("review before submitting" labeling).
- [x] `grouping` (click-to-assign pool↔bins; bins labelled from `groups` keys).
- [x] `matching` (assign right→left; **auto-match only on forward assignment leaving one pair**; announce it).
- [x] `ordering` (move up/down; deterministic reshuffle-if-equal; move announcements).
- [x] Shared status logic derived from the answer payload (not-answered / in-progress / answered), shape+label icons (§6).
- [x] Per-action announcements through the two `aria-live` regions (§4.6).
- [x] Click-to-assign is the sole (accessible) interaction for grouping/matching/ordering; ≥24px targets. (No drag.)
- [x] Widget lifecycle seam (mount-once-and-cache per question, rehydrate from `app.answers`) + per-type module registry (`render/statusOf/score`, plus `describeSolution/describeAnswer` for the results review).
**Deliverable:** every type fully answerable and individually gradable.

### M4 — Scoring & results
- [x] Per-type scoring fns with partial credit (§5); unit-tested.
- [x] Totals + per-challenge subtotals + percentage.
- [x] Results screen: per-question correct/partial/incorrect, learner answer, **correct solution**, points, optional behavior tag.
- [x] Submit confirmation modal (unanswered warning); Retake.
**Deliverable:** full submit → graded results flow.

### M5 — Persistence
- [x] `localStorage` blob (answers, **resolved orderings**, index, `submitted`, `schemaVersion`) namespaced by **content fingerprint**; the seed lives in its own key and results are recomputed from answers on restore.
- [x] try/catch all storage access; degrade to in-memory + notice when unavailable.
- [x] Save on every answer/navigation; restore on load; Resume vs Start-over.
- [x] Restore results screen after submit; discard on fingerprint/`schemaVersion` mismatch; Retake clears storage.
**Deliverable:** reload-safe progress and results.

### M6 — Brand polish, a11y, responsive, CI, deploy
- [x] Apply full brand pass (one coral primary/screen, CTA semantics, type scale, compliant logo, voice/microcopy).
- [x] Accessibility pass: keyboard paths, ARIA roles, **focus management (submit modal + navigator roving tabindex), `aria-live` behavior**, contrast AA (incl. point chip + all outcome/status signals verified with a checker), no color-only signaling; screen-reader run-through.
- [x] Responsive pass: navigator wrapping, ≥24px touch targets, fluid type.
- [x] Edge-case hardening (§10).
- [x] Minimal **CI workflow** (run `node --test` scoring tests + lint on push).
- [x] Finalize GitHub Pages deploy (source decided in M1); verify live on the subpath.
**Deliverable:** on-brand, accessible, CI-guarded, deployed app.

---

## Suggested file structure
```
/
├─ index.html
├─ theme.css                # from brand skill
├─ styles/                  # layout + component styles
├─ data/
│  └─ spec-driven-development-assessment.json
├─ src/
│  ├─ main.js               # bootstrap + router
│  ├─ state.js              # app + in-quiz state; serialize/hydrate
│  ├─ session.js            # per-assessment seed + session blob (fingerprint-scoped)
│  ├─ scoring.js            # grade(app): totals, per-challenge subtotals, outcomes
│  ├─ data/loadAssessment.js
│  ├─ util/{prng,shuffle,storage,a11y}.js
│  ├─ screens/{dom,instructions,quiz,results,modal,error}.js
│  └─ questions/{registry,single,multi,grouping,matching,ordering}.js
├─ .github/workflows/       # ci.yml (tests) + deploy-pages.yml
└─ SPEC.md / PLAN.md / prompt.md
```

## Testing
- `node --test` on pure scoring/PRNG modules: all types, partial-credit boundaries (incl. multi-select select-all = 0.33, clamp-to-zero), seeded-shuffle reproducibility.
- Manual matrix: each type × {answer correctly, partially, skip} → results.
- **Matching:** auto-match only on forward last assignment; wrong earlier pair grades correctly.
- Reload at each stage (mid-quiz, post-submit) reproduces exact layout; `localStorage`-disabled fallback.
- Keyboard-only + screen-reader smoke test (focus lands on headings, announcements fire).
- Cross-device: desktop + mobile widths; GitHub Pages subpath live check.

## Sequencing & risks
- **Critical path:** M0 → M2 → M3 → M4. M1/M5/M6 can overlap once the shell exists.
- **Highest-risk item:** accessible, touch-friendly grouping/matching/ordering. Mitigation: click-to-assign is the sole interaction (no drag); a11y verified in M6.
- **`file://` + base-path trap:** mitigated by requiring a dev server (M0), relative paths, and an early throwaway deploy (M1) — not deferring deploy to M6.
- **Answer-key exposure:** accepted per spec; revisit only if stakes change.

## Definition of done
All §11 acceptance criteria in `SPEC.md` pass, scoring unit tests green, and the app is live on GitHub Pages.
