import { Parser } from "../../parser.ts";
import { ScopeManager } from "../typescript-semantic/scope.ts";
import { TgType } from "../typescript-semantic/semantic-node.ts";

export abstract class Runtime {
  protected constructor(public node: Parser.SyntaxNode) { }

  static analyze(node: Parser.SyntaxNode): Runtime | null {
    if (node.type !== "new_expression") {
      throw new Error("expected new expression for runtime definition");
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
        throw new Error(`unknown runtime: ${constructorName}`);
    }
  }

  abstract getGeneratorInputType(
    generatorName: string,
    generatorArgs: Parser.SyntaxNode[],
    scopeManager: ScopeManager,
  ): TgType;
}

export class DenoRuntime extends Runtime {
  constructor(node: Parser.SyntaxNode) {
    super(node);
  }

  override getGeneratorInputType(
    generatorName: string,
    generatorArgs: Parser.SyntaxNode[],
    scopeManager: ScopeManager,
  ): TgType {
    switch (generatorName) {
      case "identity": {
        // TODO
        return TgType.fromNode(generatorArgs[0]);
      }
      case "func": {
        // const inputType = TgType.fromNode(generatorArgs[0]);
        // console.log("func input type", inputType);
        // Type.fromNode(generatorArgs[0]);
        // as struct
        return TgType.fromNode(generatorArgs[0]);
      }

      default:
        throw new Error(`unknown generator: ${generatorName}`);
    }
  }
}

export class PythonRuntime extends Runtime {
  constructor(node: Parser.SyntaxNode) {
    super(node);
  }

  override getGeneratorInputType(
    generatorName: string,
    generatorArgs: Parser.SyntaxNode[],
    scopeManager: ScopeManager,
  ): TgType {
    switch (generatorName) {
      case "fromLambda": {
        return TgType.fromNode(generatorArgs[0]);
      }

      default:
        throw new Error(`unknown generator: ${generatorName}`);
    }
  }
}
