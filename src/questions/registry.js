// Per-type question registry. Each module exports a uniform interface:
//   render(container, { question, app, rng, onChange, announce })
//   statusOf(answer, question) -> "not-answered" | "in-progress" | "answered"
//   score(answer, question)    -> number in [0, 1]
//   noun                       -> short display noun

import * as single_selection from "./single.js";
import * as multiple_selections from "./multi.js";
import * as grouping from "./grouping.js";
import * as matching from "./matching.js";
import * as ordering from "./ordering.js";

const REGISTRY = Object.freeze({
  single_selection,
  multiple_selections,
  grouping,
  matching,
  ordering,
});

/** @param {string} type @returns {object} the type module (throws on unknown type) */
export function widgetFor(type) {
  const mod = REGISTRY[type];
  if (!mod) throw new Error(`No question module for type "${type}".`);
  return mod;
}
