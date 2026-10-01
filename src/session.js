// Per-assessment session state (SPEC §7), namespaced by the content fingerprint
// so a changed assessment can't restore stale state against new content.
//
// Two SEPARATE storage keys per assessment:
//   - the shuffle SEED (own key) — minted once, restored on reload (§2.5)
//   - the session BLOB (own key) — reserved for M5: answers, interacted flags,
//     resolved orderings, current index, submitted flag, and results (§7)
//
// The seed lives in its own key ON PURPOSE: minting a seed at boot must NOT
// create a "session" that looks like resumable progress, and must never be able
// to clobber answer state. Therefore `hasSavedProgress` keys off the blob's
// answer/submitted fields — NEVER off mere key/blob presence.

import { getJSON, setJSON, removeItem } from "./util/storage.js";
import { makeSessionSeed } from "./util/prng.js";

const SEED_VERSION = 1;
const BLOB_VERSION = 1;
const seedKey = (fingerprint) => `assessment:seed:${fingerprint}`;
const blobKey = (fingerprint) => `assessment:session:${fingerprint}`;

/**
 * Return the persisted seed for this assessment, minting and persisting a fresh
 * one on first visit. Mint-or-restore entry point for §2.5 shuffles.
 * @param {string} fingerprint
 * @returns {number} unsigned 32-bit seed
 */
export function getOrCreateSeed(fingerprint) {
  const stored = getJSON(seedKey(fingerprint));
  if (stored && stored.schemaVersion === SEED_VERSION && Number.isFinite(stored.seed)) {
    return stored.seed >>> 0;
  }
  const seed = makeSessionSeed();
  setJSON(seedKey(fingerprint), { schemaVersion: SEED_VERSION, seed });
  return seed;
}

/**
 * Persist the session BLOB for an assessment (SPEC §7). Stamps the schemaVersion.
 * @param {string} fingerprint
 * @param {object} data - JSON-plain in-quiz state (from app.serialize())
 */
export function saveSession(fingerprint, data) {
  setJSON(blobKey(fingerprint), { schemaVersion: BLOB_VERSION, ...data });
}

/**
 * Load the stored session BLOB (M5 answer state), if present and schema-compatible.
 * @param {string} fingerprint
 * @returns {object|null}
 */
export function loadSession(fingerprint) {
  const data = getJSON(blobKey(fingerprint));
  if (!data || data.schemaVersion !== BLOB_VERSION) return null;
  return data;
}

/**
 * Whether a resumable in-progress (or submitted) session exists.
 * Contract: this MUST be decided by the blob's answer/submitted fields, never by
 * seed or blob mere-presence — otherwise minting a seed at boot would falsely
 * offer Resume (§3.1). M1 stub: no answers are persisted yet, so always false.
 * M5 implements this against loadSession(fingerprint).
 * @param {string} fingerprint
 * @returns {boolean}
 */
export function hasSavedProgress(fingerprint) {
  const s = loadSession(fingerprint);
  if (!s) return false;
  return Boolean(s.submitted) || (s.answers && Object.keys(s.answers).length > 0);
}

/**
 * Clear ALL stored state for an assessment — both the seed and the session blob
 * (Retake / Start over, §3.1).
 * @param {string} fingerprint
 */
export function clearSession(fingerprint) {
  removeItem(seedKey(fingerprint));
  removeItem(blobKey(fingerprint));
}

/**
 * Start a fresh attempt: clear all state and mint a new seed. Single entry point
 * for Start-over / Retake so seed ownership isn't split across screens.
 * @param {string} fingerprint
 * @returns {number} the new seed
 */
export function startFresh(fingerprint) {
  clearSession(fingerprint);
  return getOrCreateSeed(fingerprint);
}
