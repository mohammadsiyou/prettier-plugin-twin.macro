const SPACE_ID = "__SPACE_ID__";

interface ATTObjType {
  [index: string]: ATTObjType | (string | ATTObjType)[];
}

type ATTArrType = (string | ATTObjType)[];

type ATTType = ATTObjType | ATTArrType;

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

const sliceToSpace = (str: string) => {
  const spaceIndex = str.indexOf(" ");
  if (spaceIndex === -1) return str;

  return str.slice(0, spaceIndex);
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
  const reg = /(\[.*?]:|[\w-<>]+:)|(!?[\w-./[\]]+!?)|\(|(\S+)/g;

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
    } else if (className && className.includes("[")) {
      const closeBracket = findRightBracket(
        classes,
        match.index,
        classes.length,
        ["[", "]"]
      );
      if (typeof closeBracket !== "number")
        throw new Error(
          `An ending bracket ']' wasn’t found for these classes:\n\n${classes}`
        );

      const importantGroup = classes[closeBracket + 1] === "!";
      const cssClass = classes.slice(match.index, closeBracket + 1);

      const hasSlashOpacity =
        classes.slice(closeBracket + 1, closeBracket + 2) === "/";
      const opacityValue = hasSlashOpacity
        ? sliceToSpace(classes.slice(closeBracket + 1))
        : "";

      // Convert spaces in classes to a temporary string so the css won't be
      // split into multiple classes
      const spaceReplacedClass = cssClass
        // Normalise the spacing - single spaces only
        // Replace spaces with the space id stand-in
        // Remove newlines within the brackets to allow multiline values
        .replace(/\s+/g, SPACE_ID);

      results.push(
        context +
          spaceReplacedClass +
          opacityValue +
          (importantGroup || importantContext ? "!" : "")
      );

      reg.lastIndex =
        closeBracket + (importantGroup ? 2 : 1) + opacityValue.length;
      context = baseContext;
    } else if (className) {
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

      const importantGroup = classes[closeBracket + 1] === "!";
      results.push(
        ...handleVariantGroups(
          classes,
          context,
          importantContext || importantGroup,
          match.index + 1,
          closeBracket
        )
      );
      reg.lastIndex = closeBracket + (importantGroup ? 2 : 1);
    }
  }

  return results;
};

// Abstract Tokens Tree.
const parseATT = (path: string, data?: ATTType, splitter = ":"): ATTType => {
  const tokens = path.split(splitter);

  if (tokens.length === 1) {
    if (data === undefined) return [path];
    else if (Array.isArray(data)) return [...data, path];
    return [data, path];
  }

  const variant = tokens[0];
  const newPath = tokens.slice(1).join(splitter);

  // make CSS class string an object.
  if (data === undefined) {
    return {
      [variant]: parseATT(newPath),
    };
  }

  if (Array.isArray(data)) {
    const lastIndex = data.length - 1;
    const lastData = data[lastIndex];

    if (typeof lastData === "object") {
      const newItem = parseATT(path, lastData) as ATTObjType;

      return [...data.slice(0, lastIndex), newItem];
    }

    return [...data, parseATT(path) as ATTObjType];
  }

  if (data[variant] === undefined) {
    return { ...data, [variant]: parseATT(newPath) };
  }

  if (Array.isArray(data[variant])) {
    return { ...data, [variant]: parseATT(newPath, data[variant]) };
  }

  return {
    ...data,
    [variant]: parseATT(newPath, data[variant]),
  };
};

const isSigned = (str: string, sign = "!") => {
  return !str.split(" ").some((item) => item[item.length - 1] !== sign);
};

const bracketClasses = (
  str: string,
  brackets = ["(", ")"],
  sign = "!",
  firstRoot = false
) => {
  if (isSigned(str, sign)) {
    const newStr = str
      .split(" ")
      .map((item) => item.slice(0, item.length - 1))
      .join(SPACE_ID);

    return `${brackets[0]}${newStr}${brackets[1]}${sign}`;
  }

  if (firstRoot) return str;

  return `${brackets[0]}${str}${brackets[1]}`;
};

const printATT = (
  data: ATTType | string,
  brackets = ["(", ")"],
  sign = "!",
  firstRoot = false
) => {
  if (typeof data === "string") return data;

  let str = "";

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // First item doesn't need space(item1 item2 ...).
      str += (i !== 0 ? " " : "") + printATT(item, brackets, sign);
    }

    // Less than two items don't need to be surrounded by brackets.
    if (data.length < 2) return str;

    return bracketClasses(str, brackets, sign, firstRoot);
  }

  for (let key in data) {
    const newData = printATT(data[key], brackets, sign);
    str += `${key}:${newData} `;
  }

  return str.trim();
};

const moveSignIntoEnd = (list: string[], sign = "!") => {
  const moveImportantToEnd = (item: string) =>
    item[0] === sign ? `${item.slice(1)}${sign}` : item;

  return list.map((item) => {
    const tokens = item.split(":");

    if (tokens.length === 1) {
      return moveImportantToEnd(item);
    }

    const newItem =
      tokens.slice(0, tokens.length - 1).join(":") +
      ":" +
      moveImportantToEnd(tokens[tokens.length - 1]);

    return newItem;
  });
};

const finalizePrintedATT = (str: string) => {
  const newStr = str.replace(new RegExp(SPACE_ID, "g"), " ");

  return newStr;
};

const groupifyCSSClass = (classes: string[]): string => {
  let att: ATTType = [];

  const importedSign = "!";
  const brackets = ["(", ")"];

  const newClasses = moveSignIntoEnd(classes, importedSign);

  for (let i = 0; i < newClasses.length; i++) {
    const classStr = newClasses[i];

    att = parseATT(classStr, att);
  }

  const code = printATT(att, brackets, importedSign, true);

  const finalCode = finalizePrintedATT(code);

  return finalCode;
};

export { handleVariantGroups, groupifyCSSClass };
