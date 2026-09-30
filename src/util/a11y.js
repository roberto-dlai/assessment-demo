// Accessibility primitives (SPEC §4.6, §4.7).
//
// These are the shared building blocks every screen and interaction uses so
// announcements and focus behave consistently. The live regions themselves are
// declared once in index.html (#live-polite / #live-assertive).

/**
 * Announce a message to assistive tech via a live region.
 * Clears the region first and sets the text on the next frame so that repeating
 * the SAME message still triggers an announcement (setting identical textContent
 * is otherwise a no-op for screen readers).
 * @param {string} message
 * @param {{ assertive?: boolean }} [opts] - assertive for context changes (nav,
 *   completion); omit/false (polite) for incremental status.
 */
export function announce(message, { assertive = false } = {}) {
  const region = document.getElementById(assertive ? "live-assertive" : "live-polite");
  if (!region) return;
  region.textContent = "";
  const raf = globalThis.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
  raf(() => {
    region.textContent = message;
  });
}

/**
 * Move focus to a screen's heading so keyboard/screen-reader users land on — and
 * hear — the new context after a route change (SPEC §4.6).
 * @param {HTMLElement|null} heading
 */
export function focusHeading(heading) {
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus();
}
