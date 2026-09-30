You are a senior product engineer helping me write a detailed spec for a web-based assessment tool.

## Goal
Build a static web app, deployable to GitHub Pages (or a similarly simple host), that delivers an assessment/quiz.

## Question types
The tool must support the following types. Key off the exact `type` string in the data so nothing is lost in translation:
- `single_selection` — multiple choice, one correct answer
- `multiple_selections` — multiple choice, one or more correct answers (note the plural in the data)
- `grouping` — sort items into named categories
- `matching` — pair items from a left list with items from a right list
- `ordering` — arrange items into the correct sequence

See `spec-driven-development-assessment.json` for example questions of each type. Treat it as an *example* of the data format (one of potentially many assessments), not the only content the app must ever load. Use it to infer the schema and edge cases.

## Data format
Read the JSON carefully before writing the spec, and account for its actual shape:

- **Hierarchy.** The assessment is not a flat list of questions. It is a set of `challenges`, each with its own narrative `scenario`, and each challenge contains 2–3 `questions`. The spec must decide how challenges and their scenarios appear in the UI (e.g., scenario shown as a header for its group of questions, and whether the question navigator groups by challenge).
- **Assessment-level fields.** `capability_name`, `audience`, `estimated_duration`, and `lead_scenario` exist at the top level. Decide which of these feed the pre-quiz instructions screen.
- **Embedded answer keys.** Correct answers live in the data itself: `correct: true/false` on options, the grouped items under `grouping`, the `pairs` for `matching`, and `correct_order` for `ordering`. If the app loads this file client-side, the answer key is visible in the browser (view-source / network tab). The spec must address this trade-off — at minimum call it out; ideally propose an approach (obfuscation, a split answer key, or an accepted risk for low-stakes use).
- **Points.** The current data has **no** points/weight field on questions. The spec must resolve this: either define a points field to add to the data format, or specify how points are derived (e.g., per type, or a flat value). Do not silently assume a scheme.
- **Matching invariant.** Assume `matching` questions have equal-length left and right lists (the examples do). State this invariant, since the "auto-match the final remaining pair" behavior depends on it.

## Requirements
**Before the quiz**
- A pre-quiz instructions screen (specify what content it shows and where that content comes from)

**During the quiz**
- Back and Next buttons
- A way to jump to any question in any order (e.g., a question navigator)
- An icon marking each question as answered — define what counts as "answered" for each type (especially the compound types: multi-select, grouping, matching, ordering)
- Auto-advance to the next question once a question is answered — define the trigger consistently with the "answered" definition above, and specify behavior for compound types where completion is gradual
- For matching questions, automatically match the final remaining pair once all others are matched
- Each question should display its point value (resolve the points question above first)

**After submission**
- A results view showing which questions were answered correctly or incorrectly
- The correct solution for every question

**Design**
- Follow DeepLearning.AI's brand guidelines (colors, typography, UI patterns)

## How to work with me
Don't write the spec yet. First, ask me clarifying questions about anything ambiguous or unspecified. Cover at least:
- **Data & authoring** — how questions are authored and loaded; whether the challenge/scenario grouping drives the UI; how the missing points field should be handled; how much the exposed-answer-key risk matters
- **Scoring** — partial credit rules for grouping/matching/ordering and multi-select; how points roll up
- **Flow & state** — whether answers can be changed after auto-advance; what counts as "answered" per type; timing/time limits
- **Persistence** — whether progress survives a page reload
- **Accessibility & mobile** — keyboard/screen-reader support for drag-style interactions; touch/mobile support

Group your questions by topic, and suggest a sensible default for each so I can just confirm. Once I've answered, write the full spec.
