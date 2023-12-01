import { Parser, TypeScript } from "../parser.ts";
import { ScopeManager } from "./typescript-semantic/scope.ts";

export type ExposedFunction = {
  name: string;
  node: Parser.SyntaxNode;
  runtime: Parser.SyntaxNode;
  generator: string;
  generatorArgs: Parser.SyntaxNode;
  reduce?: Parser.SyntaxNode | null;
  policy?: Parser.SyntaxNode | null;
};

type MethodCall = {
  object: Parser.SyntaxNode;
  method: string;
  arguments: Parser.SyntaxNode;
};

export function asMethodCall(node: Parser.SyntaxNode): MethodCall | null {
  if (node.type !== "call_expression") {
    return null;
  }
  const fn = node.childForFieldName("function")!;
  if (fn.type !== "member_expression") {
    return null;
  }
  const object = fn.childForFieldName("object")!;
  const property = fn.childForFieldName("property")!;
  if (property.type !== "property_identifier") {
    return null;
  }
  const argumentsNode = node.childForFieldName("arguments")!;
  if (argumentsNode.type !== "arguments") {
    return null;
  }
  return {
    object: object,
    method: property.text,
    arguments: argumentsNode,
  };
}

const runtimeNameByConstructor = {
  "PythonRuntime": "python",
  "DenoRuntime": "deno",
  "PrismaRuntime": "prisma",
};

/**
 * Analyze an expose expression
 *
 * TODO: variable resolution (use the definition subtree)
 *   to be implemented in asMethodCall
 *   use default LSP to find definition
 *
 * Example:
 * database.findMany(users).reduce({ where: { id: 1 } }).withPolicy(policy)
 * - runtime: database
 * - generator: findMany
 * - generatorArgs: users
 * - reduce: { where: { id: 1 } }
 * - policy: policy
 */
export function analyzeExposeExpression(
  node: Parser.SyntaxNode,
  scopeManager: ScopeManager,
): Omit<ExposedFunction, "name"> {
  let methodCall = asMethodCall(node);
  if (methodCall === null) {
    throw new Error("expected method call");
  }
  let policy: Parser.SyntaxNode | null = null;
  let reduce: Parser.SyntaxNode | null = null;
  if (methodCall.method === "withPolicy") {
    policy = methodCall.arguments;
    methodCall = asMethodCall(methodCall.object);
    if (methodCall === null) {
      throw new Error("expected method call");
    }
  }

  // TODO what if reduce is a generator name??
  if (methodCall.method === "reduce") {
    reduce = methodCall.arguments;
    methodCall = asMethodCall(methodCall.arguments);
    if (methodCall === null) {
      throw new Error("expected method call");
    }
  }

  let runtime = methodCall.object;
  if (runtime.type === "identifier") {
    const variable = scopeManager.findVariable(runtime);
    if (variable === null) {
      // TODO diagnostic??
      throw new Error(`variable ${runtime.text} not found`);
    }
    runtime = variable.definition;
  }

  if (runtime.type !== "new_expression") {
    throw new Error("expected new expression");
  }
  const runtimeConstructor = runtime.childForFieldName("constructor")!.text;
  const runtimeName =
    runtimeNameByConstructor[
    runtimeConstructor as keyof typeof runtimeNameByConstructor
    ];
  if (runtimeName === undefined) {
    throw new Error(`unknown runtime: ${runtimeConstructor}`);
  }

  const generator = methodCall.method;
  const generatorArgs = methodCall.arguments;

  return {
    node,
    runtime,
    generator,
    generatorArgs,
    reduce,
    policy,
  };
}
