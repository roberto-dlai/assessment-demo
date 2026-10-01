# Assessment Tool — Product & Technical Spec

**Status:** Draft v1
**Source:** Derived from `prompt.md` and `spec-driven-development-assessment.json`
**Last updated:** 2026-09-30

---

## 1. Overview

A static, single-page web app that delivers a multi-challenge assessment loaded from a JSON file. It supports five question types, free navigation between questions, per-question point display, progress persistence across reloads, and a post-submission results view — all styled to DeepLearning.AI's brand.

**Non-goals:** authoring UI, user accounts/auth, a backend/API, server-side grading, analytics dashboards, multi-assessment libraries. The app loads one assessment JSON and runs it.

### 1.1 Confirmed decisions

| Topic | Decision |
|---|---|
| Scoring | 1 point per question, with **partial credit** on compound types (see §5) |
| Answer-key exposure | **Accept the risk** — load the JSON as-is client-side; suitable for low-stakes/self-assessment |
| Persistence | **Yes** — save answers + position to `localStorage`, restore on reload |
| Challenge/scenario UI | **Scenario header + grouped navigator** — each challenge's scenario heads its questions; the navigator groups questions by challenge |
| Accessibility | WCAG 2.1 AA (default) |
| Mobile | Responsive; full touch support (default) |
| Timing | No time limit (default); `estimated_duration` shown as an informational guide only |
| Editing answers | Editable until final submission (default) |

---

## 2. Data model

The app consumes the schema exemplified by `spec-driven-development-assessment.json`.

### 2.1 Assessment (top level)

| Field | Used by app | Purpose |
|---|---|---|
| `capability_name` | ✅ | Title on instructions screen + header |
| `audience` | ✅ | Shown on instructions screen |
| `estimated_duration` | ✅ | Shown on instructions screen |
| `lead_scenario` | ✅ | Framing text on instructions screen |
| `status` | ➖ | Ignored by runtime |
| `skills_framework` | ➖ | Ignored by runtime (authoring metadata) |
| `proficiency_level_descriptors` | ➖ | Ignored by runtime (authoring metadata) |
| `challenges[]` | ✅ | The quiz content |

### 2.2 Challenge

```
{ challenge_number: int, scenario: string, questions: Question[] }
```

Questions are flattened into a single global sequence for Back/Next, but the navigator and headers preserve challenge grouping. Global question index is derived by walking challenges in array order.

### 2.3 Question (common fields)

```
{ id: string, type: string, behavior: string, prompt: string, ... }
```

`type` is the authoritative discriminator. `behavior` is not shown to the learner during the quiz (it may appear in results as a learning tag — optional). Every question is worth **1 point**.

### 2.4 Per-type payloads

| `type` | Payload | Correct-answer source |
|---|---|---|
| `single_selection` | `options: [{label, correct}]` | the option with `correct: true` |
| `multiple_selections` | `options: [{label, correct}]` | all options with `correct: true` |
| `grouping` | `groups: { <groupName>: [item, …] }` | each item's owning group. **Bin labels = the keys of the `groups` object; an item's correct bin = the key it is listed under.** Groups may be uneven in size (e.g., 3 vs 2) and there may be 2+ of them. |
| `matching` | `pairs: [{left, right}]` | the given left↔right pairing |
| `ordering` | `correct_order: [item, …]` | the array order |

### 2.5 Presentation shuffling

To avoid revealing answers through ordering, the app shuffles on load. Determinism rules (so a reload reproduces the exact layout — see §7):

- Use a **named, seeded PRNG** (`mulberry32`); never `Math.random()` (unseedable).
- Derive a **per-question sub-seed** deterministically from `sessionSeed + question.id`, so each question's shuffle is stable and independent of the order questions are loaded or graded.
- Every renderable item (option/pool item/left row/right value/ordering item) carries a **stable synthetic id** (`challenge#-question#-originalIndex`), and all assign/score/render logic keys off that id — never off the label text. This prevents duplicate-label collisions.

Per type:
- **single/multiple selection:** shuffle `options`.
- **grouping:** collect all items across groups into one shuffled pool; render empty group bins (labelled from the `groups` keys).
- **matching:** render `left` values in a fixed column; shuffle the `right` values as the assignable pool.
- **ordering:** render items in a shuffled order **guaranteed ≠ `correct_order`**; the reshuffle-if-equal retry advances the seeded PRNG deterministically (so restore reproduces the same resolved order). The **resolved post-reshuffle order is persisted**, not just the seed, so restore can never diverge from the reshuffle rule.

> ⚠️ **Answer-key note:** Correct answers are present in the loaded JSON and therefore visible to anyone inspecting browser tools. This is accepted for the intended low-stakes use. If stakes rise, revisit: split/obfuscate the key or grade server-side.

---

## 3. Screens & flow

```
Instructions ──▶ Quiz (question N of M) ──▶ Submit confirm ──▶ Results
                     ▲         │
                     └─ navigator / Back / Next ─┘
```

### 3.1 Instructions screen (pre-quiz)
- Assessment title (`capability_name`), `audience`, `estimated_duration`.
- `lead_scenario` as framing narrative.
- Summary: number of challenges, number of questions, total points, question-type legend.
- How-it-works notes: free navigation, answers editable until submit, progress saved.
- Primary CTA: **Start assessment** (coral). If saved progress exists, offer **Resume** (coral) + **Start over** (teal/secondary).

### 3.2 Quiz screen (during)
Layout: a horizontal question navigator across the top of the quiz, with the question panel below it. The navigator wraps to more rows on narrow screens (no horizontal scroll).

- **Challenge scenario header** above the first question of each challenge (and shown as context on each question within that challenge, e.g., a persistent banner).
- **Question panel:** challenge label (e.g., "Challenge 2 · Question 2 of 3"), point value badge ("1 point"), the `prompt`, and the type-specific interaction (§4).
- **Controls:** Back (left) and the forward action on the right — **Next** on every question except the last, where **Submit** replaces it. Submit confirms if unanswered questions remain (§3.3). The navigator still lets the learner jump anywhere, so reaching the last question to submit is always one click away.
- **Navigator:** grouped by challenge; each entry is a real `<button>` showing question number + status icon (§6) + an `aria-label` naming the state; `aria-current="true"` marks the active question. Activating an entry jumps to that question and **moves focus to the target question's heading** (not into an input).
- **Navigator keyboard model:** the navigator is a single tab stop (roving tabindex) whose tabbable button is the current question; Arrow keys (and Home/End) move between question buttons, so Tab reaches the question panel in one step.
- Progress indicator: answered count / total.

### 3.3 Submit confirmation
- Modal summarizing answered vs unanswered counts; warns if any are unanswered. **Submit** (coral) / **Keep working** (teal).
- `role="dialog" aria-modal="true"`; focus moves to the modal on open and is trapped within it; Escape triggers **Keep working**; on close, focus returns to the Submit button that invoked it.

### 3.4 Results screen (after)
- Score summary: total points earned / total, percentage, per-challenge subtotals.
- Per-question cards: the prompt, the learner's answer, the outcome, the **correct solution**, points earned, and optional `behavior` tag.
- **Outcome is shown with a shape + text label, never color alone** (§6): ✓ "Correct", ◐ "Partial — 2 of 3 (0.67 pt)", ✕ "Incorrect", ○ "Not answered". Color is a secondary reinforcement.
- The **correct solution renders canonically from the source data**, independent of the session shuffle (e.g., `correct_order` in true order, `pairs` in their given pairing) — never in shuffled positions.
- Supportive microcopy for incorrect/partial states ("Here's the reasoning"), never at the learner's expense.
- Actions: **Review by challenge** (jump to any question's result), **Retake** (clears storage, returns to instructions).
- Read-only.

---

## 4. Question-type interactions

Interaction is **click/tap-to-assign only** — keyboard- and touch-friendly, AA-accessible. Drag-and-drop is **not implemented**; if ever added it must be additive-only (every action stays click-operable, with identical state/announcements and ≥24×24px targets, aim 44×44px).

Every meaningful action is announced to assistive tech via `aria-live` (§4.6): "Placed X in bin Y", "Matched A with B", "Moved 'X' to position 3 of 5".

- **single_selection:** radio-style list; selecting one clears the other.
- **multiple_selections:** checkbox-style list; toggle any number. See the "in progress" status in §6.
- **grouping:** group bins shown **above** a boxless "unplaced" pool of loose chips. Click an item chip to select it, then click a group to place it — the **whole group box is a click target** (its centered title is the keyboard-focusable control). Each placed chip shows a corner **×** to remove it back to the pool. Answered when all items are placed.
- **matching:** two columns — items on the left, options on the right. Click an item on either side, then click its match on the other side; matched pairs show a shared number badge on both columns, with a corner **×** on a matched left to unmatch. Right values are one-to-one (re-using one frees its old pair).
  - **Auto-match final pair:** fires only on a *forward assignment* that leaves exactly one left row and one right value unmatched; the app then matches them and announces it ("Last pair matched automatically: X with Y").
  - ⚠️ Auto-match completes whatever remains — if earlier assignments were wrong, the forced last pair may also be wrong. The learner can un-assign and re-edit any pair before submitting; the correctness is graded normally (§5).
- **ordering:** a vertical list the learner reorders with move up/down buttons (up disabled on first item, down on last). The learner advances via Next.

> **No auto-advance.** The learner always advances explicitly with Back/Next or the navigator; answering a question never moves them automatically. (This reverses the original `prompt.md` requirement, per a later decision.)

### 4.6 Live-region announcements
Two `aria-live` regions to avoid flooding vs. missing messages:
- `polite` — navigation ("Question 4 of 17. Challenge 2.") and incremental status ("3 of 6 placed"), debounced.
- `assertive` — completion/system events: "Question complete", auto-match.

---

## 5. Scoring

Each question is worth **1 point**. `questionScore ∈ [0, 1]`.

- **single_selection:** `1` if the selected option is the correct one, else `0`.
- **multiple_selections:** `clamp01((selectedCorrect − selectedIncorrect) / totalCorrect)`, where `selectedCorrect` = correct options chosen, `selectedIncorrect` = distractors chosen, `totalCorrect` = count of correct options. All-correct-and-none-wrong ⇒ 1; scoring never goes negative.
  - *Worked example (Q4.3: 3 correct of 5).* Pick all 3 correct, no wrong → `(3−0)/3 = 1.0`. Pick 2 correct, 0 wrong → `0.67`. Pick 3 correct + 1 wrong → `(3−1)/3 = 0.67`. **Select all 5** → `(3−2)/3 = 0.33` (deliberate anti-guessing behavior). Pick only distractors → clamped to `0`.
- **grouping:** `itemsInCorrectGroup / totalItems`.
- **matching:** `correctPairs / totalPairs`.
- **ordering:** `itemsInCorrectAbsolutePosition / totalItems`. Absolute-position is chosen for transparency (learners can see exactly which slots were right); it does penalize a single early insertion more than an adjacency/Kendall-tau metric would — accepted for this low-stakes use.

Totals: `totalEarned = Σ questionScore`; `totalPossible = number of questions`. Percentage = `round(totalEarned / totalPossible × 100)`. Per-challenge subtotals computed the same way over that challenge's questions.

A question counts as **correct** in results when `questionScore === 1`, **partial** when `0 < score < 1`, **incorrect** when `0`.

---

## 6. Question status states

Each question tracks an explicit **`interacted` boolean**, stored separately from the answer payload. Status is derived from `interacted` + completeness — never inferred from the payload alone (so an ordering question returned to its shuffled start, or a cleared selection, reads correctly).

Every state is conveyed by **shape + text label**, not color alone (color is secondary reinforcement). Shapes must be distinguishable in greyscale — hollow vs. half vs. full:

| State | Shape | `aria-label` | Color | Definition |
|---|---|---|---|---|
| Not answered | ○ hollow | "not answered" | muted grey | no answer recorded |
| In progress | ◐ half | "in progress" | teal | grouping partially placed, or matching partially matched |
| Answered | ● filled dot | "answered" | teal | single selected; multi ≥1 selected; grouping all placed; matching all matched; ordering reordered |

- **Multiple-selections** shows **Answered** once ≥1 option is selected, but its `aria-label` reads "answered — multi-select, review before submitting". It never claims completeness we can't verify.
- Status is derived from the answer payload (via the per-type `statusOf`); the **submit unanswered-warning** (§3.3) flags any question whose status is **not-answered**.
- The "answered" icon required by `prompt.md` = the ● filled-dot state (colored teal).

---

## 7. Persistence

- Store to `localStorage` under a key namespaced by an **assessment content fingerprint** — a hash of the challenges' question `id`s, `type`s, and option/item text — **not** by title or question count (which collide and miss content drift). Stored blob carries an explicit `schemaVersion`.
- Blob contents: per-question answers, per-question `interacted` flags, the session seed **and the resolved post-reshuffle orderings**, current question index, results, and a `submitted` flag.
- On load: if state exists for this fingerprint, offer Resume; otherwise start fresh.
- Persisting the resolved orderings (not just the seed) guarantees restore reproduces the exact layout and never conflicts with the reshuffle-if-equal rule (§2.5).
- On **Submit**, persist results + `submitted: true` so a reload returns to the results screen.
- **Retake / Start over** clears the key.
- **Drift guard:** on load, if the stored fingerprint or `schemaVersion` doesn't match, discard stored state and start fresh.
- **Availability guard:** wrap all `localStorage` access in try/catch (Safari private mode and disabled-storage throw). On failure, fall back to in-memory-only state and show a non-blocking notice that progress won't be saved.

---

## 8. Design (DeepLearning.AI brand)

Follow the brand skill; use `theme.css` tokens rather than hardcoded hex.

- **Color:** white backgrounds; **coral `#F65B66`** for primary CTAs. **teal `#237B94`** for secondary actions, featured/scenario banners (white text on teal, ~4.9:1 ✓), the active navigator highlight, selected options, and the answered status dot. Blue `#1C74EB` for links (~4.4:1 ✓).
  - **Contrast rules (AA is a hard requirement):** coral on white is ~3.0:1 — use it **only for solid fills and large/icon elements, never small coral text or hairline glyphs**. Never use yellow `#FAB901` as text or a small glyph (~1.6:1 — fails). Teal `#237B94` (~4.9:1) is fine for the small status dot and selection rings.
  - **Outcome colors** reinforce the shape+label (§3.4/§6), never stand alone: correct = **teal** (not off-palette green); partial = an amber chip with a **dark glyph/label** (never yellow text); incorrect = **magenta `#DD3C66`** (reserved for "incorrect" so it stays distinct from coral's CTA/answered meaning).
- **Typography:** Poppins (500/600) for headings, question prompts, CTAs; Open Sans (400/600) for body and options. Maintain headline ≈ 2× body hierarchy; scale fluidly.
- **Voice:** friendly, encouraging, succinct. Motivate ("Nice work — here's how you did"); for incorrect/partial, explain the reasoning supportively, never at the learner's expense.
- **Logo:** coral horizontal lockup on white header — **one color only, must read "DeepLearning.AI" (D/L/AI capitalized), no effects/distortion/recolor**. Placeholder until the official asset is provided.
- **Components:** rounded cards, soft tint-circle icons, generous spacing. **Point badge** = a light-teal chip whose fill/text pairing clears **AA ≥4.5:1** (the brand's default `.dl-tag` `#164C59` on `#32AFCC` is only ~3.2:1 at 13px — use a lighter fill or ≥18.66px bold text instead). One coral primary action per screen. Contrast AA throughout.

---

## 9. Technical approach

- **Stack:** static HTML + CSS + vanilla JS (ES modules). No backend. A light build (Vite) is optional but not required; keep it build-free for simplest deploy.
- **No heavy framework** given the app's size; state is a single in-memory object mirrored to `localStorage`.
- **`file://` trap:** ES modules and `fetch()` are both blocked under `file://`. **Dev requires a local static server** (`python3 -m http.server` or `npx serve`) — documented in the README and M0. (To be `file://`-proof and truly zero-dependency, the assessment may instead be embedded as an ES module `export const assessment = {…}`; either choice is acceptable but must be stated.)
- **Base paths:** GitHub Pages serves from a `/<repo>/` subpath, so **all asset/data paths must be relative** — never root-absolute (`/data/...`) — or they 404 live while working locally.
- **Data loading:** load the assessment JSON via `fetch()` (or the embedded module above). Filename/path configurable via a constant, relative.
- **Accessibility:** semantic HTML, ARIA roles for custom controls, full keyboard operation (Tab/arrow/Enter/Space), visible focus, focus management for the submit modal and the navigator (roving tabindex, §3.2/§3.3), and click-to-assign as the accessible baseline for grouping/matching/ordering. **Two `aria-live` regions** (§4.6): `polite` for navigation + debounced incremental status, `assertive` for completion/system events.
- **Responsive:** single-column layout; the horizontal top navigator wraps to more rows on narrow screens. Touch targets ≥24px (aim 44px).
- **Randomness:** named seeded PRNG (`mulberry32`); per-question sub-seeds from `sessionSeed + question.id` (§2.5). No `Math.random()`.
- **Browser support:** modern evergreen browsers (Chrome/Edge/Firefox/Safari); no IE, no transpile — which justifies the no-build stance.
- **No external runtime dependencies** and no drag library — click-to-assign is the only interaction. (Any future drag enhancement must degrade to this click baseline.)

---

## 10. Edge cases

- Unanswered questions at submit → counted as 0, flagged in the confirm modal and results.
- Matching with unequal left/right lengths → treat as data error; log and fall back to manual matching (no auto-match). Invariant assumed: equal lengths.
- Grouping item belonging to no group / duplicate labels → every item is keyed by a **stable synthetic id** (§2.5) end-to-end (render/assign/score), so identical labels never collide.
- Ordering shuffle accidentally equal to `correct_order` → reshuffle **deterministically** (advance the seeded PRNG, never unseeded random) so restore reproduces it.
- Matching auto-match can lock in a wrong final pair if earlier pairs were wrong → learner may un-assign/re-edit before submit; graded normally (§4, §5).
- Empty challenge (no questions) → skipped in navigation.
- Malformed/missing JSON → friendly error screen with retry.
- Reload after submit → results screen restored.
- Stored state from a different assessment version → discarded (§7).

---

## 11. Acceptance criteria

1. All five types render, accept input, and grade per §5.
2. Back/Next and the challenge-grouped navigator allow reaching any question in any order.
3. Each question shows its point value and a live status icon conveyed by **shape + text label** (not color alone), driven by the `interacted` flag (§6).
4. Matching auto-matches the final pair **only on a forward assignment leaving one pair** and grades the result normally (§4).
5. Progress, `interacted` flags, and the resolved shuffle orderings survive reload; results survive reload after submit; state is discarded on fingerprint/`schemaVersion` mismatch and degrades gracefully when `localStorage` is unavailable.
6. Results show correct/partial/incorrect (shape + label), points, and the **canonical** correct solution for every question.
7. Instructions screen renders from the assessment-level fields.
8. UI passes WCAG 2.1 AA: contrast (incl. point chip and all outcome/status signals), full keyboard operation, focus management for the submit modal and navigator (roving tabindex), `aria-live` announcements, and click-to-assign as the accessible baseline with ≥24px targets. Works on mobile.
9. On-brand: coral/teal usage with one coral primary per screen, Poppins/Open Sans, correct CTA semantics, compliant logo.
10. Uses relative paths and runs correctly from a GitHub Pages subpath; deploys as a static site with no backend.
