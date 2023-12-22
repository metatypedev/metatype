import { Parser, TypeScript } from "../parser.ts";
import { ModuleDiagnosticsContext } from "./diagnostics/context.ts";
import { Runtime } from "./runtimes/mod.ts";
import { ScopeManager } from "./typescript-semantic/scope.ts";
import { TgType } from "./typescript-semantic/semantic-node.ts";
import { asMethodCall } from "./typescript-semantic/utils/mod.ts";

export type ExposedFunction = {
  name: string;
  node: Parser.SyntaxNode;
  runtime: Runtime;
  inputType: TgType | null; // null if could not be parsed or invalid
  generator: Parser.SyntaxNode;
  generatorArgs: Parser.SyntaxNode;
  reduce?: Parser.SyntaxNode | null;
  policy?: Parser.SyntaxNode | null;
};

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
  ctx: ModuleDiagnosticsContext,
): Omit<ExposedFunction, "name"> {
  let methodCall = asMethodCall(node);
  if (methodCall === null) {
    throw new Error("expected method call");
  }
  let policy: Parser.SyntaxNode | null = null;
  let reduce: Parser.SyntaxNode | null = null;
  const methodName = methodCall.method.text;
  if (methodName === "withPolicy") {
    policy = methodCall.arguments;
    methodCall = asMethodCall(methodCall.object);
    if (methodCall === null) {
      throw new Error("expected method call");
    }
  }

  // TODO what if reduce is a generator name??
  if (methodName === "reduce") {
    reduce = methodCall.arguments;
    methodCall = asMethodCall(methodCall.object);
    if (methodCall === null) {
      throw new Error("expected method call");
    }
  }

  let runtimeNode = methodCall.object;
  if (runtimeNode.type === "identifier") {
    const variable = ctx.symbolRegistry.findVariable(runtimeNode);
    if (variable === null) {
      // TODO diagnostic??
      throw new Error(`variable ${runtimeNode.text} not found`);
    }
    runtimeNode = variable.definition;
  }

  const runtime = Runtime.analyze(runtimeNode, ctx);
  if (runtime === null) {
    throw new Error("expected runtime");
  }

  // if (runtime.type !== "new_expression") {
  //   throw new Error("expected new expression");
  // }
  // const runtimeConstructor = runtime.childForFieldName("constructor")!.text;
  // const runtimeName = runtimeNameByConstructor[
  //   runtimeConstructor as keyof typeof runtimeNameByConstructor
  // ];
  // if (runtimeName === undefined) {
  //   throw new Error(`unknown runtime: ${runtimeConstructor}`);
  // }
  // console.log(runtimeName);

  const generator = methodCall.method;
  const generatorArgs = methodCall.arguments;

  return {
    node,
    runtime,
    inputType: runtime.getGeneratorInputType(
      generator,
      generatorArgs.namedChildren,
      ctx,
    ),
    generator,
    generatorArgs,
    reduce,
    policy,
  };
}
