import prettier, { SupportLanguage, Parser, Printer, AST } from "prettier";
import * as parser from "@babel/parser";

function locStart(node: any) {
  return node.start;
}

function locEnd(node: any) {
  return node.end;
}

export const languages: Partial<SupportLanguage>[] = [];

export const parsers: Record<string, Parser> = {
  babel: {
    parse: (code: string): AST => {
      const ast = parser.parse(code, {
        sourceType: "module",
        plugins: ["jsx"],
      });

      return ast;
    },
    locStart,
    locEnd,
    astFormat: "estree",
  },
};

export const printers: Record<string, Printer> = {};
