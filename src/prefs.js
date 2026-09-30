// Global user preferences (SPEC §4.6). Persisted across assessments, separate
// from per-assessment session state (which is fingerprint-scoped, see session.js).

import { getJSON, setJSON } from "./util/storage.js";

const PREFS_KEY = "assessment:prefs:v1";
const DEFAULTS = Object.freeze({ autoAdvance: true });

/** @returns {{autoAdvance: boolean}} */
export function loadPrefs() {
  return { ...DEFAULTS, ...(getJSON(PREFS_KEY) || {}) };
}

/** @param {{autoAdvance: boolean}} prefs */
export function savePrefs(prefs) {
  setJSON(PREFS_KEY, { autoAdvance: Boolean(prefs.autoAdvance) });
}

/**
 * Persist a new auto-advance preference and return the updated prefs.
 * @param {boolean} on
 * @returns {{autoAdvance: boolean}}
 */
export function setAutoAdvance(on) {
  const prefs = loadPrefs();
  prefs.autoAdvance = Boolean(on);
  savePrefs(prefs);
  return prefs;
}
