import { Parser, TypeScript } from "../parser.ts";
import { ModuleDiagnosticsContext } from "./diagnostics/context.ts";
import { InputType, Runtime } from "./runtimes/mod.ts";
import { ScopeManager } from "./typescript-semantic/scope.ts";
import { TgType } from "./typescript-semantic/semantic-node.ts";
import { asMethodCall } from "./typescript-semantic/utils/mod.ts";

export type ExposedFunction = {
  name: string;
  node: Parser.SyntaxNode;
  runtime: Runtime;
  input: InputType | null; // null if could not be parsed or invalid
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
): Omit<ExposedFunction, "name"> | null {
  if (node.type === "identifier") {
    console.log("identifier", node.toString());
    const res = ctx.symbolRegistry.findVariable(node);
    if (res === null) {
      ctx.error(node, "symbol definition not found");
      return null;
    }

    return analyzeExposeExpression(res.definition, ctx);
  }
  let methodCall = asMethodCall(node);
  if (methodCall === null) {
    ctx.error(node, "expected method call");
    return null;
  }
  const methodName = methodCall.method.text;

  if (methodName === "withPolicy") {
    const policy = methodCall.arguments;
    const expr = analyzeExposeExpression(methodCall.object, ctx);
    if (expr == null) {
      return null;
    }
    if (expr.policy != null) {
      ctx.warn(node, "multiple policies specified");
      return expr;
    }
    expr.policy = policy;
    return expr;
  }

  // TODO what if reduce is a generator name??
  if (methodName === "reduce") {
    const reduce = methodCall.arguments;
    const expr = analyzeExposeExpression(methodCall.object, ctx);
    if (expr == null) {
      return null;
    }

    if (expr.reduce != null) {
      // TODO multiple reduce not yet supported
      ctx.warn(node, "chained reduce called not yet supported by the LSP");
      return expr;
    }
    expr.reduce = reduce;
    return expr;
  }

  let runtimeNode = methodCall.object;
  if (runtimeNode.type === "identifier") {
    const variable = ctx.symbolRegistry.findVariable(runtimeNode);
    if (variable === null) {
      ctx.error(runtimeNode, "symbol definition not found");
      return null;
    }
    runtimeNode = variable.definition;
  }

  const runtime = Runtime.analyze(runtimeNode, ctx);
  if (runtime === null) {
    ctx.error(runtimeNode, "expected a runtime");
    return null;
  }

  const generator = methodCall.method;
  const generatorArgs = methodCall.arguments;

  return {
    node,
    runtime,
    input: runtime.getGeneratorInputType(
      generator,
      generatorArgs.namedChildren,
      ctx,
    ),
    generator,
    generatorArgs,
  };
}
