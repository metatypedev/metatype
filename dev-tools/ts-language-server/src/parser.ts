import Parser from "npm:web-tree-sitter";
import { join } from "std/path/mod.ts";
import {
  analyzeExposeExpression,
  ExposedFunction,
} from "./analysis/exposed_function.ts";
import { ModuleDiagnosticsContext } from "./analysis/diagnostics/context.ts";

export { Parser };

const srcDir = new URL(".", import.meta.url).pathname;

await Parser.init();
export const TypeScript = await Parser.Language.load(
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

const typegraphDefinitionCaptureNames = ["name", "builder", "args"] as const;

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

const parameterQuery = TypeScript.query(`
  (identifier) @graphParameterName
`);

const methodCallQuery = TypeScript.query(`
(call_expression
  function: (
    member_expression object: (identifier) @object
    property: (property_identifier) @method
  )
  arguments: (arguments (object) @objectArg)
)
`);

export class TypegraphDefinition {
  name: string;
  builder: Parser.SyntaxNode;
  graphParameterName: string;
  body: Parser.SyntaxNode;
  #exposedFunctions: Map<string, ExposedFunction> = new Map();

  constructor(
    captures: TypegraphDefinitionCaptures,
    private ctx: ModuleDiagnosticsContext,
  ) {
    if (captures.name != undefined) {
      this.name = captures.name.text;
      this.builder = captures.builder!;
    } else {
      // TODO find name in args
      throw new Error("TODO");
    }

    const matches = parameterQuery.matches(this.builder.namedChildren[0]);
    // this is to be checked by the typescript linter.
    if (matches.length === 0) {
      this.ctx.error(
        this.builder.namedChildren[0],
        "expected one parameter for the typegraph builder",
      );
      // throw new Error("expected one match");
      this.graphParameterName = "g";
    } else {
      if (matches.length > 1) {
        this.ctx.error(
          this.builder.namedChildren[0],
          "expected only one parameter for the typegraph builder",
        );
      }
      this.graphParameterName = matches[0].captures[0].node.text;
    }
    this.body = this.builder.namedChildren[1];
  }

  #findExposedFunctions(): [name: string, node: Parser.SyntaxNode][] {
    const exposeObjects = methodCallQuery
      .matches(this.body)
      .filter((m) => {
        const object = m.captures.find((c) => c.name === "object");
        const method = m.captures.find((c) => c.name === "method");
        return (
          object?.node.text === this.graphParameterName &&
          method?.node.text === "expose"
        );
      })
      .map((m) => m.captures.find((c) => c.name === "objectArg")?.node);

    if (exposeObjects.length !== 1) {
      throw new Error("expected one object argument in expose");
    }

    return exposeObjects[0]!.namedChildren.map((c) => {
      const name = c.childForFieldName("key");
      const value = c.childForFieldName("value");
      return [name!.text, value!];
    });
  }

  get exposedFunctions(): Map<string, ExposedFunction> {
    if (this.#exposedFunctions.size === 0) {
      for (const [name, node] of this.#findExposedFunctions()) {
        this.#exposedFunctions.set(name, {
          ...analyzeExposeExpression(node, this.ctx.symbolRegistry),
          name,
        });
      }
    }
    return this.#exposedFunctions;
  }
}
