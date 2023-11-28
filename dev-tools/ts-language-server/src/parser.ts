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

// TODO arrrow funnction vs anonymous function vs named function
const typegraphDefinitionQuery = TypeScript.query(`
(call_expression
  function: (identifier) @function
  arguments: [
    (arguments 
      (string (string_fragment) @name)
      (arrow_function) @builder
    )
    (arguments
      (object) @args
      (arrow_function)? @builder
    )
  ]
)`);

function withCapture<T>(
  queryMatch: Parser.QueryMatch,
  captureName: string,
  f: (node: Parser.SyntaxNode) => T,
): T | undefined {
  const capture = queryMatch.captures.find((c) => c.name == captureName);
  return capture && f(capture.node);
}

type TypegraphDefinitionCaptures = {
  name?: Parser.SyntaxNode;
  builder?: Parser.SyntaxNode;
  args?: Parser.SyntaxNode;
};

const typegraphDefinitionCaptureNames = [
  "name",
  "builder",
  "args",
] as const;

/// find top level typegraph definitions
/// return the arguments node
export function findTypegraphDefinitions(
  node: Parser.SyntaxNode,
): TypegraphDefinitionCaptures[] {
  return typegraphDefinitionQuery
    .matches(node)
    .filter((m) => withCapture(m, "function", (n) => n.text === "typegraph"))
    .map((m) =>
      m.captures.reduce((acc, c) => {
        if (typegraphDefinitionCaptureNames.includes(c.name as any)) {
          acc[c.name as keyof TypegraphDefinitionCaptures] = c.node;
        }
        return acc;
      }, {} as TypegraphDefinitionCaptures)
    );
}

export class TypegraphDefinition {
  name: string;
  builder: Parser.SyntaxNode;

  constructor(captures: TypegraphDefinitionCaptures) {
    if (captures.name != undefined) {
      this.name = captures.name.text;
      this.builder = captures.builder!;
    } else {
      // TODO find name in args
      throw new Error("TODO");
    }
  }
}
