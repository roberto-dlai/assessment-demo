# Project Plan — Assessment Tool

**Companion to:** `SPEC.md`
**Approach:** Build-free static app (HTML/CSS/vanilla JS ES modules), deployable to GitHub Pages. Vertical-slice milestones so there's a runnable app early, then depth per feature.

---

## Milestones

### M0 — Scaffold, data layer & infra decisions
Goal: repo runs locally (via a static server) and loads the assessment.
- [ ] Project structure (`index.html`, `/src`, `/styles`, `/data`, `theme.css` from brand skill). **All paths relative** (GitHub Pages subpath-safe).
- [ ] **Dev server documented** in README (`npx serve` / `python3 -m http.server`) — ES modules + `fetch()` fail under `file://`.
- [ ] **Decide test runner now:** `node --test` on pure scoring/util modules (zero-dep). Wire an empty test file so Definition of Done is enforceable.
- [ ] Google Fonts embed (Poppins, Open Sans); drop in brand tokens.
- [ ] `data/loadAssessment.js`: load + parse + validate shape; flatten challenges → global sequence; assign stable synthetic ids to every item; friendly error on malformed JSON.
- [ ] `mulberry32` seeded PRNG + shuffle helpers with per-question sub-seeds (§2.5).
- [ ] App shell + screen router (instructions / quiz / results).
**Deliverable:** app boots from a local server, logs a parsed, flattened assessment.

### M1 — Instructions screen + early deploy
- [ ] Render `capability_name`, `audience`, `estimated_duration` (marked "informational guide"), `lead_scenario`.
- [ ] Summary (challenge/question counts, total points, type legend).
- [ ] Start CTA → quiz; Resume/Start-over when saved state exists (stub until M5).
- [ ] **Throwaway GitHub Pages deploy of the skeleton** to shake out base-path/subpath issues early (decide publish source: Actions or `/docs`).
**Deliverable:** branded landing screen that launches the quiz, verified live on GitHub Pages.

### M2 — Quiz shell & navigation
- [ ] Question panel scaffold: challenge label, point badge, scenario header, prompt.
- [ ] Back/Next controls + global index management.
- [ ] Challenge-grouped horizontal navigator across the top (wraps on narrow screens) with jump-to + roving tabindex.
- [ ] Progress indicator (answered/total).
**Deliverable:** navigate an empty-answer quiz across all questions in any order.

### M3 — Question types (the core)
One vertical slice per type: render (shuffled) → capture answer → status → grade fn.
- [ ] `single_selection`.
- [ ] `multiple_selections` ("review before submitting" labeling).
- [ ] `grouping` (click-to-assign pool↔bins; bins labelled from `groups` keys).
- [ ] `matching` (assign right→left; **auto-match only on forward assignment leaving one pair**; announce it).
- [ ] `ordering` (up/down + drag; deterministic reshuffle-if-equal; move announcements).
- [ ] Shared `interacted`-flag + status logic (not-answered / in-progress / answered), shape+label icons (§6).
- [ ] Per-action announcements through the two `aria-live` regions (§4.6).
- [ ] Drag is additive-only over the click baseline; ≥24px targets.
- [ ] Widget lifecycle seam (mount-once-and-cache per question, rehydrate from `app.answers`) + per-type module registry (`render/isInteracted/isComplete/statusOf/score`).
**Deliverable:** every type fully answerable and individually gradable.

### M4 — Scoring & results
- [ ] Per-type scoring fns with partial credit (§5); unit-tested.
- [ ] Totals + per-challenge subtotals + percentage.
- [ ] Results screen: per-question correct/partial/incorrect, learner answer, **correct solution**, points, optional behavior tag.
- [ ] Submit confirmation modal (unanswered warning); Retake.
**Deliverable:** full submit → graded results flow.

### M5 — Persistence
- [ ] `localStorage` blob (answers, `interacted` flags, seed + **resolved orderings**, index, results, `submitted`, `schemaVersion`) namespaced by **content fingerprint**.
- [ ] try/catch all storage access; degrade to in-memory + notice when unavailable.
- [ ] Save on every answer/navigation; restore on load; Resume vs Start-over.
- [ ] Restore results screen after submit; discard on fingerprint/`schemaVersion` mismatch; Retake clears storage.
**Deliverable:** reload-safe progress and results.

### M6 — Brand polish, a11y, responsive, CI, deploy
- [ ] Apply full brand pass (one coral primary/screen, CTA semantics, type scale, compliant logo, voice/microcopy).
- [ ] Accessibility pass: keyboard paths, ARIA roles, **focus management (submit modal + navigator roving tabindex), `aria-live` behavior**, contrast AA (incl. point chip + all outcome/status signals verified with a checker), no color-only signaling; screen-reader run-through.
- [ ] Responsive pass: navigator wrapping, ≥24px touch targets, fluid type.
- [ ] Edge-case hardening (§10).
- [ ] Minimal **CI workflow** (run `node --test` scoring tests + lint on push).
- [ ] Finalize GitHub Pages deploy (source decided in M1); verify live on the subpath.
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
│  ├─ state.js              # in-memory state + localStorage sync
│  ├─ data/loadAssessment.js
│  ├─ util/prng.js, shuffle.js
│  ├─ screens/{instructions,quiz,results}.js
│  ├─ questions/{single,multi,grouping,matching,ordering}.js
│  └─ scoring/score.js
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
- **Highest-risk item:** accessible, touch-friendly grouping/matching/ordering. Mitigation: click-to-assign baseline first, drag as enhancement (M3), a11y verified in M6.
- **`file://` + base-path trap:** mitigated by requiring a dev server (M0), relative paths, and an early throwaway deploy (M1) — not deferring deploy to M6.
- **Answer-key exposure:** accepted per spec; revisit only if stakes change.

## Definition of done
All §11 acceptance criteria in `SPEC.md` pass, scoring unit tests green, and the app is live on GitHub Pages.
