import { SupportLanguage, Parser, Printer, AST } from "prettier";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import type { Visitor } from "@babel/traverse";
import * as t from "@babel/types";
import * as path from "path";
import escalade from "escalade/sync";
// @ts-ignore
import defaultTailwindConfig from "tailwindcss/stubs/defaultConfig.stub";
import resolveConfig from "tailwindcss/resolveConfig";
// @ts-ignore
import { createContext } from "tailwindcss/lib/lib/setupContextUtils";
import objectHash from "object-hash";
import { Node, NodePath } from "babel__traverse";

interface TWContextType {
  getClassOrder: (classes: string[]) => Array<[string, bigint]>;
}

interface contextType {
  context: TWContextType;
  hash: string;
}

type VisitorType = Visitor<{ context: TWContextType }>;

const TWIN_LIB_NAME: string = "twin.macro";
const TWIN_PROP_NAME: string = "tw";

const contextMap = new Map<string, contextType>();
const refrencesName = new Set<string>();

function locStart(node: any) {
  return node.start;
}

function locEnd(node: any) {
  return node.end;
}

export const languages: Partial<SupportLanguage>[] = [];

interface PrettierOptions {
  filepath?: string;
}

// https://github.com/tailwindlabs/prettier-plugin-tailwindcss/blob/main/src/index.js
const getTailwindConfig = (options: PrettierOptions) => {
  const baseDir = options.filepath
    ? path.dirname(options.filepath)
    : process.cwd();

  const tailwindConfigPath = escalade(baseDir, (_dir, names) => {
    if (names.includes("tailwind.config.js")) {
      return "tailwind.config.js";
    }
    if (names.includes("tailwind.config.cjs")) {
      return "tailwind.config.cjs";
    }
  });

  const tailwindConfig = tailwindConfigPath
    ? require(tailwindConfigPath)
    : defaultTailwindConfig;

  // suppress "empty content" warning
  tailwindConfig.content = ["no-op"];

  const cachePath = tailwindConfigPath || baseDir;

  const cache = contextMap.get(cachePath);

  const hash = objectHash(tailwindConfig);

  let context;

  if (cache && cache.hash === hash) {
    context = cache.context;
  } else {
    context = createContext(resolveConfig(tailwindConfig));
    contextMap.set(cachePath, { context, hash });
  }

  return context;
};

const bigSign = (bigIntValue: bigint) => {
  return Number(bigIntValue > 0n) - Number(bigIntValue < 0n);
};

const sortClasses = (
  classStr: string,
  { context }: { context: TWContextType }
) => {
  if (typeof classStr !== "string" || classStr === "") {
    return classStr;
  }

  let result = "";

  const parts = classStr.split(/(\s+)/);
  const classes = parts.filter((_, i) => i % 2 === 0);
  const whitespace = parts.filter((_, i) => i % 2 !== 0);

  if (classes[classes.length - 1] === "") {
    classes.pop();
  }

  const classNamesWithOrder = context.getClassOrder(classes);

  const orderedClasses = classNamesWithOrder
    .sort(([, a], [, z]) => {
      if (a === z) return 0;

      if (a === null) return -1;
      if (z === null) return 1;
      return bigSign(a - z);
    })
    .map(([className]) => className);

  for (let i = 0; i < orderedClasses.length; i++) {
    result += `${orderedClasses[i]}${whitespace[i] ?? ""}`;
  }

  return result;
};

const sortStringLiteral = (node: t.StringLiteral, context: TWContextType) => {
  let sortedClasses = sortClasses(node.value, { context });

  node.value = sortedClasses;

  if (node.extra) {
    // JavaScript (StringLiteral)
    const raw = (node.extra.raw || "") as string;

    node.extra = {
      ...node.extra,
      rawValue: sortedClasses,
      raw: raw[0] + sortedClasses + raw.slice(-1),
    };
  }
};

const sortTemplateLiteral = (
  node: t.TemplateLiteral,
  context: TWContextType
) => {
  node.quasis.forEach((quasi) => {
    const sortedClasses = sortClasses(quasi.value.raw, { context });

    quasi.value.raw = sortedClasses;
    quasi.value.cooked = sortedClasses;
  });
};

const matchTwTag = (path: NodePath<t.TaggedTemplateExpression>): boolean => {
  const {
    node: { tag },
  } = path;

  if (t.isIdentifier(tag)) {
    const identifier = tag as t.Identifier;

    if (refrencesName.has(identifier.name)) {
      return true;
    }
  }
  else if (t.isMemberExpression(tag)) {
    const identifier = (tag as t.MemberExpression).object as t.Identifier;

    if (refrencesName.has(identifier.name)) {
      return true;
    }
  }
  else if (t.isCallExpression(tag)) {
    const identifier = (tag as t.CallExpression).callee as t.Identifier;

    if (refrencesName.has(identifier.name)) {
      return true;
    }
  }

  return false;
};

const JSXVisitor: VisitorType = {
  StringLiteral(path: NodePath<t.StringLiteral>) {
    sortStringLiteral(path.node, this.context);
  },
  TemplateLiteral(path: NodePath<t.TemplateLiteral>) {
    sortTemplateLiteral(path.node, this.context);
  },
};

const TaggedTemplateVisitor: VisitorType = {
  TemplateLiteral(innerPath) {
    sortTemplateLiteral(innerPath.node, this.context);
  },
};

const MainVisitor: VisitorType = {
  ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
    const libName = path.node.source.value;

    if (libName !== TWIN_LIB_NAME) return;

    path.node.specifiers.forEach((specifier) => {
      if (t.isImportDefaultSpecifier(specifier)) {
        const identifierName = specifier.local.name;

        refrencesName.add(identifierName);
      }
    });
  },
  JSXAttribute(path: NodePath<t.JSXAttribute>) {
    const { node } = path;

    const {
      name: { name: attributeName },
    } = node;

    if (attributeName === TWIN_PROP_NAME) {
      const { value } = node;

      if (t.isStringLiteral(value)) {
        sortStringLiteral(value, this.context);
      } else if (t.isJSXExpressionContainer(value)) {
        path.traverse(JSXVisitor, { context: this.context });
      }
    }
  },
  TaggedTemplateExpression(path: NodePath<t.TaggedTemplateExpression>) {
    const matchedTag: boolean = matchTwTag(path);

    if (matchedTag) {
      path.traverse(TaggedTemplateVisitor, { context: this.context });
    }
  },
};

export const parsers: Record<string, Parser> = {
  babel: {
    parse: (
      code: string,
      parsers: object,
      options: PrettierOptions = {}
    ): AST => {
      const ast: Node = parser.parse(code, {
        sourceType: "module",
        plugins: ["jsx"],
      });

      const context: TWContextType = getTailwindConfig(options);

      traverse(ast, MainVisitor, undefined, { context });

      return ast;
    },
    locStart,
    locEnd,
    astFormat: "estree",
  },
};

export const printers: Record<string, Printer> = {};
