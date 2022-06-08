import { splitAtTopLevelOnly } from "./splitAtTopLevelOnly";
import type { TWContextType, LayerOrderName } from "../index.d";

// https://github.com/tailwindlabs/tailwindcss/blob/master/src/lib/generateRules.js

const extractArbitraryProperty = (
  classCandidate: string,
  context: TWContextType
) => {
  const [, property, value] =
    classCandidate.match(/^\[([a-zA-Z0-9-_]+):(\S+)\]$/) ?? [];

  if (property === undefined || value === undefined) {
    return null;
  }

  return [[{ sort: context.arbitraryPropertiesSort, layer: "utilities" }]];
};

// Generate match permutations for a class candidate, like:
// ['ring-offset-blue', '100']
// ['ring-offset', 'blue-100']
// ['ring', 'offset-blue-100']
// Example with dynamic classes:
// ['grid-cols', '[[linename],1fr,auto]']
// ['grid', 'cols-[[linename],1fr,auto]']
function* candidatePermutations(candidate: string) {
  let lastIndex = Infinity;

  while (lastIndex >= 0) {
    let dashIdx;

    if (lastIndex === Infinity && candidate.endsWith("]")) {
      let bracketIdx = candidate.indexOf("[");

      // If character before `[` isn't a dash or a slash, this isn't a dynamic class
      // eg. string[]
      dashIdx = ["-", "/"].includes(candidate[bracketIdx - 1])
        ? bracketIdx - 1
        : -1;
    } else {
      dashIdx = candidate.lastIndexOf("-", lastIndex);
    }

    if (dashIdx < 0) {
      break;
    }

    let prefix = candidate.slice(0, dashIdx);
    let modifier = candidate.slice(dashIdx + 1);

    yield [prefix, modifier];

    lastIndex = dashIdx - 1;
  }
}

const extractShortClass = (classCandidate: string, context: TWContextType) => {
  const [, property, value] =
    classCandidate.match(/^([a-zA-Z0-9-_]+)\[(\S+)\]$/) ?? [];

  if (property === undefined || value === undefined) {
    return null;
  }

  return [[{ sort: context.arbitraryPropertiesSort, layer: "utilities" }]];
};

function* resolveMatchedPlugins(
  classCandidate: string,
  context: TWContextType
) {
  if (context.candidateRuleMap.has(classCandidate)) {
    yield [context.candidateRuleMap.get(classCandidate), "DEFAULT"];
  }

  yield* (function* (arbitraryPropertyRule) {
    if (arbitraryPropertyRule !== null) {
      yield [arbitraryPropertyRule, "DEFAULT"];
    }
  })(extractArbitraryProperty(classCandidate, context));

  yield* (function* (shortPropertyRule) {
    if (shortPropertyRule !== null) {
      yield [shortPropertyRule, "DEFAULT"];
    }
  })(extractShortClass(classCandidate, context));

  let candidatePrefix = classCandidate;
  let negative = false;

  const twConfigPrefix = context.tailwindConfig.prefix;

  const twConfigPrefixLen = twConfigPrefix.length;

  const hasMatchingPrefix =
    candidatePrefix.startsWith(twConfigPrefix) ||
    candidatePrefix.startsWith(`-${twConfigPrefix}`);

  if (candidatePrefix[twConfigPrefixLen] === "-" && hasMatchingPrefix) {
    negative = true;
    candidatePrefix =
      twConfigPrefix + candidatePrefix.slice(twConfigPrefixLen + 1);
  }

  if (negative && context.candidateRuleMap.has(candidatePrefix)) {
    yield [context.candidateRuleMap.get(candidatePrefix), "-DEFAULT"];
  }

  for (let [prefix, modifier] of candidatePermutations(candidatePrefix)) {
    if (context.candidateRuleMap.has(prefix)) {
      yield [
        context.candidateRuleMap.get(prefix),
        negative ? `-${modifier}` : modifier,
      ];
    }
  }
}

const isArbitraryValue = (input: string) =>
  input.startsWith("[") && input.endsWith("]");

const getVariantSort = (variant: string, context: TWContextType) => {
  let newVariant = variant;

  // Find partial arbitrary variants
  if (variant.endsWith("]") && !variant.startsWith("[")) {
    const args = variant.slice(variant.lastIndexOf("[") + 1, -1);
    newVariant = variant.slice(
      0,
      variant.indexOf(args) - 1 /* - */ - 1 /* [ */
    );
  }

  // Arbitrary variants
  if (isArbitraryValue(newVariant) && !context.variantMap.has(newVariant)) {
    const sortValues: bigint[] = Array.from(context.variantOrder.values());
    const sort = (sortValues.pop() || 16384n) << 1n;

    return sort;
  }

  if (context.variantMap.has(newVariant)) {
    const variantResolved = context.variantMap.get(newVariant);
    const [variantSorrt] = variantResolved.flat(1);

    return variantSorrt;
  }

  return context.variantOrder.get("first-letter");
};

const resolveMatches = (
  candidate: string,
  context: TWContextType
): { sort: bigint; layer: LayerOrderName } => {
  const separator = context.tailwindConfig.separator;

  let [classCandidate, ...variants] = Array.from(
    splitAtTopLevelOnly(candidate, separator)
  ).reverse();

  if (classCandidate.startsWith("!")) {
    classCandidate = classCandidate.slice(1);
  }

  const [matchedPlugins] = resolveMatchedPlugins(classCandidate, context);

  let sort = context.layerOrder.components;
  let layer = "utilities" as LayerOrderName;

  if (matchedPlugins) {
    const [plugins] = matchedPlugins;

    ({ sort, layer } = plugins.flat(2)[0]);
  }

  for (const variant of variants) {
    const variantSorrt = getVariantSort(variant, context);

    sort += variantSorrt;
  }

  return { sort, layer };
};

const getClassOrder = (candidates: string[], context: TWContextType) => {
  const allRules: [string, bigint][] = candidates.map((candidate) => {
    const { sort, layer } = resolveMatches(candidate, context);

    return [candidate, sort | context.layerOrder[layer]];
  });

  return allRules;
};

export default getClassOrder;
