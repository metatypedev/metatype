import { Parser } from "../../parser.ts";

export type Type = {}; // TODO

export abstract class Runtime {
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
  ): Type;
}

export class DenoRuntime extends Runtime {
  constructor(public _node: Parser.SyntaxNode) {
    super();
  }

  override getGeneratorInputType(
    generatorName: string,
    _generatorArgs: Parser.SyntaxNode[],
    scopeManager: ScopeManager,
  ): Type {
    switch (generatorName) {
      case "identity": {
        // TODO
        return {};
      }
      case "func": {
        // Type.fromNode(generatorArgs[0]);
        // as struct
        return {};
      }

      default:
        throw new Error(`unknown generator: ${generatorName}`);
    }
  }
}

export class PythonRuntime extends Runtime {
  constructor(public _node: Parser.SyntaxNode) {
    super();
  }

  override getGeneratorInputType(
    generatorName: string,
    _generatorArgs: Parser.SyntaxNode[],
    scopeManager: ScopeManager,
  ): Type {
    switch (generatorName) {
      case "fromLamdda": {
        // Type.fromNode(generatorArgs[0]);
        return {};
      }

      default:
        throw new Error(`unknown generator: ${generatorName}`);
    }
  }
}
