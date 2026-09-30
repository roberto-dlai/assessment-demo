// Small DOM helpers shared by all screens, to keep screen modules declarative
// and consistent (avoids re-implementing the same boilerplate per screen).

/**
 * Create an element with an optional class and text.
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Clear the root and mount a fresh <section class="screen screen--<modifier>">.
 * @param {HTMLElement} root
 * @param {string} modifier - screen name (e.g. "instructions")
 * @returns {HTMLElement} the section, ready to append content to
 */
export function mountScreen(root, modifier) {
  root.innerHTML = "";
  const section = el("section", `screen screen--${modifier}`);
  root.append(section);
  return section;
}

/**
 * Create a screen <h1>. Made programmatically focusable so route changes can
 * move focus to it (see focusHeading in util/a11y.js).
 * @param {string} text
 * @returns {HTMLElement}
 */
export function heading(text) {
  const h = el("h1", "", text);
  h.tabIndex = -1;
  return h;
}
