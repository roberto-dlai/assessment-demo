// Minimal app state + screen routing (SPEC §3 flow).
//
// M0 scope: hold the loaded model and the current screen, and notify a
// listener to re-render on screen changes. Answer state, persistence, and
// grading arrive in later milestones (M3–M5).

export const SCREENS = Object.freeze({
  INSTRUCTIONS: "instructions",
  QUIZ: "quiz",
  RESULTS: "results",
  ERROR: "error",
});

/**
 * Create the app controller.
 * @param {(app: AppController) => void} onChange - called whenever the screen changes
 * @returns {AppController}
 */
export function createApp(onChange) {
  /** @typedef {object} AppController */
  const app = {
    /** @type {object|null} normalized assessment model */
    model: null,
    /** @type {string} current screen key */
    screen: SCREENS.INSTRUCTIONS,
    /** @type {Error|null} */
    error: null,
    /** @type {number|null} per-assessment shuffle seed (SPEC §2.5) */
    sessionSeed: null,
    /** @type {{autoAdvance: boolean}} global user preferences (SPEC §4.6) */
    prefs: { autoAdvance: true },

    // ---- In-quiz state (keyed by question uid) --------------------------------
    // These are mutated in place by the quiz screen, which patches the DOM
    // directly rather than routing through the full-screen `onChange` render.
    // `onChange` is reserved for ROUTE changes (screen swaps) only, so per-answer
    // and per-navigation updates never destroy focus or the auto-advance timer.
    /** @type {number} current question index into model.questions */
    currentIndex: 0,
    /** @type {Map<string, any>} uid -> answer payload (M3) */
    answers: new Map(),
    /** @type {Set<string>} uids the learner has interacted with (SPEC §6) */
    interacted: new Set(),
    /** @type {Set<string>} uids that already auto-advanced once (SPEC §4.6; M3 wires it) */
    hasAutoAdvanced: new Set(),
    /** @type {Map<string, string[]>} uid -> resolved shuffle order of item ids (M3) */
    resolvedOrderings: new Map(),
    /** @type {boolean} */
    submitted: false,
    /** @type {object|null} computed results (M4) */
    results: null,

    setModel(model) {
      this.model = model;
      return this;
    },
    setSessionSeed(seed) {
      this.sessionSeed = seed;
      return this;
    },
    setPrefs(prefs) {
      this.prefs = prefs;
      return this;
    },

    // ---- Navigation (no render; caller patches) --------------------------------
    /** @param {number} i @returns {number} the clamped index actually set */
    setIndex(i) {
      const n = this.model ? this.model.questions.length : 0;
      this.currentIndex = n === 0 ? 0 : Math.max(0, Math.min(i, n - 1));
      return this.currentIndex;
    },
    next() {
      return this.setIndex(this.currentIndex + 1);
    },
    back() {
      return this.setIndex(this.currentIndex - 1);
    },
    currentQuestion() {
      return this.model ? this.model.questions[this.currentIndex] : null;
    },

    // ---- Answer mutation (M3 populates; API defined now) -----------------------
    setAnswer(uid, payload) {
      this.answers.set(uid, payload);
      this.interacted.add(uid);
      return this;
    },
    markInteracted(uid) {
      this.interacted.add(uid);
      return this;
    },
    setResolvedOrdering(uid, itemIds) {
      this.resolvedOrderings.set(uid, itemIds);
      return this;
    },

    /**
     * Status of a question for the navigator/icon (SPEC §6).
     * M2: only not-answered vs answered (no answers exist yet). M3 refines this
     * to add "in-progress" and per-type completeness.
     * @param {string} uid
     * @returns {"not-answered"|"in-progress"|"answered"}
     */
    statusOf(uid) {
      return this.interacted.has(uid) ? "answered" : "not-answered";
    },
    answeredCount() {
      if (!this.model) return 0;
      let n = 0;
      for (const q of this.model.questions) if (this.statusOf(q.uid) !== "not-answered") n++;
      return n;
    },
    fail(error) {
      this.error = error instanceof Error ? error : new Error(String(error));
      this.screen = SCREENS.ERROR;
      onChange(this);
      return this;
    },
    go(screen) {
      this.screen = screen;
      onChange(this);
      return this;
    },
  };
  return app;
}
