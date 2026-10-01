// Reusable modal dialog (SPEC §3.3): role=dialog + aria-modal, focus trap,
// Escape/backdrop to cancel, scroll lock, and focus return to the opener.

import { el } from "./dom.js";
import { createFocusTrap } from "../util/a11y.js";

let idCounter = 0;

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.message]
 * @param {Array<{label,variant,onClick}>} opts.actions - rendered left→right
 * @param {() => void} [opts.onCancel] - called on Escape / backdrop
 * @returns {{ close: () => void }}
 */
export function openModal({ title, message, actions, onCancel }) {
  const titleId = `modal-title-${++idCounter}`;
  const backdrop = el("div", "modal-backdrop");

  const dialog = el("div", "modal");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", titleId);
  dialog.tabIndex = -1;

  const heading = el("h2", "modal__title", title);
  heading.id = titleId;
  dialog.append(heading);
  if (message) dialog.append(el("p", "modal__message", message));

  const row = el("div", "modal__actions");
  const trap = createFocusTrap(dialog, {
    onEscape: () => {
      if (onCancel) onCancel();
      close();
    },
    focusContainer: true,
  });

  function close() {
    document.body.style.overflow = "";
    trap.release();
    backdrop.remove();
  }

  for (const a of actions) {
    const btn = el("button", `dl-btn dl-btn--${a.variant}`, a.label);
    btn.type = "button";
    btn.addEventListener("click", () => {
      close();
      a.onClick();
    });
    row.append(btn);
  }
  dialog.append(row);

  backdrop.append(dialog);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      if (onCancel) onCancel();
      close();
    }
  });

  document.body.append(backdrop);
  document.body.style.overflow = "hidden";
  trap.activate();

  return { close };
}
