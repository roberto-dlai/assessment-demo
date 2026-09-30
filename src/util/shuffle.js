// Deterministic shuffles (SPEC §2.5).
//
// All shuffles take an explicit rng (from prng.js) so they reproduce exactly
// on reload. Nothing here calls Math.random().

/**
 * Fisher–Yates shuffle producing a NEW array; consumes the given rng.
 * @template T
 * @param {T[]} array
 * @param {() => number} rng - float source in [0, 1)
 * @returns {T[]}
 */
export function shuffle(array, rng) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffle, retrying deterministically until the result is NOT "equal" to a
 * reference (e.g. an ordering question must not present items already in the
 * correct order). The retry keeps consuming the same rng, so the resolved
 * order is reproducible from the seed. Falls back to the last shuffle after a
 * bounded number of attempts (e.g. a single-item list can never differ).
 * @template T
 * @param {T[]} array
 * @param {() => number} rng
 * @param {(candidate: T[]) => boolean} isEqual - true when candidate is disallowed
 * @param {number} [maxAttempts]
 * @returns {T[]}
 */
export function shuffleUntil(array, rng, isEqual, maxAttempts = 20) {
  let candidate = shuffle(array, rng);
  let attempts = 1;
  while (isEqual(candidate) && attempts < maxAttempts) {
    candidate = shuffle(array, rng);
    attempts++;
  }
  return candidate;
}

/**
 * Convenience: true when two arrays are element-wise identical (by ===, or by
 * a key function). Useful as the isEqual predicate for shuffleUntil.
 * @template T
 * @param {T[]} a
 * @param {T[]} b
 * @param {(x: T) => unknown} [key]
 * @returns {boolean}
 */
export function sameOrder(a, b, key = (x) => x) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => key(x) === key(b[i]));
}
