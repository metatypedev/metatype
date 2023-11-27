import Parser from "npm:web-tree-sitter";
import { join } from "std/path/mod.ts";

export { Parser };

const srcDir = new URL(".", import.meta.url).pathname;

await Parser.init();
const TypeScript = await Parser.Language.load(
  join(srcDir, "../grammars/typescript.wasm"),
);

export function parse(code: string): Parser.Tree {
  const parser = new Parser();
  parser.setLanguage(TypeScript);
  return parser.parse(code);
}

/// find top level typegraph definitions
export function findTypegraphDefinitions(
  node: Parser.SyntaxNode,
): Parser.SyntaxNode[] {
  return node.children
    .map((node: Parser.SyntaxNode) => {
      if (node.type == "expression_statement") {
        const expr = node.namedChildren[0];
        if (expr.type == "call_expression") {
          const ident = expr.namedChildren[0];
          if (ident.type == "identifier") {
            if (ident.text == "typegraph") {
              return expr;
            }
          }
        }
      }
      return null;
    })
    .filter((n: Parser.SyntaxNode | null) => n) as Parser.SyntaxNode[];
}

export class TypegraphDefinition {
  name: string;
  builder: Parser.SyntaxNode;

  constructor(node: Parser.SyntaxNode) {
    const args = node.namedChildren[1];
    if (args.namedChildCount != 2) {
      throw new Error("typegraph definition must have 2 arguments");
    }
    const nameExpr = args.namedChildren[0];
    if (nameExpr.type != "string") {
      throw new Error("typegraph definition name must be a string literal");
    }

    if (nameExpr.namedChildCount != 1) {
      // TODO not supported??
      throw new Error("string literal must have 1 child");
    }
    this.name = nameExpr.namedChildren[0].text;

    const builderExpr = args.namedChildren[1];
    if (
      builderExpr.type != "function" &&
      builderExpr.type != "arrow_function"
    ) {
      throw new Error("typegraph definition builder must be a function");
    }

    this.builder = builderExpr;
  }
}
