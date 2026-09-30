// Per-assessment session state (SPEC §7), namespaced by the content fingerprint
// so a changed assessment can't restore stale state against new content.
//
// M1 scope: own the session SEED (mint once, restore on reload) so shuffles are
// reproducible. M5 will extend the stored blob with answers, interacted flags,
// resolved orderings, current index, submitted flag, and results — reusing this
// same fingerprint-scoped key.

import { getJSON, setJSON, removeItem } from "./util/storage.js";
import { makeSessionSeed } from "./util/prng.js";

const SCHEMA_VERSION = 1;
const key = (fingerprint) => `assessment:session:${fingerprint}`;

/**
 * Load the stored session for an assessment, if any and schema-compatible.
 * @param {string} fingerprint
 * @returns {object|null}
 */
export function loadSession(fingerprint) {
  const data = getJSON(key(fingerprint));
  if (!data || data.schemaVersion !== SCHEMA_VERSION) return null;
  return data;
}

/**
 * Return the persisted seed for this assessment, minting and persisting a fresh
 * one on first visit. This is the mint-or-restore entry point for §2.5 shuffles.
 * @param {string} fingerprint
 * @returns {number} unsigned 32-bit seed
 */
export function getOrCreateSeed(fingerprint) {
  const existing = loadSession(fingerprint);
  if (existing && Number.isFinite(existing.seed)) return existing.seed >>> 0;
  const seed = makeSessionSeed();
  setJSON(key(fingerprint), { schemaVersion: SCHEMA_VERSION, seed });
  return seed;
}

/**
 * Whether a resumable in-progress (or submitted) session exists.
 * M1 stub: always false — no answers are persisted yet. M5 implements this from
 * the stored answers/submitted flag, which gates the Resume/Start-over UI (§3.1).
 * @param {string} _fingerprint
 * @returns {boolean}
 */
export function hasSavedProgress(_fingerprint) {
  return false;
}

/**
 * Clear all stored state for an assessment (Retake / Start over, §3.1).
 * @param {string} fingerprint
 */
export function clearSession(fingerprint) {
  removeItem(key(fingerprint));
}
