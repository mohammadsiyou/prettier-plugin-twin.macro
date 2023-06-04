const SPACE_ID = "__SPACE_ID__";
const _ = require("lodash");

interface ATTType {
  [index: string]: ATTType[];
}

const findRightBracket = (
  classes: string,
  start: number = 0,
  end: number = classes.length,
  brackets: ("(" | ")" | "[" | "]")[] = ["(", ")"]
) => {
  let stack = 0;

  for (let index = start; index < end; index++) {
    if (classes[index] === brackets[0]) {
      stack += 1;
    } else if (classes[index] === brackets[1]) {
      if (stack === 0) return;
      if (stack === 1) return index;
      stack -= 1;
    }
  }
};

// https://github.com/ben-rogerson/twin.macro/blob/master/src/variants.js
const handleVariantGroups = (
  classes: string,
  context: string = "",
  importantContext: boolean = false,
  start: number = 0,
  end?: number
): string[] => {
  if (classes === "") return [];

  const results = [];
  classes = classes.slice(start, end).trim();

  // variant / class / group
  const reg = /(\[.*?]:|[\w-]+\[.*?]:|[\w-<>]+:)|(!?([\w-]+\[.*?]|\[.*?]|[\w-./[\]]+)!?)|\(|(\S+)/g;

  let match;
  const baseContext = context;

  while ((match = reg.exec(classes))) {
    const [, variant, className, weird] = match;

    if (variant) {
      // Replace arbitrary variant spaces with a placeholder to avoid incorrect splitting
      const spaceReplacedVariant = variant.replace(/\s+/g, SPACE_ID);
      context += spaceReplacedVariant;

      // Skip empty classes
      if (/\s/.test(classes[reg.lastIndex])) {
        context = baseContext;
        continue;
      }

      if (classes[reg.lastIndex] === "(") {
        const closeBracket = findRightBracket(classes, reg.lastIndex);

        if (typeof closeBracket !== "number")
          throw new Error(
            `An ending bracket ')' wasn’t found for these classes:\n\n${classes}`
          );

        const importantGroup = classes[closeBracket + 1] === "!";

        results.push(
          ...handleVariantGroups(
            classes,
            context,
            importantContext || importantGroup,
            reg.lastIndex + 1,
            closeBracket
          )
        );
        reg.lastIndex = closeBracket + (importantGroup ? 2 : 1);
        context = baseContext;
      }
    }
    else if (className) {
      const tail = !className.endsWith("!") && importantContext ? "!" : "";
      let newClassName = className;

      if (className.endsWith("!")) {
        newClassName = `!${className.slice(0, className.length - 1)}`;
      }

      results.push(context + tail + newClassName);
      context = baseContext;
    } else if (weird) {
      results.push(context + weird);
    } else {
      const closeBracket = findRightBracket(classes, match.index);

      if (typeof closeBracket !== "number")
        throw new Error(
          `An ending bracket ')' wasn’t found for these classes:\n\n${classes}`
        );

      const headImportant =  classes[0] === "!";

      const tailImportant = classes[closeBracket + 1] === "!";

      const importantGroup = headImportant || tailImportant;

      results.push(
        ...handleVariantGroups(
          classes,
          context,
          importantContext || importantGroup,
          match.index + (headImportant ? 2 : 1),
          closeBracket
        )
      );
      reg.lastIndex = closeBracket + (tailImportant ? 2 : 1);
    }
  }

  return results;
};

// Abstract Tokens Tree.
const parseATT = (list: string[]):ATTType[] => {
  if (!list.length)
    return [];

  const groupifiedList: Record<string, string[]>[] = _.chain(list).groupBy((item: string) => {
    const reg = /(\[.*?]:|[\w-]+\[.*?]:|[\w-<>]+:)|(!?([\w-]+\[.*?]|\[.*?]|[\w-./[\]]+)!?)|\(|(\S+)/g;

    const match = reg.exec(item);

    if (!match)
      return item;

    const [, variant, className, weird] = match;

    if (variant !== undefined)
      return variant;

    if (className !== undefined && className.startsWith('!'))
      return '!';

    return className || weird || item;

  }).map((value: string[], key: string) => ({
    [key]: value.map(item => {
      const reg = /(\[.*?]:|[\w-]+\[.*?]:|[\w-<>]+:)|(!?([\w-]+\[.*?]|\[.*?]|[\w-./[\]]+)!?)|\(|(\S+)/g;

      const match = reg.exec(item);

      if (!match)
        return [];

      const [, variant, className,] = match;

      if (variant !== undefined)
        return item.slice(variant.length);

      if (className !== undefined && className.startsWith('!'))
        return className.slice(1);

      if (className !== undefined)
        return [];

      return item;
    }).flat()
  })).value();

  const newList = groupifiedList.map(item => {
    const newItem = Object.fromEntries(Object.entries(item).map(([key, value]) => {
      return [key, parseATT(value)]
    }));

    return newItem;
  });

  return newList;
};

const printATT = (list:ATTType[], needSpace = true) => {
  let str = "";

  list.forEach(item => {
    Object.entries(item).map(([key, value]) => {
      if (Array.isArray(value) && value.length === 0) {
        str += key;

        if (needSpace)
          str += ' ';
      }
      else {
        str += key;

        if (value.length > 1)
          str += '(';

        str += printATT(value, !!value.length).trim();

        if (value.length > 1)
          str += ')';

        str += " ";
      }
    });
  });

  return str.trim();
};

const finalizePrintedATT = (str: string) => {
  const newStr = str.replace(new RegExp(SPACE_ID, "g"), " ");

  return newStr;
};

const groupifyCSSClass = (classes: string[]): string => {
  const parsedData = parseATT(classes);

  const code = printATT(parsedData);

  const finalCode = finalizePrintedATT(code);

  return finalCode;
};

export { handleVariantGroups, groupifyCSSClass };
