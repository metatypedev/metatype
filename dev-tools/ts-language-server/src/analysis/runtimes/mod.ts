import { Parser } from "../../parser.ts";
import { ModuleDiagnosticsContext } from "../diagnostics/context.ts";
import { TgType } from "../typescript-semantic/semantic-node.ts";

export abstract class Runtime {
  protected constructor(public node: Parser.SyntaxNode) {}

  static analyze(
    node: Parser.SyntaxNode,
    ctx: ModuleDiagnosticsContext,
  ): Runtime | null {
    if (node.type !== "new_expression") {
      ctx.warn(node, "expected new expression for runtime definition");
      return null;
    }

    // TODO check import name, etc...
    const constructorName = node.childForFieldName("constructor")!.text;
    switch (constructorName) {
      case "DenoRuntime":
        return new DenoRuntime(node);
      case "PythonRuntime":
        return new PythonRuntime(node);
      // case "PrismaRuntime":
      //   return new PrismaRuntime(node);
      default:
        ctx.error(node, `unknown runtime: ${constructorName}`);
        return null;
    }
  }

  abstract getGeneratorInputType(
    generatorNameNode: Parser.SyntaxNode,
    generatorArgs: Parser.SyntaxNode[],
    ctx: ModuleDiagnosticsContext,
  ): TgType | null;
}

export class DenoRuntime extends Runtime {
  constructor(node: Parser.SyntaxNode) {
    super(node);
  }

  override getGeneratorInputType(
    generatorNameNode: Parser.SyntaxNode,
    generatorArgs: Parser.SyntaxNode[],
    ctx: ModuleDiagnosticsContext,
  ): TgType | null {
    switch (generatorNameNode.text) {
      case "identity": {
        // TODO
        return TgType.fromNode(generatorArgs[0], ctx);
      }
      case "func": {
        // const inputType = TgType.fromNode(generatorArgs[0]);
        // console.log("func input type", inputType);
        // Type.fromNode(generatorArgs[0]);
        // as struct
        return TgType.fromNode(generatorArgs[0], ctx);
      }

      default:
        ctx.error(
          generatorNameNode,
          `unknown generator: ${generatorNameNode.text}`,
        );
        return null;
    }
  }
}

export class PythonRuntime extends Runtime {
  constructor(node: Parser.SyntaxNode) {
    super(node);
  }

  override getGeneratorInputType(
    generatorNameNode: Parser.SyntaxNode,
    generatorArgs: Parser.SyntaxNode[],
    ctx: ModuleDiagnosticsContext,
  ): TgType | null {
    switch (generatorNameNode.text) {
      case "fromLambda": {
        return TgType.fromNode(generatorArgs[0], ctx);
      }

      default:
        ctx.error(
          generatorNameNode,
          `unknown generator: ${generatorNameNode.text}`,
        );
        return null;
    }
  }
}
