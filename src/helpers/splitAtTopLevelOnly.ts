// https://github.com/tailwindlabs/tailwindcss/blob/master/src/util/splitAtTopLevelOnly.js

const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|]/g;
const REGEX_HAS_SPECIAL = RegExp(REGEX_SPECIAL.source);

const escape = (string: string) => {
  return string && REGEX_HAS_SPECIAL.test(string)
    ? string.replace(REGEX_SPECIAL, "\\$&")
    : string || "";
};

/**
 * This splits a string on a top-level character.
 *
 * Regex doesn't support recursion (at least not the JS-flavored version).
 * So we have to use a tiny state machine to keep track of paren placement.
 *
 * Expected behavior using commas:
 * var(--a, 0 0 1px rgb(0, 0, 0)), 0 0 1px rgb(0, 0, 0)
 *       ─┬─             ┬  ┬    ┬
 *        x              x  x    ╰──────── Split because top-level
 *        ╰──────────────┴──┴───────────── Ignored b/c inside >= 1 levels of parens
 *
 * @param {string} input
 * @param {string} separator
 */
export function* splitAtTopLevelOnly(input: string, separator: string) {
  let SPECIALS = new RegExp(`[(){}\\[\\]${escape(separator)}]`, "g");

  let depth = 0;
  let lastIndex = 0;
  let found = false;
  let separatorIndex = 0;
  let separatorStart = 0;
  let separatorLength = separator.length;

  // Find all paren-like things & character
  // And only split on commas if they're top-level
  for (let match of input.matchAll(SPECIALS)) {
    let matchesSeparator = match[0] === separator[separatorIndex];
    let atEndOfSeparator = separatorIndex === separatorLength - 1;
    let matchesFullSeparator = matchesSeparator && atEndOfSeparator;

    if (match[0] === "(") depth++;
    if (match[0] === ")") depth--;
    if (match[0] === "[") depth++;
    if (match[0] === "]") depth--;
    if (match[0] === "{") depth++;
    if (match[0] === "}") depth--;

    if (matchesSeparator && depth === 0) {
      if (separatorStart === 0) {
        separatorStart = match.index ?? 0;
      }

      separatorIndex++;
    }

    if (matchesFullSeparator && depth === 0) {
      found = true;

      yield input.substring(lastIndex, separatorStart);
      lastIndex = separatorStart + separatorLength;
    }

    if (separatorIndex === separatorLength) {
      separatorIndex = 0;
      separatorStart = 0;
    }
  }

  // Provide the last segment of the string if available
  // Otherwise the whole string since no `char`s were found
  // This mirrors the behavior of string.split()
  if (found) {
    yield input.substring(lastIndex);
  } else {
    yield input;
  }
}
