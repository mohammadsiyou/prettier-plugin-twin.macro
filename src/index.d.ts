import type { Visitor } from "@babel/traverse";

export type LayerOrderName =
  | "defaults"
  | "base"
  | "components"
  | "utilities"
  | "user";

export interface TWContextType {
  tailwindConfig: {
    separator: string;
    prefix: string;
  };
  candidateRuleMap: any;
  arbitraryPropertiesSort: bigint;
  variantMap: any;
  variantOrder: any;
  layerOrder: Record<LayerOrderName, bigint>;
  getClassOrder: (classes: string[]) => Array<[string, bigint]>;
}

export interface ContextType {
  context: TWContextType;
  hash: string;
}

export type VisitorType = Visitor<{ context: TWContextType }>;
