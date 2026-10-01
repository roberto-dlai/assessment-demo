// Accessibility primitives (SPEC §4.6).
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
  // setTimeout, not requestAnimationFrame: rAF is paused in background tabs, so
  // announcements could be delayed indefinitely. The clear-then-set still forces
  // a re-announcement of an identical string.
  setTimeout(() => {
    region.textContent = message;
  }, 0);
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(container) {
  // getClientRects() is a more robust visibility test than offsetParent, which
  // returns null for position:fixed elements (e.g. a fixed modal).
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (elm) => elm === document.activeElement || elm.getClientRects().length > 0
  );
}

/**
 * Create a focus trap for a modal container (e.g. the submit-confirmation
 * modal). Traps Tab within the container, closes on Escape, and restores focus
 * to the element that was focused before activation (SPEC §3.3).
 * @param {HTMLElement} container
 * @param {{ onEscape?: () => void, focusContainer?: boolean }} [opts]
 *   focusContainer: focus the container itself first (so a dialog's name/role is
 *   announced) instead of its first focusable child.
 * @returns {{ activate: () => void, release: () => void }}
 */
export function createFocusTrap(container, { onEscape, focusContainer = false } = {}) {
  let previouslyFocused = null;

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (onEscape) onEscape();
      return;
    }
    if (e.key !== "Tab") return;
    const items = focusableWithin(container);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previouslyFocused = document.activeElement;
      container.addEventListener("keydown", onKeydown);
      if (focusContainer) {
        container.focus();
      } else {
        const items = focusableWithin(container);
        (items[0] || container).focus();
      }
    },
    release() {
      container.removeEventListener("keydown", onKeydown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    },
  };
}
