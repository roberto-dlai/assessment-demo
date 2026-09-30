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

    setModel(model) {
      this.model = model;
      return this;
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
