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

const typegraphDefinitionQuery = TypeScript.query(`
(call_expression
  function: (identifier) @function
  arguments: (arguments) @arguments
)`);

function withCapture<T>(
  queryMatch: Parser.QueryMatch,
  captureName: string,
  f: (node: Parser.SyntaxNode) => T,
): T | undefined {
  const capture = queryMatch.captures.find((c) => c.name == captureName);
  return capture && f(capture.node);
}

/// find top level typegraph definitions
/// return the arguments node
export function findTypegraphDefinitions(
  node: Parser.SyntaxNode,
): Parser.SyntaxNode[] {
  return typegraphDefinitionQuery
    .matches(node)
    .filter((m) => withCapture(m, "function", (n) => n.text === "typegraph"))
    .map((m) => withCapture(m, "arguments", (n) => n)!);
}

export class TypegraphDefinition {
  name: string;
  builder: Parser.SyntaxNode;

  constructor(node: Parser.SyntaxNode) {
    if (node.type != "arguments") {
      throw new Error(
        "typegraph definition must be constructed from arguments node",
      );
    }
    const nameExpr = node.namedChildren[0];
    if (nameExpr.type != "string") {
      throw new Error("typegraph definition name must be a string literal");
    }

    if (nameExpr.namedChildCount != 1) {
      // TODO not supported??
      throw new Error("string literal must have 1 child");
    }
    this.name = nameExpr.namedChildren[0].text;

    const builderExpr = node.namedChildren[1];
    if (
      builderExpr.type != "function" &&
      builderExpr.type != "arrow_function"
    ) {
      throw new Error("typegraph definition builder must be a function");
    }

    this.builder = builderExpr;
  }
}
