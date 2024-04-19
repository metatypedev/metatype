import Parser = require("tree-sitter");
import { typescript as TypeScript } from "tree-sitter-typescript";
import {
  analyzeExposeExpression,
  ExposedFunction,
} from "./analysis/exposed_function.ts";
import { ModuleDiagnosticsContext } from "./analysis/diagnostics/context.ts";

export { Parser, TypeScript };

export function parse(code: string): Parser.Tree {
  const parser = new Parser();
  parser.setLanguage(TypeScript);
  return parser.parse(code);
}

export function queryMatches(
  query: string,
  node: Parser.SyntaxNode,
): Parser.QueryMatch[] {
  const q = new Parser.Query(TypeScript, query);
  return q.matches(node);
}

// TODO arrrow funnction vs anonymous function vs named function
const typegraphDefinitionQuery = `
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
)`;

function withCapture<T>(
  queryMatch: Parser.QueryMatch,
  captureName: string,
  f: (node: Parser.SyntaxNode) => T,
): T | undefined {
  const capture = queryMatch.captures.find((c) => c.name == captureName);
  return capture && f(capture.node);
}

export type TypegraphDefinitionCaptures = {
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
  return queryMatches(typegraphDefinitionQuery, node)
    .filter((m) => withCapture(m, "function", (n) => n.text === "typegraph"))
    .map((m) =>
      m.captures.reduce((acc, c) => {
        const captureNames = typegraphDefinitionCaptureNames as string[];
        if (captureNames.includes(c.name)) {
          acc[c.name as keyof TypegraphDefinitionCaptures] = c.node;
        }
        return acc;
      }, {} as TypegraphDefinitionCaptures)
    );
}

const parameterQuery = `
(identifier) @graphParameterName
`;

const methodCallQuery = `
(call_expression
 function: (
   member_expression object: (identifier) @object
   property: (property_identifier) @method
 )
 arguments: (arguments (object) @objectArg)
)
`;

export class TypegraphDefinition {
  public exposedFunctions: Map<string, ExposedFunction>;

  private constructor(
    public name: string,
    public builder: Parser.SyntaxNode,
    public graphParameterName: string,
    public body: Parser.SyntaxNode,
    ctx: ModuleDiagnosticsContext,
  ) {
    this.exposedFunctions = new Map();
    for (const [name, node] of this.#findExposedFunctions()) {
      const res = analyzeExposeExpression(node, ctx);
      if (res === null) {
        continue;
      }
      this.exposedFunctions.set(name, { ...res, name });
    }
  }

  static create(
    captures: TypegraphDefinitionCaptures,
    ctx: ModuleDiagnosticsContext,
  ): TypegraphDefinition | null {
    if (captures.name == undefined) {
      // TODO find name in args
      ctx.error(captures.args!, "Invalid typegraph definition");
      return null;
    }

    const name = captures.name.text;
    const builder = captures.builder!;

    const matches = queryMatches(parameterQuery, builder.namedChildren[0]);
    let graphParameterName: string;
    // this is to be checked by the typescript linter.
    if (matches.length === 0) {
      ctx.error(
        builder.namedChildren[0],
        "expected one parameter for the typegraph builder",
      );
      graphParameterName = "g";
    } else {
      if (matches.length > 1) {
        ctx.error(
          builder.namedChildren[0],
          "expected only one parameter for the typegraph builder",
        );
      }
      graphParameterName = matches[0].captures[0].node.text;
    }

    const body = builder.namedChildren[1];

    return new TypegraphDefinition(
      name,
      builder,
      graphParameterName,
      body,
      ctx,
    );
  }

  #findExposedFunctions(): [name: string, node: Parser.SyntaxNode][] {
    const exposeObjects = queryMatches(methodCallQuery, this.body)
      .filter((m) => {
        const object = m.captures.find((c) => c.name === "object");
        const method = m.captures.find((c) => c.name === "method");
        return (
          object?.node.text === this.graphParameterName &&
          method?.node.text === "expose"
        );
      })
      .map((m) => m.captures.find((c) => c.name === "objectArg")?.node);

    return exposeObjects.filter((o) => o).flatMap((o) => {
      return o!.namedChildren.map((c) => {
        const name = c.childForFieldName("key");
        const value = c.childForFieldName("value");
        return [name!.text, value!] as [string, Parser.SyntaxNode];
      });
    });
  }
}
